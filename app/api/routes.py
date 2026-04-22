import os
import json
import io
import zipfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv
import google.generativeai as genai

from app.processors.pptx_parser import extract_slides
from app.processors.xml_parser import parse_qti_xml
from app.processors.pptx_parser import extract_slides
from app.processors.xml_parser import parse_qti_xml
from app.processors.story_parser import parse_story_file # ADD THIS LINE
# Load hidden variables from .env file
load_dotenv()

router = APIRouter()

# Securely fetch the API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("No GEMINI_API_KEY found in .env file")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash')

class CourseData(BaseModel):
    title: str
    blocks: List[Dict[str, Any]]

@router.post("/upload/pptx")
async def upload_pptx(file: UploadFile = File(...)):
    contents = await file.read()
    slides_data = await extract_slides(contents)
    return {"status": "success", "filename": file.filename, "blocks": slides_data}

@router.post("/upload/xml")
async def upload_xml(file: UploadFile = File(...)):
    contents = await file.read()
    xml_text = contents.decode("utf-8")
    blocks_data = await parse_qti_xml(xml_text)
    return {"status": "success", "filename": file.filename, "blocks": blocks_data}

@router.post("/ai/generate")
async def generate_ai_block(prompt: str = Form(...), block_type: str = Form(...)):
    try:
        system_instruction = f"""
        You are an expert e-learning course creator. 
        Create a concise '{block_type}' based on the user's prompt. 
        
        CRITICAL RULES:
        1. Keep the content short and punchy (under 75 words unless it is a list/quiz).
        2. You MUST return the output as valid JSON.
        3. Do not include markdown code blocks (like ```json), just the raw JSON object.
        4. Do not have any introductory message or similar which would give away that you are an agent only return information and what is asked
        
        If block_type is 'Multiple Choice Question', return: {{"question": "...", "options": ["A", "B", "C", "D"], "answer": "..."}}
        If block_type is 'Flashcard', return: {{"front": "...", "back": "..."}}
        Otherwise, return: {{"content": "..."}}
        """
        
        full_prompt = f"{system_instruction}\n\nUser Request: {prompt}"
        response = model.generate_content(full_prompt)
        
        try:
            structured_data = json.loads(response.text)
        except json.JSONDecodeError:
            structured_data = {"content": response.text.strip()}
        
        return {
            "status": "success", 
            "block_type": block_type,
            "data": structured_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export/scorm")
async def export_scorm(course: CourseData):
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        
        manifest_xml = f"""<?xml version="1.0" standalone="no" ?>
<manifest identifier="CourseForge_Manifest" version="1.0"
          xmlns="[http://www.imsproject.org/xsd/imscp_rootv1p1p2](http://www.imsproject.org/xsd/imscp_rootv1p1p2)"
          xmlns:adlcp="[http://www.adlnet.org/xsd/adlcp_rootv1p2](http://www.adlnet.org/xsd/adlcp_rootv1p2)">
    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>1.2</schemaversion>
    </metadata>
    <organizations default="CourseForge_Org">
        <organization identifier="CourseForge_Org">
            <title>{course.title}</title>
            <item identifier="Item_1" identifierref="Resource_1">
                <title>{course.title}</title>
            </item>
        </organization>
    </organizations>
    <resources>
        <resource identifier="Resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
            <file href="index.html"/>
        </resource>
    </resources>
</manifest>"""
        zip_file.writestr("imsmanifest.xml", manifest_xml)

        course_content = ""
        for block in course.blocks:
            # Check if block data is nested from AI generation, otherwise use flat content
            content_text = block.get("content", "")
            if isinstance(content_text, dict):
                content_text = str(content_text)
                
            course_content += f'<div style="margin-bottom:20px; padding:15px; background:#f9fafb; border-radius:8px; font-family:sans-serif;">{content_text}</div>\n'

        index_html = f"""<!DOCTYPE html>
<html>
<head>
    <title>{course.title}</title>
    <script>
        var API = null;
        function initCourse() {{
            console.log("Course loaded. SCORM connection initialized.");
        }}
    </script>
</head>
<body onload="initCourse()" style="max-width:800px; margin:0 auto; padding:40px;">
    <h1 style="font-family:sans-serif; color:#333;">{course.title}</h1>
    {course_content}
</body>
</html>"""
        zip_file.writestr("index.html", index_html)

    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer, 
        media_type="application/x-zip-compressed", 
        headers={"Content-Disposition": f'attachment; filename="{course.title.replace(" ", "_")}_SCORM.zip"'}
    )

@router.post("/export/xapi")
async def export_xapi(course: CourseData):
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        course_content = ""
        for block in course.blocks:
            content_text = block.get("content", "")
            if isinstance(content_text, dict):
                content_text = str(content_text)
            course_content += f'<div style="margin-bottom:20px; padding:15px; background:#f9fafb; border-radius:8px; font-family:sans-serif;">{content_text}</div>\n'

        tracking_script = f"""
        console.log("xAPI Initialized. Ready to send statements to LRS.");
        const statement = {{
            actor: {{ mbox: "mailto:student@example.com" }},
            verb: {{ id: "http://adlnet.gov/expapi/verbs/initialized", display: {{ "en-US": "initialized" }} }},
            object: {{ id: "http://courseforge.com/{course.title.replace(' ', '_')}" }}
        }};
        console.log("xAPI Payload:", statement);
        """

        index_html = f"""<!DOCTYPE html>
<html>
<head>
    <title>{course.title}</title>
    <script>
        function initCourse() {{
            {tracking_script}
        }}
    </script>
</head>
<body onload="initCourse()" style="max-width:800px; margin:0 auto; padding:40px;">
    <h1 style="font-family:sans-serif; color:#333;">{course.title}</h1>
    {course_content}
</body>
</html>"""
        zip_file.writestr("index.html", index_html)

    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer, 
        media_type="application/x-zip-compressed", 
        headers={"Content-Disposition": f'attachment; filename="{course.title.replace(" ", "_")}_xAPI.zip"'}
    )   

@router.post("/upload/story")
async def upload_story(file: UploadFile = File(...)):
    contents = await file.read()
    blocks_data = await parse_story_file(contents)
    return {"status": "success", "filename": file.filename, "blocks": blocks_data}
