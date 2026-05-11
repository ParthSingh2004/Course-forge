from PIL import Image
import pptx
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.util import Pt
from pptx.oxml.ns import qn
import io
import base64
import uuid
import re

# ── Helpers ─────────────────────────────────────────────────────────────────

def _uid(prefix="el"):
    return f"pptx_{prefix}_{uuid.uuid4().hex[:8]}"


def _compress_image(image_blob: bytes):
    """Compress to JPEG ≤ 1280×720 for reasonable SCORM package sizes."""
    try:
        with Image.open(io.BytesIO(image_blob)) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.thumbnail((1280, 720), Image.Resampling.LANCZOS)
            out = io.BytesIO()
            img.save(out, format="JPEG", quality=75)
            return out.getvalue(), "image/jpeg"
    except Exception:
        return image_blob, "image/png"


def _blob_to_data_uri(blob: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(blob).decode()}"


def _rgb_to_hex(rgb) -> str:
    """Convert pptx RGBColor (or tuple) to CSS hex string."""
    try:
        return f"#{rgb.red:02x}{rgb.green:02x}{rgb.blue:02x}"
    except Exception:
        pass
    try:
        r, g, b = rgb
        return f"#{r:02x}{g:02x}{b:02x}"
    except Exception:
        return ""


# ── Rich text extraction ─────────────────────────────────────────────────────

def _para_to_html(para) -> str:
    """Convert a pptx paragraph to inline HTML, preserving basic formatting."""
    parts = []
    for run in para.runs:
        text = run.text
        if not text:
            continue
        # Build inline style
        style_parts = []
        try:
            if run.font.bold:
                style_parts.append("font-weight:bold")
        except Exception:
            pass
        try:
            if run.font.italic:
                style_parts.append("font-style:italic")
        except Exception:
            pass
        try:
            if run.font.underline:
                style_parts.append("text-decoration:underline")
        except Exception:
            pass
        try:
            size = run.font.size
            if size:
                style_parts.append(f"font-size:{int(size / 12700)}px")
        except Exception:
            pass
        try:
            color = run.font.color.rgb
            if color:
                style_parts.append(f"color:{_rgb_to_hex(color)}")
        except Exception:
            pass

        escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        if style_parts:
            parts.append(f'<span style="{"; ".join(style_parts)}">{escaped}</span>')
        else:
            parts.append(escaped)

    return "".join(parts)


def _is_numbered_list(para) -> bool:
    """Detect if a paragraph is in a numbered list via pptx XML."""
    try:
        pPr = para._p.find(qn("a:pPr"))
        if pPr is not None:
            buAutoNum = pPr.find(qn("a:buAutoNum"))
            if buAutoNum is not None:
                return True
    except Exception:
        pass
    return False


def _is_bullet_list(para) -> bool:
    """Detect if a paragraph has a bullet character (non-auto-num)."""
    try:
        pPr = para._p.find(qn("a:pPr"))
        if pPr is not None:
            # Explicit no-bullet suppressor
            buNone = pPr.find(qn("a:buNone"))
            if buNone is not None:
                return False
            buChar = pPr.find(qn("a:buChar"))
            buFont = pPr.find(qn("a:buFont"))
            if buChar is not None or buFont is not None:
                return True
    except Exception:
        pass
    return False


def _get_indent_level(para) -> int:
    try:
        pPr = para._p.find(qn("a:pPr"))
        if pPr is not None:
            lvl = pPr.get("lvl")
            if lvl:
                return int(lvl)
    except Exception:
        pass
    return 0


# ── Background extraction ────────────────────────────────────────────────────

def _extract_slide_background(slide) -> dict:
    """
    Return background info:  { "type": "color"|"image"|"none", "value": ... }
    """
    try:
        bg = slide.background
        fill = bg.fill
        fill_type = fill.type

        # Solid color fill
        if fill_type is not None and str(fill_type) in ("SOLID", "1"):
            try:
                color = fill.fore_color.rgb
                return {"type": "color", "value": _rgb_to_hex(color)}
            except Exception:
                pass

        # Picture fill
        try:
            # Access the underlying XML element for background picture
            bgPr = bg._element.find(f".//{qn('p:bgPr')}")
            if bgPr is not None:
                blipFill = bgPr.find(qn("a:blipFill"))
                if blipFill is not None:
                    blip = blipFill.find(qn("a:blip"))
                    if blip is not None:
                        rId = blip.get(qn("r:embed"))
                        if rId:
                            part = slide.part.related_parts.get(rId)
                            if part:
                                blob, mime = _compress_image(part.blob)
                                return {"type": "image", "value": _blob_to_data_uri(blob, mime)}
        except Exception:
            pass

    except Exception:
        pass

    return {"type": "none", "value": None}


# ── Transition extraction ────────────────────────────────────────────────────

_TRANSITION_NAMES = {
    "blinds": "Blinds", "checker": "Checker", "circle": "Circle",
    "comb": "Comb", "cover": "Cover", "cut": "Cut", "diamond": "Diamond",
    "dissolve": "Dissolve", "fade": "Fade", "newsflash": "Newsflash",
    "plus": "Plus", "pull": "Pull", "push": "Push", "random": "Random",
    "randomBar": "Random Bar", "split": "Split", "strips": "Strips",
    "wedge": "Wedge", "wheel": "Wheel", "wipe": "Wipe", "zoom": "Zoom",
    # PowerPoint 2013+
    "fly": "Fly Through", "glitter": "Glitter", "honeycomb": "Honeycomb",
    "morph": "Morph", "origami": "Origami", "pan": "Pan", "peel": "Peel",
    "prestige": "Prestige", "reveal": "Reveal", "ripple": "Ripple",
    "rotate": "Rotate", "shred": "Shred", "switch": "Switch",
    "vortex": "Vortex", "wind": "Wind",
}

def _extract_transition(slide) -> str | None:
    """Return human-readable transition name or None."""
    try:
        spTree = slide._element
        transition_el = spTree.find(f".//{qn('p:transition')}")
        if transition_el is None:
            # It's a direct child of the slide element
            transition_el = slide._element.find(qn("p:transition"))
        if transition_el is not None:
            for child in transition_el:
                local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                name = _TRANSITION_NAMES.get(local, local if local else None)
                if name:
                    return name
            return "Transition"  # transition element exists but type unknown
    except Exception:
        pass
    return None


# ── Audio extraction ─────────────────────────────────────────────────────────

_AUDIO_MIMES = {
    "mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg",
    "m4a": "audio/mp4", "aac": "audio/aac", "flac": "audio/flac",
    "wma": "audio/x-ms-wma",
}

def _extract_embedded_audio(slide) -> list:
    """
    Return list of audio block dicts for any audio embedded in the slide.
    Handles both MEDIA shapes and OLE-embedded audio links.
    """
    audio_blocks = []
    try:
        for shape in slide.shapes:
            # python-pptx MEDIA shape type covers audio/video
            if shape.shape_type == MSO_SHAPE_TYPE.MEDIA:
                try:
                    # Access the relationship target
                    media_el = shape._element
                    # Find the video/audio reference via pic or nvPicPr
                    rId = None
                    for el in media_el.iter():
                        tag_local = el.tag.split("}")[-1] if "}" in el.tag else el.tag
                        if tag_local in ("audioFile", "wavAudioFile"):
                            rId = el.get(qn("r:link")) or el.get(qn("r:embed"))
                            if rId:
                                break
                    if not rId:
                        # Try p:nvPicPr → p:nvPr → a:audioCd / a:audioFile
                        for el in media_el.iter():
                            rId = el.get(qn("r:embed")) or el.get(qn("r:link"))
                            if rId:
                                break

                    if rId:
                        part = slide.part.related_parts.get(rId)
                        if part:
                            ext = part.partname.rsplit(".", 1)[-1].lower()
                            mime = _AUDIO_MIMES.get(ext, "audio/mpeg")
                            data_uri = _blob_to_data_uri(part.blob, mime)
                            label = shape.name or f"Audio Track"
                            audio_blocks.append({
                                "id": _uid("audio"),
                                "type": "audio",
                                "label": label,
                                "audioUrl": data_uri,
                                "mediaId": "",
                                "mandatory": False,
                            })
                except Exception:
                    pass
    except Exception:
        pass
    return audio_blocks


# ── Table extraction ─────────────────────────────────────────────────────────

def _extract_table(shape) -> dict | None:
    """Convert a pptx table shape to a CourseForge table block."""
    try:
        table = shape.table
        headers = []
        rows = []
        for row_idx, row in enumerate(table.rows):
            cells = [cell.text_frame.text.strip() if cell.text_frame else "" for cell in row.cells]
            if row_idx == 0:
                headers = cells
            else:
                rows.append(cells)
        if not headers:
            return None
        return {
            "id": _uid("table"),
            "type": "table",
            "headers": headers,
            "rows": rows,
        }
    except Exception:
        return None


# ── Shape-level text parsing (rich text, lists) ──────────────────────────────

def _extract_text_shapes(shape) -> list:
    """
    Given a text-bearing shape, return one or more CourseForge blocks:
    - Detects numbered/bulleted lists → list block
    - Falls back to rich-text HTML → text block
    - Handles headings (placeholder idx 0 = title, idx 1 = body)
    """
    if not hasattr(shape, "text_frame"):
        return []

    tf = shape.text_frame
    paragraphs = [p for p in tf.paragraphs if p.text.strip()]
    if not paragraphs:
        return []

    # Determine if the shape is a title placeholder
    is_title = (
        getattr(shape, "is_placeholder", False)
        and shape.placeholder_format is not None
        and shape.placeholder_format.idx == 0
    )
    if is_title:
        return []  # caller uses it as the slide title

    # Detect if ALL non-empty paragraphs are list items
    is_all_bullets = all(_is_bullet_list(p) or _is_numbered_list(p) for p in paragraphs)

    if is_all_bullets and len(paragraphs) > 1:
        items = [p.text.strip() for p in paragraphs if p.text.strip()]
        return [{
            "id": _uid("list"),
            "type": "list",
            "items": items,
        }]

    # Mixed / rich text — build HTML
    html_parts = []
    for para in paragraphs:
        para_html = _para_to_html(para)
        if not para_html.strip():
            continue
        # Guess heading vs body from font size
        try:
            sz = para.runs[0].font.size if para.runs else None
            if sz and sz / 12700 >= 28:
                html_parts.append(f"<h2 style='margin:0 0 8px'>{para_html}</h2>")
                continue
        except Exception:
            pass
        html_parts.append(f"<p style='margin:0 0 6px'>{para_html}</p>")

    if not html_parts:
        return []

    return [{
        "id": _uid("text"),
        "type": "text",
        "content": "".join(html_parts),
    }]


# ── Speaker notes ────────────────────────────────────────────────────────────

def _extract_notes(slide) -> str | None:
    try:
        notes_slide = slide.notes_slide
        tf = notes_slide.notes_text_frame
        text = tf.text.strip()
        if text:
            return text
    except Exception:
        pass
    return None


# ── Main entry point ─────────────────────────────────────────────────────────

async def extract_slides(file_bytes: bytes):
    prs = Presentation(io.BytesIO(file_bytes))
    blocks = []

    for i, slide in enumerate(prs.slides):
        slide_title = f"Slide {i + 1}"
        elements = []

        # ── Determine slide title from title placeholder ──────────────────────
        for shape in slide.shapes:
            if (
                getattr(shape, "is_placeholder", False)
                and shape.placeholder_format is not None
                and shape.placeholder_format.idx == 0
                and hasattr(shape, "text")
                and shape.text.strip()
            ):
                slide_title = shape.text.strip()
                break

        # ── Background ────────────────────────────────────────────────────────
        bg = _extract_slide_background(slide)

        # ── Transition ────────────────────────────────────────────────────────
        transition = _extract_transition(slide)

        # ── Embedded audio ────────────────────────────────────────────────────
        audio_blocks = _extract_embedded_audio(slide)
        elements.extend(audio_blocks)

        # ── Per-shape extraction ──────────────────────────────────────────────
        for shape in slide.shapes:
            # --- Table ---
            if shape.shape_type == MSO_SHAPE_TYPE.TABLE:
                tbl = _extract_table(shape)
                if tbl:
                    elements.append(tbl)
                continue

            # --- Image / Picture ---
            image_blob = None
            content_type = "image/png"

            if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                image_blob = shape.image.blob
            elif (
                getattr(shape, "is_placeholder", False)
                and hasattr(shape, "image")
            ):
                try:
                    image_blob = shape.image.blob
                except (AttributeError, Exception):
                    pass

            if image_blob:
                compressed, content_type = _compress_image(image_blob)
                data_uri = _blob_to_data_uri(compressed, content_type)
                # Try to get alt text
                alt_text = ""
                try:
                    alt_text = shape.name or ""
                except Exception:
                    pass
                elements.append({
                    "id": _uid("img"),
                    "type": "image",
                    "imageUrl": data_uri,
                    "caption": alt_text if alt_text and alt_text != shape.name else "",
                })
                continue  # image shapes can also have text; skip text extraction

            # --- Text / List (skip MEDIA shape text labels) ---
            if shape.shape_type == MSO_SHAPE_TYPE.MEDIA:
                continue  # already handled via _extract_embedded_audio

            text_blocks = _extract_text_shapes(shape)
            elements.extend(text_blocks)

        # ── Speaker notes → appended as a styled text block ──────────────────
        notes_text = _extract_notes(slide)
        if notes_text:
            escaped = notes_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            elements.append({
                "id": _uid("notes"),
                "type": "text",
                "content": (
                    f'<div style="border-left:3px solid #8b1a1a;padding:8px 12px;'
                    f'background:#fff5f5;border-radius:4px;font-size:13px;color:#555;">'
                    f'<strong style="color:#8b1a1a;font-size:10px;letter-spacing:0.1em;">SPEAKER NOTES</strong>'
                    f'<br/>{escaped}</div>'
                ),
            })

        # ── Build slide block ─────────────────────────────────────────────────
        slide_block = {
            "id": _uid("slide"),
            "type": "slide",
            "title": slide_title,
            "slideNumber": i + 1,
            "elements": elements,
        }

        # Attach background metadata
        if bg["type"] == "color":
            slide_block["backgroundColor"] = bg["value"]
        elif bg["type"] == "image":
            slide_block["backgroundImage"] = bg["value"]

        # Attach transition metadata (informational — rendered as note if present)
        if transition:
            slide_block["transition"] = transition

        blocks.append(slide_block)

    return blocks