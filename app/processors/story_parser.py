"""
story_parser.py — Robust Articulate Storyline (.story) content extractor
==========================================================================
Extracts: headings · text · images · audio · video · quiz questions
          buttons · hotspots · sliders · drag-drop · layers · slide notes
          variables · orphaned media

Articulate Storyline .story files are ZIP archives.  The key layout:
  story/slides/*.xml          — one XML per slide
  story/slides/_rels/*.xml.rels — relationship maps (rId → media path)
  story/media/*               — images, audio, video
  story/story.xml             — project-level metadata & variables
"""

import zipfile
import xml.etree.ElementTree as ET
import uuid
import base64
import re
from pathlib import PurePosixPath
from typing import Optional


# ══════════════════════════════════════════════════════════════════
#  CONSTANTS
# ══════════════════════════════════════════════════════════════════

IMAGE_EXTS = {".png", ".gif", ".jpg", ".jpeg", ".svg", ".bmp", ".webp"}
AUDIO_EXTS = {".mp3", ".wav", ".ogg", ".m4a", ".aac"}
VIDEO_EXTS = {".mp4", ".m4v", ".webm", ".avi", ".mov"}

MIME_MAP = {
    ".png":  "image/png",   ".gif":  "image/gif",
    ".jpg":  "image/jpeg",  ".jpeg": "image/jpeg",
    ".mp3":  "audio/mpeg",  ".wav":  "audio/wav",
    ".mp4":  "video/mp4",   ".m4v":  "video/mp4",
    ".webm": "video/webm",  ".svg":  "image/svg+xml",
    ".ogg":  "audio/ogg",   ".m4a":  "audio/mp4",
    ".aac":  "audio/aac",
}

# Attribute names that carry human-readable text
TEXT_ATTRS = {
    "Text", "Title", "Value", "Label", "Name", "Caption",
    "Hint", "CorrectText", "IncorrectText", "Description",
    "NarratorText", "AltText", "AccessibilityLabel",
    "PlaceholderText", "SubmitButtonLabel", "Stem", "Question",
    "QuestionText", "FeedbackCorrect", "FeedbackIncorrect",
    # lowercase variants (Articulate is inconsistent)
    "text", "title", "value", "label", "name", "caption",
    "hint", "description", "alttext",
}

JUNK_TOKENS = {
    "oldsize", "actualrotation", "multiple choice", "olddesignedslidesizeprop",
    "oldprojguid", "parentinteractiontype", "submit", "true", "false",
    "normal", "none", "left", "right", "center", "top", "bottom", "middle",
    "auto", "bold", "italic", "underline", "solid", "transparent",
    "after selecting answer please click the submit button !",
    "correct", "incorrect", "next", "prev", "previous", "continue",
    "retry", "review", "start", "finish", "close", "open",
}

_GUID_RE     = re.compile(
    r"^[{(]?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}"
    r"-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[})]?$"
)
_NUMBER_RE   = re.compile(r"^-?\d+(\.\d+)?(%|px|pt|em|s|ms|cm|in|rem)?$")
_HEX_RE      = re.compile(r"^#?[0-9a-fA-F]{3,8}$")
_XML_TAG_RE  = re.compile(r"<[A-Za-z_:][^>]{0,300}>")
_QUIZ_Q_RE   = re.compile(r"^Q[\.\:\-]\s*(.+)", re.IGNORECASE)
_QUIZ_OPT_RE = re.compile(r"^([A-E])[\.\)\-]\s*(.+)", re.IGNORECASE)


# ══════════════════════════════════════════════════════════════════
#  SMALL UTILITIES
# ══════════════════════════════════════════════════════════════════

def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _ext(path: str) -> str:
    return PurePosixPath(path.lower()).suffix


def _to_data_uri(path: str, data: bytes) -> str:
    mime = MIME_MAP.get(_ext(path), "application/octet-stream")
    return f"data:{mime};base64,{base64.b64encode(data).decode()}"


def _is_image(p: str) -> bool: return _ext(p) in IMAGE_EXTS
def _is_audio(p: str) -> bool: return _ext(p) in AUDIO_EXTS
def _is_video(p: str) -> bool: return _ext(p) in VIDEO_EXTS


def _resolve(source: str, target: str) -> str:
    """
    Resolve *target* (possibly relative with ../) against the directory
    that contains *source* inside a ZIP.
    """
    target = target.replace("\\", "/")
    if target.startswith("/"):
        return target.lstrip("/")
    base_dir = source.replace("\\", "/").rsplit("/", 1)[0] if "/" in source else ""
    segs = [s for s in base_dir.split("/") if s]
    for seg in target.split("/"):
        if seg == "..":
            if segs:
                segs.pop()
        elif seg and seg != ".":
            segs.append(seg)
    return "/".join(segs)


# ══════════════════════════════════════════════════════════════════
#  TEXT FILTERING
# ══════════════════════════════════════════════════════════════════

def _is_junk(text: str) -> bool:
    """Return True if this string is a system/structural value, not user content."""
    t = text.strip()
    if not t or len(t) < 2:
        return True
    if t in {"\n", "\r", "\r\n", "&#xA;", "&#xD;", "\u00a0", "...", "—", "–"}:
        return True
    if _GUID_RE.match(t):
        return True
    if _NUMBER_RE.match(t):
        return True
    if _HEX_RE.match(t) and len(t) <= 9:
        return True
    if t.lower() in JUNK_TOKENS:
        return True
    if t.lower().startswith("triggerscollapsedpersistence_"):
        return True
    # Embedded XML leaking through
    if (t.startswith("<") and (">" in t or "xmlns" in t)) or "xmlns:" in t:
        return True
    return False


def _extract_spans_from_blob(blob: str) -> list:
    """
    Parse an embedded XML blob (common in Articulate) and pull every
    human-readable text value from Text= attributes and element bodies.
    """
    try:
        root = ET.fromstring(blob.strip())
        out = []
        for node in root.iter():
            for attr in TEXT_ATTRS:
                val = node.attrib.get(attr, "").strip()
                if val and not _is_junk(val):
                    out.append(val)
            for src in (node.text or "", node.tail or ""):
                val = src.strip()
                if val and not _is_junk(val):
                    out.append(val)
        return out
    except ET.ParseError:
        return []


def _process_raw(raw: str) -> list:
    """
    Given a raw string from .text / .tail / attribute value,
    return a list of clean human-visible strings.
    """
    if not raw:
        return []
    s = raw.strip()
    if not s:
        return []
    if s.startswith("<"):
        return _extract_spans_from_blob(s)
    return [] if _is_junk(s) else [s]


# ══════════════════════════════════════════════════════════════════
#  RELATIONSHIP PARSING
# ══════════════════════════════════════════════════════════════════

def _parse_rels(zf: zipfile.ZipFile, source_path: str) -> dict:
    """
    Return {rId: resolved_zip_path} for every relationship of source_path.
    Tries the standard OPC location first, then a fallback.
    """
    dir_part, file_part = (
        source_path.rsplit("/", 1) if "/" in source_path else ("", source_path)
    )
    candidates = [
        f"{dir_part}/_rels/{file_part}.rels",
        f"_rels/{source_path}.rels",
    ]
    for rels_path in candidates:
        try:
            root = ET.fromstring(zf.read(rels_path))
            result = {}
            for rel in root:
                rid    = rel.attrib.get("Id", "")
                target = rel.attrib.get("Target", "")
                if rid and target:
                    result[rid] = _resolve(source_path, target)
            return result
        except (KeyError, ET.ParseError):
            continue
    return {}


# ══════════════════════════════════════════════════════════════════
#  MEDIA HELPERS
# ══════════════════════════════════════════════════════════════════

_MIN_MEDIA_BYTES = 512   # ignore icon-sized placeholders


def _read_media(zf: zipfile.ZipFile, path: str) -> Optional[bytes]:
    try:
        data = zf.read(path)
        return data if len(data) >= _MIN_MEDIA_BYTES else None
    except KeyError:
        return None


def _make_media_block(path: str, data: bytes) -> Optional[dict]:
    uri  = _to_data_uri(path, data)
    name = PurePosixPath(path).name
    if _is_image(path):
        return {"id": _uid("img"),   "type": "image", "imageUrl": uri, "filename": name}
    if _is_audio(path):
        return {"id": _uid("audio"), "type": "audio", "audioUrl": uri, "filename": name}
    if _is_video(path):
        return {"id": _uid("video"), "type": "video", "videoUrl": uri, "filename": name}
    return None


def _index_all_media(zf: zipfile.ZipFile) -> dict:
    """
    Scan the entire archive for media files.
    Returns {zip_path: bytes} for every qualifying file.
    Used to catch media that slide rels don't reference directly.
    """
    media = {}
    for name in zf.namelist():
        if "/media/" in name.lower() or name.lower().startswith("media/"):
            if _ext(name) in (IMAGE_EXTS | AUDIO_EXTS | VIDEO_EXTS):
                try:
                    data = zf.read(name)
                    if len(data) >= _MIN_MEDIA_BYTES:
                        media[name] = data
                except Exception:
                    pass
    return media


# ══════════════════════════════════════════════════════════════════
#  TEXT EXTRACTION FROM SLIDE XML
# ══════════════════════════════════════════════════════════════════

def _extract_slide_texts(root: ET.Element) -> list:
    """
    Scrape every human-readable string from a slide's XML tree.
    Checks:
      • every attribute in TEXT_ATTRS
      • any attribute whose value looks like an XML blob
      • elem.text and elem.tail
    Deduplicates while preserving first-seen order.
    """
    seen, out = set(), []

    def _add(s: str):
        s = s.strip()
        if s and s not in seen:
            seen.add(s)
            out.append(s)

    for elem in root.iter():
        for attr_name, attr_val in elem.attrib.items():
            local = attr_name.split("}")[-1] if "}" in attr_name else attr_name
            if local in TEXT_ATTRS:
                for s in _process_raw(attr_val):
                    _add(s)
            elif attr_val.strip().startswith("<"):
                # Embedded XML blob in an unexpected attribute
                for s in _extract_spans_from_blob(attr_val):
                    _add(s)

        for s in _process_raw(elem.text  or ""):
            _add(s)
        for s in _process_raw(elem.tail or ""):
            _add(s)

    return out


# ══════════════════════════════════════════════════════════════════
#  OBJECT-AWARE PARSING (media + interactive elements)
# ══════════════════════════════════════════════════════════════════

def _extract_objects(
    root: ET.Element,
    rels: dict,
    zf: zipfile.ZipFile,
    seen_media: set,
) -> list:
    """
    Walk the element tree and emit typed blocks for every structured
    object: images, audio, video, buttons, hotspots, sliders, drag-drop.
    """
    blocks = []
    RID_ATTRS = (
        "r:embed", "r:link", "embed", "link", "rId", "relationshipId",
        "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed",
        "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}link",
    )

    def _try_emit_by_rid(elem: ET.Element):
        for attr in RID_ATTRS:
            rid = elem.attrib.get(attr)
            if rid and rid in rels:
                _emit_path(rels[rid])

    def _emit_path(path: str):
        if path in seen_media:
            return
        data = _read_media(zf, path)
        if data:
            block = _make_media_block(path, data)
            if block:
                seen_media.add(path)
                blocks.append(block)

    def _emit_by_filename(fname: str):
        """Try to find a media file by bare filename in story/media/."""
        if not fname:
            return
        stem = PurePosixPath(fname).name
        candidates = [
            f"story/media/{stem}",
            f"story/{stem}",
            fname,
        ]
        for c in candidates:
            if c not in seen_media:
                _emit_path(c)

    for elem in root.iter():
        tag   = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
        otype = (elem.attrib.get("type") or elem.attrib.get("Type") or "").lower()

        # ── Images ────────────────────────────────────────────────
        if tag in ("image", "picture", "blipfill", "blip", "imageobject") or \
           otype in ("image", "picture", "imageobject", "photo"):
            _try_emit_by_rid(elem)
            for attr in ("src", "path", "source", "filePath", "filepath", "File"):
                v = elem.attrib.get(attr, "")
                if v and _is_image(v):
                    _emit_by_filename(v)

        # ── Audio ─────────────────────────────────────────────────
        elif tag in ("audio", "audioobject", "sound", "narration", "narrator") or \
             otype in ("audio", "audioobject", "narration", "sound", "narrator"):
            _try_emit_by_rid(elem)
            for attr in ("src", "path", "source", "filePath", "filepath", "File", "file"):
                v = elem.attrib.get(attr, "")
                if v and _is_audio(v):
                    _emit_by_filename(v)

        # ── Video ─────────────────────────────────────────────────
        elif tag in ("video", "videoobject", "movie") or \
             otype in ("video", "videoobject", "movie"):
            _try_emit_by_rid(elem)
            for attr in ("src", "path", "source", "filePath", "filepath"):
                v = elem.attrib.get(attr, "")
                if v and _is_video(v):
                    _emit_by_filename(v)

        # ── Button ────────────────────────────────────────────────
        elif tag == "button" or otype in ("button", "clickarea", "submitbutton"):
            label = next(
                (elem.attrib.get(a, "").strip()
                 for a in ("Text", "Label", "Caption", "Name", "text", "label", "name")
                 if elem.attrib.get(a, "").strip()),
                "Button",
            )
            if not _is_junk(label):
                blocks.append({"id": _uid("button"), "type": "button", "label": label})

        # ── Hotspot ───────────────────────────────────────────────
        elif tag == "hotspot" or otype in ("hotspot", "clickablearea", "hotspotobject"):
            label = next(
                (elem.attrib.get(a, "").strip()
                 for a in ("Name", "Label", "Text", "name", "label")
                 if elem.attrib.get(a, "").strip()),
                "Hotspot",
            )
            blocks.append({"id": _uid("hotspot"), "type": "hotspot", "label": label})

        # ── Slider ────────────────────────────────────────────────
        elif tag == "slider" or otype == "slider":
            blocks.append({
                "id":      _uid("slider"),
                "type":    "slider",
                "label":   (elem.attrib.get("Name") or elem.attrib.get("name") or "Slider").strip(),
                "min":     elem.attrib.get("MinValue", elem.attrib.get("min", "0")),
                "max":     elem.attrib.get("MaxValue", elem.attrib.get("max", "100")),
                "initial": elem.attrib.get("InitialValue", elem.attrib.get("value", "0")),
                "step":    elem.attrib.get("StepSize",    elem.attrib.get("step",  "1")),
            })

        # ── Drag-and-drop ─────────────────────────────────────────
        elif tag in ("dragsource", "dragtarget", "dropzone") or \
             otype in ("dragsource", "dragtarget", "dragobject", "dropzone"):
            label = (
                elem.attrib.get("Name") or elem.attrib.get("Text") or
                elem.attrib.get("Label") or tag
            ).strip()
            blocks.append({
                "id":    _uid("dnd"),
                "type":  "drag_drop",
                "role":  tag,
                "label": label,
            })

        # ── Fallback: chase any rId we haven't caught yet ─────────
        else:
            _try_emit_by_rid(elem)

    return blocks


# ══════════════════════════════════════════════════════════════════
#  QUESTION / QUIZ EXTRACTION
# ══════════════════════════════════════════════════════════════════

def _extract_questions(root: ET.Element, already_seen: set) -> list:
    """
    Walk the element tree looking for structured question objects.
    Handles: multiple choice, true/false, fill-in, matching, drag-drop,
    hotspot-quiz, numeric, Likert.
    Returns quiz blocks and populates *already_seen* with question text
    so that plain text extraction doesn't duplicate them.
    """
    blocks = []

    QUESTION_TAGS  = {
        "question", "quiz", "quizobject", "interaction", "assessment",
        "questionobject", "quizquestion",
    }
    QUESTION_TYPES = {
        "question", "quiz", "quizobject", "interaction", "multiplechoice",
        "truefalse", "fillintheblank", "matching", "wordbank", "dragdrop",
        "hotspot", "sequencing", "numeric", "likert", "essayquestion",
    }
    CHOICE_TAGS  = {"choice", "option", "answer", "item", "alternative", "distractor"}
    CHOICE_TYPES = {"choice", "option", "answer"}

    for elem in root.iter():
        tag   = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
        otype = (elem.attrib.get("type") or elem.attrib.get("Type") or "").lower()

        if tag not in QUESTION_TAGS and otype not in QUESTION_TYPES:
            continue

        # ── Extract question stem ─────────────────────────────
        question_text = ""
        for attr in (
            "QuestionText", "questiontext", "Stem", "stem",
            "Question", "question", "Text", "text", "Title", "title",
        ):
            val = elem.attrib.get(attr, "").strip()
            if val and not _is_junk(val):
                question_text = val
                break

        if not question_text:
            # Check child elements for the stem
            for child in elem:
                ctag = child.tag.split("}")[-1].lower() if "}" in child.tag else child.tag.lower()
                if ctag in ("questiontext", "stem", "questionbody", "prompt"):
                    val = (child.text or "").strip()
                    if val and not _is_junk(val):
                        question_text = val
                        break

        if not question_text:
            continue

        # ── Extract choices ───────────────────────────────────
        options, correct_idxs = [], []
        for child in elem.iter():
            ctag  = child.tag.split("}")[-1].lower() if "}" in child.tag else child.tag.lower()
            ctype = (child.attrib.get("type") or child.attrib.get("Type") or "").lower()
            if ctag not in CHOICE_TAGS and ctype not in CHOICE_TYPES:
                continue
            choice_text = (
                child.attrib.get("Text")  or child.attrib.get("text")  or
                child.attrib.get("Value") or child.attrib.get("Label") or
                (child.text or "")
            ).strip()
            if choice_text and not _is_junk(choice_text):
                is_correct = child.attrib.get(
                    "Correct", child.attrib.get("correct",
                    child.attrib.get("IsCorrect", "false"))
                )
                if is_correct.lower() in ("true", "1", "yes"):
                    correct_idxs.append(len(options))
                options.append(choice_text)
                already_seen.add(choice_text)

        already_seen.add(question_text)
        blocks.append({
            "id":            _uid("quiz"),
            "type":          "quiz",
            "questionType":  otype or tag,
            "question":      question_text,
            "options":       options,
            "correctAnswer": correct_idxs[0] if correct_idxs else 0,
            "allCorrect":    correct_idxs,
        })

    return blocks


# ══════════════════════════════════════════════════════════════════
#  LAYER EXTRACTION
# ══════════════════════════════════════════════════════════════════

def _extract_layers(root: ET.Element) -> list:
    """Extract named layers and their text content."""
    layers = []
    for elem in root.iter():
        tag = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
        if tag != "layer":
            continue
        name = (
            elem.attrib.get("Name") or elem.attrib.get("name") or "Unnamed Layer"
        ).strip()
        texts = []
        seen  = set()
        for child in elem.iter():
            for attr in TEXT_ATTRS:
                v = child.attrib.get(attr, "").strip()
                if v and not _is_junk(v) and v not in seen:
                    seen.add(v)
                    texts.append(v)
            for src in (child.text or "", child.tail or ""):
                for s in _process_raw(src):
                    if s not in seen:
                        seen.add(s)
                        texts.append(s)
        layers.append({
            "id":    _uid("layer"),
            "type":  "layer",
            "name":  name,
            "texts": texts,
        })
    return layers


# ══════════════════════════════════════════════════════════════════
#  SLIDE NOTES / NARRATION SCRIPT
# ══════════════════════════════════════════════════════════════════

def _extract_notes(root: ET.Element) -> Optional[str]:
    """Return the slide's speaker notes / narrator script, if any."""
    NOTE_TAGS = {
        "notes", "speakernotes", "note", "narration",
        "narratortext", "script", "captionstext", "captions",
    }
    for elem in root.iter():
        tag = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
        if tag not in NOTE_TAGS:
            continue
        parts, seen = [], set()
        for child in elem.iter():
            for attr in ("Text", "text", "Value", "value"):
                v = child.attrib.get(attr, "").strip()
                if v and not _is_junk(v) and v not in seen:
                    seen.add(v)
                    parts.append(v)
            for src in (child.text or "", child.tail or ""):
                s = src.strip()
                if s and not _is_junk(s) and s not in seen:
                    seen.add(s)
                    parts.append(s)
        if parts:
            return " ".join(parts)
        # Try direct attribute on the notes element itself
        for attr in ("Text", "text", "Value"):
            v = (elem.attrib.get(attr) or "").strip()
            if v and not _is_junk(v):
                return v
    return None


# ══════════════════════════════════════════════════════════════════
#  VARIABLE EXTRACTION (project-level)
# ══════════════════════════════════════════════════════════════════

def _extract_variables(zf: zipfile.ZipFile) -> list:
    """
    Parse story-level XML files for Articulate variable definitions.
    """
    VARIABLE_TAGS = {
        "variable", "var", "projectvariable", "storylinevariable",
        "customvariable",
    }
    candidates = [
        "story/story.xml",
        "story/variables.xml",
        "story/data/variables.xml",
    ]
    variables, seen = [], set()

    for path in candidates:
        try:
            root = ET.fromstring(zf.read(path))
        except (KeyError, ET.ParseError):
            continue
        for elem in root.iter():
            tag = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
            if tag not in VARIABLE_TAGS:
                continue
            vname = (elem.attrib.get("Name") or elem.attrib.get("name") or "").strip()
            if not vname or vname in seen:
                continue
            seen.add(vname)
            variables.append({
                "name":         vname,
                "varType":      (elem.attrib.get("Type") or elem.attrib.get("type") or "text").strip(),
                "defaultValue": (
                    elem.attrib.get("DefaultValue") or elem.attrib.get("Value") or
                    elem.attrib.get("value") or (elem.text or "")
                ).strip(),
            })
    return variables


# ══════════════════════════════════════════════════════════════════
#  TEXT → TYPED BLOCKS  (quiz pattern detection + merging)
# ══════════════════════════════════════════════════════════════════

def _group_texts(texts: list, skip: set) -> list:
    """
    Convert flat text strings into typed blocks.
    Skips strings already captured as structured quiz content (*skip*).
    Detects inline quiz patterns: 'Q. ...' / 'A. ...' / 'B. ...'
    Merges consecutive plain text into a single block.
    """
    blocks, current_quiz = [], None

    for text in texts:
        if text in skip:
            continue

        q_m = _QUIZ_Q_RE.match(text)
        if q_m:
            if current_quiz:
                blocks.append(current_quiz)
            current_quiz = {
                "id":           _uid("quiz"),
                "type":         "quiz",
                "questionType": "multipleChoice",
                "question":     q_m.group(1).strip() or text,
                "options":      [],
                "correctAnswer": 0,
                "allCorrect":   [],
            }
            continue

        opt_m = _QUIZ_OPT_RE.match(text)
        if current_quiz and opt_m:
            current_quiz["options"].append(opt_m.group(2).strip() or text)
            continue

        if current_quiz:
            blocks.append(current_quiz)
            current_quiz = None

        # Plain text: merge consecutive blocks
        if blocks and blocks[-1]["type"] == "text":
            blocks[-1]["content"] += "\n" + text
        else:
            blocks.append({"id": _uid("text"), "type": "text", "content": text})

    if current_quiz:
        blocks.append(current_quiz)

    return blocks


# ══════════════════════════════════════════════════════════════════
#  MAIN ASYNC PARSER
# ══════════════════════════════════════════════════════════════════

async def parse_story_file(file_path: str) -> list:
    """
    Parse an Articulate Storyline .story file and return a structured
    list of content blocks.

    Block types returned:
      variables  — project variables list
      heading    — slide title
      notes      — slide speaker notes / narrator script
      quiz       — question with options and correct-answer index
      button     — interactive button label
      hotspot    — hotspot label
      slider     — slider with min/max/step
      drag_drop  — drag source or drop target label
      layer      — named layer with its text content
      image      — base64 data URI  (imageUrl)
      audio      — base64 data URI  (audioUrl)
      video      — base64 data URI  (videoUrl)
      text       — plain prose content
    """
    blocks: list = []

    try:
        with zipfile.ZipFile(file_path, "r") as zf:
            all_names = set(zf.namelist())

            # ── 1. Inventory ALL media in the archive ─────────────────
            media_index  = _index_all_media(zf)
            seen_media: set = set()

            # ── 2. Project-level variables ─────────────────────────────
            variables = _extract_variables(zf)
            if variables:
                blocks.append({
                    "id":        _uid("variables"),
                    "type":      "variables",
                    "variables": variables,
                })

            # ── 3. Discover slide files ────────────────────────────────
            slide_files = sorted(
                f for f in all_names
                if re.match(r"story/slides/[^/]+\.xml$", f)
            )
            if not slide_files:
                # Broader fallback
                slide_files = sorted(
                    f for f in all_names
                    if f.startswith("story/") and f.endswith(".xml")
                    and "/media/" not in f and "/_rels/" not in f
                    and f not in {"story/story.xml"}
                )

            # ── 4. Process each slide ──────────────────────────────────
            for slide_idx, slide_path in enumerate(slide_files):
                try:
                    root = ET.fromstring(zf.read(slide_path))
                except Exception:
                    continue

                rels = _parse_rels(zf, slide_path)

                # 4a. Heading
                title = (
                    root.attrib.get("name")  or root.attrib.get("Name")  or
                    root.attrib.get("title") or root.attrib.get("Title") or
                    f"Slide {slide_idx + 1}"
                ).strip()
                blocks.append({
                    "id":         _uid("heading"),
                    "type":       "heading",
                    "content":    title,
                    "slideIndex": slide_idx,
                })

                # 4b. Speaker notes
                notes = _extract_notes(root)
                if notes:
                    blocks.append({
                        "id":      _uid("notes"),
                        "type":    "notes",
                        "content": notes,
                    })

                # 4c. Structured quiz/question objects
                already_seen_in_quiz: set = set()
                quiz_blocks = _extract_questions(root, already_seen_in_quiz)
                blocks.extend(quiz_blocks)

                # 4d. Interactive + media objects (buttons, hotspots, images …)
                blocks.extend(_extract_objects(root, rels, zf, seen_media))

                # 4e. Plain text (skip anything already emitted as quiz)
                raw_texts   = _extract_slide_texts(root)
                text_blocks = _group_texts(raw_texts, already_seen_in_quiz)
                blocks.extend(text_blocks)

                # 4f. Layers
                blocks.extend(_extract_layers(root))

                # 4g. Remaining rel-targets not yet emitted
                for rid, resolved in rels.items():
                    if resolved not in seen_media:
                        data = _read_media(zf, resolved)
                        if data:
                            block = _make_media_block(resolved, data)
                            if block:
                                seen_media.add(resolved)
                                blocks.append(block)

            # ── 5. Orphaned media (in archive but never referenced) ────
            for path, data in media_index.items():
                if path not in seen_media:
                    block = _make_media_block(path, data)
                    if block:
                        seen_media.add(path)
                        blocks.append(block)

    except zipfile.BadZipFile:
        blocks.append({
            "id":      _uid("error"),
            "type":    "text",
            "content": "⚠️ Invalid or unreadable .story file.",
        })
    except Exception as exc:
        blocks.append({
            "id":      _uid("error"),
            "type":    "text",
            "content": f"⚠️ Parse error: {exc}",
        })

    if not blocks:
        blocks.append({
            "id":      _uid("empty"),
            "type":    "text",
            "content": "No readable content found in .story file.",
        })

    return blocks