import os
import json
import io
import re
import zipfile
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai
import shutil
import tempfile
from app.processors.pptx_parser import extract_slides
from app.processors.xml_parser import parse_qti_xml
from app.processors.story_parser import parse_story_file
from app.processors.scorm_builder import (
    build_course_definition,
    generate_manifest,
    generate_runtime_html,
)

load_dotenv()

router = APIRouter()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("No GEMINI_API_KEY found in .env file")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash')


# ---------------------------------------------------------------------------
# MODELS
# ---------------------------------------------------------------------------

class CourseData(BaseModel):
    title: str
    blocks: List[Dict[str, Any]]


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


@router.post("/upload/xml")
async def upload_xml(file: UploadFile = File(...)):
    contents = await file.read()
    blocks = await parse_qti_xml(contents.decode("utf-8"))
    return {"status": "success", "blocks": blocks}


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
    course_def = build_course_definition(course.title, course.blocks)

    # Extract embedded media (data URIs) into separate files
    media_files = {}  # filename -> bytes
    _extract_media_from_course(course_def, media_files)

    # Generate SCORM 1.2 compliant manifest (include media file declarations)
    manifest = generate_manifest(course.title, media_files=list(media_files.keys()))

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


def _extract_media_from_course(course_def: Dict[str, Any], media_files: Dict[str, bytes]):
    """Walk through slides/layers/components and extract data URIs into files."""
    media_counter = 0
    for slide in course_def.get("slides", []):
        for layer in slide.get("layers", []):
            for comp in layer.get("components", []):
                # Handle video data URIs (blob: URLs won't work, but data: will)
                if comp.get("type") == "video" and comp.get("src", "").startswith("data:"):
                    media_counter += 1
                    data_uri = comp["src"]
                    # Parse data URI: data:video/mp4;base64,XXXXX
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
                            pass  # Keep original data URI if decode fails


def _mime_to_ext(mime: str) -> str:
    """Convert a MIME type to a file extension."""
    mime_map = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/ogg": "ogg",
        "video/avi": "avi",
        "video/quicktime": "mov",
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
    }
    return mime_map.get(mime, mime.split("/")[-1] if "/" in mime else "bin")


# ---------------------------------------------------------------------------
# XAPI EXPORT
# ---------------------------------------------------------------------------

@router.post("/export/xapi")
async def export_xapi(course: CourseData):
    buffer = io.BytesIO()

    safe_id = course.title.replace(" ", "_")

    xapi_script = f"""
    function initCourse() {{
        console.log("xAPI Initialized");

        const statement = {{
            actor: {{ mbox: "mailto:student@example.com" }},
            verb: {{
                id: "http://adlnet.gov/expapi/verbs/initialized",
                display: {{ "en-US": "initialized" }}
            }},
            object: {{
                id: "http://courseforge.com/{safe_id}"
            }}
        }};

        console.log("xAPI Statement:", statement);

        // OPTIONAL: send to LRS
        /*
        fetch("https://your-lrs-endpoint.com/xapi/statements", {{
            method: "POST",
            headers: {{
                "Content-Type": "application/json",
                "Authorization": "Basic YOUR_AUTH"
            }},
            body: JSON.stringify(statement)
        }});
        */
    }}
    """

    html = _build_course_html(course.title, course.blocks, xapi_script)

    with zipfile.ZipFile(buffer, "w") as z:
        z.writestr("index.html", html)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_id}_xapi.zip"'}
    )