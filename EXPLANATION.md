# CourseForge Technical Documentation

Welcome to the comprehensive guide for CourseForge. This document provides a deep dive into the architecture, the inner workings of every processor, the frontend structure, and the exported SCORM/xAPI runtime engine.

---

## 1. System Overview

CourseForge is a high-performance authoring tool designed to create interactive, educational content. It bridges the gap between modern web design and legacy e-learning standards like **SCORM 1.2** and **xAPI**.

### High-Level Architecture
- **Frontend**: A React-based Single Page Application (SPA) providing a drag-and-drop authoring environment.
- **Backend**: A FastAPI (Python) service handling complex file parsing, AI content generation, and export packaging.
- **Runtime**: A modular TypeScript engine injected into exported packages to handle LMS communication and learner interactions.

---

## 2. Backend Processors

The "Processors" are the heavy lifters that handle file imports and package building. They are located in `app/processors/`.

### 2.1 PowerPoint Parser (`pptx_parser.py`)
This processor converts `.pptx` files into CourseForge blocks.
- **Logic**: It uses the `python-pptx` library to iterate through slides.
- **Text Extraction**: It identifies placeholders and text shapes. If a shape is a title placeholder (idx 0), it promotes the text to the "Slide Title".
- **Image Processing**: It extracts images from shapes. To keep export sizes small, it **compresses** images (converting to JPEG at 75% quality and resizing to max 1280x720) before Base64 encoding them for the authoring canvas.

### 2.2 Articulate Storyline Parser (`story_parser.py`)
A robust decoder for `.story` files.
- **Mechanism**: Storyline files are ZIP archives containing complex XML structures.
- **XML Traversal**: It parses `story/slides/*.xml` for content and `story/slides/_rels/*.xml.rels` to map internal IDs (rIds) to media assets.
- **Feature Support**: It extracts not just text and images, but also **Quiz questions**, **Buttons**, **Hotspots**, **Sliders**, and **Drag-and-Drop** configurations.
- **Variable Indexing**: It scans `story/story.xml` to recover project-level variables used in the original course.

### 2.3 PDF Parser (`pdf_parser.py`)
Converts static PDF documents into interactive course slides.
- **Engine**: Powered by `PyMuPDF` (fitz).
- **Layout Intelligence**: It analyzes font sizes on a page to guess which text is the "Heading" and which is the "Body".
- **Image Extraction**: It performs a pixel-perfect extraction of raster images embedded in the PDF, handling transparency masks (alpha channels) by compositing them onto RGB backgrounds.

### 2.4 SCORM Builder (`scorm_builder.py`)
The "Export Engine" that compiles your authored course into a standard-compliant ZIP.
- **Model Conversion**: It transforms the "Authoring Blocks" (flat list) into a hierarchical "Runtime Model" (Slides -> Layers -> Components).
- **Manifest Generation**: It dynamically generates `imsmanifest.xml`, ensuring all media assets and schema references are correctly declared for LMS compatibility.
- **Runtime Injection**: It reads the pre-built `scorm-runtime.js` bundle and injects it into a generated `index.html`.
- **Automatic Triggers**: It automatically generates "Trigger Rules" for quiz blocks (e.g., "On Submit, show Feedback").

---

## 3. Frontend Architecture

The frontend is contained primarily within `courseforge-frontend/`.

### 3.1 Main Controller (`App.jsx`)
Despite its size, `App.jsx` follows a strict state-driven pattern:
- **State Management**: Uses `useState` for the main `blocks` array, which is the "Source of Truth" for the course content.
- **Block Editing**: Every content block (Text, Quiz, Flashcard) is a controlled component. Changes are debounced and synced back to the main state.
- **Drag and Drop**: Implements native HTML5 Drag and Drop (using `onDragStart`, `onDragOver`, etc.) to allow reordering of content blocks and slides.
- **AI Orchestration**: Connects to the `/api/ai/generate` endpoint to send user prompts to Google Gemini and transform the JSON response into authoring blocks.

### 3.2 Content Blocks
CourseForge supports a rich variety of blocks:
- **Media**: Image (with caption), Video (Direct/YouTube/Vimeo), Audio (Mandatory/Optional).
- **Interactive**: Flashcards (3D flip animation), Quiz (MCQ), True/False, Fill-in-the-Blanks.
- **Layout**: Heading, Quote, List, Process (Step-by-step), Table.

---

## 4. The SCORM Runtime Engine

When a course is exported, it includes a sophisticated runtime (`scorm-runtime/src/`).

### 4.1 LMS Communication (`scorm-api.ts`)
- **Discovery**: Automatically searches up the window hierarchy (`window.parent`, `window.opener`) to find the LMS's `API` or `API_1484_11` adapter.
- **Lifecycle**: Handles `LMSInitialize()`, `LMSCommit()`, and `LMSFinish()`.

### 4.2 State and Persistence (`state-compressor.ts`)
- **Challenge**: SCORM 1.2 has a strict 4,096-character limit for `cmi.suspend_data`.
- **Solution**: The runtime uses **LZ-String compression** and **Bitsets** (to track visited slides) to pack complex interaction data and variables into a tiny footprint.

### 4.3 Trigger Engine (`trigger-engine.ts`)
- **Event-Action Pattern**: Listens for events like `onSlideEnter`, `onQuizSubmit`, or `onVariableChange`.
- **Execution**: Runs actions such as `jumpToSlide`, `showLayer`, `toggleVariable`, or `completeCourse`.
- **Worker Support**: Uses a Web Worker to process complex triggers without blocking the main UI thread.

### 4.4 Completion Logic
- **Mandatory Interactions**: A course can be gated so that it only marks as "Passed" if the learner has:
    1. Viewed all slides.
    2. Listened to mandatory audio.
    3. Scored above the `passingScore` (default 80%) on assessments.
- **Scoring**: Calculates a normalized 0-100 score based on weightage assigned to individual questions.

---

## 5. Summary of Features

| Feature | Description | Implementation |
| :--- | :--- | :--- |
| **AI Content Gen** | Generate full courses from a single prompt. | Gemini API + Frontend Block Factory |
| **Multi-Format Import** | Import from PPTX, PDF, or Storyline. | Specialized Python Parsers |
| **Interactive Quizzes** | MCQ, T/F, and Fill-in-the-Blanks. | React UI + Runtime Assessment Engine |
| **Advanced Export** | One-click export to SCORM 1.2 or xAPI. | `scorm_builder.py` |
| **State Recovery** | Resume exactly where the learner left off. | `suspend_data` + State Compressor |
| **Branching Logic** | Create non-linear learning paths. | Runtime Trigger Engine |
