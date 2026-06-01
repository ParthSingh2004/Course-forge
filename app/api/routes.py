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
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal, Union
from dotenv import load_dotenv
import google.generativeai as genai
import time
import random
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

genai.configure(api_key=api_key, transport="rest")
model = genai.GenerativeModel('gemini-3.5-flash')
pro_model = genai.GenerativeModel('gemini-3.5-flash')

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
                f'<div style="position:absolute;left:{left}%;top:{top}%;display:block;min-width:100px;z-index:10;">'
                f'<div style="min-width:90px;background:transparent;border:none;border-radius:0;backdrop-filter:none;-webkit-backdrop-filter:none;">'
                f'<div style="font-size:15px;line-height:1.7;color:#1a1a1a;min-width:140px;min-height:1.6em;text-shadow:0 1px 2px rgba(255,255,255,0.7);">{layer.get("content","")}</div>'
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
            open_attr = ""
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
        _h_size = {"h1": "3rem", "h2": "1.875rem", "h3": "1.125rem"}.get(heading_tag, "1rem")
        _h_weight = {"h1": "800", "h2": "700", "h3": "600"}.get(heading_tag, "600")
        _h_line = {"h1": "1.1", "h2": "1.2", "h3": "1.3"}.get(heading_tag, "1.3")
        return f'<{heading_tag} style="font-family:sans-serif;font-size:{_h_size};font-weight:{_h_weight};line-height:{_h_line};margin-bottom:12px;">{content}</{heading_tag}>'

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
        # 1. Slide-level bgAudio
        bg_audio = slide.get("bgAudio")
        if bg_audio and bg_audio.get("url", "").startswith("data:"):
            audio_url = bg_audio["url"]
            media_id = bg_audio.get("mediaId")
            
            try:
                header, b64_data = audio_url.split(",", 1)
                mime_type = header.split(";")[0].split(":")[1]
                audio_bytes = base64.b64decode(b64_data)
                
                if not media_id:
                    media_id = uuid.uuid4().hex
                    bg_audio["mediaId"] = media_id
                    
                ext = mime_type.split("/")[-1] if "/" in mime_type else "mp3"
                filename = f"audio_{media_id}.{ext}"
                
                _MEDIA_STORE[media_id] = {
                    "filename": filename,
                    "bytes": audio_bytes,
                    "mime": mime_type,
                }
                
                bg_audio["url"] = f"/api/media/{media_id}"
            except Exception as e:
                print(f"Failed to wire PPTX slide bgAudio to media store: {e}")

        # 2. Canvas items / Slide elements level audio
        all_objs = slide.get("elements", []) + slide.get("items", [])
        for element in all_objs:
            audio_url = element.get("audioUrl") or element.get("src")
            if element.get("type") == "audio" and audio_url and audio_url.startswith("data:"):
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
                    
                    if "audioUrl" in element:
                        element["audioUrl"] = f"/api/media/{media_id}"
                    if "src" in element:
                        element["src"] = f"/api/media/{media_id}"
                except Exception as e:
                    print(f"Failed to wire PPTX item audio to media store: {e}")
                    
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
# AI COURSE GENERATOR & SCHEMAS
# ---------------------------------------------------------------------------

class NestedItem(BaseModel):
    text: str = Field(..., description="Title/text or left-side item")
    secondaryText: str = Field(..., description="Description/content or right-side item")


class MatrixRow(BaseModel):
    cells: Optional[List[str]] = Field(None, description="List of cell values in this row or column")
    items: Optional[List[str]] = Field(None, description="List of cell values in this row or column")


class GeneratedContentBlock(BaseModel):
    type: str = Field(
        ...,
        description="Block type. Allowed: 'heading', 'text', 'image', 'button', 'quiz', 'true_false', 'fill_blanks', 'multi_select', 'matching', 'flashcard', 'quote', 'process', 'tabs', 'accordion', 'list', 'table', 'columns'"
    )
    text: Optional[str] = Field(..., description="Primary text content. For headings, paragraph text, buttons, quotes. For 'quiz', 'true_false', 'fill_blanks', 'multi_select', 'matching', this MUST be the question text (or statement text for true_false). For 'flashcard', this is the front text of the card.")
    secondaryText: Optional[str] = Field(..., description="Secondary text content. For quote author, heading level (like 'h1'/'h2'/'h3'), button alignment/target. For 'flashcard', this is the back text of the card.")
    items: Optional[List[str]] = Field(..., description="Choices or options array. For tables, this represents column headers. For 'quiz' and 'multi_select', this MUST be the array of 3 to 5 options/choices for the question in this block.")
    answerIndex: Optional[int] = Field(..., description="Correct option index (0-based) for quiz.")
    answerBool: Optional[bool] = Field(..., description="Correct answer for true/false.")
    answerIndices: Optional[List[int]] = Field(..., description="Correct option indices (0-based) for multi_select.")
    nestedItems: Optional[List[NestedItem]] = Field(..., description="Nested pairs (steps for process, tabs for tabs, topics for accordion, left/right items for matching).")
    matrix: Optional[List[MatrixRow]] = Field(..., description="List of rows/columns. For table: each row has a list of string cells. For columns: each column has a list of paragraph text strings.")
    imagePrompt: Optional[str] = Field(None, description="AI image generation prompt.")
    unsplashQuery: Optional[str] = Field(None, description="Unsplash stock search query.")


class GeneratedCanvasItem(BaseModel):
    type: str = Field(..., description="Canvas element type: 'rect', 'circle', 'triangle', 'text', 'image'")
    x: float = Field(..., description="X coordinate as percentage (0 to 100) relative to the slide canvas.")
    y: float = Field(..., description="Y coordinate as percentage (0 to 100) relative to the slide canvas.")
    w: float = Field(..., description="Width as percentage (5 to 100).")
    h: float = Field(..., description="Height as percentage (5 to 100).")
    color: str = Field("#3b82f6", description="Hex color code for shape or text color.")
    text: Optional[str] = Field(None, description="Text content (only for type='text').")
    fontSize: Optional[int] = Field(16, description="Font size in pixels (only for type='text').")
    imagePrompt: Optional[str] = Field(None, description="Image generation prompt (only for type='image').")
    unsplashQuery: Optional[str] = Field(None, description="Unsplash search query (only for type='image').")


class GeneratedSlide(BaseModel):
    type: str = Field("slide", description="Slide layout type. Use 'slide' for normal vertical block scrolling, or 'canvas' for coordinate-based infographic elements.")
    title: str = Field(..., description="Slide title.")
    backgroundColor: str = Field("#ffffff", description="Hex color code for the slide background. Pick a beautiful, subtle, soft color (soft pastel or dark theme background) that matches the slide's topic and course theme.")
    elements: List[GeneratedContentBlock] = Field(default=[], description="Blocks list (must be populated with 2 to 4 content blocks if type is 'slide', otherwise empty list).")
    canvasBg: str = Field("#ffffff", description="Hex color for canvas background (only if type is 'canvas').")
    canvasItems: List[GeneratedCanvasItem] = Field(default=[], description="List of items on the canvas (must be populated with infographic elements if type is 'canvas', otherwise empty list).")


class GeneratedCourse(BaseModel):
    courseTitle: str = Field(..., description="The overall title of the course.")
    passingScore: int = Field(70, description="Passing score percentage (0-100).")
    slides: List[GeneratedSlide] = Field(..., description="List of slides.")


class BlockOutline(BaseModel):
    type: str = Field(
        ...,
        description="Block type: 'heading', 'text', 'image', 'button', 'quiz', 'true_false', 'fill_blanks', 'multi_select', 'matching', 'flashcard', 'quote', 'process', 'tabs', 'accordion', 'list', 'table', 'columns'"
    )
    focus: str = Field(
        ...,
        description="A short 1-sentence summary of the educational focus, concept, or question for this block."
    )


class CanvasItemOutline(BaseModel):
    type: str = Field(..., description="Canvas element type: 'rect', 'circle', 'triangle', 'text', 'image'")
    purpose: str = Field(..., description="A short description of the item's role in the infographic layout (e.g., 'Container for step 1 description', 'Step 1 number label', etc.)")
    color: str = Field("#3b82f6", description="Hex color code.")


class SlideOutline(BaseModel):
    type: str = Field("slide", description="Slide layout type. Use 'slide' for normal vertical block scrolling, or 'canvas' for coordinate-based infographic elements.")
    title: str = Field(..., description="Slide title.")
    backgroundColor: str = Field("#ffffff", description="Hex color code for the slide background.")
    elements: List[BlockOutline] = Field(default=[], description="List of block outlines (only if type is 'slide', otherwise empty list).")
    canvasBg: str = Field("#ffffff", description="Hex color for canvas background (only if type is 'canvas').")
    canvasItems: List[CanvasItemOutline] = Field(default=[], description="List of canvas item outlines (only if type is 'canvas', otherwise empty list).")


class CourseOutline(BaseModel):
    courseTitle: str = Field(..., description="The overall title of the course.")
    passingScore: int = Field(70, description="Passing score percentage (0-100).")
    slides: List[SlideOutline] = Field(..., description="List of slides.")



class GenerateCourseRequest(BaseModel):
    prompt: str
    num_slides: int
    image_type: str  # "ai" or "unsplash"


def generate_react_id(prefix: str = "id") -> str:
    import random
    import time
    rand_part = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=6))
    return f"{prefix}_{int(time.time())}_{rand_part}"


def _fetch_unsplash_base64(query: str) -> str | None:
    try:
        client_id = os.getenv("NEXT_PUBLIC_UNSPLASH_ACCESS_KEY", "MGjPRsN98K3iYFnC8T_XqwV3oVZApm9x9IoZjhlTfeQ")
        search_url = "https://api.unsplash.com/search/photos"
        resp = requests.get(search_url, params={"query": query, "client_id": client_id, "per_page": 1}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if results:
            img_url = results[0].get("urls", {}).get("regular") or results[0].get("urls", {}).get("small")
            if img_url:
                download_location = results[0].get("links", {}).get("download_location")
                if download_location:
                    try:
                        requests.get(download_location, params={"client_id": client_id}, timeout=5)
                    except Exception:
                        pass
                img_resp = requests.get(img_url, timeout=10)
                img_resp.raise_for_status()
                content_type = img_resp.headers.get("Content-Type", "image/jpeg")
                b64 = base64.b64encode(img_resp.content).decode("utf-8")
                return f"data:{content_type};base64,{b64}"
    except Exception as e:
        print(f"Error fetching Unsplash image for '{query}': {e}")
    return None


def _generate_imagen_base64(prompt: str) -> str | None:
    try:
        key = os.getenv("ENTERPRISE_GEMINI_IMAGE_KEY")
        if not key:
            return None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key={key}"
        payload = {
            "instances": [{"prompt": prompt}],
            "parameters": {"sampleCount": 1}
        }
        resp = requests.post(url, json=payload, timeout=20)
        if resp.ok:
            data = resp.json()
            predictions = data.get("predictions", [])
            if predictions:
                b64_str = predictions[0].get("bytesBase64Encoded")
                if b64_str:
                    return f"data:image/png;base64,{b64_str}"
        else:
            print(f"Imagen API failed: {resp.text}")
    except Exception as e:
        print(f"Error generating Imagen image for '{prompt}': {e}")
    return None


def normalize_block_dict(block: dict) -> dict:
    """Pre-process block dict to handle field mapping variations and synonyms from Gemini."""
    if not isinstance(block, dict):
        return block
        
    # Standardize block type name
    b_type = str(block.get("type", "")).lower().strip()
    block["type"] = b_type
    
    # Ensure text and secondaryText are strings if present
    if "text" in block and block["text"] is not None:
        block["text"] = str(block["text"])
    if "secondaryText" in block and block["secondaryText"] is not None:
        block["secondaryText"] = str(block["secondaryText"])

    # Handle items
    if "items" in block and block["items"] is not None:
        if isinstance(block["items"], (str, int, float, bool)):
            block["items"] = [str(block["items"])]
        elif isinstance(block["items"], list):
            block["items"] = [str(x) for x in block["items"]]
            
    # Handle answerIndex
    if "answerIndex" in block and block["answerIndex"] is not None:
        try:
            block["answerIndex"] = int(block["answerIndex"])
        except (ValueError, TypeError):
            block["answerIndex"] = 0
            
    # Handle answerBool
    if "answerBool" in block and block["answerBool"] is not None:
        if isinstance(block["answerBool"], str):
            block["answerBool"] = block["answerBool"].lower().strip() in ("true", "1", "yes")
        else:
            block["answerBool"] = bool(block["answerBool"])
            
    # Handle answerIndices
    if "answerIndices" in block and block["answerIndices"] is not None:
        if isinstance(block["answerIndices"], (int, str)):
            try:
                block["answerIndices"] = [int(block["answerIndices"])]
            except (ValueError, TypeError):
                block["answerIndices"] = [0]
        elif isinstance(block["answerIndices"], list):
            normalized_indices = []
            for x in block["answerIndices"]:
                try:
                    normalized_indices.append(int(x))
                except (ValueError, TypeError):
                    pass
            block["answerIndices"] = normalized_indices

    # Handle nestedItems synonym keys
    if "nestedItems" in block and isinstance(block["nestedItems"], list):
        normalized_nested = []
        for item in block["nestedItems"]:
            if isinstance(item, dict):
                # Map various synonym fields to Pydantic:
                text_val = item.get("text") or item.get("title") or item.get("left") or item.get("leftItem") or item.get("label") or item.get("name") or ""
                sec_val = item.get("secondaryText") or item.get("content") or item.get("right") or item.get("rightItem") or item.get("value") or item.get("description") or ""
                normalized_nested.append({
                    "text": str(text_val),
                    "secondaryText": str(sec_val)
                })
            else:
                # Wrap primitive string/number as standard nestedItem dictionary
                normalized_nested.append({
                    "text": str(item),
                    "secondaryText": ""
                })
        block["nestedItems"] = normalized_nested
        
    # Handle matrix synonym keys
    if "matrix" in block and isinstance(block["matrix"], list):
        normalized_matrix = []
        for row in block["matrix"]:
            if isinstance(row, dict):
                cells_val = row.get("cells") or row.get("items") or []
                if isinstance(cells_val, str):
                    cells_val = [cells_val]
                elif isinstance(cells_val, list):
                    cells_val = [str(c) for c in cells_val]
                normalized_matrix.append({
                    "cells": cells_val,
                    "items": cells_val
                })
            elif isinstance(row, list):
                cells_val = [str(c) for c in row]
                normalized_matrix.append({
                    "cells": cells_val,
                    "items": cells_val
                })
            else:
                # Wrap primitive type (e.g. string) as standard matrix row cells
                cells_val = [str(row)]
                normalized_matrix.append({
                    "cells": cells_val,
                    "items": cells_val
                })
        block["matrix"] = normalized_matrix
        
    return block


def map_content_block(b: GeneratedContentBlock, image_type: str) -> Dict[str, Any]:
    block_type = b.type.lower().replace("-", "_")
    
    TYPE_SYNONYMS = {
        "mcq": "quiz", "multiple_choice": "quiz",
        "paragraph": "text", "body": "text", "description": "text",
        "accordian": "accordion", "accordion_block": "accordion",
        "step": "process", "steps": "process",
        "tab": "tabs", "tabbed": "tabs",
        "card": "flashcard", "flip_card": "flashcard",
        "tf": "true_false", "truefalse": "true_false",
        "fitb": "fill_blanks", "fill_blank": "fill_blanks",
        "match": "matching", "pairs": "matching",
        "h1": "heading", "h2": "heading", "h3": "heading",
        "header": "heading", "title": "heading",
        "grid": "table", "matrix": "table",
        "col": "columns", "column": "columns",
        "img": "image", "photo": "image",
        "blockquote": "quote", "citation": "quote",
    }
    block_type = TYPE_SYNONYMS.get(block_type, block_type)
        
    mapped = {
        "id": generate_react_id("block"),
        "type": block_type
    }
    
    if block_type in ("heading", "heading_1"):
        mapped["type"] = "heading"
        mapped["content"] = b.text or "Heading"
        mapped["headingLevel"] = b.secondaryText or "h1"
    elif block_type == "text":
        mapped["content"] = b.text or ""
    elif block_type == "image":
        mapped["content"] = ""
        if image_type == "unsplash" and b.unsplashQuery:
            print(f"[AI Generator] Searching stock photo on Unsplash for: '{b.unsplashQuery}'")
            b64 = _fetch_unsplash_base64(b.unsplashQuery)
            if b64:
                mapped["content"] = b64
                print("[AI Generator] Stock photo fetched successfully.")
        elif image_type == "ai" and b.imagePrompt:
            print(f"[AI Generator] Generating image with Imagen for: '{b.imagePrompt}'")
            b64 = _generate_imagen_base64(b.imagePrompt)
            if b64:
                mapped["content"] = b64
                print("[AI Generator] AI Image generated successfully.")
    elif block_type == "button":
        mapped["content"] = b.text or "Click Here"
        mapped["targetSlideId"] = ""
        mapped["alignment"] = b.secondaryText or "center"
    elif block_type == "quiz":
        mapped["question"] = b.text or ""
        mapped["options"] = b.items or ["Option 1", "Option 2", "Option 3"]
        mapped["correctAnswer"] = b.answerIndex or 0
        mapped["marks"] = 10
        mapped["questionImage"] = None
    elif block_type == "true_false":
        mapped["question"] = b.text or ""
        mapped["correctAnswer"] = b.answerBool if b.answerBool is not None else True
        mapped["marks"] = 10
    elif block_type == "fill_blanks":
        mapped["question"] = b.text or "Fill in the blank ____"
        answers = b.items or [""]
        mapped["answers"] = answers
        mapped["answer"] = answers[0] if answers else ""
        mapped["caseSensitive"] = False
        mapped["marks"] = 10
    elif block_type == "multi_select":
        mapped["question"] = b.text or ""
        options = b.items or ["Option 1", "Option 2", "Option 3"]
        mapped["options"] = options
        correct_indices = b.answerIndices or []
        correct_answers = [str(i) for i in correct_indices if i < len(options)]
        mapped["correctAnswer"] = correct_answers
        mapped["marks"] = 10
    elif block_type == "matching":
        mapped["question"] = b.text or ""
        pairs = []
        if b.nestedItems:
            for item in b.nestedItems:
                pairs.append({
                    "leftItem": item.text,
                    "rightItem": item.secondaryText
                })
        else:
            pairs = [{"leftItem": "A", "rightItem": "B"}]
        mapped["pairs"] = pairs
        mapped["marks"] = 10
    elif block_type == "flashcard":
        mapped["front"] = b.text or ""
        mapped["back"] = b.secondaryText or ""
    elif block_type == "quote":
        mapped["content"] = b.text or ""
        mapped["author"] = b.secondaryText or ""
        mapped["layout"] = "below-left"
        mapped["bgOverlay"] = 0.45
    elif block_type == "process":
        steps = []
        if b.nestedItems:
            for item in b.nestedItems:
                steps.append({
                    "title": item.text,
                    "content": item.secondaryText
                })
        mapped["steps"] = steps
    elif block_type == "tabs":
        tabs = []
        if b.nestedItems:
            for item in b.nestedItems:
                tabs.append({
                    "title": item.text,
                    "content": item.secondaryText,
                    "image": None
                })
        mapped["tabs"] = tabs
    elif block_type == "accordion":
        topics = []
        if b.nestedItems:
            for item in b.nestedItems:
                topics.append({
                    "id": generate_react_id("topic"),
                    "title": item.text,
                    "items": [{
                        "id": generate_react_id("accordionitem"),
                        "type": "text",
                        "value": item.secondaryText
                    }]
                })
        mapped["topics"] = topics
    elif block_type == "list":
        mapped["items"] = b.items or [""]
    elif block_type == "table":
        mapped["headers"] = b.items or ["Col 1", "Col 2"]
        rows = []
        if b.matrix:
            for row in b.matrix:
                rows.append(row.cells or row.items or [])
        mapped["rows"] = rows or [["", ""]]
        mapped["tableColor"] = "#ffffff"
        mapped["headerColor"] = "#d5b4b4"
    elif block_type == "columns":
        columns = []
        if b.matrix:
            for col in b.matrix:
                col_blocks = []
                cells = col.cells or col.items or []
                for text in cells:
                    col_blocks.append({
                        "id": generate_react_id("subblock"),
                        "type": "text",
                        "content": text
                    })
                columns.append(col_blocks)
        mapped["columns"] = columns
    else:
        # Unknown/unhandled block type — fallback to text block
        mapped["type"] = "text"
        mapped["content"] = b.text or b.secondaryText or ""
        print(f"[AI Generator] Unknown block type '{b.type}' (resolved to '{block_type}') — fallback to text block", flush=True)
        
    return mapped


def map_canvas_item(item: GeneratedCanvasItem, image_type: str) -> Dict[str, Any]:
    mapped = {
        "id": generate_react_id("canvasitem"),
        "type": item.type,
        "x": max(0.0, min(100.0, float(item.x))),
        "y": max(0.0, min(100.0, float(item.y))),
        "w": max(5.0, min(100.0, float(item.w))),
        "h": max(5.0, min(100.0, float(item.h))),
        "color": item.color or "#111827",
        "rotation": 0,
        "animation": "none",
        "animationDelay": 0,
    }
    
    if item.type == "text":
        mapped["text"] = item.text or "Text"
        mapped["fontSize"] = item.fontSize or 16
        mapped["fontFamily"] = "inherit"
        mapped["fontWeight"] = "normal"
        mapped["fontStyle"] = "normal"
        mapped["textDecoration"] = "none"
        mapped["textAlign"] = "left"
        mapped["lineHeight"] = 1.5
        mapped["letterSpacing"] = 0
        mapped["boxBg"] = "#ffffff"
        mapped["boxBgOpacity"] = 0
    elif item.type == "image":
        mapped["src"] = ""
        if image_type == "unsplash" and item.unsplashQuery:
            print(f"[AI Generator] Searching stock photo on Unsplash for canvas: '{item.unsplashQuery}'")
            b64 = _fetch_unsplash_base64(item.unsplashQuery)
            if b64:
                mapped["src"] = b64
                print("[AI Generator] Canvas stock photo fetched successfully.")
        elif image_type == "ai" and item.imagePrompt:
            print(f"[AI Generator] Generating canvas image with Imagen for: '{item.imagePrompt}'")
            b64 = _generate_imagen_base64(item.imagePrompt)
            if b64:
                mapped["src"] = b64
                print("[AI Generator] Canvas AI Image generated successfully.")
                
    return mapped

def pydantic_to_gemini_schema(model_class) -> Dict[str, Any]:
    """
    Recursively convert Pydantic schema to Gemini-compliant dict schema.
    Resolves `$defs` and `$ref` references, and strips unsupported keys like 'default'.
    """
    if hasattr(model_class, "model_json_schema"):
        raw = model_class.model_json_schema()
    else:
        raw = model_class.schema()
        
    defs = raw.get("$defs", raw.get("definitions", {}))
    
    def resolve_and_clean(item):
        if not isinstance(item, dict):
            return item
            
        # Resolve $ref
        if "$ref" in item:
            ref_path = item["$ref"]
            ref_name = ref_path.split("/")[-1]
            ref_schema = defs.get(ref_name, {})
            # Merge ref schema properties
            merged = {**item, **ref_schema}
            del merged["$ref"]
            return resolve_and_clean(merged)
            
        # Before cleaning, resolve anyOf (Pydantic v2 Optional pattern)
        if "anyOf" in item:
            for variant in item["anyOf"]:
                resolved = resolve_and_clean(variant)
                if isinstance(resolved, dict) and resolved.get("type") != "null":
                    # Merge description from parent item if not in resolved
                    if "description" in item and "description" not in resolved:
                        resolved["description"] = item["description"]
                    resolved["nullable"] = True
                    return resolved
            # Fallback if only null or empty
            return {"type": "string", "nullable": True, "description": item.get("description", "")}
            
        cleaned = {}
        # Only keep Gemini Schema supported keys
        allowed_keys = {"type", "description", "properties", "required", "items", "enum", "nullable"}
        for k, v in item.items():
            if k in allowed_keys:
                if k == "properties":
                    cleaned[k] = {prop_name: resolve_and_clean(prop_val) for prop_name, prop_val in v.items()}
                elif k == "items":
                    cleaned[k] = resolve_and_clean(v)
                else:
                    # In python dict schemas, type value must be standard (e.g. object, string, etc.)
                    cleaned[k] = v
                    
        return cleaned

    return resolve_and_clean(raw)


def repair_json_string(s: str) -> str:
    """Attempt to repair a truncated or malformed JSON string by closing open braces, brackets, and quotes."""
    s = s.strip()
    if not s:
        return "{}"
        
    # Remove trailing commas that might cause parse failure
    s = re.sub(r',\s*$', '', s)
    
    in_string = False
    escape = False
    stack = []
    
    i = 0
    clean_chars = []
    
    while i < len(s):
        char = s[i]
        
        if escape:
            clean_chars.append(char)
            escape = False
            i += 1
            continue
            
        if char == '\\':
            clean_chars.append(char)
            escape = True
            i += 1
            continue
            
        if char == '"':
            in_string = not in_string
            clean_chars.append(char)
            i += 1
            continue
            
        if not in_string:
            if char in ('{', '['):
                stack.append(char)
            elif char in ('}', ']'):
                if stack:
                    top = stack[-1]
                    if (char == '}' and top == '{') or (char == ']' and top == '['):
                        stack.pop()
        clean_chars.append(char)
        i += 1
        
    repaired = "".join(clean_chars)
    
    if in_string:
        repaired += '"'
        
    while stack:
        top = stack.pop()
        if top == '{':
            repaired += '}'
        elif top == '[':
            repaired += ']'
            
    # Remove trailing comma before closing brace or bracket
    repaired = re.sub(r',\s*([}\]])', r'\1', repaired)
    
    return repaired


@router.post("/ai/generate-course")
async def generate_course(req: GenerateCourseRequest):
    try:
        print(f"\n--- AI COURSE GENERATOR REQUEST ---", flush=True)
        print(f"Prompt: {req.prompt}", flush=True)
        print(f"Slides count: {req.num_slides}", flush=True)
        print(f"ImageType selection: {req.image_type}", flush=True)

        outline_system_instruction = (
            "You are CourseForge AI, an expert instructional designer. "
            "Your task is to generate a high-level course outline (schema/structure) for a slide-based course "
            "conforming strictly to the requested CourseOutline schema.\n"
            "Design instructions:\n"
            "1. Structure the slides in a logical learning progression.\n"
            "2. Mix block types for variety across slides: use heading, text, flashcards, accordions, quizzes, tables, and canvas slides. DO NOT generate list blocks (type: 'list') under any circumstances.\n"
            "3. Set a beautiful, tailored background color that is the exact same single relevant color across every single slide in the course. Make it preferable to use strong, visible colors instead of very light colors.\n"
            "4. For canvas slides (type: 'canvas'), define the outline of elements (rect, circle, triangle, text, etc.) and their purpose. Do not generate 'image' items on canvas slides.\n"
            "5. Place a quiz, true_false, or matching assessment slide at the end of the course to verify understanding."
        )

        expansion_system_instruction = (
            "You are CourseForge AI, an expert instructional designer. "
            "Your task is to take a high-level CourseOutline structure and expand it into a fully populated, comprehensive slide-based course "
            "conforming strictly to the requested GeneratedCourse schema.\n"
            "Expansion instructions:\n"
            "1. You must follow the provided slide titles, slide types, block types, and canvas items specified in the outline. Expand each item's focus/purpose into rich, educational content.\n"
            "2. Keep the content educational, accurate, and detailed. Do not leave text blocks empty.\n"
            "3. For normal slides (type: 'slide'), map elements as specified by the block type. Do not generate list blocks (type: 'list').\n"
            "4. For canvas slides (type: 'canvas'), lay out elements on a 100x100 grid. Assign x, y coordinates and w, h sizes. Use 'text' items for captions/labels, and 'rect' or 'circle' for visual frames/containers. Do not generate 'image' items on canvas slides. For all canvas text and shape elements, implement only 1 matching font/stroke color that contrasts clearly with the slide's background color.\n"
            "5. You MUST generate correct options and correct answers for all quiz, true_false, multi_select, matching, and fill_blanks blocks. For quiz and multi_select, always generate 3 to 5 options in the 'items' list and output the correct index/indices. Never leave them empty. For 'true_false' blocks, the question text MUST be a direct statement rather than a question.\n"
            "6. For 'text' blocks, write at least 2-3 detailed sentences (40+ words) explaining the concept. Never generate single-sentence text blocks. Corporate L&D content must be substantive and professional.\n"
            "7. For 'flashcard' blocks, you MUST populate BOTH fields: the 'text' field (front of the card - term, concept, or question) and the 'secondaryText' field (back of the card - definition, explanation, or answer). NEVER leave 'secondaryText' empty for flashcards.\n"
            "8. For 'fill_blanks' blocks, the 'text' field should contain the sentence with ____ as the blank placeholder, and the 'items' field should contain the list of correct answers (one per blank).\n"
            "9. For 'process', 'tabs', 'accordion', and 'matching' blocks, always generate at least 3 nestedItems entries. Each entry MUST have both 'text' and 'secondaryText' populated with meaningful content."
        )

        # For debugging, log prompt settings
        print(f"[AI Generator] Outline System Instruction:\n{outline_system_instruction}\n", flush=True)

        print("[AI Generator] Building outline schema...", flush=True)
        cleaned_outline_schema = pydantic_to_gemini_schema(CourseOutline)

        outline_course = None
        max_attempts = 2

        # Pass 1: Generate Outline
        for attempt in range(1, max_attempts + 1):
            try:
                current_temp = 0.2 if attempt == 1 else 0.0
                print(f"[AI Generator Pass 1] Calling Gemini 3.5 Flash for Outline (Attempt {attempt}/{max_attempts}, temp={current_temp})...", flush=True)
                
                model_instance = genai.GenerativeModel(
                    'gemini-3.5-flash',
                    system_instruction=outline_system_instruction
                )
                
                user_prompt_text = (
                    f"Please generate a course outline with exactly {req.num_slides} slides. "
                    f"The course topic/subject is: \"{req.prompt}\"."
                )
                
                response = model_instance.generate_content(
                    user_prompt_text,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=cleaned_outline_schema,
                        temperature=current_temp,
                    ),
                )
                
                text_content = response.text.strip()
                print(f"[AI Generator Pass 1] Response received (length: {len(text_content)} characters).", flush=True)
                
                if text_content.startswith("```json"):
                    text_content = text_content[len("```json"):]
                if text_content.endswith("```"):
                    text_content = text_content[:-len("```")]
                text_content = text_content.strip()
                
                try:
                    outline_course = json.loads(text_content, strict=False)
                except json.JSONDecodeError as je:
                    print(f"[AI Generator Pass 1] JSON parse failed: {je}. Attempting auto-repair...", flush=True)
                    repaired_text = repair_json_string(text_content)
                    outline_course = json.loads(repaired_text, strict=False)
                
                if not outline_course or not isinstance(outline_course, dict) or "slides" not in outline_course:
                    raise ValueError("Parsed JSON does not contain valid course outline slides data")
                break
            except Exception as e:
                print(f"[AI Generator Pass 1] Attempt {attempt} failed: {str(e)}", flush=True)
                if attempt == max_attempts:
                    raise e

        print(f"[AI Generator Pass 1] Outline parsed successfully: '{outline_course.get('courseTitle')}'", flush=True)

        # Pass 2: Content Expansion
        print("[AI Generator Pass 2] Building detailed course schema...", flush=True)
        cleaned_course_schema = pydantic_to_gemini_schema(GeneratedCourse)

        raw_course = None
        for attempt in range(1, max_attempts + 1):
            try:
                current_temp = 0.2 if attempt == 1 else 0.0
                print(f"[AI Generator Pass 2] Calling Gemini 3.5 Flash for Content Expansion (Attempt {attempt}/{max_attempts}, temp={current_temp})...", flush=True)
                
                model_instance = genai.GenerativeModel(
                    'gemini-3.5-flash',
                    system_instruction=expansion_system_instruction
                )
                
                outline_str = json.dumps(outline_course, indent=2)
                user_expansion_prompt = (
                    f"We are generating a course on the topic: \"{req.prompt}\".\n"
                    f"Here is the high-level course outline generated in Pass 1:\n"
                    f"```json\n{outline_str}\n```\n\n"
                    "Now, please expand this course outline into the final detailed course JSON conforming to the GeneratedCourse schema. "
                    "For each slide in the outline, preserve its type, title, and background color, and fully expand all elements and canvas items "
                    "with rich, professional educational content as outlined."
                )

                # Save the expansion prompt to scratch for debugging
                try:
                    os.makedirs("scratch", exist_ok=True)
                    with open("scratch/last_gemini_prompt.txt", "w", encoding="utf-8") as f:
                        f.write(f"SYSTEM:\n{expansion_system_instruction}\n\nUSER:\n{user_expansion_prompt}")
                except Exception:
                    pass
                
                response = model_instance.generate_content(
                    user_expansion_prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=cleaned_course_schema,
                        temperature=current_temp,
                        max_output_tokens=65536,
                    ),
                )
                
                text_content = response.text.strip()
                print(f"[AI Generator Pass 2] Response received (length: {len(text_content)} characters).", flush=True)
                
                if text_content.startswith("```json"):
                    text_content = text_content[len("```json"):]
                if text_content.endswith("```"):
                    text_content = text_content[:-len("```")]
                text_content = text_content.strip()
                
                try:
                    raw_course = json.loads(text_content, strict=False)
                except json.JSONDecodeError as je:
                    print(f"[AI Generator Pass 2] JSON parse failed: {je}. Attempting auto-repair...", flush=True)
                    repaired_text = repair_json_string(text_content)
                    raw_course = json.loads(repaired_text, strict=False)
                
                if not raw_course or not isinstance(raw_course, dict) or "slides" not in raw_course:
                    raise ValueError("Parsed JSON does not contain valid course slides data")
                break # Success!
                
            except Exception as e:
                print(f"[AI Generator] Attempt {attempt} failed: {str(e)}", flush=True)
                if attempt == max_attempts:
                    print(f"--- GENERATE COURSE CRASH ---\nRaw response text was:\n{response.text if 'response' in locals() else 'N/A'}", flush=True)
                    raise e

        print(f"[AI Generator] Course outline parsed: '{raw_course.get('courseTitle')}'", flush=True)
        print(f"[AI Generator] Mapping {len(raw_course.get('slides', []))} slides to CourseForge editor model...", flush=True)

        mapped_slides = []
        for slide in raw_course.get("slides", []):
            slide_type = slide.get("type", "slide")
            slide_title = slide.get("title") or "Untitled Slide"
            slide_bg = slide.get("backgroundColor") or slide.get("canvasBg") or "#ffffff"
            print(f"[AI Generator] Mapping slide: '{slide_title}' (Type: {slide_type}) with bg: '{slide_bg}'", flush=True)
            
            mapped_slide = {
                "id": generate_react_id("slide"),
                "title": slide_title,
                "type": slide_type,
                "background": {"type": "color", "value": slide_bg}
            }

            if slide_type == "canvas":
                mapped_slide["canvasBg"] = slide_bg
                canvas_items = []
                for item in slide.get("canvasItems") or []:
                    try:
                        canvas_items.append(map_canvas_item(GeneratedCanvasItem(**item), req.image_type))
                    except Exception as e:
                        print(f"[AI Generator] Skipping malformed canvas item {item}. Error: {e}", flush=True)
                mapped_slide["items"] = canvas_items
                mapped_slide["elements"] = []
            else:
                raw_blocks = []
                for block in slide.get("elements") or []:
                    try:
                        normalized = normalize_block_dict(block)
                        raw_blocks.append(GeneratedContentBlock(**normalized))
                    except Exception as e:
                        print(f"[AI Generator] Skipping malformed block {block}. Error: {e}", flush=True)
                
                # Merge fragmented quiz/multi_select blocks and prune empty ones
                merged_blocks = []
                idx = 0
                while idx < len(raw_blocks):
                    curr_b = raw_blocks[idx]
                    
                    # Fragmented block merging
                    if curr_b.type in ("quiz", "multi_select") and curr_b.text and (not curr_b.items or len(curr_b.items) == 0):
                        if idx + 1 < len(raw_blocks):
                            next_b = raw_blocks[idx + 1]
                            if next_b.type in (curr_b.type, "list") and next_b.items and len(next_b.items) > 0 and not next_b.text:
                                # Merge options/answers into the current block!
                                curr_b.items = next_b.items
                                if next_b.type in ("quiz", "multi_select"):
                                    if next_b.answerIndex is not None:
                                        curr_b.answerIndex = next_b.answerIndex
                                    if next_b.answerIndices:
                                        curr_b.answerIndices = next_b.answerIndices
                                print(f"[AI Generator] Post-process: merged consecutive fragmented quiz/multi_select block for question: '{curr_b.text}'", flush=True)
                                merged_blocks.append(curr_b)
                                idx += 2
                                continue
                                
                    # Empty block pruning: skip if quiz block has no text and no options
                    if curr_b.type in ("quiz", "multi_select") and not curr_b.text and (not curr_b.items or len(curr_b.items) == 0):
                        print(f"[AI Generator] Post-process: skipped empty/malformed quiz block", flush=True)
                        idx += 1
                        continue
                        
                    merged_blocks.append(curr_b)
                    idx += 1

                # Dedup identical consecutive quiz/assessment questions
                dedupped_blocks = []
                seen_questions = set()
                for block in merged_blocks:
                    if block.type in ("quiz", "multi_select", "true_false") and block.text:
                        norm_q = block.text.strip().lower()
                        if norm_q in seen_questions:
                            print(f"[AI Generator] Post-process: pruned duplicate assessment question: '{block.text}'", flush=True)
                            continue
                        seen_questions.add(norm_q)
                    dedupped_blocks.append(block)

                # Post-validation for assessments and nested blocks to guarantee schema safety
                for block in dedupped_blocks:
                    if block.type == "quiz":
                        if not block.text:
                            block.text = "Question not generated"
                        if not block.items or len(block.items) < 2:
                            block.items = ["Option A", "Option B", "Option C"]
                        if block.answerIndex is None or block.answerIndex >= len(block.items) or block.answerIndex < 0:
                            block.answerIndex = 0
                    elif block.type == "multi_select":
                        if not block.text:
                            block.text = "Question not generated"
                        if not block.items or len(block.items) < 2:
                            block.items = ["Option A", "Option B", "Option C"]
                        if not block.answerIndices:
                            block.answerIndices = [0]
                    elif block.type == "true_false":
                        if not block.text:
                            block.text = "Statement not generated"
                        if block.answerBool is None:
                            block.answerBool = True
                    elif block.type == "flashcard":
                        if not block.text:
                            block.text = "Front not generated"
                        if not block.secondaryText:
                            block.secondaryText = "Back not generated"
                    elif block.type in ("process", "tabs", "accordion", "matching"):
                        if not block.nestedItems or len(block.nestedItems) == 0:
                            block.nestedItems = [NestedItem(text="Item 1", secondaryText="Content for item 1")]
                        else:
                            for item in block.nestedItems:
                                if not item.text:
                                    item.text = "Item"
                                if not item.secondaryText:
                                    item.secondaryText = "Details"

                mapped_elements = []
                for block in dedupped_blocks:
                    try:
                        mapped_elements.append(map_content_block(block, req.image_type))
                    except Exception as e:
                        print(f"[AI Generator] Error mapping block of type '{block.type}': {e}", flush=True)
                mapped_slide["elements"] = mapped_elements

            mapped_slides.append(mapped_slide)

        return {
            "status": "success",
            "courseTitle": raw_course.get("courseTitle") or "Untitled Generated Course",
            "passingScore": raw_course.get("passingScore") or 70,
            "slides": mapped_slides
        }

    except Exception as e:
        import traceback
        print("\n--- GENERATE COURSE CRASH ---")
        traceback.print_exc()
        print("----------------------\n")
        raise HTTPException(status_code=500, detail=str(e))


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
        course_def,
        inline_assets=False,  # FIX Bug 3: reference JS as external files, not inline
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
                if ctype in ("video", "interactive-video", "storyline-video") and comp.get("src", "").startswith("data:"):
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

                # ── Canvas: walk items and extract nested image elements
                if ctype == "canvas":
                    for item in comp.get("items", []):
                        if item.get("type") == "image" and item.get("src", "").startswith("data:"):
                            media_counter += 1
                            data_uri = item["src"]
                            match = re.match(r"data:([\w/+.-]+);base64,(.*)", data_uri, re.DOTALL)
                            if match:
                                mime, b64_data = match.group(1), match.group(2)
                                ext = _mime_to_ext(mime)
                                fname = f"media/canvas_img_{media_counter}.{ext}"
                                try:
                                    media_files[fname] = base64.b64decode(b64_data)
                                    item["src"] = fname
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
