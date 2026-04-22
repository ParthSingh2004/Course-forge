import io
from pptx import Presentation

async def extract_slides(file_bytes: bytes):
    # Convert the raw bytes from the upload into a format python-pptx can read
    file_stream = io.BytesIO(file_bytes)
    prs = Presentation(file_stream)
    
    blocks = []
    
    # Loop through every slide in the presentation
    for i, slide in enumerate(prs.slides):
        slide_text = ""
        
        # Look at every shape on the slide and extract its text
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                slide_text += shape.text + "\n"
        
        # Add the extracted slide content to our CourseForge canvas
        if slide_text.strip():
            blocks.append({
                "id": f"slide_text_{i+1}",
                "type": "text",
                "content": f"--- Slide {i+1} Text ---\n{slide_text.strip()}"
            })
        else:
            blocks.append({
                "id": f"slide_empty_{i+1}",
                "type": "text",
                "content": f"--- Slide {i+1} ---\n[This slide contains images or no text]"
            })
            
    return blocks