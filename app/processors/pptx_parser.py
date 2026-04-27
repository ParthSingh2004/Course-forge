from PIL import Image
import pptx
from pptx.enum.shapes import MSO_SHAPE_TYPE
import io
import base64
import uuid

def _compress_image(image_blob: bytes) -> bytes:
    """Compresses an image to a reasonable size and converts to JPEG to save space."""
    try:
        with Image.open(io.BytesIO(image_blob)) as img:
            # Convert to RGB if it has an alpha channel to save as JPEG
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Resize if too large
            max_size = (1280, 720)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            out = io.BytesIO()
            img.save(out, format="JPEG", quality=75)
            return out.getvalue(), "image/jpeg"
    except Exception:
        # Fallback to original if compression fails
        return image_blob, "image/png"

async def extract_slides(file_bytes: bytes):
    prs = pptx.Presentation(io.BytesIO(file_bytes))
    blocks = []

    for i, slide in enumerate(prs.slides):
        slide_title = f"Slide {i + 1}"
        elements = []

        for shape in slide.shapes:
            # 1. Extract Text
            if hasattr(shape, "text") and shape.text.strip():
                text = shape.text.strip()
                # If this text looks like a title, use it as the slide title
                if getattr(shape, "is_placeholder", False) and shape.placeholder_format.idx == 0:
                    slide_title = text
                else:
                    elements.append({
                        "id": f"pptx_text_{uuid.uuid4().hex[:6]}",
                        "type": "text",
                        "content": text
                    })
            
            # 2. Extract Images (Aggressive Catch for standard images & placeholders)
            image_blob = None
            content_type = "image/png"
            
            # Catch standard inserted pictures
            if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                image_blob = shape.image.blob
                
            # Catch images dragged into slide layout placeholders
            elif getattr(shape, "is_placeholder", False) and hasattr(shape, "image") and shape.image:
                try:
                    image_blob = shape.image.blob
                except AttributeError:
                    pass # Failsafe if the placeholder exists but is empty

            # If we found image data, compress it and Base64 encode it
            if image_blob:
                compressed_blob, content_type = _compress_image(image_blob)
                base64_encoded = base64.b64encode(compressed_blob).decode('utf-8')
                data_uri = f"data:{content_type};base64,{base64_encoded}"
                
                elements.append({
                    "id": f"pptx_img_{uuid.uuid4().hex[:6]}",
                    "type": "image",
                    "imageUrl": data_uri
                })

        # Group elements into a single slide block
        blocks.append({
            "id": f"pptx_slide_{i}_{uuid.uuid4().hex[:6]}",
            "type": "slide",
            "title": slide_title,
            "slideNumber": i + 1,
            "elements": elements
        })

    return blocks