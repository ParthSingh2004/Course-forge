import xml.etree.ElementTree as ET
import uuid

async def parse_qti_xml(xml_string: str):
    blocks = []
    
    try:
        # Parse the raw XML string into a searchable tree
        root = ET.fromstring(xml_string)

        # Helper function to guess the best CourseForge block type
        def get_block_type(tag_name):
            tag = tag_name.lower()
            if 'title' in tag or tag in ['h1', 'h2', 'h3', 'header']:
                return 'heading-1'
            elif 'img' in tag or 'image' in tag:
                return 'image'
            # QTI quiz elements
            elif tag in ['item', 'prompt', 'mattext']:
                return 'text'
            return 'text'

        # Traverse every single element in the XML document
        for elem in root.iter():
            # XML files often have ugly namespaces like "{http://www.imsglobal...}title"
            # We split by '}' to just grab the clean tag name (e.g., "title")
            clean_tag_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            
            # Check if this specific XML tag actually contains text
            if elem.text and elem.text.strip():
                content = elem.text.strip()
                
                # Ignore tiny fragments of text (like random newlines or numbers)
                if len(content) > 2:
                    blocks.append({
                        "id": f"xml_{clean_tag_name}_{uuid.uuid4().hex[:6]}",
                        "type": get_block_type(clean_tag_name),
                        "content": content
                    })

        if not blocks:
            blocks.append({
                "id": "xml_empty",
                "type": "text",
                "content": "[Imported XML contained no readable text data.]"
            })

    except ET.ParseError:
        # If the user uploads a corrupted XML file, it won't crash your server
        blocks.append({
            "id": "xml_error",
            "type": "text",
            "content": "⚠️ Error: The uploaded file is corrupted or not valid XML."
        })
        
    return blocks