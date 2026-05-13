from PIL import Image
import pptx
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.util import Pt
from pptx.oxml.ns import qn
import io
import base64
import uuid
import hashlib
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


_SCHEME_COLOR_MAP = {
    "bg1": "#ffffff",
    "lt1": "#ffffff",
    "bg2": "#000000",
    "lt2": "#f3f4f6",
    "tx1": "#000000",
    "dk1": "#000000",
    "tx2": "#1f2937",
    "dk2": "#1f2937",
    "accent1": "#4f46e5",
    "accent2": "#059669",
    "accent3": "#dc2626",
    "accent4": "#d97706",
    "accent5": "#7c3aed",
    "accent6": "#0891b2",
}

def _build_theme_color_map(prs) -> dict:
    """Extract actual hex colors from the presentation's theme XML."""
    theme_colors = {}
    try:
        if not prs.slides:
            return theme_colors
        # Navigate to the theme part via the slide master
        theme_part = prs.slides[0].slide_layout.slide_master.part.theme_part
        clrScheme = theme_part.element.find(f".//{qn('a:themeElements')}//{qn('a:clrScheme')}")
        
        # Fallback if xpath is finicky
        if clrScheme is None:
            themeElements = theme_part.element.find(qn('a:themeElements'))
            if themeElements is not None:
                clrScheme = themeElements.find(qn('a:clrScheme'))

        if clrScheme is not None:
            for child in clrScheme:
                tag_name = child.tag.split('}')[-1]
                
                # Check for sRGB explicit colors
                srgbClr = child.find(qn('a:srgbClr'))
                if srgbClr is not None:
                    val = srgbClr.get("val")
                    if val:
                        theme_colors[tag_name] = f"#{val.lower()}"
                    continue
                
                # Check for system colors
                sysClr = child.find(qn('a:sysClr'))
                if sysClr is not None:
                    val = sysClr.get("lastClr")
                    if val:
                        theme_colors[tag_name] = f"#{val.lower()}"
    except Exception as e:
        print(f"[pptx_parser] Could not extract theme colors: {e}")
    return theme_colors


def _extract_hex_from_color_choice(color_parent, theme_map=None) -> str:
    """Extract a CSS hex color from pptx color XML when python-pptx fill helpers miss."""
    if color_parent is None:
        return ""

    try:
        srgb = color_parent.find(qn("a:srgbClr"))
        if srgb is not None:
            val = (srgb.get("val") or "").strip()
            if re.fullmatch(r"[0-9A-Fa-f]{6}", val):
                return f"#{val.lower()}"
    except Exception:
        pass

    try:
        scheme = color_parent.find(qn("a:schemeClr"))
        if scheme is not None:
            val = (scheme.get("val") or "").strip()
            
            # 1. Prioritize dynamic theme map
            if theme_map and val in theme_map:
                return theme_map[val]
                
            # 2. Fallback to hardcoded tailwind map
            return _SCHEME_COLOR_MAP.get(val, "")
    except Exception:
        pass

    return ""


def _emu_to_pct(val, total) -> float:
    """Convert EMU position/size to a percentage of the slide dimension."""
    try:
        return round(val / total * 100, 2)
    except Exception:
        return 0.0


# ── Rich text extraction ─────────────────────────────────────────────────────

def _para_to_html(para) -> str:
    """Convert a pptx paragraph to inline HTML, preserving basic formatting."""
    parts = []
    for run in para.runs:
        text = run.text
        if not text:
            continue
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

def _extract_slide_background(slide, theme_map=None) -> dict:
    """
    Return background info:  { "type": "color"|"image"|"none", "value": ... }
    """
    try:
        bg = slide.background
        fill = bg.fill
        fill_type = fill.type

        if fill_type is not None and str(fill_type) in ("SOLID", "1"):
            try:
                color = fill.fore_color.rgb
                hex_color = _rgb_to_hex(color)
                if hex_color:
                    return {"type": "color", "value": hex_color}
            except Exception:
                pass

        try:
            bgPr = bg._element.find(f".//{qn('p:bgPr')}")
            if bgPr is not None:
                solidFill = bgPr.find(qn("a:solidFill"))
                if solidFill is not None:
                    hex_color = _extract_hex_from_color_choice(solidFill, theme_map)
                    if hex_color:
                        return {"type": "color", "value": hex_color}

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

            bgRef = bg._element.find(f".//{qn('p:bgRef')}")
            if bgRef is not None:
                hex_color = _extract_hex_from_color_choice(bgRef, theme_map)
                if hex_color:
                    return {"type": "color", "value": hex_color}
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
            transition_el = slide._element.find(qn("p:transition"))
        if transition_el is not None:
            for child in transition_el:
                local = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                name = _TRANSITION_NAMES.get(local, local if local else None)
                if name:
                    return name
            return "Transition"
    except Exception:
        pass
    return None


# ── Audio extraction ─────────────────────────────────────────────────────────

_AUDIO_MIMES = {
    "mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg",
    "m4a": "audio/mp4", "aac": "audio/aac", "flac": "audio/flac",
    "wma": "audio/x-ms-wma",
}

_AUDIO_XML_TAGS = {"audioFile", "wavAudioFile", "audioCd"}


def _find_audio_rid(element) -> str | None:
    for el in element.iter():
        local = el.tag.split("}")[-1] if "}" in el.tag else el.tag
        if local in _AUDIO_XML_TAGS:
            rid = el.get(qn("r:link")) or el.get(qn("r:embed"))
            if rid:
                return rid
    return None


def _try_extract_audio_from_shape(shape, slide, slide_w, slide_h,
                                   audio_blocks: list, seen_rids: set) -> None:
    try:
        rid = _find_audio_rid(shape._element)
        if not rid or rid in seen_rids:
            return
        seen_rids.add(rid)

        rel = slide.part.rels.get(rid)
        
        if rel is None or getattr(rel, "is_external", False):
            print(
                f"[pptx_parser] audio '{getattr(shape, 'name', '?')}' on slide "
                f"uses a linked (external) file (rId={rid}). "
                f"Only embedded audio is supported — re-save the PPTX with "
                f"'Embed media in file' enabled to include this track."
            )
            return

        part = rel.target_part

        ext = part.partname.rsplit(".", 1)[-1].lower()
        mime = _AUDIO_MIMES.get(ext, "audio/mpeg")
        blob = part.blob

        _MAX_INLINE_BYTES = 2 * 1024 * 1024  # 2 MB
        if len(blob) > _MAX_INLINE_BYTES:
            print(
                f"[pptx_parser] audio '{getattr(shape, 'name', '?')}' is "
                f"{len(blob) // 1024} KB. Embedding as a data URI will inflate "
                f"the SCORM JSON payload. Consider using file-based export "
                f"(pass scorm_output_dir to extract_slides) for audio files "
                f"larger than {_MAX_INLINE_BYTES // 1024} KB."
            )

        media_id = hashlib.md5(blob).hexdigest()[:12]

        position = {}
        try:
            position = {
                "x":      _emu_to_pct(shape.left,   slide_w),
                "y":      _emu_to_pct(shape.top,    slide_h),
                "width":  _emu_to_pct(shape.width,  slide_w),
                "height": _emu_to_pct(shape.height, slide_h),
            }
        except Exception as pos_err:
            print(f"[pptx_parser] could not read position for audio shape "
                  f"'{getattr(shape, 'name', '?')}': {pos_err}")

        audio_blocks.append({
            "id":        _uid("audio"),
            "type":      "audio",
            "label":     getattr(shape, "name", None) or "Audio Track",
            "audioUrl":  _blob_to_data_uri(blob, mime),
            "mediaId":   media_id,
            "autoPlay":  True,
            "loop":      False,
            "controls":  True,
            "mandatory":  False,
            "position":   position,
        })

    except Exception as err:
        print(f"[pptx_parser] failed to extract audio from shape "
              f"'{getattr(shape, 'name', '?')}': {err}")


def _extract_embedded_audio(slide, slide_w: int, slide_h: int) -> list:
    audio_blocks: list = []
    seen_rids: set = set()

    try:
        for shape in slide.shapes:
            _try_extract_audio_from_shape(
                shape, slide, slide_w, slide_h, audio_blocks, seen_rids
            )
    except Exception as err:
        print(f"[pptx_parser] slide-level audio scan failed: {err}")

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
    if not hasattr(shape, "text_frame"):
        return []

    tf = shape.text_frame
    paragraphs = [p for p in tf.paragraphs if p.text.strip()]
    if not paragraphs:
        return []

    is_title = (
        getattr(shape, "is_placeholder", False)
        and shape.placeholder_format is not None
        and shape.placeholder_format.idx == 0
    )
    if is_title:
        return []

    is_all_bullets = all(_is_bullet_list(p) or _is_numbered_list(p) for p in paragraphs)

    if is_all_bullets and len(paragraphs) > 1:
        items = [p.text.strip() for p in paragraphs if p.text.strip()]
        return [{
            "id": _uid("list"),
            "type": "list",
            "items": items,
        }]

    html_parts = []
    for para in paragraphs:
        para_html = _para_to_html(para)
        if not para_html.strip():
            continue
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
    
    # 1. Build the dynamic theme color map for this specific presentation
    theme_map = _build_theme_color_map(prs)

    # Slide dimensions in EMU — needed to convert shape positions to percentages.
    slide_w = prs.slide_width
    slide_h = prs.slide_height

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
        # 2. Pass the generated theme_map into the background extractor
        bg = _extract_slide_background(slide, theme_map)

        # ── Transition ────────────────────────────────────────────────────────
        transition = _extract_transition(slide)

        # ── Embedded audio ────────────────────────────────────────────────────
        audio_blocks = _extract_embedded_audio(slide, slide_w, slide_h)
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
                if _find_audio_rid(shape._element):
                    continue
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
                continue

            # --- Skip MEDIA shapes — already handled by _extract_embedded_audio ---
            if shape.shape_type == MSO_SHAPE_TYPE.MEDIA:
                continue

            # --- Text / List ---
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

        if bg["type"] in ("color", "image") and bg["value"]:
            slide_block["background"] = bg

        if bg["type"] == "color":
            slide_block["backgroundColor"] = bg["value"]
        elif bg["type"] == "image":
            slide_block["backgroundImage"] = bg["value"]

        if transition:
            slide_block["transition"] = transition

        blocks.append(slide_block)

    return blocks