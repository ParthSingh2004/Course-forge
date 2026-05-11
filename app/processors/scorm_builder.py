import json
import os
import re
import uuid
import html as html_module
from urllib.parse import parse_qs, urlparse
from typing import List, Dict, Any

DEFAULT_FLASHCARD_COLOR = "#8b1a1a"


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _sanitize_hex_color(value: Any, fallback: str = DEFAULT_FLASHCARD_COLOR) -> str:
    raw = str(value or "").strip()
    return raw if re.fullmatch(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})", raw) else fallback


def _expand_hex_color(value: str) -> str:
    clean = _sanitize_hex_color(value)[1:]
    return "".join(ch * 2 for ch in clean) if len(clean) == 3 else clean


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    full = _expand_hex_color(value)
    return int(full[0:2], 16), int(full[2:4], 16), int(full[4:6], 16)


def _rgb_to_hex(r: float, g: float, b: float) -> str:
    return "#{:02x}{:02x}{:02x}".format(
        round(_clamp(r, 0, 255)),
        round(_clamp(g, 0, 255)),
        round(_clamp(b, 0, 255)),
    )


def _mix_hex(hex_color: str, target_hex: str, amount: float) -> str:
    r1, g1, b1 = _hex_to_rgb(hex_color)
    r2, g2, b2 = _hex_to_rgb(target_hex)
    return _rgb_to_hex(
        r1 + (r2 - r1) * amount,
        g1 + (g2 - g1) * amount,
        b1 + (b2 - b1) * amount,
    )


def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    r, g, b = _hex_to_rgb(hex_color)
    return f"rgba({r}, {g}, {b}, {alpha})"


def _flashcard_theme(color: Any) -> Dict[str, str]:
    base = _sanitize_hex_color(color)
    return {
        "base": base,
        "front_bg": f"linear-gradient(145deg, {_mix_hex(base, '#000000', 0.72)} 0%, {_mix_hex(base, '#000000', 0.48)} 60%, {_mix_hex(base, '#ffffff', 0.12)} 100%)",
        "front_border": _mix_hex(base, "#ffffff", 0.18),
        "front_shadow": _hex_to_rgba(base, 0.28),
        "back_bg": f"linear-gradient(145deg, {_mix_hex(base, '#ffffff', 0.94)} 0%, {_mix_hex(base, '#ffffff', 0.84)} 100%)",
        "back_border": _mix_hex(base, "#ffffff", 0.58),
        "back_shadow": _hex_to_rgba(base, 0.14),
        "front_badge": "rgba(255,255,255,0.68)",
        "back_badge": _mix_hex(base, "#ffffff", 0.28),
        "back_text": _mix_hex(base, "#000000", 0.82),
    }


def _count_fill_blank_placeholders(question: Any) -> int:
    return len(re.findall(r"____", str(question or "")))


def _normalize_fill_blank_answers(block: Dict[str, Any]) -> List[str]:
    answers = block.get("answers")
    explicit_answer_count = len(answers) if isinstance(answers, list) else 0
    desired_count = max(explicit_answer_count, _count_fill_blank_placeholders(block.get("question", "")), 1)
    if isinstance(answers, list) and len(answers) > 0:
        source = [str(answer or "") for answer in answers]
    else:
        source = [str(block.get("answer", "") or "")]
    return [source[idx] if idx < len(source) else "" for idx in range(desired_count)]
 
 
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


def _to_embeddable_video_url(url: str) -> str:
    """Convert public video page URLs into iframe-safe embed URLs."""
    if not url:
        return ""

    raw_url = url.strip()
    parsed = urlparse(raw_url)
    host = parsed.netloc.lower().replace("www.", "")
    path = parsed.path.strip("/")

    if host in ("youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"):
        video_id = ""
        if path == "watch":
            video_id = (parse_qs(parsed.query).get("v") or [""])[0]
        elif path.startswith(("embed/", "shorts/", "live/")):
            video_id = path.split("/", 1)[1].split("/", 1)[0]

        if re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id or ""):
            return f"https://www.youtube.com/embed/{video_id}?rel=0"

    if host == "youtu.be":
        video_id = path.split("/", 1)[0]
        if re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id or ""):
            return f"https://www.youtube.com/embed/{video_id}?rel=0"

    if host == "vimeo.com":
        match = re.search(r"(\d+)", path)
        if match:
            return f"https://player.vimeo.com/video/{match.group(1)}"

    return raw_url


def _resolve_image_src(block: Dict[str, Any]) -> str:
    """Resolve image-like source fields used by authoring blocks."""
    return (
        block.get("image")
        or block.get("imageUrl")
        or block.get("src")
        or (block.get("data") or {}).get("image")
        or ""
    )
 
 
def _block_to_component_raw(block: Dict[str, Any], idx: int) -> Dict[str, Any]:
    """Convert an authoring block into a runtime Component (raw)."""
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
        src = _resolve_image_src(block)
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
            "src": _to_embeddable_video_url(url),
            "embedType": _detect_embed_type(url),
        }
        if block.get("mandatory"):
            comp["mandatory"] = True
        return comp
 
    if btype == "image-hotspot":
        return {
            "type": "image-hotspot",
            "id": bid,
            "src": _resolve_image_src(block),
            "hotspots": block.get("hotspots", []),
        }

    if btype == "interactive-video":
        url = block.get("videoUrl") or block.get("video_url") or ""
        interactions = []
        for interaction in block.get("interactions", []):
            if not isinstance(interaction, dict):
                continue
            interactions.append({
                **interaction,
                "requireCorrectToContinue": interaction.get("requireCorrectToContinue", True),
            })
        comp = {
            "type": "interactive-video",
            "id": bid,
            "src": _to_embeddable_video_url(url),
            "embedType": _detect_embed_type(url),
            "interactions": interactions
        }
        if block.get("mandatory"):
            comp["mandatory"] = True
        return comp
 
    if btype == "button":
        return {
            "type": "button",
            "id": bid,
            "label": block.get("content") or block.get("label") or "Button",
            "targetSlideId": str(block.get("targetSlideId") or ""),
            "alignment": str(block.get("alignment") or "center"),
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
            "marks": block.get("marks"),
        }
        if block.get("mandatory"):
            comp["mandatory"] = True
        return comp
 
    if btype == "multi_select":
        comp = {
            "type": "multi_select",
            "id": bid,
            "question": block.get("question", ""),
            "options": block.get("options", []),
            "correctAnswer": block.get("correctAnswer", []),
            "feedback": {
                "correct": "Correct!",
                "incorrect": "Incorrect. Try again.",
            },
            "marks": block.get("marks"),
        }
        if block.get("mandatory"):
            comp["mandatory"] = True
        return comp
 
    if btype == "matching":
        comp = {
            "type": "matching",
            "id": bid,
            "question": block.get("question", ""),
            "pairs": block.get("pairs", []),
            "feedback": {
                "correct": "Correct!",
                "incorrect": "Incorrect. Try again.",
            },
            "marks": block.get("marks"),
        }
        if block.get("mandatory"):
            comp["mandatory"] = True
        return comp
 
    if btype == "flashcard":
        flashcard_color = _sanitize_hex_color(block.get("color"))
        flashcard_theme = _flashcard_theme(flashcard_color)
        return {
            "type": "flashcard",
            "id": bid,
            "front": block.get("front", ""),
            "back": block.get("back", ""),
            "color": flashcard_color,
            "frontBackground": flashcard_theme["front_bg"],
            "frontBorder": flashcard_theme["front_border"],
            "frontShadow": flashcard_theme["front_shadow"],
            "backBackground": flashcard_theme["back_bg"],
            "backBorder": flashcard_theme["back_border"],
            "backShadow": flashcard_theme["back_shadow"],
            "frontBadgeColor": flashcard_theme["front_badge"],
            "backBadgeColor": flashcard_theme["back_badge"],
            "backTextColor": flashcard_theme["back_text"],
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
 
    if btype == "audio":
        comp = {
            "type": "audio",
            "id": bid,
            # src is a relative media/ path, resolved during export packaging
            "src": block.get("src") or block.get("audioUrl", ""),
            "label": block.get("label", "Audio Track"),
            "mediaId": block.get("mediaId", ""),
        }
        if block.get("mandatory"):
            comp["mandatory"] = True
        return comp
 
    if btype == "true_false":
        comp = {
            "type": "true_false",
            "id": bid,
            "question": block.get("question", ""),
            "correctAnswer": block.get("correctAnswer", True),
            "marks": block.get("marks"),
        }
        if block.get("isMandatory") or block.get("mandatory"):
            comp["mandatory"] = True
        return comp
 
    if btype == "fill_blanks":
        answers = _normalize_fill_blank_answers(block)
        comp = {
            "type": "fill_blanks",
            "id": bid,
            "question": block.get("question", ""),
            "answer": answers[0] if answers else "",
            "answers": answers,
            "caseSensitive": bool(block.get("caseSensitive", False)),
            "marks": block.get("marks"),
        }
        if block.get("isMandatory") or block.get("mandatory"):
            comp["mandatory"] = True
        return comp
 
    if btype == "table":
        return {
            "type": "table",
            "id": bid,
            "headers": block.get("headers", []),
            "rows": block.get("rows", []),
        }

    if btype == "columns":
        raw_cols = block.get("columns")
        if not isinstance(raw_cols, list) or len(raw_cols) == 0:
            raw_cols = [[], []]
        serialized_cols = []
        for col in raw_cols:
            if not isinstance(col, list):
                col = []
            serialized_sub = []
            for sub in col:
                stype = (sub.get("type") or "").lower().strip()
                if stype == "text":
                    serialized_sub.append({
                        "type": "text",
                        "id": str(sub.get("id", _make_id("sub"))),
                        "content": sub.get("content", ""),
                    })
                elif stype == "image":
                    src = _resolve_image_src(sub)
                    serialized_sub.append({
                        "type": "image",
                        "id": str(sub.get("id", _make_id("sub"))),
                        "src": src,
                        "alt": sub.get("alt", ""),
                        "caption": sub.get("caption", ""),
                    })
            serialized_cols.append(serialized_sub)
        return {
            "type": "columns",
            "id": bid,
            "columns": serialized_cols,
        }
 
    # Fallback: treat as text
    return {
        "type": "text",
        "id": bid,
        "content": block.get("content", str(block)),
    }
 
 
def _block_to_component(block: Dict[str, Any], idx: int) -> Dict[str, Any]:
    comp = _block_to_component_raw(block, idx)
    allowed_animations = {
        "none",
        "fade-in",
        "fade-in-up",
        "slide-in-left",
        "slide-in-right",
        "slide-in-up",
        "slide-in-down",
        "zoom-in",
        "zoom-out",
        "flip-in",
        "bounce-in",
    }
    animation = block.get("animation", "none")
    comp["animation"] = animation if animation in allowed_animations else "none"
    comp["animationDelay"] = block.get("animationDelay", 0)
    return comp


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
                "background": block.get("background", {"type": "color", "value": "#ffffff"}),
                "bgAudio": block.get("bgAudio"),
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
 
 
 
def generate_manifest(
    title: str,
    identifier: str = "CourseForge_Course",
    media_files: list = None,
    mastery_score: float | int | None = None,
) -> str:
    safe_title = html_module.escape(title)
    safe_id = identifier.replace(" ", "_")
    mastery_score_xml = ""
    if mastery_score is not None:
        try:
            resolved_mastery = max(0, min(100, round(float(mastery_score))))
            mastery_score_xml = f"\n        <adlcp:masteryscore>{resolved_mastery}</adlcp:masteryscore>"
        except (TypeError, ValueError):
            mastery_score_xml = ""
 
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
{mastery_score_xml}
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
    return r"""
(function() {
  'use strict';
 
  // ---------------------------------------------------------------------------
  // SCORM 1.2 API DISCOVERY
  // ---------------------------------------------------------------------------
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
 
  if (API) {
    try { API.LMSInitialize(''); } catch(e) {}
  }
 
  var courseData = window.__CF_COURSE_DATA;
  if (!courseData) return;
 
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  var currentSlide    = 0;
  var slides          = courseData.slides || [];
  var visitedSlides   = {};
  var bgAudioElement  = null;
 
  // FIX: Single flag that gates status writes — set to true the moment the
  //      LMS receives 'passed'. Prevents renderSlide() from overwriting it
  //      with 'incomplete' on subsequent navigation.
  var coursePassedFlag = false;
 
  // Build mandatory-component index and weightage map up-front
  var mandatoryIds  = {};   // compId → true  (must complete to unlock scoring)
  var weightageMap  = {};   // compId → marks (positive integer)
  var scorableComps = {};   // compId → true|false  (true = answered correctly)
  var mandatoryCompleted = {};  // compId → true
 
  for (var si = 0; si < slides.length; si++) {
    var sLayers = slides[si].layers || [];
    for (var li2 = 0; li2 < sLayers.length; li2++) {
      var sComps = sLayers[li2].components || [];
      for (var ci2 = 0; ci2 < sComps.length; ci2++) {
        var c = sComps[ci2];
        if (c.mandatory) mandatoryIds[c.id] = true;
        if (c.type === 'quiz' || c.type === 'true_false' || c.type === 'fill_blanks' || c.type === 'multi_select' || c.type === 'matching') {
          weightageMap[c.id] = (typeof c.marks === 'number' && c.marks > 0) ? c.marks : 1;
        }
      }
    }
  }
 
  // ---------------------------------------------------------------------------
  // SCORE CALCULATION
  // Always returns a normalised 0-100 percentage alongside raw marks so that
  // both the lesson_status and score CMI fields are consistent.
  // ---------------------------------------------------------------------------
  function calculateScore() {
    var maxPossible = 0;
    var earned      = 0;
    for (var cid in weightageMap) {
      maxPossible += weightageMap[cid];
      if (typeof scorableComps[cid] === 'number') {
        var normalized = Math.max(0, Math.min(1, Number(scorableComps[cid]) || 0));
        earned += weightageMap[cid] * normalized;
      } else if (scorableComps[cid] === true) {
        earned += weightageMap[cid];
      }
    }
    if (maxPossible === 0) {
      // No scorable interactions — treat as full marks (content-only course)
      return { raw: 0, max: 0, pct: 100 };
    }
    var pct = Math.round((earned / maxPossible) * 100);
    return { raw: earned, max: maxPossible, pct: pct };
  }
 
  // ---------------------------------------------------------------------------
  // PASSING SCORE RESOLUTION
  // FIX: Declare passingScore before the try block so the catch branch can
  //      still fall through to the policy default without leaving it as NaN.
  // Priority: LMS mastery_score > courseData.policy.passingScore > 80
  // ---------------------------------------------------------------------------
  function getPassingScore() {
    var passing = NaN;
    try {
      if (API) {
        var lmsMastery = API.LMSGetValue('cmi.student_data.mastery_score');
        passing = parseFloat(lmsMastery);
      }
    } catch(e) {
      passing = NaN;
    }
    if (isNaN(passing) || passing <= 0) {
      var policy = courseData.policy || {};
      passing = (typeof policy.passingScore === 'number' && policy.passingScore > 0)
        ? policy.passingScore
        : 80;
    }
    return passing;
  }
 
  // ---------------------------------------------------------------------------
  // COMPLETION CHECK — called after every interaction and slide render
  // ---------------------------------------------------------------------------
  function checkCompletion() {
    // FIX: Once the LMS has received 'passed', never re-evaluate. The learner
    //      has succeeded; further navigation must not downgrade the status.
    if (coursePassedFlag) return;
 
    // Gate 1 — all mandatory components must be completed
    var allMandatoryDone = true;
    var hasMandatory     = false;
    for (var mid in mandatoryIds) {
      hasMandatory = true;
      if (!mandatoryCompleted[mid]) {
        allMandatoryDone = false;
        break;
      }
    }
    if (!allMandatoryDone) return;

    // FIX Gate 2 — if the course has scorable interactions, require at least
    //      one attempt before committing any status. This prevents a zero-
    //      attempt course from being auto-passed on the very first slide load.
    var hasScorable    = Object.keys(weightageMap).length > 0;
    var hasAnyAttempt  = Object.keys(scorableComps).length > 0;
    if (hasScorable && !hasAnyAttempt) return;
 
    if (!API) return;
 
    var result       = calculateScore();
    // FIX: Always send a normalised 0-100 score so score.raw/score.max is
    //      unambiguous regardless of how many raw marks the course uses.
    //      The LMS mastery_score threshold is also expressed as 0-100.
    var normScore    = hasScorable ? result.pct : 100;
    var passingScore = getPassingScore();
    var status       = (normScore >= passingScore) ? 'passed' : 'failed';
 
    try {
      API.LMSSetValue('cmi.core.score.min', '0');
      API.LMSSetValue('cmi.core.score.max', '100');
      API.LMSSetValue('cmi.core.score.raw', String(normScore));
      API.LMSSetValue('cmi.core.lesson_status', status);
      API.LMSCommit('');
    } catch(e) {}
 
    if (status === 'passed') {
      // FIX: Lock the flag so renderSlide() can no longer overwrite 'passed'
      coursePassedFlag = true;
    }
 
    console.log(
      '[Runtime] lesson_status=' + status +
      ' score=' + normScore + '/100' +
      ' (raw ' + result.raw + '/' + result.max + ' marks)' +
      ' pass_threshold=' + passingScore + '%'
    );
  }

  function areMandatoryItemsComplete(slide) {
    var layers = (slide && slide.layers) || [];
    for (var li = 0; li < layers.length; li++) {
      var comps = layers[li].components || [];
      for (var ci = 0; ci < comps.length; ci++) {
        var comp = comps[ci];
        if (mandatoryIds[comp.id] && !mandatoryCompleted[comp.id]) {
          return false;
        }
      }
    }
    return true;
  }

  function showRuntimeToast(message, type) {
    var existing = document.querySelector('.cf-rt-toast');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var toast = document.createElement('div');
    toast.className = 'cf-rt-toast cf-rt-toast-' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.classList.add('cf-rt-toast-exit');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2200);
  }

  function canNavigateToSlide(targetIdx) {
    if (targetIdx > currentSlide) {
      for (var si = currentSlide; si < targetIdx; si++) {
        var slideToCheck = slides[si];
        if (slideToCheck && !areMandatoryItemsComplete(slideToCheck)) {
          showRuntimeToast('Please complete all mandatory items on intermediate slides', 'info');
          return false;
        }
      }
    }
    return true;
  }
 
  // ---------------------------------------------------------------------------
  // SLIDE RENDERER
  // ---------------------------------------------------------------------------
  function renderSlide(idx) {
    var slide = slides[idx];
    if (!slide) return;
    var container = document.getElementById('cf-slide-container');
    if (!container) return;

    var bg = slide.background || null;
    if (bg) {
      if (bg.type === 'color' && bg.value) {
        container.style.backgroundColor = bg.value;
        container.style.backgroundImage = 'none';
      } else if (bg.type === 'image' && bg.value) {
        container.style.backgroundColor = '#ffffff';
        container.style.backgroundImage = 'url("' + bg.value + '")';
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
      }
    } else {
      container.style.backgroundColor = '#ffffff';
      container.style.backgroundImage = 'none';
    }

    var bgAudio = slide.bgAudio || null;
    var bgAudioSrc = bgAudio ? (bgAudio.src || bgAudio.url || '') : '';
    if (bgAudioSrc) {
      if (!bgAudioElement) {
        bgAudioElement = document.createElement('audio');
        bgAudioElement.loop = true;
      }
      var resolvedBgAudioSrc = new URL(bgAudioSrc, window.location.href).href;
      if (bgAudioElement.src !== resolvedBgAudioSrc) {
        bgAudioElement.pause();
        bgAudioElement.src = resolvedBgAudioSrc;
        bgAudioElement.currentTime = 0;
      }
      bgAudioElement.play().catch(function() {});
    } else if (bgAudioElement) {
      bgAudioElement.pause();
      bgAudioElement.removeAttribute('src');
      bgAudioElement.load();
    }

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
        } else if (comp.type === 'image-hotspot') {
          el.style.position = 'relative';
          el.style.display = 'inline-block';
          el.style.width = '100%';

          var hotspotImg = document.createElement('img');
          hotspotImg.className = 'cf-rt-image';
          hotspotImg.src = comp.src || '';
          hotspotImg.alt = comp.alt || 'Hotspot image';
          hotspotImg.style.width = '100%';
          hotspotImg.style.display = 'block';
          hotspotImg.style.borderRadius = '8px';
          el.appendChild(hotspotImg);

          var activeHotspotId = null;
          var activeHotspotPopup = null;

          function closeHotspotPopup() {
            if (activeHotspotPopup) {
              activeHotspotPopup.remove();
              activeHotspotPopup = null;
            }
            activeHotspotId = null;
          }

          var hotspotItems = comp.hotspots || [];
          for (var hi = 0; hi < hotspotItems.length; hi++) {
            (function(hotspot) {
              var dot = document.createElement('button');
              dot.type = 'button';
              dot.setAttribute('aria-label', hotspot.title || 'Hotspot');
              dot.style.position = 'absolute';
              dot.style.left = hotspot.x + '%';
              dot.style.top = hotspot.y + '%';
              dot.style.width = '24px';
              dot.style.height = '24px';
              dot.style.backgroundColor = '#b91c1c';
              dot.style.borderRadius = '50%';
              dot.style.border = '2px solid white';
              dot.style.transform = 'translate(-50%, -50%)';
              dot.style.cursor = 'pointer';
              dot.style.zIndex = '10';
              dot.style.padding = '0';

              dot.onclick = function(evt) {
                evt.stopPropagation();
                if (activeHotspotId === hotspot.id) {
                  closeHotspotPopup();
                  return;
                }

                closeHotspotPopup();
                activeHotspotId = hotspot.id;
                activeHotspotPopup = document.createElement('div');
                activeHotspotPopup.style.position = 'absolute';
                activeHotspotPopup.style.top = '50%';
                activeHotspotPopup.style.left = '50%';
                activeHotspotPopup.style.transform = 'translate(-50%, -50%)';
                activeHotspotPopup.style.background = '#000';
                activeHotspotPopup.style.border = '1px solid #404040';
                activeHotspotPopup.style.color = '#fff';
                activeHotspotPopup.style.padding = '1rem';
                activeHotspotPopup.style.borderRadius = '6px';
                activeHotspotPopup.style.zIndex = '50';
                activeHotspotPopup.style.minWidth = '250px';

                var popupHeader = document.createElement('div');
                popupHeader.style.display = 'flex';
                popupHeader.style.justifyContent = 'space-between';
                popupHeader.style.alignItems = 'center';
                popupHeader.style.marginBottom = '0.5rem';

                var popupTitle = document.createElement('h4');
                popupTitle.style.margin = '0';
                popupTitle.style.fontSize = '1.1rem';
                popupTitle.textContent = hotspot.title || 'Hotspot';

                var popupClose = document.createElement('button');
                popupClose.type = 'button';
                popupClose.textContent = 'X';
                popupClose.style.background = 'transparent';
                popupClose.style.border = 'none';
                popupClose.style.color = '#a3a3a3';
                popupClose.style.cursor = 'pointer';
                popupClose.onclick = closeHotspotPopup;

                popupHeader.appendChild(popupTitle);
                popupHeader.appendChild(popupClose);

                var popupContent = document.createElement('p');
                popupContent.style.margin = '0';
                popupContent.style.fontSize = '0.9rem';
                popupContent.style.lineHeight = '1.5';
                popupContent.textContent = hotspot.content || '';

                activeHotspotPopup.appendChild(popupHeader);
                activeHotspotPopup.appendChild(popupContent);
                el.appendChild(activeHotspotPopup);
              };

              el.appendChild(dot);
            })(hotspotItems[hi]);
          }
        } else if (comp.type === 'quiz') {
          var opts = '';
          for (var oi = 0; oi < (comp.options||[]).length; oi++) {
            opts += '<label class="cf-rt-quiz-option"><input type="radio" name="q-' + comp.id + '" value="' + oi + '"/><span>' + comp.options[oi] + '</span></label>';
          }
          el.innerHTML = '<div class="cf-rt-quiz-badge">QUIZ</div><div class="cf-rt-quiz-question">' + comp.question + '</div><div class="cf-rt-quiz-options">' + opts + '</div><div id="fb-' + comp.id + '" style="margin-top:10px;font-size:13px;font-weight:600;"></div><button id="quiz-btn-' + comp.id + '" class="cf-rt-quiz-submit" disabled>Submit</button>';
          (function(q) {
            setTimeout(function() {
              var btn = document.getElementById('quiz-btn-' + q.id);
              var radios = document.querySelectorAll('input[name="q-' + q.id + '"]');
              radios.forEach(function(radio) {
                radio.addEventListener('change', function() {
                  if (btn) btn.disabled = false;
                });
              });
              if (!btn) return;
              btn.addEventListener('click', function() {
                var sel = document.querySelector('input[name="q-' + q.id + '"]:checked');
                if (!sel) return;
                var correct = (Number(sel.value) === (q.correctAnswer || 0));
                scorableComps[q.id] = correct;
                mandatoryCompleted[q.id] = true;
                if (correct) {
                  btn.disabled = true;
                  btn.textContent = 'Submitted';
                  radios.forEach(function(r) { r.disabled = true; });
                } else {
                  btn.disabled = false;
                }
                var fb = document.getElementById('fb-' + q.id);
                if (fb) fb.innerHTML = correct
                  ? '<span style="color:#4ade80">' + ((q.feedback && q.feedback.correct) || 'Correct!') + '</span>'
                  : '<span style="color:#f87171">' + ((q.feedback && q.feedback.incorrect) || 'Incorrect. Try again.') + '</span>';
                checkCompletion();
              });
            }, 0);
          })(comp);
        } else if (comp.type === 'true_false') {
          var tfId = comp.id;
          var tfCorrect = comp.correctAnswer === true ? 'true' : 'false';
          el.innerHTML = '<div class="cf-rt-quiz-badge">TRUE / FALSE</div>' +
            '<div class="cf-rt-quiz-question">' + comp.question + '</div>' +
            '<div style="display:flex;gap:10px;margin-top:12px;">' +
              '<button id="tf-true-' + tfId + '" style="flex:1;padding:10px;border-radius:8px;border:2px solid #e8d0d0;background:#ffffff;color:#1a0a0a;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;" onclick="__cfTFSubmit(\'' + tfId + '\',true,\'' + tfCorrect + '\')">✓ True</button>' +
              '<button id="tf-false-' + tfId + '" style="flex:1;padding:10px;border-radius:8px;border:2px solid #e8d0d0;background:#ffffff;color:#1a0a0a;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;" onclick="__cfTFSubmit(\'' + tfId + '\',false,\'' + tfCorrect + '\')">✗ False</button>' +
            '</div>' +
            '<div id="fb-' + tfId + '" style="margin-top:10px;font-size:13px;font-weight:600;"></div>';
        } else if (comp.type === 'fill_blanks') {
          var fbId = comp.id;
          var fbCS = comp.caseSensitive ? 'true' : 'false';
          var fbAnswers = Array.isArray(comp.answers) && comp.answers.length ? comp.answers : [comp.answer || ''];
          var fbAnsSafe = JSON.stringify(fbAnswers).replace(/'/g, "&#39;");
          var fbQuestion = comp.question ? String(comp.question) : "";
          fbQuestion += '<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">';
          for (var fi = 0; fi < fbAnswers.length; fi++) {
            fbQuestion += '<input id="fitb-' + fbId + '-' + fi + '" type="text" placeholder="Answer ' + (fi + 1) + '" style="padding:10px 14px;border-radius:8px;border:1.5px solid #e8d0d0;background:#ffffff;color:#1a0a0a;font-size:14px;outline:none;font-family:inherit;"/>';
          }
          fbQuestion += '</div>';
          el.innerHTML = '<div class="cf-rt-quiz-badge">FILL IN THE BLANK</div>' +
            '<div class="cf-rt-quiz-question">' + fbQuestion + '</div>' +
            '<div style="margin-top:12px;display:flex;gap:8px;align-items:center;">' +
              "<button id=\"fitb-btn-" + fbId + "\" class=\"cf-rt-quiz-submit\" onclick='__cfFITBSubmit(\"" + fbId + "\", " + fbAnsSafe + ", " + fbCS + ")'>Submit</button>" +
            '</div>' +
            '<div id="fb-' + fbId + '" style="margin-top:10px;font-size:13px;font-weight:600;"></div>';
        } else if (comp.type === 'multi_select') {
          var msId = comp.id;
          var msOpts = '';
          for (var mi = 0; mi < (comp.options || []).length; mi++) {
            msOpts += '<label class="cf-rt-quiz-option"><input type="checkbox" name="ms-' + msId + '" value="' + mi + '"/><span>' + comp.options[mi] + '</span></label>';
          }
          el.innerHTML = '<div class="cf-rt-quiz-badge">MULTI-SELECT</div>' +
            '<div class="cf-rt-quiz-question">' + (comp.question || '') + '</div>' +
            '<div class="cf-rt-quiz-options">' + msOpts + '</div>' +
            '<button id="ms-btn-' + msId + '" class="cf-rt-quiz-submit" disabled>Submit Answer</button>' +
            '<div id="fb-' + msId + '" class="cf-rt-quiz-feedback"></div>';
          (function(msComp) {
            setTimeout(function() {
              var btn = document.getElementById('ms-btn-' + msComp.id);
              var boxes = document.querySelectorAll('input[name="ms-' + msComp.id + '"]');
              boxes.forEach(function(box) {
                box.addEventListener('change', function() {
                  var anyChecked = Array.prototype.some.call(boxes, function(b) { return b.checked; });
                  if (btn) btn.disabled = !anyChecked;
                });
              });
              if (!btn) return;
              btn.addEventListener('click', function() {
                var selected = Array.prototype.filter.call(boxes, function(b) { return b.checked; }).map(function(b) { return String(b.value); });
                var correctAnswers = (msComp.correctAnswer || []).map(function(v) { return String(v); });
                var correct = selected.length === correctAnswers.length && selected.every(function(v) { return correctAnswers.indexOf(v) !== -1; });
                scorableComps[msComp.id] = correct;
                mandatoryCompleted[msComp.id] = true;
                var fb = document.getElementById('fb-' + msComp.id);
                if (fb) fb.innerHTML = correct ? '<span style="color:#4ade80">\u2713 Correct!</span>' : '<span style="color:#f87171">\u2717 Incorrect. Try again.</span>';
                if (correct) {
                  boxes.forEach(function(b) { b.disabled = true; });
                  btn.disabled = true;
                  btn.textContent = 'Submitted';
                } else {
                  btn.disabled = false;
                }
                checkCompletion();
              });
            }, 0);
          })(comp);
        } else if (comp.type === 'matching') {
          var mtId = comp.id;
          var rightItems = (comp.pairs || []).map(function(p) { return p.rightItem || ''; });
          for (var ri = rightItems.length - 1; ri > 0; ri--) {
            var rj = Math.floor(Math.random() * (ri + 1));
            var tmp = rightItems[ri];
            rightItems[ri] = rightItems[rj];
            rightItems[rj] = tmp;
          }
          var pairsHtml = '';
          for (var mpi = 0; mpi < (comp.pairs || []).length; mpi++) {
            var pair = comp.pairs[mpi] || {};
            var optionsHtml = '<option value="">Select match...</option>';
            for (var rmi = 0; rmi < rightItems.length; rmi++) {
              var safeRight = String(rightItems[rmi]).replace(/"/g, '&quot;');
              optionsHtml += '<option value="' + safeRight + '">' + rightItems[rmi] + '</option>';
            }
            pairsHtml += '<div style="display:flex;gap:10px;margin-bottom:10px;align-items:center;">' +
              '<div style="flex:1;padding:10px;background:#18181b;border-radius:6px;color:#fafafa;border:1px solid #27272a;">' + (pair.leftItem || '') + '</div>' +
              '<select class="cf-rt-match-select" data-match-id="' + mtId + '" data-pair-idx="' + mpi + '" style="flex:1;padding:10px;background:#ffffff;border-radius:6px;color:#1a0a0a;border:1px solid #e8d0d0;outline:none;">' + optionsHtml + '</select>' +
            '</div>';
          }
          el.innerHTML = '<div class="cf-rt-quiz-badge">MATCHING</div>' +
            '<div class="cf-rt-quiz-question">' + (comp.question || '') + '</div>' +
            '<div class="cf-rt-match-container" style="margin-top:1rem;">' + pairsHtml + '</div>' +
            '<button id="mt-btn-' + mtId + '" class="cf-rt-quiz-submit" disabled>Submit Answer</button>' +
            '<div id="fb-' + mtId + '" class="cf-rt-quiz-feedback"></div>';
          (function(mtComp) {
            setTimeout(function() {
              var btn = document.getElementById('mt-btn-' + mtComp.id);
              var selects = document.querySelectorAll('select[data-match-id="' + mtComp.id + '"]');
              selects.forEach(function(sel) {
                sel.addEventListener('change', function() {
                  var allSelected = Array.prototype.every.call(selects, function(s) { return s.value !== ''; });
                  if (btn) btn.disabled = !allSelected;
                });
              });
              if (!btn) return;
              btn.addEventListener('click', function() {
                var correct = true;
                selects.forEach(function(sel) {
                  var idx = parseInt(sel.getAttribute('data-pair-idx') || '0', 10);
                  var expected = mtComp.pairs[idx] ? mtComp.pairs[idx].rightItem : '';
                  if (sel.value !== expected) correct = false;
                });
                scorableComps[mtComp.id] = correct;
                mandatoryCompleted[mtComp.id] = true;
                var fb = document.getElementById('fb-' + mtComp.id);
                if (fb) fb.innerHTML = correct ? '<span style="color:#4ade80">\u2713 Correct!</span>' : '<span style="color:#f87171">\u2717 Incorrect. Try again.</span>';
                if (correct) {
                  selects.forEach(function(s) { s.disabled = true; s.style.opacity = '0.6'; });
                  btn.disabled = true;
                  btn.textContent = 'Submitted';
                } else {
                  btn.disabled = false;
                }
                checkCompletion();
              });
            }, 0);
          })(comp);
        } else if (comp.type === 'table') {
          var tableHtml = '<div style="overflow-x:auto;margin-bottom:1rem;"><table style="width:100%;border-collapse:collapse;border:1px solid #3f3f46;color:#fafafa;font-size:14px;"><thead><tr>';
          for (var thi = 0; thi < (comp.headers || []).length; thi++) {
            tableHtml += '<th style="border:1px solid #3f3f46;padding:10px;background:#18181b;font-weight:600;text-align:left;">' + comp.headers[thi] + '</th>';
          }
          tableHtml += '</tr></thead><tbody>';
          for (var tri = 0; tri < (comp.rows || []).length; tri++) {
            tableHtml += '<tr>';
            var row = comp.rows[tri] || [];
            for (var tdi = 0; tdi < row.length; tdi++) {
              tableHtml += '<td style="border:1px solid #3f3f46;padding:10px;background:#09090b;">' + row[tdi] + '</td>';
            }
            tableHtml += '</tr>';
          }
          tableHtml += '</tbody></table></div>';
          el.innerHTML = tableHtml;
        } else if (comp.type === 'interactive-video') {
          if (comp.mandatory) {
            var ivBadge = document.createElement('div');
            ivBadge.id = 'mandatory-badge-' + comp.id;
            ivBadge.style.fontSize = '10px';
            ivBadge.style.fontWeight = '700';
            ivBadge.style.letterSpacing = '0.15em';
            ivBadge.style.padding = '4px 10px';
            ivBadge.style.borderRadius = '6px';
            ivBadge.style.marginBottom = '8px';
            ivBadge.style.display = 'inline-block';
            if (mandatoryCompleted[comp.id]) {
              ivBadge.textContent = '\u2713 COMPLETED';
              ivBadge.style.background = '#052e16';
              ivBadge.style.color = '#4ade80';
              ivBadge.style.border = '1px solid #166534';
            } else {
              ivBadge.textContent = '\u26a0 MANDATORY \u2014 Watch to continue';
              ivBadge.style.background = '#2a0a0a';
              ivBadge.style.color = '#f87171';
              ivBadge.style.border = '1px solid #7f1d1d';
            }
            el.appendChild(ivBadge);
          }
          if (comp.embedType === 'youtube' || comp.embedType === 'vimeo') {
            var ivMessage = document.createElement('div');
            ivMessage.style.padding = '24px';
            ivMessage.style.border = '1px solid #7f1d1d';
            ivMessage.style.borderRadius = '8px';
            ivMessage.style.background = '#1a0a0a';
            ivMessage.style.color = '#fca5a5';
            ivMessage.style.lineHeight = '1.5';
            ivMessage.innerHTML = '<strong>Interactive video requires an uploaded video file.</strong><br>YouTube and Vimeo embeds cannot expose playback timing to this SCORM player.';
            el.appendChild(ivMessage);
          } else {
            el.style.position = 'relative';
            var iv = document.createElement('video');
            iv.className = 'cf-rt-video';
            iv.controls = true;
            iv.src = comp.src || '';
            iv.style.width = '100%';
            iv.style.borderRadius = '8px';
            iv.style.background = '#000';
            el.appendChild(iv);

            var overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.inset = '0';
            overlay.style.background = 'rgba(0,0,0,0.9)';
            overlay.style.display = 'none';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.borderRadius = '8px';
            overlay.style.zIndex = '10';
            overlay.style.padding = '2rem';
            el.appendChild(overlay);

            var interactions = comp.interactions || [];
            if (comp.mandatory) {
              var ivMaxWatched = 0;
              iv.addEventListener('timeupdate', function() {
                if (!iv.seeking) {
                  ivMaxWatched = Math.max(ivMaxWatched, iv.currentTime);
                }
              });
              iv.addEventListener('seeking', function() {
                if (iv.currentTime > ivMaxWatched + 1) {
                  iv.currentTime = ivMaxWatched;
                }
              });
            }
            iv.addEventListener('timeupdate', function() {
              var currentTime = iv.currentTime;
              var hit = null;
              for (var ii = 0; ii < interactions.length; ii++) {
                var candidate = interactions[ii];
                var candidateTime = Number(candidate.timestamp || 0);
                if (!candidate.completed && currentTime >= candidateTime && currentTime <= candidateTime + 0.75) {
                  hit = candidate;
                  break;
                }
              }
              if (!hit || overlay.style.display !== 'none') return;

              iv.pause();
              overlay.innerHTML = '';
              overlay.style.display = 'flex';
              iv.controls = false;

              var box = document.createElement('div');
              box.style.textAlign = 'center';
              box.style.width = '100%';
              box.style.maxWidth = '500px';

              var question = document.createElement('h3');
              question.style.color = '#fff';
              question.style.marginBottom = '1.5rem';
              question.style.fontSize = '1.25rem';
              question.style.fontWeight = '600';
              question.textContent = hit.question || '';
              box.appendChild(question);

              var options = document.createElement('div');
              options.style.display = 'flex';
              options.style.flexDirection = 'column';
              options.style.gap = '0.75rem';

              (hit.options || []).forEach(function(opt, optionIndex) {
                var btn = document.createElement('button');
                btn.textContent = opt;
                btn.style.background = '#171717';
                btn.style.color = '#fff';
                btn.style.border = '1px solid #450a0a';
                btn.style.padding = '0.75rem';
                btn.style.borderRadius = '6px';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '1rem';
                btn.onclick = function() {
                  var requireCorrectToContinue = hit.requireCorrectToContinue !== false;
                  var answeredCorrectly = optionIndex === hit.correctAnswerIndex;
                  var feedbackId = 'quiz-feedback-' + hit.id;
                  var feedback = box.querySelector('#' + feedbackId);
                  if (!feedback) {
                    feedback = document.createElement('p');
                    feedback.id = feedbackId;
                    feedback.style.marginTop = '1rem';
                    feedback.style.fontWeight = '600';
                    box.appendChild(feedback);
                  }
                  if (answeredCorrectly) {
                    btn.style.background = '#16a34a';
                    feedback.textContent = 'Correct! You can now continue.';
                    feedback.style.color = '#4ade80';
                    options.querySelectorAll('button').forEach(function(b) {
                      b.disabled = true;
                      if (b !== btn) b.style.opacity = '0.5';
                    });
                    var continueBtn = document.createElement('button');
                    continueBtn.textContent = 'Continue Video';
                    continueBtn.style.background = '#8b1a1a';
                    continueBtn.style.color = '#fff';
                    continueBtn.style.padding = '0.75rem 2rem';
                    continueBtn.style.border = 'none';
                    continueBtn.style.borderRadius = '6px';
                    continueBtn.style.cursor = 'pointer';
                    continueBtn.style.fontWeight = '700';
                    continueBtn.style.marginTop = '1rem';
                    continueBtn.onclick = function() {
                      hit.completed = true;
                      overlay.style.display = 'none';
                      iv.controls = true;
                      iv.play();
                    };
                    box.appendChild(continueBtn);
                  } else if (!requireCorrectToContinue) {
                    feedback.textContent = 'Incorrect, but you can continue.';
                    feedback.style.color = '#fbbf24';
                    options.querySelectorAll('button').forEach(function(b) {
                      b.disabled = true;
                      if (b !== btn) b.style.opacity = '0.5';
                    });
                    var continueBtnWrong = document.createElement('button');
                    continueBtnWrong.textContent = 'Continue Video';
                    continueBtnWrong.style.background = '#8b1a1a';
                    continueBtnWrong.style.color = '#fff';
                    continueBtnWrong.style.padding = '0.75rem 2rem';
                    continueBtnWrong.style.border = 'none';
                    continueBtnWrong.style.borderRadius = '6px';
                    continueBtnWrong.style.cursor = 'pointer';
                    continueBtnWrong.style.fontWeight = '700';
                    continueBtnWrong.style.marginTop = '1rem';
                    continueBtnWrong.onclick = function() {
                      hit.completed = true;
                      overlay.style.display = 'none';
                      iv.controls = true;
                      iv.play();
                    };
                    box.appendChild(continueBtnWrong);
                  } else {
                    btn.style.background = '#7f1d1d';
                    feedback.textContent = 'Incorrect answer. Please try again.';
                    feedback.style.color = '#f87171';
                    setTimeout(function() { btn.style.background = '#171717'; }, 1200);
                  }
                };
                options.appendChild(btn);
              });

              box.appendChild(options);
              overlay.appendChild(box);
            });
            if (comp.mandatory) {
              iv.addEventListener('ended', function() {
                var allInteractionsCompleted = true;
                for (var ci = 0; ci < interactions.length; ci++) {
                  if (!interactions[ci].completed) {
                    allInteractionsCompleted = false;
                    break;
                  }
                }
                if (!allInteractionsCompleted) return;
                mandatoryCompleted[comp.id] = true;
                var badge = document.getElementById('mandatory-badge-' + comp.id);
                if (badge) {
                  badge.textContent = '\u2713 COMPLETED';
                  badge.style.background = '#052e16';
                  badge.style.color = '#4ade80';
                  badge.style.borderColor = '#166534';
                }
                checkCompletion();
              });
            }
          }
        } else if (comp.type === 'video') {
          if (comp.embedType === 'youtube' || comp.embedType === 'vimeo') {
            el.innerHTML = '<div class="cf-rt-video-wrap"><iframe class="cf-rt-video-embed" src="' + comp.src + '" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>';
          } else {
            el.innerHTML = '<video class="cf-rt-video" src="' + comp.src + '" controls></video>';
          }
        } else if (comp.type === 'flashcard') {
          el.innerHTML = '<div class="cf-rt-flashcard-scene" onclick="this.classList.toggle(\'flipped\')"><div class="cf-rt-flashcard-inner"><div class="cf-rt-flashcard-face cf-rt-flashcard-front" style="background:' + (comp.frontBackground || 'linear-gradient(145deg, #1a0a0a 0%, #3d1010 60%, #6b1a1a 100%)') + ';border:1px solid ' + (comp.frontBorder || '#4d2020') + ';box-shadow:0 8px 32px ' + (comp.frontShadow || 'rgba(139,26,26,0.25)') + ';"><div class="cf-rt-flashcard-label" style="color:' + (comp.frontBadgeColor || 'rgba(255,255,255,0.68)') + ';">FRONT</div><div class="cf-rt-flashcard-text">' + (comp.front||'') + '</div><div class="cf-rt-flashcard-hint" style="color:rgba(255,255,255,0.78);">Click to flip</div></div><div class="cf-rt-flashcard-face cf-rt-flashcard-back" style="background:' + (comp.backBackground || 'linear-gradient(145deg, #fffaf9 0%, #fff0ee 100%)') + ';border:2px solid ' + (comp.backBorder || '#e8c8c8') + ';box-shadow:0 8px 32px ' + (comp.backShadow || 'rgba(139,26,26,0.12)') + ';"><div class="cf-rt-flashcard-label" style="color:' + (comp.backBadgeColor || '#c4a0a0') + ';">BACK</div><div class="cf-rt-flashcard-text" style="color:' + (comp.backTextColor || '#1a0a0a') + ';">' + (comp.back||'') + '</div><div class="cf-rt-flashcard-hint" style="color:' + (comp.backTextColor || '#8b1a1a') + ';">Click to flip back</div></div></div></div>';
        } else if (comp.type === 'list') {
          var listHtml = '<ul class="cf-rt-list" style="padding-left:20px;margin:0;color:#111111;">';
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
          var alignment = String(comp.alignment || 'center').toLowerCase();
          el.style.display = 'flex';
          el.style.width = '100%';
          el.style.justifyContent = alignment === 'left' ? 'flex-start' : (alignment === 'right' ? 'flex-end' : 'center');
          el.innerHTML = '<button class="cf-rt-button" data-target-slide-id="' + (comp.targetSlideId||'') + '">' + (comp.label||'Button') + '</button>';
          var buttonEl = el.querySelector('button');
          if (buttonEl && comp.targetSlideId) {
            buttonEl.onclick = function(targetId) {
              return function() {
                for (var si = 0; si < slides.length; si++) {
                  if (String(slides[si].id) === String(targetId)) {
                    if (!canNavigateToSlide(si)) return;
                    currentSlide = si;
                    renderSlide(currentSlide);
                    try {
                      if (API) {
                        API.LMSSetValue('cmi.core.lesson_location', String(currentSlide));
                        API.LMSCommit('');
                      }
                    } catch(e) {}
                    break;
                  }
                }
              };
            }(comp.targetSlideId);
          }
        } else if (comp.type === 'audio') {
          var audioSrc = comp.src || '';
          var mandBadge = '';
          if (comp.mandatory) {
            mandBadge = '<div id="mandatory-badge-' + comp.id + '" style="font-size:10px;font-weight:700;letter-spacing:0.15em;padding:4px 10px;border-radius:6px;margin-bottom:8px;display:inline-block;background:#2a0a0a;color:#f87171;border:1px solid #7f1d1d;">\u26a0 MANDATORY \u2014 Listen to continue</div>';
          }
          el.innerHTML = '<div style="padding:16px;border:1px solid #f0d8d8;border-radius:12px;background:#fffafa;">' +
            mandBadge +
            '<div style="margin-bottom:6px;font-size:10px;font-weight:700;letter-spacing:0.15em;color:#c0392b;">AUDIO</div>' +
            '<div style="font-size:14px;font-weight:600;color:#1a0a0a;margin-bottom:10px;">' + (comp.label||'Audio Track') + '</div>' +
            '<audio id="audio-el-' + comp.id + '" controls style="width:100%;border-radius:8px;background:#000;">' +
              '<source src="' + audioSrc + '">' +
              'Your browser does not support audio.' +
            '</audio>' +
            '</div>';
          if (comp.mandatory) {
            (function(cid) {
              setTimeout(function() {
                var ael = document.getElementById('audio-el-' + cid);
                if (ael) {
                  ael.addEventListener('ended', function() {
                    mandatoryCompleted[cid] = true;
                    var badge = document.getElementById('mandatory-badge-' + cid);
                    if (badge) { badge.textContent = '\u2713 COMPLETED'; badge.style.background = '#052e16'; badge.style.color = '#4ade80'; badge.style.borderColor = '#166534'; }
                    checkCompletion();
                  });
                }
              }, 0);
            })(comp.id);
          }
        } else if (comp.type === 'columns') {
          var colsHtml = '';
          var cols = comp.columns || [];
          var colsCount = Math.max(cols.length || 0, 1);
          colsHtml += '<div class="cf-rt-columns-grid" style="--cf-columns-count:' + colsCount + ';">';
          for (var gi = 0; gi < cols.length; gi++) {
            colsHtml += '<div class="cf-rt-column">';
            var subBlocks = cols[gi] || [];
            for (var sbi = 0; sbi < subBlocks.length; sbi++) {
              var sb = subBlocks[sbi];
              if (sb.type === 'text') {
                colsHtml += '<div class="cf-rt-text" style="margin-bottom:10px;color:#111111;">' + (sb.content || '') + '</div>';
              } else if (sb.type === 'image' && sb.src) {
                colsHtml += '<div style="text-align:center;margin-bottom:10px;">';
                colsHtml += '<img src="' + sb.src + '" alt="' + (sb.alt || '') + '" style="width:100%;border-radius:8px;display:block;" />';
                if (sb.caption) colsHtml += '<div style="margin-top:6px;font-size:13px;color:#a1a1aa;">' + sb.caption + '</div>';
                colsHtml += '</div>';
              }
            }
            colsHtml += '</div>';
          }
          colsHtml += '</div>';
          el.innerHTML = colsHtml;
        } else {
          el.innerHTML = '<div class="cf-rt-text">' + (comp.content || comp.label || '') + '</div>';
        }
        container.appendChild(el);
      }
    }
 
    // Update nav UI
    var counter = document.getElementById('cf-slide-counter');
    if (counter) counter.textContent = (idx+1) + ' / ' + slides.length;
    var prevBtn = document.getElementById('cf-prev-btn');
    var nextBtn = document.getElementById('cf-next-btn');
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= slides.length - 1;
    var progress = document.getElementById('cf-progress-bar');
    if (progress) progress.style.width = ((idx+1)/slides.length*100) + '%';
 
    // ---------------------------------------------------------------------------
    // FIX: Only write 'incomplete' when the course has NOT already been passed.
    //      Previously this unconditionally overwrote 'passed' every time the
    //      learner navigated to a new slide, making the LMS see a stale status.
    // ---------------------------------------------------------------------------
    visitedSlides[idx] = true;
    if (API) {
      try {
        API.LMSSetValue('cmi.core.lesson_location', String(idx));
        if (!coursePassedFlag) {
          API.LMSSetValue('cmi.core.lesson_status', 'incomplete');
          API.LMSCommit('');
        }
      } catch(e) {}
    }
 
    // Re-evaluate completion (e.g. content-only courses with no mandatory items
    // only reach 'passed' once all questions have been answered via interactions,
    // not by merely visiting slides — gated by Gate 2 inside checkCompletion).
    checkCompletion();
  }
 
  // ---------------------------------------------------------------------------
  // TRUE / FALSE SUBMISSION
  // Disables buttons only on correct; keeps them live for retry on wrong.
  // ---------------------------------------------------------------------------
  window.__cfTFSubmit = function(id, chosen, correct) {
    var isCorrect = (String(chosen) === String(correct));
    scorableComps[id]      = isCorrect;
    mandatoryCompleted[id] = true;
 
    var fbEl = document.getElementById('fb-' + id);
    if (fbEl) fbEl.innerHTML = isCorrect
      ? '<span style="color:#4ade80">\u2713 Correct!</span>'
      : '<span style="color:#f87171">\u2717 Incorrect. Try again.</span>';
 
    var chosenBtn = document.getElementById('tf-' + (chosen ? 'true' : 'false') + '-' + id);
    var otherBtn  = document.getElementById('tf-' + (chosen ? 'false' : 'true') + '-' + id);
    if (chosenBtn) chosenBtn.style.borderColor = isCorrect ? '#16a34a' : '#dc2626';
    if (otherBtn)  otherBtn.style.borderColor  = '#27272a';
 
    if (isCorrect) {
      var tb  = document.getElementById('tf-true-'  + id);
      var fb2 = document.getElementById('tf-false-' + id);
      if (tb)  { tb.disabled  = true; tb.style.opacity  = '0.5'; }
      if (fb2) { fb2.disabled = true; fb2.style.opacity = '0.5'; }
    } else {
      if (chosenBtn) { chosenBtn.disabled = false; chosenBtn.style.opacity = '1'; }
      if (otherBtn)  { otherBtn.disabled  = false; otherBtn.style.opacity  = '1'; }
    }
    checkCompletion();
  };
 
  // ---------------------------------------------------------------------------
  // FILL-IN-THE-BLANK SUBMISSION
  // Disables input only on correct; keeps it live for retry on wrong.
  // ---------------------------------------------------------------------------
  window.__cfFITBSubmit = function(id, correctAnswers, caseSensitive) {
    var answers = Array.isArray(correctAnswers) && correctAnswers.length ? correctAnswers : [correctAnswers];
    var inputEls = answers.map(function(_, index) {
      return document.getElementById('fitb-' + id + '-' + index);
    }).filter(Boolean);
    if (!inputEls.length) return;
    var correctCount = 0;
    inputEls.forEach(function(inputEl, index) {
      var learnerVal = inputEl.value.trim();
      var answerVal = String(answers[index] || '').trim();
      var checkVal = caseSensitive ? learnerVal : learnerVal.toLowerCase();
      var normalizedAnswer = caseSensitive ? answerVal : answerVal.toLowerCase();
      if (checkVal === normalizedAnswer) correctCount += 1;
    });
    var totalBlanks = answers.length || 1;
    var partialScore = correctCount / totalBlanks;
    var isCorrect = partialScore === 1;
 
    scorableComps[id]      = partialScore;
    mandatoryCompleted[id] = true;
 
    var fbEl = document.getElementById('fb-' + id);
    if (fbEl) {
      if (isCorrect) {
        fbEl.innerHTML = '<span style="color:#4ade80">\u2713 Correct!</span>';
      } else if (correctCount > 0) {
        fbEl.innerHTML = '<span style="color:#fbbf24">\u25B3 ' + correctCount + ' of ' + totalBlanks + ' correct. You can retry for full marks.</span>';
      } else {
        fbEl.innerHTML = '<span style="color:#f87171">\u2717 Incorrect. Try again.</span>';
      }
    }
 
    if (isCorrect) {
      inputEls.forEach(function(inputEl, index) {
        inputEl.disabled = true;
        inputEl.style.opacity = '0.6';
        inputEl.value = String(answers[index] || '');
      });
      var submitBtn = document.getElementById('fitb-btn-' + id);
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted';
      }
    } else {
      inputEls.forEach(function(inputEl) {
        inputEl.disabled = false;
        inputEl.style.opacity = '1';
      });
    }
    checkCompletion();
  };

  window.__cfNext = function() {
    if (currentSlide < slides.length - 1) {
      var targetSlide = currentSlide + 1;
      if (!canNavigateToSlide(targetSlide)) return;
      currentSlide = targetSlide;
      renderSlide(currentSlide);
    }
  };
  window.__cfPrev = function() {
    if (currentSlide > 0) { currentSlide--; renderSlide(currentSlide); }
  };
  window.__cfRestart = function() {
    currentSlide = 0;
    visitedSlides = {};
    scorableComps = {};
    mandatoryCompleted = {};
    coursePassedFlag = false;
    if (bgAudioElement) {
      try {
        bgAudioElement.pause();
        bgAudioElement.currentTime = 0;
      } catch(e) {}
    }
    renderSlide(currentSlide);
    if (API) {
      try {
        API.LMSSetValue('cmi.core.lesson_location', '0');
        API.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        API.LMSSetValue('cmi.core.score.min', '0');
        API.LMSSetValue('cmi.core.score.max', '100');
        API.LMSSetValue('cmi.core.score.raw', '0');
        API.LMSCommit('');
      } catch(e) {}
    }
  };
 
  // ---------------------------------------------------------------------------
  // BOOT
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function() {
    // FIX: Restore coursePassedFlag from a previous session so that a learner
    //      who already passed and is re-opening the SCO doesn't get their
    //      status downgraded back to 'incomplete' by the initial renderSlide().
    if (API) {
      try {
        var prevStatus = API.LMSGetValue('cmi.core.lesson_status');
        if (prevStatus === 'passed') coursePassedFlag = true;
      } catch(e) {}
      try {
        var loc = API.LMSGetValue('cmi.core.lesson_location');
        if (loc && !isNaN(Number(loc))) currentSlide = Number(loc);
      } catch(e) {}
    }
 
    renderSlide(currentSlide);
 
    // Set 'incomplete' only on a fresh (not yet passed) attempt
    if (API && !coursePassedFlag) {
      try {
        API.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        API.LMSCommit('');
      } catch(e) {}
    }
  });
 
  // Auto-finish on tab/window close
  window.addEventListener('beforeunload', function() {
    if (API) {
      try { API.LMSCommit(''); API.LMSFinish(''); } catch(e) {}
    }
  });
})();
"""
 
 
def generate_runtime_html(
    title: str,
    course_definition: Dict[str, Any],
    *,
    inline_assets: bool = True,
    runtime_js_path: str = "runtime.js",
    course_data_js_path: str = "course-data.js",
    extra_script_paths: List[str] | None = None,
) -> str:
    """Generate the complete runtime HTML page."""
    safe_title = html_module.escape(title)
    course_json = json.dumps(course_definition, separators=(",", ":"))
    runtime_js = _get_runtime_js()

    extra_script_markup = ""
    if extra_script_paths:
        extra_script_markup = "\n".join(
            f'  <script src="{html_module.escape(path)}"></script>' for path in extra_script_paths
        )

    if inline_assets:
        course_data_markup = f"<script>window.__CF_COURSE_DATA = {course_json};</script>"
        runtime_markup = f"<script>{runtime_js}</script>"
    else:
        course_data_markup = f'<script src="{html_module.escape(course_data_js_path)}"></script>'
        runtime_markup = f'<script src="{html_module.escape(runtime_js_path)}"></script>'

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
  <div class="cf-rt-layout">
    <!-- Slide Container -->
    <main class="cf-rt-main">
      <div class="cf-rt-slide-container" id="cf-slide-container">
        <div class="cf-rt-loading">Loading course...</div>
      </div>
    </main>

    <!-- Sidebar Wrapper (positions the toggle tab) -->
    <div class="cf-rt-sidebar-wrapper" id="cf-sidebar-wrapper">
      <!-- Toggle tab button — always visible on the left edge of the sidebar -->
      <button
        class="cf-rt-sidebar-toggle"
        id="cf-sidebar-toggle"
        aria-expanded="true"
        aria-controls="cf-sidebar"
        title="Toggle navigation panel"
      >
        <svg class="cf-rt-sidebar-toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06z" clip-rule="evenodd"/>
        </svg>
      </button>
      <!-- Sidebar panel -->
      <aside class="cf-rt-sidebar" id="cf-sidebar">
        <div class="cf-rt-sidebar-header">
          <div class="cf-rt-sidebar-progress-text" id="cf-sidebar-progress-text">0% COMPLETE</div>
          <div class="cf-rt-sidebar-progress-track">
            <div class="cf-rt-sidebar-progress-bar" id="cf-sidebar-progress-bar"></div>
          </div>
        </div>
        <div class="cf-rt-sidebar-menu" id="cf-sidebar-menu"></div>
      </aside>
    </div>
  </div>
 
  <!-- Navigation -->
  <nav class="cf-rt-nav">
    <button class="cf-rt-nav-btn" id="cf-restart-btn" type="button" onclick="window.__cfRestart()">
      &#8635; Restart
    </button>
    <button class="cf-rt-nav-btn" id="cf-prev-btn" type="button">
      &#8592; Previous
    </button>
    <button class="cf-rt-nav-btn cf-rt-nav-btn-primary" id="cf-next-btn" type="button">
      Next &#8594;
    </button>
  </nav>
 
  <!-- Course Data -->
  {course_data_markup}

  <!-- Extra Runtime Scripts -->
{extra_script_markup}
 
  <!-- Runtime Bundle -->
  {runtime_markup}
</body>
</html>"""
 
 
def _get_runtime_css() -> str:
    """Embedded CSS for the SCORM runtime player."""
    return """
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f4f4f5;
  color: #18181b;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
 
/* Layout */
.cf-rt-layout {
  display: flex;
  min-height: 100vh;
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
  background: #ffffff; border: 1px solid #e4e4e7;
  border-radius: 16px; padding: 48px 40px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  min-height: 400px;
}
 
/* Loading */
.cf-rt-loading {
  text-align: center; color: #71717a; padding: 80px 0;
  font-size: 15px;
}
 
/* Slide title */
.cf-rt-slide-title {
  font-size: 28px; font-weight: 700; color: #111827;
  margin-bottom: 24px; line-height: 1.3;
  border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;
}
 
/* Components */
.cf-rt-component { margin-bottom: 20px; }
.cf-rt-heading { font-size: 22px; font-weight: 600; color: #111827; margin-bottom: 12px; }
.cf-rt-text { font-size: 15px; line-height: 1.75; color: #374151; }
.cf-rt-text ul, .cf-rt-text ol { padding-left: 24px; margin-top: 8px; margin-bottom: 8px; }
.cf-rt-text ul { list-style-type: disc; }
.cf-rt-text ol { list-style-type: decimal; }
.cf-rt-text li { display: list-item; }
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
.cf-rt-quiz-block {
  padding: 16px;
  border: 1px solid #f0d8d8;
  border-radius: 12px;
  background: #fffafa;
}
.cf-rt-quiz-badge {
  font-size: 10px; font-weight: 700; letter-spacing: 0.15em;
  color: #c0392b; margin-bottom: 12px;
}
.cf-rt-quiz-question {
  font-size: 17px; font-weight: 600; color: #1a0a0a;
  margin-bottom: 16px; line-height: 1.5;
}
.cf-rt-quiz-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.cf-rt-quiz-option {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border: 1.5px solid #e8d0d0;
  border-radius: 10px; cursor: pointer; transition: all 0.15s;
  background: #ffffff;
}
.cf-rt-quiz-option:hover { border-color: #8b1a1a; background: #fff5f5; }
.cf-rt-quiz-option input[type="radio"], .cf-rt-quiz-option input[type="checkbox"] { accent-color: #c0392b; width: 16px; height: 16px; }
.cf-rt-quiz-option-text { font-size: 14px; color: #1a0a0a; }
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
/* Sidebar wrapper — positions the toggle tab relative to the panel */
.cf-rt-sidebar-wrapper {
  position: relative;
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
}

/* Toggle tab — pill button on the left edge of the wrapper */
.cf-rt-sidebar-toggle {
  position: absolute;
  left: -28px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 28px;
  height: 56px;
  border: 1px solid #3f3f46;
  border-right: none;
  border-radius: 8px 0 0 8px;
  background: #2a2a2e;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}
.cf-rt-sidebar-toggle:hover {
  background: #3f3f46;
  color: #ffffff;
  box-shadow: -3px 0 12px rgba(0,0,0,0.4);
}

/* Chevron icon inside the toggle */
.cf-rt-sidebar-toggle-icon {
  width: 14px;
  height: 14px;
  display: block;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
/* When sidebar is collapsed the chevron flips to point left (re-open) */
.cf-rt-sidebar-toggle[aria-expanded="false"] .cf-rt-sidebar-toggle-icon {
  transform: rotate(180deg);
}

/* Sidebar panel */
.cf-rt-sidebar {
  width: 320px;
  min-width: 320px;
  background: #2a2a2e;
  color: #e4e4e7;
  border-left: 1px solid #3f3f46;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              min-width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.35s ease;
}
/* Collapsed state — entire panel slides away */
.cf-rt-sidebar.sidebar-collapsed {
  width: 0;
  min-width: 0;
  border-left-color: transparent;
}

.cf-rt-sidebar-header {
  padding: 24px;
  border-bottom: 1px solid #3f3f46;
  white-space: nowrap;
}
.cf-rt-sidebar-progress-text {
  font-size: 13px;
  font-weight: 700;
  color: #a1a1aa;
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}
.cf-rt-sidebar-progress-track {
  height: 6px;
  background: #27272a;
  border-radius: 3px;
  overflow: hidden;
}
.cf-rt-sidebar-progress-bar {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #8b1a1a, #c0392b);
  transition: width 0.4s ease;
}
.cf-rt-sidebar-menu {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}
.cf-rt-menu-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}
.cf-rt-menu-item:hover {
  background: #27272a;
}
.cf-rt-menu-item.active {
  background: #2a0a0a;
  border-left: 4px solid #c0392b;
  padding-left: 20px;
}
.cf-rt-menu-item-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #52525b;
  margin-right: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #18181b;
}
.cf-rt-menu-item.completed .cf-rt-menu-item-icon {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.cf-rt-menu-item.locked .cf-rt-menu-item-icon {
  background: #27272a;
  border-color: #3f3f46;
}
.cf-rt-menu-item.completed .cf-rt-menu-item-icon::after {
  content: '✓';
}
.cf-rt-menu-item-title {
  font-size: 14px;
  font-weight: 500;
  color: #a1a1aa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cf-rt-menu-item.active .cf-rt-menu-item-title,
.cf-rt-menu-item:hover .cf-rt-menu-item-title {
  color: #fafafa;
}
.cf-rt-menu-item.active .cf-rt-menu-item-title {
  font-weight: 600;
}

/* Animations */
[class*="animate-"]:not(.animate-none) {
  opacity: 0;
  animation-duration: 0.6s;
  animation-fill-mode: forwards;
  animation-timing-function: ease-out;
  backface-visibility: visible;
  transform-style: flat;
}
.animate-fade-in { animation-name: cfFadeIn; }
.animate-slide-in-left { animation-name: cfSlideInLeft; }
.animate-slide-in-right { animation-name: cfSlideInRight; }
.animate-zoom-in { animation-name: cfZoomIn; }
.animate-slide-in-up { animation-name: cfSlideInUp; }
.animate-slide-in-down { animation-name: cfSlideInDown; }
.animate-zoom-out { animation-name: cfZoomOut; }
.animate-flip-in { animation-name: cfFlipIn; }
.animate-bounce-in { animation-name: cfBounceIn; }
.animate-fade-in-up { animation-name: cfFadeInUp; }

@keyframes cfFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes cfSlideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes cfSlideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes cfZoomIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes cfSlideInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cfSlideInDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cfZoomOut {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes cfFlipIn {
  from { opacity: 0; transform: perspective(400px) rotateX(90deg); }
  to { opacity: 1; transform: perspective(400px) rotateX(0deg); }
}
@keyframes cfBounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { opacity: 1; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes cfFadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Columns / Grid block */
.cf-rt-columns-grid {
  display: grid;
  grid-template-columns: repeat(var(--cf-columns-count, 1), minmax(0, 1fr));
  gap: 1.25rem;
  width: 100%;
}
.cf-rt-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  color: #111111;
}
@media (max-width: 900px) {
  .cf-rt-columns-grid {
    grid-template-columns: 1fr;
  }
}
"""
 
 
# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------
 
def build_course_definition(
    title: str,
    blocks: List[Dict[str, Any]],
    policy: Dict[str, Any] | None = None,
    theme: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Build a complete CourseDefinition from authoring blocks.
 
    Args:
        title:  Course title (used in the LMS and HTML <title>).
        blocks: Flat list of authoring blocks from the frontend editor.
        policy: LMS admin-configured marking & attempts criteria dict with keys:
                  passingScore (float, 0-100)
                  maxAttempts  (int, ≥1)
                  lockOnPass   (bool)
                  lockOnExhaust (bool)
    """
    slides = blocks_to_slides(blocks)
    triggers = []
 
    # Default policy — matches what the admin UI shows on first load
    resolved_policy = {
        "passingScore":  70,
        "maxAttempts":   3,
        "lockOnPass":    False,
        "lockOnExhaust": True,
    }
    if policy:
        resolved_policy.update(policy)
 
    return {
        "id": _make_id("course"),
        "title": title,
        "version": "1.0.0",
        "slides": slides,
        "triggers": triggers,
        "variables": [],
        "policy": resolved_policy,
        "theme": theme or {"background": {"type": "color", "value": "#ffffff"}},
    }
