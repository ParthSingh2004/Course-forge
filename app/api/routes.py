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
import html
from app.processors.pptx_parser import extract_slides
from app.processors.story_parser import parse_story_file
from app.processors.pdf_parser import extract_pdf_slides
from app.processors.scorm_builder import (
    build_course_definition,
    generate_manifest,
    generate_manifest_scorm2004,
    generate_runtime_html,
    _get_runtime_js,
)

load_dotenv()

router = APIRouter()

DEFAULT_FLASHCARD_COLOR = "#8b1a1a"


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _sanitize_hex_color(value: Any, fallback: str = DEFAULT_FLASHCARD_COLOR) -> str:
    raw = str(value or "").strip()
    return raw if re.fullmatch(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})", raw) else fallback


def _expand_hex_color(value: str) -> str:
    clean = _sanitize_hex_color(value)[1:]
    return "".join(ch * 2 for ch in clean) if len(clean) == 3 else clean


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    full = _expand_hex_color(value)
    return int(full[0:2], 16), int(full[2:4], 16), int(full[4:6], 16)


def _rgb_to_hex(r: float, g: float, b: float) -> str:
    return "#{:02x}{:02x}{:02x}".format(
        round(_clamp(r, 0, 255)),
        round(_clamp(g, 0, 255)),
        round(_clamp(b, 0, 255)),
    )


def _mix_hex(hex_color: str, target_hex: str, amount: float) -> str:
    r1, g1, b1 = _hex_to_rgb(hex_color)
    r2, g2, b2 = _hex_to_rgb(target_hex)
    return _rgb_to_hex(
        r1 + (r2 - r1) * amount,
        g1 + (g2 - g1) * amount,
        b1 + (b2 - b1) * amount,
    )


def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    r, g, b = _hex_to_rgb(hex_color)
    return f"rgba({r}, {g}, {b}, {alpha})"


def _flashcard_theme(color: Any) -> Dict[str, str]:
    base = _sanitize_hex_color(color)
    return {
        "front_bg": f"linear-gradient(145deg, {_mix_hex(base, '#000000', 0.72)} 0%, {_mix_hex(base, '#000000', 0.48)} 60%, {_mix_hex(base, '#ffffff', 0.12)} 100%)",
        "front_border": _mix_hex(base, "#ffffff", 0.18),
        "front_shadow": _hex_to_rgba(base, 0.28),
        "back_bg": f"linear-gradient(145deg, {_mix_hex(base, '#ffffff', 0.94)} 0%, {_mix_hex(base, '#ffffff', 0.84)} 100%)",
        "back_border": _mix_hex(base, "#ffffff", 0.58),
        "back_shadow": _hex_to_rgba(base, 0.14),
        "front_badge": "rgba(255,255,255,0.68)",
        "back_badge": _mix_hex(base, "#ffffff", 0.28),
        "back_text": _mix_hex(base, "#000000", 0.82),
    }


def _count_fill_blank_placeholders(question: Any) -> int:
    return len(re.findall(r"____", str(question or "")))


def _normalize_fill_blank_answers(block: Dict[str, Any]) -> List[str]:
    answers = block.get("answers")
    explicit_answer_count = len(answers) if isinstance(answers, list) else 0
    desired_count = max(explicit_answer_count, _count_fill_blank_placeholders(block.get("question", "")), 1)
    if isinstance(answers, list) and len(answers) > 0:
        source = [str(answer or "") for answer in answers]
    else:
        source = [str(block.get("answer", "") or "")]
    return [source[idx] if idx < len(source) else "" for idx in range(desired_count)]

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

def _render_flashcard_html(front: str, back: str, card_id: str, wrapper_style: str, color: str = DEFAULT_FLASHCARD_COLOR) -> str:
    """
    Render a self-contained, CSS-only flip card.
    Works offline inside a SCORM/xAPI ZIP with no external dependencies.
    """
    theme = _flashcard_theme(color)
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
                background: {theme["front_bg"]};
                border: 1px solid {theme["front_border"]};
                box-shadow: 0 8px 32px {theme["front_shadow"]};
                color: #fff;
            }}
            .fc-back-{card_id} {{
                background: {theme["back_bg"]};
                border: 2px solid {theme["back_border"]};
                box-shadow: 0 8px 32px {theme["back_shadow"]};
                color: {theme["back_text"]};
                transform: rotateY(180deg);
            }}
            .fc-label-{card_id} {{
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.15em;
                text-transform: uppercase;
                margin-bottom: 10px;
                opacity: 1;
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
                    <div class="fc-label-{card_id}" style="color:{theme['front_badge']};">Question / Term</div>
                    <p class="fc-text-{card_id}">{front or "(no question set)"}</p>
                    <div class="fc-hint-{card_id}">↻ Click to reveal answer</div>
                </div>
                <div class="fc-back-{card_id}">
                    <div class="fc-label-{card_id}" style="color:{theme['back_badge']};">Answer / Definition</div>
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
        color = block.get("color", DEFAULT_FLASHCARD_COLOR)
        card_id = f"fc{block_index}"
        return _render_flashcard_html(front, back, card_id, wrapper, color)

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
        return _render_flashcard_html(data.get("front"), data.get("back"), card_id, wrapper, data.get("color", DEFAULT_FLASHCARD_COLOR))

    # ── LIST / QUOTE / PROCESS ────────────────────────────────────────────────
    if block_type == "list":
        items_html = "".join(f"<li style='margin-bottom:8px;'>{item}</li>" for item in block.get("items", []))
        return f'<div style="{wrapper}"><ul style="padding-left:20px;margin:0;">{items_html}</ul></div>'

    if block_type == "quote":
        quote_content = block.get("content", "")
        author = block.get("author", "")
        layout = str(block.get("layout", "below-left"))
        bg_image = block.get("bgImage")
        bg_overlay = max(0.0, min(1.0, float(block.get("bgOverlay", 0.45) or 0.45)))
        has_bg = bool(bg_image)
        is_above = layout.startswith("above")
        is_inline = layout.startswith("inline")
        is_right = layout.endswith("right")
        wrapper_bits = [
            wrapper,
            "position:relative",
            "overflow:hidden",
            "padding:0",
            f"background:{'#111827' if has_bg else '#fff5f5'}",
            f"border-radius:{'8px' if has_bg else '0 8px 8px 0'}",
            f"{'border-left:none' if has_bg else 'border-left:4px solid #8b1a1a'}",
        ]
        if has_bg:
            wrapper_bits.extend([
                f"background-image:url('{bg_image}')",
                "background-size:cover",
                "background-position:center",
                "min-height:140px",
            ])
        quote_mark = f'<span style="display:block;font-size:3.5rem;line-height:.6;color:{("rgba(255,255,255,.6)" if has_bg else "#c0807080")};font-family:Georgia,serif;{"margin-bottom:.15rem;" if not is_inline else ""}">"</span>'
        author_html = ""
        if author:
            author_html = f'<div style="font-size:.875rem;color:{("rgba(255,255,255,.85)" if has_bg else "#8b6060")};font-weight:600;font-family:Georgia,serif;font-style:italic;">{author}</div>'
        inline_html = f'<div style="display:flex;align-items:center;gap:.75rem;flex-direction:{("row-reverse" if is_right else "row")};">{quote_mark}{author_html}</div>' if is_inline else quote_mark
        author_block_html = ""
        if author and not is_inline:
            author_block_html = f'<div style="display:flex;justify-content:{("flex-end" if is_right else "flex-start")};">{author_html}</div>'
        scrim_html = f'<div style="position:absolute;inset:0;pointer-events:none;background-color:rgba(0,0,0,{bg_overlay});"></div>' if has_bg else ""
        inner_html = (
            f'<div style="position:relative;z-index:1;display:flex;flex-direction:{("column-reverse" if is_above else "column")};gap:.35rem;padding:1rem 1rem .6rem;">'
            f'{inline_html}'
            f'<div style="font-size:18px;font-style:italic;color:{("#ffffff" if has_bg else "#1a0a0a")};line-height:1.7;">{quote_content}</div>'
            f'{author_block_html}'
            f'</div>'
        )
        return f'<div style="{";".join(wrapper_bits)}">{scrim_html}{inner_html}</div>'

    if block_type == "statement":
        image = block.get("image") or block.get("imageUrl") or block.get("src")
        image_height = str(block.get("imageHeight") or "380px")
        layers = block.get("textLayers", [])
        layer_html = ""
        for idx, layer in enumerate(layers):
            left = max(0, min(88, float(layer.get("x", 8) or 8)))
            top = max(0, min(88, float(layer.get("y", 8) or 8)))
            layer_html += (
                f'<div style="position:absolute;left:{left}%;top:{top}%;display:inline-flex;flex-direction:column;min-width:100px;z-index:10;">'
                f'<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;gap:.4rem;background:#ffffff;border:1px solid #e4e4e0;border-bottom:none;border-radius:6px 6px 0 0;box-shadow:0 -1px 4px rgba(0,0,0,.04);pointer-events:none;">'
                f'<div style="display:flex;align-items:center;gap:.35rem;"><span style="color:#b0b0ac;font-size:.7rem;">•••</span><span style="font-size:.65rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#b0b0ac;">Text {idx + 1}</span></div>'
                f'</div>'
                f'<div style="padding:4px 7px;min-width:90px;background:rgba(255,255,255,0.88);border:1px solid rgba(228,228,224,0.9);border-top:none;border-radius:0 6px 6px 6px;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);">'
                f'<div style="font-size:15px;line-height:1.7;color:#1a1a1a;min-width:140px;min-height:1.6em;">{layer.get("content","")}</div>'
                f'</div></div>'
            )
        empty_html = '' if image else '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#909090;font-size:.88rem;font-weight:600;">No image uploaded</div>'
        bg_style = f"background-image:url('{image}');background-size:cover;background-position:center;background-repeat:no-repeat;" if image else "background:#fafaf8;"
        return f'<div style="{wrapper} padding:0;border-radius:12px;border:1px solid #e4e4e0;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.05),0 2px 12px rgba(0,0,0,.04);"><div style="position:relative;width:100%;height:{image_height};overflow:hidden;{bg_style}">{empty_html}{layer_html}</div></div>'

    if block_type == "process":
        steps = block.get("steps", [])
        steps_html = ""
        for i, step in enumerate(steps):
            title = step.get("title", "")
            step_content = step.get("content", "")
            steps_html += f'<div style="margin-bottom:16px;padding:12px;background:#fff;border-radius:6px;border:1px solid #e8e8e8;"><strong>Step {i+1}: {title}</strong><p style="margin-top:8px;">{step_content}</p></div>'
        return f'<div style="{wrapper}"><div style="font-weight:bold;margin-bottom:12px;color:#8b1a1a;">Process ({len(steps)} steps)</div>{steps_html}</div>'

    if block_type in ("accordion", "accordian"):
        topics = block.get("topics", [])
        topic_html = ""
        for i, topic in enumerate(topics):
            title = topic.get("title", "") or f"Topic {i + 1}"
            items_html = ""
            for item in topic.get("items", []):
                item_type = (item.get("type") or "").lower()
                if item_type == "text" and item.get("value"):
                    items_html += f'<div style="line-height:1.7;color:#333;margin-bottom:12px;">{item.get("value","")}</div>'
                elif item_type == "image":
                    src = item.get("src") or item.get("image") or item.get("imageUrl") or ""
                    if src:
                        caption = item.get("caption", "")
                        caption_html = f'<div style="margin-top:8px;font-size:13px;color:#666;">{caption}</div>' if caption else ""
                        items_html += f'<div style="text-align:center;margin-bottom:12px;"><img src="{src}" alt="{item.get("alt","")}" style="width:100%;max-height:320px;object-fit:contain;border-radius:8px;background:#fafafa;" />{caption_html}</div>'
            open_attr = " open" if i == 0 else ""
            topic_html += f'<details{open_attr} style="border:1px solid #ead0d0;border-radius:10px;background:#fff;margin-bottom:12px;overflow:hidden;"><summary style="cursor:pointer;list-style:none;padding:14px 16px;background:#fdf8f8;font-weight:700;color:#1a0a0a;">{title}</summary><div style="padding:16px;border-top:1px solid #f3e4e4;">{items_html}</div></details>'
        return f'<div style="{wrapper}">{topic_html}</div>'

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
        question_display = re.sub(r"____", "_" * 10, block.get("question",""))
        answers = _normalize_fill_blank_answers(block)
        answer_html = "".join(
            f'<div style="margin-top:{0 if idx == 0 else 6}px;">Blank {idx + 1}: <strong>{answer}</strong></div>'
            for idx, answer in enumerate(answers)
        )
        return f'''
        <div style="{wrapper}">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;color:#8b1a1a;margin-bottom:10px;">FILL IN THE BLANK</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:14px;">{question_display}</div>
            <div style="padding:8px 14px;background:#f0f0f0;border-radius:6px;font-size:14px;color:#555;">{answer_html}</div>
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
        raw_level = str(block.get("headingLevel") or block.get("level") or "h1").strip().lower()
        heading_tag = raw_level if raw_level in {"h1", "h2", "h3", "h4", "h5", "h6"} else "h1"
        return f'<{heading_tag} style="font-family:sans-serif;margin-bottom:12px;">{content}</{heading_tag}>'

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
    
    for slide in slides:
        for element in slide.get("elements", []):
            if element.get("type") == "audio" and element.get("audioUrl", "").startswith("data:"):
                audio_url = element["audioUrl"]
                media_id = element.get("mediaId")
                
                try:
                    header, b64_data = audio_url.split(",", 1)
                    mime_type = header.split(";")[0].split(":")[1]
                    audio_bytes = base64.b64decode(b64_data)
                    
                    if not media_id:
                        media_id = uuid.uuid4().hex
                        element["mediaId"] = media_id
                        
                    ext = mime_type.split("/")[-1] if "/" in mime_type else "mp3"
                    filename = f"audio_{media_id}.{ext}"
                    
                    _MEDIA_STORE[media_id] = {
                        "filename": filename,
                        "bytes": audio_bytes,
                        "mime": mime_type,
                    }
                    
                    element["audioUrl"] = f"/api/media/{media_id}"
                except Exception as e:
                    print(f"Failed to wire PPTX audio to media store: {e}")
                    
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
    runtime_js_name = "runtime.js"
    course_data_js_name = "course-data.js"

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
        media_files=list(media_files.keys()) + [runtime_js_name, course_data_js_name],
        mastery_score=course.policy.passingScore,
    )

    # Generate runtime HTML referencing external JS assets to avoid CSP issues in hosted LMS portals
    html = generate_runtime_html(
        course.title,
        course_def,
        inline_assets=False,
        runtime_js_path=runtime_js_name,
        course_data_js_path=course_data_js_name,
    )
    runtime_js = _get_runtime_js()
    course_data_js = f"window.__CF_COURSE_DATA = {json.dumps(course_def, separators=(',', ':'))};"

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", html)
        z.writestr("imsmanifest.xml", manifest)
        z.writestr(runtime_js_name, runtime_js)
        z.writestr(course_data_js_name, course_data_js)

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


@router.post("/export/scorm-2004")
async def export_scorm_2004(course: CourseData):
    buffer = io.BytesIO()
    runtime_js_name = "runtime.js"
    course_data_js_name = "course-data.js"

    course_def = build_course_definition(course.title, course.blocks, theme=course.theme, policy={
        "passingScore": course.policy.passingScore,
        "maxAttempts":  course.policy.maxAttempts,
        "lockOnPass":   course.policy.lockOnPass,
        "lockOnExhaust": course.policy.lockOnExhaust,
    })

    media_files = {}
    _extract_media_from_course(course_def, media_files)

    manifest = generate_manifest_scorm2004(
        course.title,
        media_files=list(media_files.keys()) + [runtime_js_name, course_data_js_name],
    )

    html = generate_runtime_html(
        course.title,
        runtime_js_path=runtime_js_name,
        course_data_js_path=course_data_js_name,
    )
    runtime_js = _get_runtime_js()
    course_data_js = f"window.__CF_COURSE_DATA = {json.dumps(course_def, separators=(',', ':'))};"

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", html)
        z.writestr("imsmanifest.xml", manifest)
        z.writestr(runtime_js_name, runtime_js)
        z.writestr(course_data_js_name, course_data_js)

        for fname, fbytes in media_files.items():
            z.writestr(fname, fbytes)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{course.title}_scorm_2004.zip"'}
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

    def package_audio_source(raw_src: str | None, fallback_name: str) -> str | None:
        if not raw_src:
            return None

        if raw_src.startswith("data:"):
            match = re.match(r"data:([\w/+.-]+);base64,(.*)", raw_src, re.DOTALL)
            if not match:
                return None
            mime, b64_data = match.group(1), match.group(2)
            fname = f"media/{fallback_name}.{_mime_to_ext(mime)}"
            try:
                media_files[fname] = base64.b64decode(b64_data)
                return fname
            except Exception:
                return None

        if raw_src.startswith("http://") or raw_src.startswith("https://"):
            try:
                response = requests.get(raw_src, timeout=20)
                response.raise_for_status()
                mime = response.headers.get("Content-Type", "audio/mpeg").split(";")[0]
                fname = f"media/{fallback_name}.{_mime_to_ext(mime)}"
                media_files[fname] = response.content
                return fname
            except Exception:
                return None

        return None

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
            if not bg_audio.get("src"):
                packaged_src = package_audio_source(
                    bg_audio.get("src") or bg_audio.get("url"),
                    f"bg_audio_slide_{slide_idx}",
                )
                if packaged_src:
                    bg_audio["src"] = packaged_src

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
                    else:
                        packaged_src = package_audio_source(comp.get("src"), f"audio_{media_id or media_counter}")
                        if packaged_src:
                            comp["src"] = packaged_src
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


def _generate_tincan_xml(title: str, activity_id: str, launch_path: str = "launch.html") -> str:
    safe_title = html.escape(title)
    safe_activity_id = html.escape(activity_id, quote=True)
    safe_launch_path = html.escape(launch_path, quote=True)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<tincan xmlns="http://projecttincan.com/tincan.xsd">
  <activities>
    <activity id="{safe_activity_id}" type="http://adlnet.gov/expapi/activities/course">
      <name lang="en-US">{safe_title}</name>
      <description lang="en-US">{safe_title}</description>
      <launch lang="en-US">{safe_launch_path}</launch>
    </activity>
  </activities>
</tincan>"""


def _generate_xapi_launch_html(title: str, target_path: str = "index.html") -> str:
    safe_title = html.escape(title)
    safe_target_path = html.escape(target_path, quote=True)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{safe_title}</title>
</head>
<body style="font-family:sans-serif;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
<p>Launching course...</p>
<script>
(function() {{
  var target = "{safe_target_path}";
  var qs = window.location.search || "";
  var hash = window.location.hash || "";
  window.location.replace(target + qs + hash);
}})();
</script>
</body>
</html>"""


def _generate_xapi_bridge_js(title: str, activity_id: str, passing_score: float) -> str:
    safe_title = json.dumps(title)
    safe_activity_id = json.dumps(activity_id)
    resolved_passing_score = max(0, min(100, round(float(passing_score or 0))))
    return f"""
(function() {{
  'use strict';

  function parseLaunchConfig() {{
    var params = new URLSearchParams(window.location.search || '');
    var rawActor = params.get('actor');
    var actor = null;

    if (rawActor) {{
      try {{
        actor = JSON.parse(rawActor);
      }} catch (err) {{
        try {{
          actor = JSON.parse(decodeURIComponent(rawActor));
        }} catch (_) {{
          actor = null;
        }}
      }}
    }}

    if (!actor) {{
      actor = {{
        objectType: 'Agent',
        mbox: 'mailto:learner@example.com',
        name: 'Learner'
      }};
    }}

    return {{
      endpoint: params.get('endpoint') || '',
      auth: params.get('auth') || '',
      actor: actor,
      registration: params.get('registration') || '',
      activityId: params.get('activity_id') || {safe_activity_id},
      activityTitle: {safe_title},
      passingScore: {resolved_passing_score}
    }};
  }}

  function sendStatement(config, verbId, verbDisplay, result) {{
    if (!config.endpoint || !config.auth) return;

    var statement = {{
      actor: config.actor,
      verb: {{
        id: verbId,
        display: {{ 'en-US': verbDisplay }}
      }},
      object: {{
        id: config.activityId,
        objectType: 'Activity',
        definition: {{
          name: {{ 'en-US': config.activityTitle }},
          type: 'http://adlnet.gov/expapi/activities/course'
        }}
      }}
    }};

    if (config.registration) {{
      statement.context = {{ registration: config.registration }};
    }}

    if (result) {{
      statement.result = result;
    }}

    fetch(config.endpoint, {{
      method: 'POST',
      headers: {{
        'Content-Type': 'application/json',
        'X-Experience-API-Version': '1.0.3',
        'Authorization': config.auth
      }},
      body: JSON.stringify(statement)
    }}).catch(function(err) {{
      console.warn('[xAPI] Statement send failed:', err);
    }});
  }}

  var config = parseLaunchConfig();
  window.__CF_XAPI_CONFIG = config;
  window.__CF_XAPI_REPORT_COMPLETION = function(scoreRaw) {{
    var rounded = Math.round(Number(scoreRaw) || 0);
    var passed = rounded >= config.passingScore;
    var result = {{
      score: {{
        raw: rounded,
        min: 0,
        max: 100,
        scaled: rounded / 100
      }},
      success: passed,
      completion: true
    }};

    sendStatement(config, 'http://adlnet.gov/expapi/verbs/completed', 'completed', result);
    sendStatement(
      config,
      passed ? 'http://adlnet.gov/expapi/verbs/passed' : 'http://adlnet.gov/expapi/verbs/failed',
      passed ? 'passed' : 'failed',
      result
    );
  }};

  document.addEventListener('DOMContentLoaded', function() {{
    sendStatement(config, 'http://adlnet.gov/expapi/verbs/initialized', 'initialized', null);
  }});
}})();
""".strip()


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
    safe_id = re.sub(r"\s+", "_", course.title.strip()) or "courseforge_course"
    runtime_js_name = "runtime.js"
    course_data_js_name = "course-data.js"
    xapi_bridge_js_name = "xapi-bridge.js"
    launch_html_name = "launch.html"
    tincan_xml_name = "tincan.xml"
    activity_id = f"http://courseforge.com/{safe_id}"

    course_def = build_course_definition(course.title, course.blocks, theme=course.theme, policy={
        "passingScore": course.policy.passingScore,
        "maxAttempts":  course.policy.maxAttempts,
        "lockOnPass":   course.policy.lockOnPass,
        "lockOnExhaust": course.policy.lockOnExhaust,
    })

    media_files: Dict[str, bytes] = {}
    _extract_media_from_course(course_def, media_files)

    html = generate_runtime_html(
        course.title,
        course_def,
        inline_assets=False,
        runtime_js_path=runtime_js_name,
        course_data_js_path=course_data_js_name,
        extra_script_paths=[xapi_bridge_js_name],
    )
    runtime_js = _get_runtime_js()
    course_data_js = f"window.__CF_COURSE_DATA = {json.dumps(course_def, separators=(',', ':'))};"
    xapi_bridge_js = _generate_xapi_bridge_js(course.title, activity_id, course.policy.passingScore)
    launch_html = _generate_xapi_launch_html(course.title, "index.html")
    tincan_xml = _generate_tincan_xml(course.title, activity_id, launch_html_name)

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", html)
        z.writestr(runtime_js_name, runtime_js)
        z.writestr(course_data_js_name, course_data_js)
        z.writestr(xapi_bridge_js_name, xapi_bridge_js)
        z.writestr(launch_html_name, launch_html)
        z.writestr(tincan_xml_name, tincan_xml)
        for fname, fbytes in media_files.items():
            z.writestr(fname, fbytes)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_id}_xapi.zip"'}
    )
