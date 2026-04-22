import zipfile
import io
import xml.etree.ElementTree as ET
import re
import uuid

async def parse_story_file(file_bytes: bytes):
    blocks = []
    
    # Treat the .story file as a ZIP archive in memory
    zip_buffer = io.BytesIO(file_bytes)
    
    try:
        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            # Articulate stores actual slide content in the 'story/slides/' folder
            slide_files = [f for f in zip_file.namelist() if f.startswith('story/slides/') and f.endswith('.xml')]
            
            # Sort to maintain the chronological order of the course
            slide_files.sort()
            
            for slide_index, slide_file in enumerate(slide_files):
                xml_content = zip_file.read(slide_file)
                
                try:
                    root = ET.fromstring(xml_content)
                    slide_text = ""
                    
                    # Traverse the XML tree looking for text nodes
                    for elem in root.iter():
                        if elem.text and elem.text.strip():
                            # Articulate often embeds raw HTML inside their XML nodes. 
                            # We use regex to strip out those HTML tags to get pure text.
                            clean_text = re.sub(r'<[^>]+>', '', elem.text.strip())
                            
                            # Ignore tiny fragments and avoid duplicating identical text strings
                            if len(clean_text) > 2 and clean_text not in slide_text:
                                slide_text += clean_text + "\n\n"
                    
                    # If we found readable text on this slide, create a block for it
                    if slide_text.strip():
                        blocks.append({
                            "id": f"story_slide_{uuid.uuid4().hex[:6]}",
                            "type": "text",
                            "content": f"--- Slide {slide_index + 1} ---\n{slide_text.strip()}"
                        })
                        
                except ET.ParseError:
                    # Skip files with corrupted XML without crashing the whole parser
                    continue
                    
        if not blocks:
            blocks.append({
                "id": "story_empty",
                "type": "text",
                "content": "[Extracted .story file, but found no readable text on the slides.]"
            })
            
    except zipfile.BadZipFile:
        blocks.append({
            "id": "story_error",
            "type": "text",
            "content": "⚠️ Error: The uploaded file is not a valid or readable .story archive."
        })
        
    return blocks