import os
import json
import io
import re
import uuid
import zipfile
import base64
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai
import shutil
import tempfile
from app.processors.pptx_parser import extract_slides
from app.processors.story_parser import parse_story_file
from app.processors.pdf_parser import extract_pdf_slides
from app.processors.scorm_builder import (
    build_course_definition,
    generate_manifest,
    generate_runtime_html,
)

load_dotenv()

router = APIRouter()

class UnsplashDownloadRequest(BaseModel):
    url: str
    download_location: str

import requests

@router.post("/unsplash-download")
async def unsplash_download(req: UnsplashDownloadRequest):
    try:
        client_id = "MGjPRsN98K3iYFnC8T_XqwV3oVZApm9x9IoZjhlTfeQ"
        if client_id and req.download_location:
            requests.get(req.download_location, params={"client_id": client_id})
        
        response = requests.get(req.url)
        response.raise_for_status()
        
        content_type = response.headers.get("Content-Type", "image/jpeg")
        b64 = base64.b64encode(response.content).decode("utf-8")
        data_uri = f"data:{content_type};base64,{b64}"
        
        return {"dataUri": data_uri}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("No GEMINI_API_KEY found in .env file")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash')

class GenerateImageRequest(BaseModel):
    prompt: str

@router.post("/generate-image")
async def generate_image_api(req: GenerateImageRequest):
    import os
    import uuid
    import requests
    import base64
    from fastapi import HTTPException
    from dotenv import load_dotenv
    
    # Reload .env to ensure the new key is captured
    load_dotenv()
    
    key = os.getenv("ENTERPRISE_GEMINI_IMAGE_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="ENTERPRISE_GEMINI_IMAGE_KEY not configured in .env")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key={key}"
    payload = {
        "instances": [{"prompt": req.prompt}],
        "parameters": {"sampleCount": 1}
    }
    
    try:
        resp = requests.post(url, json=payload)
        
        # THE FIX: Read the exact Google error instead of blindly crashing
        if not resp.ok:
            error_details = resp.text
            print("\n--- GOOGLE API ERROR ---")
            print(error_details)
            print("------------------------\n")
            raise ValueError(f"Google API rejected the request: {error_details}")
            
        data = resp.json()
        
        # Robust extraction of the base64 data
        predictions = data.get("predictions", [])
        if not predictions:
            raise ValueError(f"No predictions returned from Google API. Full response: {data}")
            
        b64_str = predictions[0].get("bytesBase64Encoded")
        if not b64_str:
            raise ValueError("No image data found in prediction response")
            
        image_bytes = base64.b64decode(b64_str)
        
        os.makedirs("media", exist_ok=True)
        filename = f"{uuid.uuid4().hex}.png"
        filepath = os.path.join("media", filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)
            
        return {"localUrl": f"/{filepath.replace(os.sep, '/')}"}
        
    except Exception as e:
        # This will now print the actual traceback to your terminal
        import traceback
        print("\n--- ENDPOINT CRASH ---")
        traceback.print_exc()
        print("----------------------\n")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# MODELS
# ---------------------------------------------------------------------------

class CoursePolicy(BaseModel):
    passingScore: float = 70.0
    maxAttempts: int = 3
    lockOnPass: bool = False
    lockOnExhaust: bool = True


class CourseData(BaseModel):
    title: str
    blocks: List[Dict[str, Any]]
    policy: CoursePolicy = CoursePolicy()  # LMS admin-configured marking & attempts criteria
    theme: Dict[str, Any] | None = None

# ---------------------------------------------------------------------------
# MEDIA STORE — persists uploaded audio files across requests
# key: media_id (str)  value: {"filename": str, "bytes": bytes, "mime": str}
# ---------------------------------------------------------------------------
_MEDIA_STORE: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# IMAGE HELPERS
# ---------------------------------------------------------------------------

def _normalise_image_src(raw: Any) -> str | None:
    if not raw:
        return None

    if isinstance(raw, (bytes, bytearray)):
        raw = base64.b64encode(raw).decode("ascii")

    if not isinstance(raw, str):
        return None

    raw = raw.strip()
    if not raw:
        return None

    if raw.startswith("data:"):
        return raw

    if raw.startswith("http://") or raw.startswith("https://"):
        return raw

    if re.fullmatch(r"[A-Za-z0-9+/\r\n]+=*", raw):
        b64 = raw.replace("\n", "").replace("\r", "")
        return f"data:image/png;base64,{b64}"

    return None


def _extract_image_src(block: Dict[str, Any]) -> str | None:
    data = block.get("data") or {}

    candidates = [
        block.get("image"),
        block.get("imageUrl"),
        block.get("src"),
        block.get("imageData"),
        block.get("image_data"),
        block.get("url"),
        block.get("data_uri"),
        data.get("image"),
        data.get("imageUrl"),
        data.get("src"),
        data.get("imageData"),
        data.get("url"),
    ]

    for candidate in candidates:
        result = _normalise_image_src(candidate)
        if result:
            return result

    return None


# ---------------------------------------------------------------------------
# VIDEO HELPERS
# ---------------------------------------------------------------------------

def _get_youtube_embed(url: str) -> str | None:
    """Extract YouTube video ID and return embed URL."""
    match = re.search(
        r"(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]{11})", url
    )
    if match:
        return f"https://www.youtube.com/embed/{match.group(1)}?rel=0"
    return None


def _get_vimeo_embed(url: str) -> str | None:
    """Extract Vimeo video ID and return embed URL."""
    match = re.search(r"vimeo\.com/(\d+)", url)
    if match:
        return f"https://player.vimeo.com/video/{match.group(1)}"
    return None


def _is_blob_url(url: str) -> bool:
    """Detect browser-generated blob: URLs which cannot survive export."""
    return url.startswith("blob:")


def _render_video_html(video_url: str, wrapper_style: str) -> str:
    """
    Return the appropriate HTML for a video URL:
      - YouTube  → responsive <iframe> embed
      - Vimeo    → responsive <iframe> embed
      - blob:    → warning (local files cannot be packaged)
      - other    → native <video> element (works for http/https direct links)
    """
    if not video_url:
        return f'<div style="{wrapper_style}"><em>[Video block – no URL provided]</em></div>'

    # Blob URLs are local browser objects; they have no meaning inside a ZIP
    if _is_blob_url(video_url):
        return f'''
        <div style="{wrapper_style} border:2px dashed #f59e0b; background:#fffbeb; text-align:center; padding:24px;">
            <p style="margin:0 0 8px; font-weight:600; color:#92400e;">⚠ Local Video File</p>
            <p style="margin:0; color:#78350f; font-size:14px;">
                This video was uploaded from your device and cannot be embedded in an exported package.
                Please host it online and paste the URL into the Video block instead.
            </p>
        </div>
        '''

    yt_embed = _get_youtube_embed(video_url)
    if yt_embed:
        return f'''
        <div style="{wrapper_style}">
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;">
                <iframe
                    src="{yt_embed}"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
        </div>
        '''

    vimeo_embed = _get_vimeo_embed(video_url)
    if vimeo_embed:
        return f'''
        <div style="{wrapper_style}">
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;">
                <iframe
                    src="{vimeo_embed}"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
        </div>
        '''

    # Direct video link (mp4, webm, ogg, etc.)
    return f'''
    <div style="{wrapper_style}">
        <video
            controls
            style="width:100%;max-height:480px;border-radius:8px;background:#000;display:block;">
            <source src="{video_url}">
            Your browser does not support the video element.
            <a href="{video_url}" target="_blank">Download video</a>
        </video>
    </div>
    '''


# ---------------------------------------------------------------------------
# FLASHCARD HTML (interactive CSS flip, no JS framework needed)
# ---------------------------------------------------------------------------

_FLASHCARD_CSS_INJECTED = False  # used as a sentinel per build call

def _render_flashcard_html(front: str, back: str, card_id: str, wrapper_style: str) -> str:
    """
    Render a self-contained, CSS-only flip card.
    Works offline inside a SCORM/xAPI ZIP with no external dependencies.
    """
    return f'''
    <div style="{wrapper_style}">
        <style>
            .fc-scene-{card_id} {{
                perspective: 1000px;
                width: 100%;
                min-height: 160px;
                cursor: pointer;
                user-select: none;
            }}
            .fc-card-{card_id} {{
                width: 100%;
                min-height: 160px;
                position: relative;
                transform-style: preserve-3d;
                transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
            }}
            .fc-scene-{card_id}.flipped .fc-card-{card_id} {{
                transform: rotateY(180deg);
            }}
            .fc-front-{card_id}, .fc-back-{card_id} {{
                position: absolute;
                inset: 0;
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
                border-radius: 12px;
                padding: 24px 28px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 160px;
            }}
            .fc-front-{card_id} {{
                background: linear-gradient(145deg, #1a0a0a, #6b1a1a);
                color: #fff;
            }}
            .fc-back-{card_id} {{
                background: linear-gradient(145deg, #fffaf9, #fff0ee);
                border: 2px solid #e8c8c8;
                color: #1a0a0a;
                transform: rotateY(180deg);
            }}
            .fc-label-{card_id} {{
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.15em;
                text-transform: uppercase;
                margin-bottom: 10px;
                opacity: 0.55;
            }}
            .fc-text-{card_id} {{
                font-size: 16px;
                font-weight: 600;
                line-height: 1.5;
                margin: 0;
            }}
            .fc-hint-{card_id} {{
                font-size: 11px;
                margin-top: 14px;
                opacity: 0.45;
            }}
        </style>
        <div class="fc-scene-{card_id}" id="scene-{card_id}"
             onclick="document.getElementById('scene-{card_id}').classList.toggle('flipped')">
            <div class="fc-card-{card_id}">
                <div class="fc-front-{card_id}">
                    <div class="fc-label-{card_id}">Question / Term</div>
                    <p class="fc-text-{card_id}">{front or "(no question set)"}</p>
                    <div class="fc-hint-{card_id}">↻ Click to reveal answer</div>
                </div>
                <div class="fc-back-{card_id}">
                    <div class="fc-label-{card_id}">Answer / Definition</div>
                    <p class="fc-text-{card_id}">{back or "(no answer set)"}</p>
                    <div class="fc-hint-{card_id}">↻ Click to flip back</div>
                </div>
            </div>
        </div>
    </div>
    '''


# ---------------------------------------------------------------------------
# HTML RENDERING (all block types)
# ---------------------------------------------------------------------------

def render_block_html(block: Dict[str, Any], block_index: int = 0) -> str:
    block_type = (block.get("type") or "").lower().strip()

    wrapper = (
        "margin-bottom:20px;padding:15px;background:#f9fafb;"
        "border-radius:8px;font-family:sans-serif;"
    )

    # ── AUDIO BLOCK ──────────────────────────────────────────────────────────
    if block_type == "audio":
        label = block.get("label", "Audio Track")
        # Priority: pre-resolved relative path (export) → media store → raw URL
        src = block.get("_resolved_src", "")
        if not src:
            mid = block.get("mediaId", "")
            entry = _MEDIA_STORE.get(mid)
            if entry:
                ext = entry["filename"].rsplit(".", 1)[-1]
                src = f"./media/{mid}.{ext}"
            else:
                src = block.get("audioUrl", "")
        return f'''
        <div style="{wrapper}">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;color:#8b1a1a;margin-bottom:10px;">AUDIO</div>
            <div style="font-size:14px;font-weight:600;margin-bottom:10px;">{label}</div>
            <audio controls style="width:100%;border-radius:8px;">
                <source src="{src}">
                Your browser does not support the audio element.
            </audio>
        </div>
        '''

    # ── VIDEO BLOCK ──────────────────────────────────────────────────────────
    if block_type == "video":
        video_url = (block.get("videoUrl") or block.get("video_url") or "").strip()
        return _render_video_html(video_url, wrapper)

    # ── FLASHCARD BLOCK ──────────────────────────────────────────────────────
    if block_type == "flashcard":
        front = block.get("front", "")
        back  = block.get("back", "")
        card_id = f"fc{block_index}"
        return _render_flashcard_html(front, back, card_id, wrapper)

    # ── IMAGE BLOCK (existing logic) ─────────────────────────────────────────
    image_src = _extract_image_src(block)

    if image_src:
        width = block.get("width", "100%")
        caption = block.get("caption", "")
        caption_html = f'<div style="margin-top:8px;font-size:14px;color:#666;">{caption}</div>' if caption else ""
        return f'''
        <div style="{wrapper} text-align:center;">
            <img src="{image_src}" style="max-width:100%;width:{width};height:auto;border-radius:4px;" />
            {caption_html}
        </div>
        '''

    if block_type in ("image", "img", "picture"):
        return f'<div style="{wrapper}"><em>[Image block – no valid image source found]</em></div>'

    data = block.get("data") if isinstance(block.get("data"), dict) else block

    # ── QUIZ BLOCK ────────────────────────────────────────────────────────────
    if block_type in ("quiz", "mcq") or ("question" in data and "options" in data):
        options_html = "".join(f"<li>{o}</li>" for o in data.get("options", []))
        return f'''
        <div style="{wrapper}">
            <strong>Q: {data.get("question","")}</strong>
            <ul>{options_html}</ul>
        </div>
        '''

    # ── LEGACY FLASHCARD (data.front / data.back without explicit type) ───────
    if "front" in data and "back" in data:
        card_id = f"fc_legacy_{block_index}"
        return _render_flashcard_html(data.get("front"), data.get("back"), card_id, wrapper)

    # ── LIST / QUOTE / PROCESS ────────────────────────────────────────────────
    if block_type == "list":
        items_html = "".join(f"<li style='margin-bottom:8px;'>{item}</li>" for item in block.get("items", []))
        return f'<div style="{wrapper}"><ul style="padding-left:20px;margin:0;">{items_html}</ul></div>'

    if block_type == "quote":
        quote_content = block.get("content", "")
        author = block.get("author", "")
        author_html = f'<div style="margin-top:8px;font-size:14px;color:#666;font-weight:bold;">— {author}</div>' if author else ""
        return f'<div style="{wrapper} border-left:4px solid #8b1a1a; background:#fff5f5;"><em style="font-size:18px;">"{quote_content}"</em>{author_html}</div>'

    if block_type == "process":
        steps = block.get("steps", [])
        steps_html = ""
        for i, step in enumerate(steps):
            title = step.get("title", "")
            step_content = step.get("content", "")
            steps_html += f'<div style="margin-bottom:16px;padding:12px;background:#fff;border-radius:6px;border:1px solid #e8e8e8;"><strong>Step {i+1}: {title}</strong><p style="margin-top:8px;">{step_content}</p></div>'
        return f'<div style="{wrapper}"><div style="font-weight:bold;margin-bottom:12px;color:#8b1a1a;">Process ({len(steps)} steps)</div>{steps_html}</div>'

    if block_type == "audio":
        media_id = block.get("mediaId", "")
        label    = block.get("label", "Audio Track")
        # In exported packages the file lives at media/<mediaId>.<ext>
        entry = _MEDIA_STORE.get(media_id)
        if entry:
            ext = entry["filename"].rsplit(".", 1)[-1]
            src = f"./media/{media_id}.{ext}"
        else:
            src = block.get("audioUrl", "")
        return f'''
        <div style="{wrapper}">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;color:#8b1a1a;margin-bottom:10px;">AUDIO</div>
            <div style="font-size:14px;font-weight:600;margin-bottom:10px;">{label}</div>
            <audio controls style="width:100%;border-radius:8px;">
                <source src="{src}">
                Your browser does not support the audio element.
            </audio>
        </div>
        '''

    if block_type == "true_false":
        correct_label = "True" if block.get("correctAnswer", True) else "False"
        return f'''
        <div style="{wrapper}">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;color:#8b1a1a;margin-bottom:10px;">TRUE / FALSE</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:14px;">{block.get("question","")}</div>
            <div style="display:flex;gap:10px;">
                <div style="flex:1;padding:10px;border-radius:8px;border:2px solid {'#16a34a' if correct_label=='True' else '#f0d8d8'};background:{'#dcfce7' if correct_label=='True' else 'white'};text-align:center;font-weight:600;">&#10003; True</div>
                <div style="flex:1;padding:10px;border-radius:8px;border:2px solid {'#dc2626' if correct_label=='False' else '#f0d8d8'};background:{'#fee2e2' if correct_label=='False' else 'white'};text-align:center;font-weight:600;">&#10007; False</div>
            </div>
            <div style="margin-top:8px;font-size:12px;color:#888;">(Correct answer: {correct_label})</div>
        </div>
        '''

    if block_type == "fill_blanks":
        question_display = (block.get("question","")).replace("____", "_" * 10)
        return f'''
        <div style="{wrapper}">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;color:#8b1a1a;margin-bottom:10px;">FILL IN THE BLANK</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:14px;">{question_display}</div>
            <div style="padding:8px 14px;background:#f0f0f0;border-radius:6px;font-size:14px;color:#555;">Answer: <strong>{block.get("answer","")}</strong></div>
        </div>
        '''

    if block_type == "columns":
        cols = block.get("columns", [])
        col_width = f"{round(100 / max(len(cols), 1), 2)}%" if cols else "100%"
        cols_html = ""
        for col in cols:
            sub_html = ""
            for sub in col:
                stype = (sub.get("type") or "").lower()
                if stype == "text":
                    sub_html += f'<div style="font-size:15px;line-height:1.7;margin-bottom:10px;">{sub.get("content","")}</div>'
                elif stype == "image":
                    src = sub.get("src") or sub.get("image") or sub.get("imageUrl") or ""
                    if src:
                        caption = sub.get("caption", "")
                        caption_html = f'<div style="margin-top:6px;font-size:13px;color:#666;">{caption}</div>' if caption else ""
                        sub_html += f'<div style="text-align:center;margin-bottom:10px;"><img src="{src}" style="width:100%;border-radius:8px;" />{caption_html}</div>'
            cols_html += f'<div style="width:{col_width};padding:12px;box-sizing:border-box;">{sub_html}</div>'
        return f'<div style="{wrapper} padding:0;"><div style="display:flex;flex-wrap:wrap;gap:0;">{cols_html}</div></div>'


    # ── TEXT / HEADING / BUTTON / FALLBACK ────────────────────────────────────
    content = block.get("content", data.get("content", ""))

    if block_type in ("heading", "heading-1"):
        return f'<h2 style="font-family:sans-serif;margin-bottom:12px;">{content}</h2>'

    if block_type == "button":
        return f'''
        <div style="margin-bottom:20px;text-align:center;">
            <button style="
                background:linear-gradient(135deg,#8b1a1a,#c0392b);
                color:white;border:none;border-radius:9px;
                padding:10px 28px;font-size:14px;font-weight:600;cursor:pointer;">
                {content}
            </button>
        </div>
        '''

    return f'<div style="{wrapper}">{content}</div>'


# ---------------------------------------------------------------------------
# HTML BUILDER (COMMON)
# ---------------------------------------------------------------------------

def _build_course_html(title: str, blocks: List[Dict[str, Any]], script: str = "") -> str:
    # Pass block index so each flashcard / video gets a unique DOM id
    content = "".join(
        render_block_html(b, i) for i, b in enumerate(blocks)
    )

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>{title}</title>
<script>
{script}
</script>
</head>
<body onload="initCourse()" style="max-width:800px;margin:auto;padding:40px;">
<h1>{title}</h1>
{content}
</body>
</html>"""


# ---------------------------------------------------------------------------
# UPLOAD ROUTES
# ---------------------------------------------------------------------------

@router.post("/upload/pptx")
async def upload_pptx(file: UploadFile = File(...)):
    contents = await file.read()
    slides = await extract_slides(contents)
    return {"status": "success", "blocks": slides}


@router.post("/upload/story")
async def upload_story(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".story") as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_file_path = temp_file.name

    try:
        blocks = await parse_story_file(temp_file_path)
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return {"status": "success", "blocks": blocks}


@router.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Extract slide-like structure from each PDF page."""
    contents = await file.read()
    slides = await extract_pdf_slides(contents)
    return {"status": "success", "blocks": slides}


@router.post("/upload/audio")
async def upload_audio(file: UploadFile = File(...)):
    """
    Store audio bytes in the in-memory media store.
    Returns a mediaId the frontend embeds in the audio block.
    """
    contents = await file.read()
    media_id = uuid.uuid4().hex
    _MEDIA_STORE[media_id] = {
        "filename": file.filename or f"audio_{media_id}",
        "bytes": contents,
        "mime": file.content_type or "audio/mpeg",
    }
    return {
        "status": "success",
        "mediaId": media_id,
        "filename": file.filename,
        "previewUrl": f"/api/media/{media_id}",
    }


@router.get("/media/{media_id}")
async def serve_media(media_id: str):
    """Serve a stored media file for the authoring preview player."""
    entry = _MEDIA_STORE.get(media_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Media not found")
    return StreamingResponse(
        io.BytesIO(entry["bytes"]),
        media_type=entry["mime"],
        headers={"Content-Disposition": f'inline; filename="{entry["filename"]}"'},
    )


# ---------------------------------------------------------------------------
# AI GENERATION ROUTE
# ---------------------------------------------------------------------------

@router.post("/ai/generate")
async def generate_ai_content(prompt: str = Form(...), block_type: str = Form("Paragraph")):
    try:
        full_prompt = (
            f"Write educational course content about: {prompt}. "
            f"Format it as a detailed {block_type}. "
            "Do not use markdown formatting like asterisks or hashtags, "
            "just return plain readable text."
        )
        response = model.generate_content(full_prompt)
        return {
            "status": "success",
            "data": {"content": response.text.strip()}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ---------------------------------------------------------------------------
# SCORM EXPORT
# ---------------------------------------------------------------------------

@router.post("/export/scorm")
async def export_scorm(course: CourseData):
    buffer = io.BytesIO()

    # Convert authoring blocks → Slide/Layer/Component model + triggers
    course_def = build_course_definition(course.title, course.blocks, theme=course.theme, policy={
        "passingScore": course.policy.passingScore,
        "maxAttempts":  course.policy.maxAttempts,
        "lockOnPass":   course.policy.lockOnPass,
        "lockOnExhaust": course.policy.lockOnExhaust,
    })

    # Extract embedded media (data URIs) into separate files
    media_files = {}  # filename -> bytes
    _extract_media_from_course(course_def, media_files)

    # Generate SCORM 1.2 compliant manifest (include media file declarations)
    manifest = generate_manifest(
        course.title,
        media_files=list(media_files.keys()),
        mastery_score=course.policy.passingScore,
    )

    # Generate runtime HTML with embedded course data + JS bundle
    html = generate_runtime_html(course.title, course_def)

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", html)
        z.writestr("imsmanifest.xml", manifest)

        # Write extracted media files
        for fname, fbytes in media_files.items():
            z.writestr(fname, fbytes)

        # Include standard SCORM 1.2 schema files
        schemas_dir = os.path.join(os.path.dirname(__file__), "..", "processors", "scorm12_schemas")
        if os.path.exists(schemas_dir):
            for file_name in os.listdir(schemas_dir):
                file_path = os.path.join(schemas_dir, file_name)
                if os.path.isfile(file_path):
                    z.write(file_path, file_name)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{course.title}_scorm.zip"'}
    )


@router.post("/preview-html")
async def preview_html(course: CourseData):
    """Return the full SCORM runtime HTML for in-browser preview (no ZIP)."""
    from fastapi.responses import HTMLResponse

    course_def = build_course_definition(course.title, course.blocks, theme=course.theme, policy={
        "passingScore": course.policy.passingScore,
        "maxAttempts":  course.policy.maxAttempts,
        "lockOnPass":   course.policy.lockOnPass,
        "lockOnExhaust": course.policy.lockOnExhaust,
    })

    html = generate_runtime_html(course.title, course_def)
    return HTMLResponse(content=html)


def _extract_media_from_course(course_def: Dict[str, Any], media_files: Dict[str, bytes]):
    """Walk through slides/layers/components, extract data URIs and resolve audio mediaIds."""
    media_counter = 0

    for slide_idx, slide in enumerate(course_def.get("slides", [])):
        bg = slide.get("background") or {}
        if bg.get("type") == "image" and bg.get("value", "").startswith("data:"):
            match = re.match(r"data:([\w/+.-]+);base64,(.*)", bg["value"], re.DOTALL)
            if match:
                mime, b64_data = match.group(1), match.group(2)
                ext = _mime_to_ext(mime)
                fname = f"media/bg_slide_{slide_idx}.{ext}"
                try:
                    media_files[fname] = base64.b64decode(b64_data)
                    bg["value"] = fname
                except Exception:
                    pass

        # Extract background audio
        bg_audio = slide.get("bgAudio")
        if bg_audio and isinstance(bg_audio, dict):
            media_id = bg_audio.get("mediaId")
            if media_id:
                entry = _MEDIA_STORE.get(media_id)
                if entry:
                    ext = entry["filename"].rsplit(".", 1)[-1]
                    fname = f"media/{media_id}.{ext}"
                    media_files[fname] = entry["bytes"]
                    bg_audio["src"] = fname

        for layer in slide.get("layers", []):
            for comp in layer.get("components", []):
                ctype = comp.get("type")

                # ── Audio blocks: resolve mediaId → physical file in media/
                if ctype == "audio":
                    media_id = comp.get("mediaId", "")
                    entry = _MEDIA_STORE.get(media_id)
                    if entry:
                        ext = entry["filename"].rsplit(".", 1)[-1]
                        fname = f"media/{media_id}.{ext}"
                        media_files[fname] = entry["bytes"]
                        comp["src"] = fname          # relative path for runtime
                    continue

                # ── Video data URIs
                if ctype in ("video", "interactive-video") and comp.get("src", "").startswith("data:"):
                    media_counter += 1
                    data_uri = comp["src"]
                    match = re.match(r"data:([\w/+.-]+);base64,(.*)", data_uri, re.DOTALL)
                    if match:
                        mime = match.group(1)
                        b64_data = match.group(2)
                        ext = _mime_to_ext(mime)
                        fname = f"media/video_{media_counter}.{ext}"
                        try:
                            media_files[fname] = base64.b64decode(b64_data)
                            comp["src"] = fname
                            comp["embedType"] = "direct"
                        except Exception:
                            pass
                # ── Image data URIs → media file
                if ctype in ("image", "image-hotspot") and comp.get("src", "").startswith("data:"):
                    media_counter += 1
                    data_uri = comp["src"]
                    match = re.match(r"data:([\w/+.-]+);base64,(.*)", data_uri, re.DOTALL)
                    if match:
                        mime, b64_data = match.group(1), match.group(2)
                        ext = _mime_to_ext(mime)
                        fname = f"media/img_{media_counter}.{ext}"
                        try:
                            media_files[fname] = base64.b64decode(b64_data)
                            comp["src"] = fname
                        except Exception:
                            pass
                    continue

                # ── Columns: walk sub-blocks and extract nested images
                if ctype == "columns":
                    for col in comp.get("columns", []):
                        for sub in col:
                            if sub.get("type") == "image" and sub.get("src", "").startswith("data:"):
                                media_counter += 1
                                data_uri = sub["src"]
                                match = re.match(r"data:([\w/+.-]+);base64,(.*)", data_uri, re.DOTALL)
                                if match:
                                    mime, b64_data = match.group(1), match.group(2)
                                    ext = _mime_to_ext(mime)
                                    fname = f"media/col_img_{media_counter}.{ext}"
                                    try:
                                        media_files[fname] = base64.b64decode(b64_data)
                                        sub["src"] = fname
                                    except Exception:
                                        pass
                    continue

def _mime_to_ext(mime: str) -> str:
    """Convert a MIME type to a file extension."""
    mime_map = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/ogg": "ogg",
        "video/avi": "avi",
        "video/quicktime": "mov",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/ogg": "ogg",
        "audio/wav": "wav",
        "audio/webm": "webm",
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
    }
    return mime_map.get(mime, mime.split("/")[-1] if "/" in mime else "bin")


# ---------------------------------------------------------------------------
# XAPI HELPERS
# ---------------------------------------------------------------------------

# All keys the frontend might use for a slide's child blocks, in priority order.
_SLIDE_CHILD_KEYS = ("blocks", "elements", "children", "components", "content_blocks")


def _flatten_course_blocks(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalise the raw frontend payload into a flat list of renderable blocks.

    Handles case-insensitive slide type matching and tries all common child-block
    key names so the export is resilient to frontend payload variations.
    """
    flattened: List[Dict[str, Any]] = []

    for item in blocks:
        item_type = (item.get("type") or "").lower().strip()

        if item_type == "slide":
            slide_title = item.get("title") or item.get("name") or "Untitled Slide"
            flattened.append({"type": "heading", "content": slide_title})

            children: List[Dict[str, Any]] = []
            for key in _SLIDE_CHILD_KEYS:
                candidate = item.get(key)
                if isinstance(candidate, list) and candidate:
                    children = candidate
                    break

            flattened.extend(children)
        else:
            flattened.append(item)

    return flattened


# ---------------------------------------------------------------------------
# XAPI EXPORT
# ---------------------------------------------------------------------------

@router.post("/export/xapi")
async def export_xapi(course: CourseData):
    buffer = io.BytesIO()

    safe_id = re.sub(r"\s+", "_", course.title.strip())

    xapi_script = f"""
    // ── CourseForge xAPI (Tin Can) Runtime ────────────────────────────────────
    // Configure your LRS endpoint and credentials here.
    var CF_LRS_ENDPOINT = "https://your-lrs-endpoint.com/xapi/statements";
    var CF_LRS_AUTH     = "Basic YOUR_BASE64_ENCODED_CREDENTIALS";
    var CF_ACTOR_MBOX   = "mailto:learner@example.com";
    var CF_COURSE_IRI   = "http://courseforge.com/{safe_id}";
    var CF_COURSE_TITLE = "{course.title}";
    var CF_PASSING_SCORE = 70; // percent — override to match your LRS/admin setting

    function _xapiSend(statement) {{
        console.log("[xAPI] Sending statement:", JSON.stringify(statement, null, 2));
        fetch(CF_LRS_ENDPOINT, {{
            method: "POST",
            headers: {{
                "Content-Type": "application/json",
                "X-Experience-API-Version": "1.0.3",
                "Authorization": CF_LRS_AUTH
            }},
            body: JSON.stringify(statement)
        }}).catch(function(err) {{
            console.warn("[xAPI] LRS POST failed:", err);
        }});
    }}

    function _xapiStatement(verbId, verbDisplay, result) {{
        var stmt = {{
            actor: {{ mbox: CF_ACTOR_MBOX }},
            verb: {{
                id: verbId,
                display: {{ "en-US": verbDisplay }}
            }},
            object: {{
                id: CF_COURSE_IRI,
                objectType: "Activity",
                definition: {{
                    name: {{ "en-US": CF_COURSE_TITLE }},
                    type: "http://adlnet.gov/expapi/activities/course"
                }}
            }}
        }};
        if (result) stmt.result = result;
        return stmt;
    }}

    // Sent on page load — tells the LRS the learner has opened the course.
    function initCourse() {{
        _xapiSend(_xapiStatement(
            "http://adlnet.gov/expapi/verbs/initialized",
            "initialized",
            null
        ));
    }}

    // Call this once the learner finishes the course with a calculated score (0-100).
    // Sends both a "completed" and a "passed"/"failed" statement as per cmi5 convention.
    function reportCourseCompletion(scoreRaw) {{
        var scaled  = Math.round(scoreRaw) / 100;
        var passed  = scoreRaw >= CF_PASSING_SCORE;
        var result  = {{
            score: {{
                raw:    Math.round(scoreRaw),
                min:    0,
                max:    100,
                scaled: scaled
            }},
            success:    passed,
            completion: true,
            duration:   "PT0S"  // override with real elapsed time if available
        }};

        // 1. completed statement
        _xapiSend(_xapiStatement(
            "http://adlnet.gov/expapi/verbs/completed",
            "completed",
            result
        ));

        // 2. passed / failed statement
        _xapiSend(_xapiStatement(
            passed
                ? "http://adlnet.gov/expapi/verbs/passed"
                : "http://adlnet.gov/expapi/verbs/failed",
            passed ? "passed" : "failed",
            result
        ));

        console.log("[xAPI] Course " + (passed ? "PASSED" : "FAILED") +
                    " — score: " + Math.round(scoreRaw) + "/100 " +
                    "(pass mark: " + CF_PASSING_SCORE + "%)");
    }}
    """

    flattened_blocks = _flatten_course_blocks(course.blocks)

    # --- bundle stored audio files into xAPI zip ---
    xapi_media: Dict[str, bytes] = {}
    for item in flattened_blocks:
        if item.get("type") == "audio":
            mid = item.get("mediaId", "")
            entry = _MEDIA_STORE.get(mid)
            if entry:
                ext = entry["filename"].rsplit(".", 1)[-1]
                xapi_media[f"media/{mid}.{ext}"] = entry["bytes"]
                # patch src so render_block_html uses relative path
                item["_resolved_src"] = f"./media/{mid}.{ext}"

    html = _build_course_html(course.title, flattened_blocks, xapi_script)

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", html)
        for fname, fbytes in xapi_media.items():
            z.writestr(fname, fbytes)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_id}_xapi.zip"'}
    )
