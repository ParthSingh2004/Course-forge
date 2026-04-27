"""
scorm_builder.py — SCORM 1.2 Package Builder
================================================
Generates a compliant SCORM 1.2 package with:
  - Proper imsmanifest.xml with ADL namespaces
  - Runtime HTML with embedded course data + bundled JS
  - Slide→Layer→Component data model conversion from authoring blocks
  - Auto-generated trigger rules from quiz blocks
"""

import json
import os
import uuid
import html as html_module
from typing import List, Dict, Any


# ---------------------------------------------------------------------------
# BLOCK → SLIDE/LAYER/COMPONENT CONVERSION
# ---------------------------------------------------------------------------

def _make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _detect_embed_type(url: str) -> str:
    if not url:
        return "direct"
    if "youtube.com" in url or "youtu.be" in url:
        return "youtube"
    if "vimeo.com" in url:
        return "vimeo"
    return "direct"


def _block_to_component(block: Dict[str, Any], idx: int) -> Dict[str, Any]:
    """Convert an authoring block into a runtime Component."""
    btype = (block.get("type") or "").lower().strip()
    bid = block.get("id") or _make_id("comp")
    bid = str(bid)

    if btype in ("heading", "heading-1"):
        return {
            "type": "heading",
            "id": bid,
            "content": block.get("content", ""),
            "level": 2,
        }

    if btype in ("text", "ai-generated"):
        return {
            "type": "text",
            "id": bid,
            "content": block.get("content", ""),
        }

    if btype == "image":
        src = (
            block.get("image")
            or block.get("imageUrl")
            or block.get("src")
            or (block.get("data") or {}).get("image")
            or ""
        )
        return {
            "type": "image",
            "id": bid,
            "src": src,
            "alt": block.get("alt", ""),
            "width": block.get("width", "100%"),
            "caption": block.get("caption", ""),
        }

    if btype == "video":
        url = block.get("videoUrl") or block.get("video_url") or ""
        comp = {
            "type": "video",
            "id": bid,
            "src": url,
            "embedType": _detect_embed_type(url),
        }
        if block.get("mandatory"):
            comp["mandatory"] = True
        return comp

    if btype == "button":
        return {
            "type": "button",
            "id": bid,
            "label": block.get("content") or block.get("label") or "Button",
        }

    if btype in ("quiz", "mcq"):
        comp = {
            "type": "quiz",
            "id": bid,
            "question": block.get("question", ""),
            "options": block.get("options", []),
            "correctAnswer": block.get("correctAnswer", 0),
            "feedback": {
                "correct": "Correct!",
                "incorrect": "Incorrect. Try again.",
            },
        }
        if block.get("mandatory"):
            comp["mandatory"] = True
        return comp

    if btype == "flashcard":
        return {
            "type": "flashcard",
            "id": bid,
            "front": block.get("front", ""),
            "back": block.get("back", ""),
        }

    if btype == "process":
        return {
            "type": "process",
            "id": bid,
            "steps": block.get("steps", []),
        }

    if btype == "list":
        return {
            "type": "list",
            "id": bid,
            "items": block.get("items", []),
        }

    if btype == "quote":
        return {
            "type": "quote",
            "id": bid,
            "content": block.get("content", ""),
            "author": block.get("author", ""),
        }

    # Fallback: treat as text
    return {
        "type": "text",
        "id": bid,
        "content": block.get("content", str(block)),
    }


def blocks_to_slides(blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert a flat list of authoring blocks into grouped Slides.
    
    Grouping strategy:
      - 'slide' blocks become their own slide with sub-elements as components
      - 'heading' blocks start a new slide
      - Other blocks are grouped into the current slide
      - If no heading exists, all blocks go into a single slide
    """
    slides: List[Dict[str, Any]] = []
    current_components: List[Dict[str, Any]] = []
    current_title = "Slide 1"
    slide_counter = 0

    def flush_slide():
        nonlocal slide_counter, current_components, current_title
        if not current_components:
            return
        slide_counter += 1
        slides.append({
            "id": _make_id("slide"),
            "title": current_title,
            "layers": [{
                "id": _make_id("layer"),
                "name": "Base Layer",
                "components": current_components,
                "visible": True,
            }],
            "triggers": [],
        })
        current_components = []

    for idx, block in enumerate(blocks):
        btype = (block.get("type") or "").lower().strip()

        # Handle native slide blocks (from .story imports)
        if btype == "slide":
            flush_slide()
            elements = block.get("elements") or []
            comps = [_block_to_component(el, i) for i, el in enumerate(elements)]
            slide_counter += 1
            slides.append({
                "id": str(block.get("id", _make_id("slide"))),
                "title": block.get("title", f"Slide {slide_counter}"),
                "layers": [{
                    "id": _make_id("layer"),
                    "name": "Base Layer",
                    "components": comps if comps else [{"type": "text", "id": _make_id("comp"), "content": ""}],
                    "visible": True,
                }],
                "triggers": [],
            })
            current_title = f"Slide {slide_counter + 1}"
            continue

        # Headings start a new slide
        if btype in ("heading", "heading-1"):
            flush_slide()
            current_title = block.get("content", f"Slide {slide_counter + 1}")
            comp = _block_to_component(block, idx)
            current_components.append(comp)
            continue

        # All other blocks go into the current slide
        comp = _block_to_component(block, idx)
        current_components.append(comp)

    # Flush remaining
    flush_slide()

    # If no slides were created, make one default
    if not slides:
        slides.append({
            "id": _make_id("slide"),
            "title": "Untitled Slide",
            "layers": [{
                "id": _make_id("layer"),
                "name": "Base Layer",
                "components": [{"type": "text", "id": _make_id("comp"), "content": "No content"}],
                "visible": True,
            }],
            "triggers": [],
        })

    return slides


# ---------------------------------------------------------------------------
# AUTO-GENERATE TRIGGER RULES FROM QUIZ BLOCKS
# ---------------------------------------------------------------------------

def generate_quiz_triggers(slides: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate basic trigger rules for quiz components."""
    triggers = []

    for slide in slides:
        for layer in slide.get("layers", []):
            for comp in layer.get("components", []):
                if comp.get("type") != "quiz":
                    continue

                quiz_id = comp["id"]

                # Trigger: show feedback on quiz submit
                triggers.append({
                    "id": _make_id("trigger"),
                    "event": {"type": "quizSubmit", "quizId": quiz_id},
                    "actions": [
                        {
                            "type": "showFeedback",
                            "message": "Answer submitted!",
                            "feedbackType": "info",
                        }
                    ],
                    "oneShot": False,
                })

    return triggers


# ---------------------------------------------------------------------------
# IMSMANIFEST.XML GENERATION (SCORM 1.2 COMPLIANT)
# ---------------------------------------------------------------------------

def generate_manifest(title: str, identifier: str = "CourseForge_Course", media_files: list = None) -> str:
    safe_title = html_module.escape(title)
    safe_id = identifier.replace(" ", "_")

    # Build file references for all media files
    file_refs = '      <file href="index.html"/>\n'
    if media_files:
        for fname in media_files:
            file_refs += f'      <file href="{html_module.escape(fname)}"/>\n'

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="{safe_id}"
          version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">

  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>

  <organizations default="org_1">
    <organization identifier="org_1">
      <title>{safe_title}</title>
      <item identifier="item_1" identifierref="res_1" isvisible="true">
        <title>{safe_title}</title>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="res_1"
              type="webcontent"
              adlcp:scormtype="sco"
              href="index.html">
{file_refs}    </resource>
  </resources>
</manifest>"""


# ---------------------------------------------------------------------------
# RUNTIME HTML GENERATION
# ---------------------------------------------------------------------------

def _get_runtime_js() -> str:
    """Read the pre-built runtime JS bundle."""
    bundle_path = os.path.join(
        os.path.dirname(__file__),
        "..", "..", "courseforge-frontend", "scorm-runtime", "dist", "scorm-runtime.js"
    )
    bundle_path = os.path.normpath(bundle_path)

    if os.path.exists(bundle_path):
        with open(bundle_path, "r", encoding="utf-8") as f:
            return f.read()

    # Fallback: minimal inline runtime for when bundle hasn't been built yet
    return _get_fallback_runtime_js()


def _get_fallback_runtime_js() -> str:
    """Minimal fallback runtime when the TypeScript bundle isn't available."""
    return """
(function() {
  'use strict';

  // Minimal SCORM 1.2 API discovery
  function findAPI(win, depth) {
    if (depth > 500) return null;
    try {
      if (win.API && typeof win.API.LMSInitialize === 'function') return win.API;
    } catch(e) { return null; }
    try {
      if (win.parent && win.parent !== win) return findAPI(win.parent, depth + 1);
    } catch(e) {}
    return null;
  }

  var API = findAPI(window, 0);
  if (!API && window.opener) {
    try { API = findAPI(window.opener, 0); } catch(e) {}
  }

  // Initialize
  if (API) {
    try { API.LMSInitialize(''); } catch(e) {}
  }

  var courseData = window.__CF_COURSE_DATA;
  if (!courseData) return;

  var currentSlide = 0;
  var slides = courseData.slides || [];
  var visitedSlides = {};
  var mandatoryIds = {};
  var mandatoryCompleted = {};

  // Build mandatory index
  for (var si = 0; si < slides.length; si++) {
    var sLayers = slides[si].layers || [];
    for (var li2 = 0; li2 < sLayers.length; li2++) {
      var sComps = sLayers[li2].components || [];
      for (var ci2 = 0; ci2 < sComps.length; ci2++) {
        if (sComps[ci2].mandatory) mandatoryIds[sComps[ci2].id] = true;
      }
    }
  }

  var quizScores = {};
  var totalQuizCount = 0;
  // Count total quizzes
  for (var si2 = 0; si2 < slides.length; si2++) {
    var sL2 = slides[si2].layers || [];
    for (var li3 = 0; li3 < sL2.length; li3++) {
      var sC2 = sL2[li3].components || [];
      for (var ci3 = 0; ci3 < sC2.length; ci3++) {
        if (sC2[ci3].type === 'quiz') totalQuizCount++;
      }
    }
  }

  function calculateScore() {
    if (totalQuizCount === 0) return 100;
    var correct = 0;
    for (var qid in quizScores) { if (quizScores[qid]) correct++; }
    return Math.round((correct / totalQuizCount) * 100);
  }

  function checkCompletion() {
    var allVisited = true;
    for (var i = 0; i < slides.length; i++) {
      if (!visitedSlides[i]) { allVisited = false; break; }
    }
    var allMandatory = true;
    for (var mid in mandatoryIds) {
      if (!mandatoryCompleted[mid]) { allMandatory = false; break; }
    }
    if (allVisited && allMandatory && API) {
      var score = calculateScore();
      var status = score >= 50 ? 'passed' : 'failed';
      try {
        API.LMSSetValue('cmi.core.lesson_status', status);
        API.LMSSetValue('cmi.core.score.raw', String(score));
        API.LMSSetValue('cmi.core.score.max', '100');
        API.LMSSetValue('cmi.core.score.min', '0');
        API.LMSCommit('');
      } catch(e) {}
    }
  }

  function renderSlide(idx) {
    var slide = slides[idx];
    if (!slide) return;
    var container = document.getElementById('cf-slide-container');
    if (!container) return;
    container.innerHTML = '';

    var title = document.createElement('h2');
    title.className = 'cf-rt-slide-title';
    title.textContent = slide.title;
    container.appendChild(title);

    var layers = slide.layers || [];
    for (var li = 0; li < layers.length; li++) {
      var layer = layers[li];
      var comps = layer.components || [];
      for (var ci = 0; ci < comps.length; ci++) {
        var comp = comps[ci];
        var el = document.createElement('div');
        el.className = 'cf-rt-component';
        if (comp.type === 'text') {
          el.innerHTML = '<div class="cf-rt-text">' + comp.content + '</div>';
        } else if (comp.type === 'heading') {
          el.innerHTML = '<h' + (comp.level||2) + ' class="cf-rt-heading">' + comp.content + '</h' + (comp.level||2) + '>';
        } else if (comp.type === 'image') {
          el.style.textAlign = 'center';
          var imgHtml = '<img class="cf-rt-image" src="' + comp.src + '" alt="' + (comp.alt||'') + '" style="width:' + (comp.width||'100%') + ';" />';
          if (comp.caption) imgHtml += '<div style="margin-top:8px;font-size:14px;color:#666;">' + comp.caption + '</div>';
          el.innerHTML = imgHtml;
        } else if (comp.type === 'quiz') {
          var opts = '';
          for (var oi = 0; oi < (comp.options||[]).length; oi++) {
            opts += '<label class="cf-rt-quiz-option"><input type="radio" name="q-' + comp.id + '" value="' + oi + '"/><span>' + comp.options[oi] + '</span></label>';
          }
          el.innerHTML = '<div class="cf-rt-quiz-badge">QUIZ</div><div class="cf-rt-quiz-question">' + comp.question + '</div><div class="cf-rt-quiz-options">' + opts + '</div><button class="cf-rt-quiz-submit" onclick="var sel=document.querySelector(\'input[name=q-' + comp.id + ']:checked\');if(sel){quizScores[\'' + comp.id + '\']=(Number(sel.value)===' + (comp.correctAnswer||0) + ');mandatoryCompleted[\'' + comp.id + '\']=true;this.disabled=true;this.textContent=\'Submitted\';checkCompletion();}">Submit</button>';
        } else if (comp.type === 'video') {
          if (comp.embedType === 'youtube' || comp.embedType === 'vimeo') {
            el.innerHTML = '<div class="cf-rt-video-wrap"><iframe class="cf-rt-video-embed" src="' + comp.src + '" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>';
          } else {
            el.innerHTML = '<video class="cf-rt-video" src="' + comp.src + '" controls></video>';
          }
        } else if (comp.type === 'flashcard') {
          el.innerHTML = '<div class="cf-rt-flashcard-scene" onclick="this.classList.toggle(\'flipped\')"><div class="cf-rt-flashcard-inner"><div class="cf-rt-flashcard-face cf-rt-flashcard-front"><div class="cf-rt-flashcard-label">FRONT</div><div class="cf-rt-flashcard-text">' + (comp.front||'') + '</div><div class="cf-rt-flashcard-hint">Click to flip</div></div><div class="cf-rt-flashcard-face cf-rt-flashcard-back"><div class="cf-rt-flashcard-label">BACK</div><div class="cf-rt-flashcard-text">' + (comp.back||'') + '</div><div class="cf-rt-flashcard-hint">Click to flip back</div></div></div></div>';
        } else if (comp.type === 'list') {
          var listHtml = '<ul class="cf-rt-list" style="padding-left:20px;margin:0;color:#a1a1aa;">';
          for (var ii = 0; ii < (comp.items||[]).length; ii++) {
            listHtml += '<li style="margin-bottom:8px;line-height:1.75;">' + comp.items[ii] + '</li>';
          }
          listHtml += '</ul>';
          el.innerHTML = listHtml;
        } else if (comp.type === 'quote') {
          var quoteHtml = '<div class="cf-rt-quote" style="border-left:4px solid #8b1a1a;padding:16px;background:#1a1a1e;border-radius:0 8px 8px 0;">';
          quoteHtml += '<div style="font-size:18px;font-style:italic;color:#fafafa;">"' + (comp.content||'') + '"</div>';
          if (comp.author) quoteHtml += '<div style="margin-top:8px;font-size:14px;color:#a1a1aa;font-weight:600;">— ' + comp.author + '</div>';
          quoteHtml += '</div>';
          el.innerHTML = quoteHtml;
        } else if (comp.type === 'process') {
          var steps = comp.steps || [];
          var procHtml = '<div style="font-size:10px;font-weight:700;letter-spacing:0.15em;color:#c0392b;margin-bottom:12px;">PROCESS</div>';
          for (var pi = 0; pi < steps.length; pi++) {
            procHtml += '<div style="padding:12px 16px;border:1px solid #27272a;border-radius:10px;margin-bottom:8px;background:#09090b;">';
            procHtml += '<div style="font-size:14px;font-weight:600;color:#fafafa;margin-bottom:4px;">Step ' + (pi+1) + ': ' + (steps[pi].title||'') + '</div>';
            if (steps[pi].content) procHtml += '<div style="font-size:13px;color:#a1a1aa;line-height:1.6;">' + steps[pi].content + '</div>';
            procHtml += '</div>';
          }
          el.innerHTML = procHtml;
        } else if (comp.type === 'button') {
          el.innerHTML = '<button class="cf-rt-button">' + (comp.label||'Button') + '</button>';
        } else {
          el.innerHTML = '<div class="cf-rt-text">' + (comp.content || comp.label || '') + '</div>';
        }
        container.appendChild(el);
      }
    }

    // Update nav
    var counter = document.getElementById('cf-slide-counter');
    if (counter) counter.textContent = (idx+1) + ' / ' + slides.length;
    var prevBtn = document.getElementById('cf-prev-btn');
    var nextBtn = document.getElementById('cf-next-btn');
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= slides.length - 1;
    var progress = document.getElementById('cf-progress-bar');
    if (progress) progress.style.width = ((idx+1)/slides.length*100) + '%';

    // SCORM bookmark
    visitedSlides[idx] = true;
    if (API) {
      try {
        API.LMSSetValue('cmi.core.lesson_location', String(idx));
        API.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        API.LMSCommit('');
      } catch(e) {}
    }
    checkCompletion();
  }

  window.__cfNext = function() {
    if (currentSlide < slides.length-1) { currentSlide++; renderSlide(currentSlide); }
  };
  window.__cfPrev = function() {
    if (currentSlide > 0) { currentSlide--; renderSlide(currentSlide); }
  };

  // Boot
  document.addEventListener('DOMContentLoaded', function() {
    // Try to resume from bookmark
    if (API) {
      try {
        var loc = API.LMSGetValue('cmi.core.lesson_location');
        if (loc && !isNaN(Number(loc))) currentSlide = Number(loc);
      } catch(e) {}
    }
    renderSlide(currentSlide);

    // Mark first slide visited and check completion for single-slide courses
    visitedSlides[currentSlide] = true;
    if (API) {
      try {
        API.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        API.LMSCommit('');
      } catch(e) {}
    }
    checkCompletion();
  });

  // Auto-finish on unload
  window.addEventListener('beforeunload', function() {
    if (API) {
      try { API.LMSCommit(''); API.LMSFinish(''); } catch(e) {}
    }
  });
})();
"""


def generate_runtime_html(title: str, course_definition: Dict[str, Any]) -> str:
    """Generate the complete runtime HTML page."""
    safe_title = html_module.escape(title)
    course_json = json.dumps(course_definition, separators=(",", ":"))
    runtime_js = _get_runtime_js()

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{safe_title}</title>
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&amp;display=swap" rel="stylesheet">
<style>
{_get_runtime_css()}
</style>
</head>
<body>
  <!-- Progress Bar -->
  <div class="cf-rt-progress-track">
    <div class="cf-rt-progress-bar" id="cf-progress-bar"></div>
  </div>

  <!-- Header -->
  <header class="cf-rt-header">
    <div class="cf-rt-header-title">{safe_title}</div>
    <div class="cf-rt-header-counter" id="cf-slide-counter">1 / 1</div>
  </header>

  <!-- Slide Container -->
  <main class="cf-rt-main">
    <div class="cf-rt-slide-container" id="cf-slide-container">
      <div class="cf-rt-loading">Loading course...</div>
    </div>
  </main>

  <!-- Navigation -->
  <nav class="cf-rt-nav">
    <button class="cf-rt-nav-btn" id="cf-prev-btn" onclick="window.__cfPrev ? window.__cfPrev() : window.__cfRuntime?.prevSlide()">
      &#8592; Previous
    </button>
    <button class="cf-rt-nav-btn cf-rt-nav-btn-primary" id="cf-next-btn" onclick="window.__cfNext ? window.__cfNext() : window.__cfRuntime?.nextSlide()">
      Next &#8594;
    </button>
  </nav>

  <!-- Course Data -->
  <script>window.__CF_COURSE_DATA = {course_json};</script>

  <!-- Runtime Bundle -->
  <script>{runtime_js}</script>
</body>
</html>"""


def _get_runtime_css() -> str:
    """Embedded CSS for the SCORM runtime player."""
    return """
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f0f11;
  color: #e4e4e7;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Progress */
.cf-rt-progress-track {
  position: fixed; top: 0; left: 0; right: 0; height: 3px;
  background: #27272a; z-index: 100;
}
.cf-rt-progress-bar {
  height: 100%; width: 0;
  background: linear-gradient(90deg, #8b1a1a, #c0392b);
  transition: width 0.4s ease;
}

/* Header */
.cf-rt-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 32px; background: #18181b; border-bottom: 1px solid #27272a;
  margin-top: 3px;
}
.cf-rt-header-title {
  font-size: 16px; font-weight: 600; color: #fafafa;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cf-rt-header-counter {
  font-size: 13px; color: #71717a; font-weight: 500;
  background: #27272a; padding: 4px 12px; border-radius: 20px;
}

/* Main */
.cf-rt-main {
  flex: 1; display: flex; justify-content: center;
  padding: 40px 24px 100px;
}
.cf-rt-slide-container {
  width: 100%; max-width: 780px;
  background: #18181b; border: 1px solid #27272a;
  border-radius: 16px; padding: 48px 40px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  min-height: 400px;
}

/* Loading */
.cf-rt-loading {
  text-align: center; color: #71717a; padding: 80px 0;
  font-size: 15px;
}

/* Slide title */
.cf-rt-slide-title {
  font-size: 28px; font-weight: 700; color: #fafafa;
  margin-bottom: 24px; line-height: 1.3;
  border-bottom: 1px solid #27272a; padding-bottom: 16px;
}

/* Components */
.cf-rt-component { margin-bottom: 20px; }
.cf-rt-heading { font-size: 22px; font-weight: 600; color: #fafafa; margin-bottom: 12px; }
.cf-rt-text { font-size: 15px; line-height: 1.75; color: #a1a1aa; }
.cf-rt-image {
  width: 100%; max-height: 500px; object-fit: contain;
  border-radius: 12px; background: #09090b;
}

/* Video */
.cf-rt-video-wrap {
  position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;
  border-radius: 12px; background: #000;
}
.cf-rt-video-embed {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;
}
.cf-rt-video { width: 100%; border-radius: 12px; background: #000; }

/* Button */
.cf-rt-button {
  background: linear-gradient(135deg, #8b1a1a, #c0392b);
  color: #fff; border: none; border-radius: 10px;
  padding: 12px 28px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit;
}
.cf-rt-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139,26,26,0.4); }

/* Quiz */
.cf-rt-quiz-block { padding: 0; }
.cf-rt-quiz-badge {
  font-size: 10px; font-weight: 700; letter-spacing: 0.15em;
  color: #c0392b; margin-bottom: 12px;
}
.cf-rt-quiz-question {
  font-size: 17px; font-weight: 600; color: #fafafa;
  margin-bottom: 16px; line-height: 1.5;
}
.cf-rt-quiz-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.cf-rt-quiz-option {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border: 1.5px solid #27272a;
  border-radius: 10px; cursor: pointer; transition: all 0.15s;
  background: #09090b;
}
.cf-rt-quiz-option:hover { border-color: #8b1a1a; background: #1a1a1e; }
.cf-rt-quiz-option input[type="radio"] { accent-color: #c0392b; width: 16px; height: 16px; }
.cf-rt-quiz-option-text { font-size: 14px; color: #d4d4d8; }
.cf-rt-quiz-submit {
  background: linear-gradient(135deg, #8b1a1a, #c0392b);
  color: #fff; border: none; border-radius: 8px;
  padding: 10px 24px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.cf-rt-quiz-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.cf-rt-quiz-feedback { margin-top: 12px; font-size: 14px; font-weight: 500; padding: 10px 16px; border-radius: 8px; }
.cf-rt-feedback-correct { background: #052e16; color: #4ade80; border: 1px solid #166534; }
.cf-rt-feedback-incorrect { background: #2a0a0a; color: #f87171; border: 1px solid #7f1d1d; }
.cf-rt-feedback-info { background: #172554; color: #60a5fa; border: 1px solid #1e3a5f; }

/* Flashcard */
.cf-rt-flashcard-scene {
  perspective: 1000px; cursor: pointer; user-select: none;
}
.cf-rt-flashcard-inner {
  position: relative; min-height: 180px;
  transition: transform 0.55s cubic-bezier(0.4,0.2,0.2,1);
  transform-style: preserve-3d;
}
.cf-rt-flashcard-scene.flipped .cf-rt-flashcard-inner { transform: rotateY(180deg); }
.cf-rt-flashcard-face {
  position: absolute; inset: 0; backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 14px; padding: 28px; display: flex;
  flex-direction: column; justify-content: center; min-height: 180px;
}
.cf-rt-flashcard-front {
  background: linear-gradient(145deg, #1a0a0a, #3d1010, #6b1a1a);
  border: 1px solid #4d2020; color: #fff;
}
.cf-rt-flashcard-back {
  background: #fafafa; border: 2px solid #e8c8c8; color: #1a0a0a;
  transform: rotateY(180deg);
}
.cf-rt-flashcard-label { font-size: 10px; font-weight: 700; letter-spacing: 0.15em; opacity: 0.5; margin-bottom: 12px; }
.cf-rt-flashcard-text { font-size: 17px; font-weight: 600; line-height: 1.5; }
.cf-rt-flashcard-hint { font-size: 11px; opacity: 0.4; margin-top: 16px; }

/* Layers */
.cf-rt-layer { transition: opacity 0.3s ease; }

/* Navigation */
.cf-rt-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: center; gap: 12px;
  padding: 16px 24px; background: #18181b;
  border-top: 1px solid #27272a; z-index: 50;
}
.cf-rt-nav-btn {
  padding: 10px 24px; border-radius: 10px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  border: 1.5px solid #27272a; background: #09090b;
  color: #a1a1aa; transition: all 0.15s; font-family: inherit;
}
.cf-rt-nav-btn:hover:not(:disabled) { border-color: #3f3f46; color: #fafafa; }
.cf-rt-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.cf-rt-nav-btn-primary {
  background: linear-gradient(135deg, #8b1a1a, #c0392b);
  color: #fff; border-color: transparent;
}
.cf-rt-nav-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(139,26,26,0.4); }

/* Toast */
.cf-rt-toast {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 500;
  animation: cf-toast-in 0.3s ease; z-index: 200;
}
.cf-rt-toast-correct { background: #052e16; color: #4ade80; border: 1px solid #166534; }
.cf-rt-toast-incorrect { background: #2a0a0a; color: #f87171; border: 1px solid #7f1d1d; }
.cf-rt-toast-info { background: #172554; color: #60a5fa; border: 1px solid #1e3a5f; }
.cf-rt-toast-exit { animation: cf-toast-out 0.3s ease forwards; }
@keyframes cf-toast-in { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
@keyframes cf-toast-out { to { opacity:0; transform: translateX(-50%) translateY(10px); } }
"""


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------

def build_course_definition(title: str, blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build a complete CourseDefinition from authoring blocks."""
    slides = blocks_to_slides(blocks)
    triggers = generate_quiz_triggers(slides)

    return {
        "id": _make_id("course"),
        "title": title,
        "version": "1.0.0",
        "slides": slides,
        "triggers": triggers,
        "variables": [],
    }
