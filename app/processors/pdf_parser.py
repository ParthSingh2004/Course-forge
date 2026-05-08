import re
import base64
import io
from typing import List, Dict, Any, Optional

try:
    import fitz  # PyMuPDF
    _FITZ_AVAILABLE = True
except ImportError:
    _FITZ_AVAILABLE = False


def _extract_images_from_page(page: "fitz.Page", doc: "fitz.Document") -> List[Dict[str, Any]]:
    """
    Extract all raster images embedded in a PDF page.
    Returns a list of image dicts with base64-encoded data and metadata.
    """
    image_elements: List[Dict[str, Any]] = []

    image_list = page.get_images(full=True)

    for img_index, img_info in enumerate(image_list):
        xref = img_info[0]          # xref number in the PDF
        smask = img_info[1]         # soft mask xref (for transparency), 0 if none
        width = img_info[2]
        height = img_info[3]
        colorspace = img_info[5]    # colorspace name string

        # Skip very small images (likely icons or decorative artifacts)
        if width < 30 or height < 30:
            continue

        try:
            base_image = doc.extract_image(xref)
            img_bytes = base_image["image"]
            ext = base_image.get("ext", "png")          # "png", "jpeg", "jp2", etc.
            cs_name = base_image.get("colorspace", colorspace)

            # If there's a soft mask (alpha channel), composite it manually
            if smask > 0:
                try:
                    pix = fitz.Pixmap(doc, xref)
                    mask_pix = fitz.Pixmap(doc, smask)
                    # Combine RGB + alpha mask into RGBA pixmap
                    if pix.n < 5:           # not already RGBA
                        combined = fitz.Pixmap(fitz.csRGB, pix)
                    else:
                        combined = pix
                    rgba_pix = fitz.Pixmap(combined, mask_pix)
                    img_bytes = rgba_pix.tobytes("png")
                    ext = "png"
                except Exception:
                    pass  # fall back to raw bytes without compositing

            # Encode to base64 data URI for frontend rendering
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            mime = "image/jpeg" if ext in ("jpeg", "jpg") else f"image/{ext}"
            data_uri = f"data:{mime};base64,{b64}"

            # Get the bounding box of the image on the page for layout hints
            bbox: Optional[tuple] = None
            try:
                for item in page.get_image_rects(xref):
                    bbox = tuple(item)      # (x0, y0, x1, y1)
                    break
            except Exception:
                pass

            image_elements.append({
                "type": "image",
                "src": data_uri,
                "width": width,
                "height": height,
                "ext": ext,
                "colorspace": cs_name,
                "bbox": bbox,           # may be None if not determinable
            })

        except Exception as e:
            # Log and skip unreadable images rather than crashing
            image_elements.append({
                "type": "image",
                "error": str(e),
                "width": width,
                "height": height,
            })

    return image_elements


def _classify_spans(lines: List[Dict]) -> tuple[str, List[str]]:
    """
    Given the structured lines from a page, return:
      - heading: the text of the largest-font line (used as slide title)
      - body_lines: all remaining non-empty text lines
    """
    heading = None
    heading_size = 0
    body_lines: List[str] = []
    all_line_texts: List[tuple[str, float]] = []   # (text, max_font_size)

    for line in lines:
        spans = line.get("spans", [])
        line_text = " ".join(s["text"] for s in spans if s.get("text")).strip()
        if not line_text:
            continue
        max_size = max((s["size"] for s in spans if s.get("text")), default=0)
        all_line_texts.append((line_text, max_size))

    if not all_line_texts:
        return "", []

    # Pick the line with the largest font as the heading
    all_line_texts.sort(key=lambda x: -x[1])
    heading_text, heading_size = all_line_texts[0]

    heading = heading_text
    body_lines = [
        text for text, size in all_line_texts[1:]
        # Include only if its size is clearly smaller than the heading
        # (avoid treating same-size peers as body)
    ]

    # Re-sort body lines in reading order (original insertion order)
    # We need the original order back — sort by their original index
    body_lines_ordered: List[str] = []
    for text, size in [item for item in [  # rebuild in original document order
        (line_text, max_size)
        for line_text, max_size in [
            (" ".join(s["text"] for s in line.get("spans", []) if s.get("text")).strip(),
             max((s["size"] for s in line.get("spans", []) if s.get("text")), default=0))
            for line in lines
        ]
        if line_text and (line_text != heading)
    ]]:
        body_lines_ordered.append(text)

    return heading or "", body_lines_ordered


async def extract_pdf_slides(contents: bytes) -> List[Dict[str, Any]]:
    """
    Parse PDF bytes into a list of slide dicts compatible with the CourseForge authoring schema.

    Each slide dict has the shape:
    {
        "type": "slide",
        "title": str,
        "elements": [
            {"type": "text",  "content": str},
            {"type": "image", "src": "data:image/png;base64,...", "width": int, "height": int, ...},
            ...
        ]
    }

    Text elements appear before image elements so the frontend renders heading/body
    first, then inline images.
    """
    if not _FITZ_AVAILABLE:
        return [{
            "type": "slide",
            "title": "PDF Import Error",
            "elements": [{
                "type": "text",
                "content": "PyMuPDF is not installed. Run: pip install pymupdf"
            }]
        }]

    slides: List[Dict[str, Any]] = []
    doc = fitz.open(stream=contents, filetype="pdf")

    for page_num, page in enumerate(doc, start=1):
        # ── 1. Extract text ──────────────────────────────────────────────
        text_dict = page.get_text("dict")
        all_lines: List[Dict] = []
        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:      # 0 = text block; skip image blocks here
                continue
            all_lines.extend(block.get("lines", []))

        heading, body_lines = _classify_spans(all_lines)
        if not heading:
            heading = f"Page {page_num}"

        # ── 2. Extract images ────────────────────────────────────────────
        image_elements = _extract_images_from_page(page, doc)

        # ── 3. Assemble elements ─────────────────────────────────────────
        elements: List[Dict[str, Any]] = []

        body = " ".join(body_lines).strip()
        if body:
            elements.append({"type": "text", "content": body})

        elements.extend(image_elements)

        slides.append({
            "type": "slide",
            "title": heading,
            "elements": elements,
        })

    doc.close()
    return slides