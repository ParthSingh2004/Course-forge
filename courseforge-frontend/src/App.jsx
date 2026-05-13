import { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, Type, Heading1, Image as ImageIcon, MousePointerClick, ListChecks, Trash2, GripVertical, FileUp, Globe, BookOpen, ChevronRight, CreditCard, Video, RotateCcw, Play, List, Quote, Layers, AlignLeft, AlignCenter, AlignRight, AlignJustify, ShieldCheck, ToggleLeft, PenLine, Mic, FileText, Table, Save, CheckCircle, Eye, X, ChevronDown, Copy, Plus, RefreshCw, Square } from 'lucide-react';

// Core UI & Storage
import Dashboard from './Dashboard';
import RichTextEditor from './components/ui/RichTextEditor';
import { createLocalCourse, saveCourseToBrowser } from './utils/storage';
import './App.css'; // <-- External CSS Import

// Content Blocks
import ColumnsGridBlock from './components/blocks/ColumnsGridBlock';
import FlashcardBlock from './components/blocks/FlashcardBlock';
import ImageBlock from './components/blocks/ImageBlock';
import ImageStackBlock from './components/blocks/ImageStackBlock';
import ImageHotspotBlock from './components/blocks/ImageHotspotBlock';
import InteractiveVideoBlock from './components/blocks/InteractiveVideoBlock';
import VideoBlock from './components/blocks/VideoBlock';
import ProcessBlock from './components/blocks/ProcessBlock';
import TableBlock from './components/blocks/TableBlock';
import AudioBlock from './components/blocks/AudioBlock';
import QuizBlock from './components/blocks/QuizBlock';
import TrueFalseBlock from './components/blocks/TrueFalseBlock';
import FillBlankBlock from './components/blocks/FillBlankBlock';
import ButtonBlock from './components/blocks/ButtonBlock';
import ListBlock from './components/blocks/ListBlock';
import QuoteBlock from './components/blocks/QuoteBlock';
import MultiSelectBlock from './components/blocks/MultiSelectBlock';
import MatchingBlock from './components/blocks/MatchingBlock';
import TabsBlock from './components/blocks/TabsBlock';
import ScenarioBlock from './components/blocks/ScenarioBlock';
import CanvasBlock from './components/blocks/CanvasBlock';

// --- API Utilities ---
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://course-forge-tpxk.onrender.com').replace(/\/+$/, '');
const buildApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
const buildBackendAssetUrl = (path) => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

// --- Helper Functions ---
const FILL_BLANK_TOKEN = /____/g;

const countFillBlankPlaceholders = (question = '') => {
  const matches = String(question).match(FILL_BLANK_TOKEN);
  return matches ? matches.length : 0;
};

const normalizeFillBlankAnswers = (question = '', answers = [], legacyAnswer = '') => {
  const explicitAnswerCount = Array.isArray(answers) ? answers.length : 0;
  const desiredCount = Math.max(explicitAnswerCount, countFillBlankPlaceholders(question), 1);
  const source = Array.isArray(answers) && answers.length > 0
    ? answers
    : [legacyAnswer || ''];
  return Array.from({ length: desiredCount }, (_, index) => source[index] ?? '');
};

const normalizeAuthoringSlides = (slides = []) => (
  (slides || []).map(slide => ({
    ...slide,
    elements: (slide.elements || []).map(block => {
      if (block.type !== 'fill_blanks') return block;
      const answers = normalizeFillBlankAnswers(block.question, block.answers, block.answer);
      return {
        ...block,
        answers,
        answer: answers[0] || '',
      };
    }),
  }))
);

const makeEditorId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const cloneSubBlockWithFreshIds = (subBlock) => ({
  ...subBlock,
  id: makeEditorId('subblock'),
});

const cloneBlockWithFreshIds = (block) => {
  const clonedBlock = {
    ...block,
    id: makeEditorId('block'),
  };

  if (block.type === 'columns') {
    clonedBlock.columns = (block.columns || []).map(col => (col || []).map(cloneSubBlockWithFreshIds));
  }

  if (block.type === 'interactive-video') {
    clonedBlock.interactions = (block.interactions || []).map(interaction => ({
      ...interaction,
      id: makeEditorId('interaction'),
    }));
  }

  if (block.type === 'image-hotspot') {
    clonedBlock.hotspots = (block.hotspots || []).map(hotspot => ({
      ...hotspot,
      id: makeEditorId('hotspot'),
    }));
  }

  if (block.type === 'canvas') {
    clonedBlock.items = (block.items || []).map(item => ({
      ...item,
      id: makeEditorId('canvasitem'),
    }));
  }

  return clonedBlock;
};

const cloneSlideWithFreshIds = (slide, copyNumber = null) => ({
  ...slide,
  id: makeEditorId('slide'),
  title: copyNumber ? `${slide.title || 'Untitled Slide'} Copy ${copyNumber}` : `${slide.title || 'Untitled Slide'} Copy`,
  elements: (slide.elements || []).map(cloneBlockWithFreshIds),
});

const createBlankSlide = (slideNumber) => ({
  id: makeEditorId('slide'),
  type: 'slide',
  title: `Slide ${slideNumber}`,
  elements: [],
});

// --- Main App Component ---
const STORAGE_KEY = 'courseforge_draft_v1';

const createDefaultAuthoringState = () => ({
  courseTitle: 'Untitled Course',
  passingScore: 70,
  slides: [
    {
      id: 1, type: 'slide', title: 'Slide 1', elements: [
        { id: 101, type: 'text', content: 'Welcome to your new course. Use the sidebar to add blocks, or click AI to generate content.' }
      ]
    }
  ],
});

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function App() {
  const draft = loadDraft();
  const initialState = {
    ...(draft ?? createDefaultAuthoringState()),
    slides: normalizeAuthoringSlides((draft ?? createDefaultAuthoringState()).slides),
  };

  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseTitle, setCourseTitle] = useState(initialState.courseTitle);
  const [passingScore, setPassingScore] = useState(initialState.passingScore);
  const [slides, setSlides] = useState(initialState.slides);
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const previewFrameRef = useRef(null);

  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const toastTimerRef = useRef(null);

  const prevSavedRef = useRef({
    courseTitle: initialState.courseTitle,
    passingScore: initialState.passingScore,
    slides: initialState.slides,
  });

  useEffect(() => {
    const isDifferent =
      courseTitle !== prevSavedRef.current.courseTitle ||
      passingScore !== prevSavedRef.current.passingScore ||
      JSON.stringify(slides) !== JSON.stringify(prevSavedRef.current.slides);
    setHasUnsaved(isDifferent);
  }, [courseTitle, passingScore, slides]);

  const handleSave = async () => {
    try {
      const payload = { courseTitle, passingScore, slides };
      const savedCourse = await saveCourseToBrowser(selectedCourseId, payload);
      setSelectedCourseId(savedCourse.id);
      prevSavedRef.current = { courseTitle, passingScore, slides };
      setHasUnsaved(false);

      setSaveToast('visible');
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setSaveToast('hiding');
        toastTimerRef.current = setTimeout(() => setSaveToast(false), 350);
      }, 2000);
      return true;
    } catch {
      alert('Could not save this course to browser storage.');
      return false;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [courseTitle, passingScore, slides]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentView !== 'editor' || !selectedCourseId) return;

    const payload = { courseTitle, passingScore, slides };
    const isDifferent =
      payload.courseTitle !== prevSavedRef.current.courseTitle ||
      payload.passingScore !== prevSavedRef.current.passingScore ||
      JSON.stringify(payload.slides) !== JSON.stringify(prevSavedRef.current.slides);

    if (!isDifferent) return;

    const autosaveTimer = setTimeout(async () => {
      try {
        await saveCourseToBrowser(selectedCourseId, payload);
        prevSavedRef.current = payload;
        setHasUnsaved(false);
      } catch {
        setHasUnsaved(true);
      }
    }, 1200);

    return () => clearTimeout(autosaveTimer);
  }, [courseTitle, currentView, passingScore, selectedCourseId, slides]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportAbortController = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragEnabledIdx, setDragEnabledIdx] = useState(null);
  const [draggedSlideIdx, setDraggedSlideIdx] = useState(null);
  const [slideDragEnabledIdx, setSlideDragEnabledIdx] = useState(null);
  const [newBlockIds, setNewBlockIds] = useState(new Set());
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBlockType, setAiBlockType] = useState('Paragraph');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const [sidebarTab, setSidebarTab] = useState('content');
  const [formatPopoverId, setFormatPopoverId] = useState(null); // block id whose format panel is open

  const activeSlide = activeSlideId ? slides.find(s => s.id === activeSlideId) : null;
  const activeSlideIndex = activeSlideId ? slides.findIndex(s => s.id === activeSlideId) : -1;

  const SUGGESTED_PROMPTS = [
    'Key learning objectives',
    'A brief introduction',
    'Common misconceptions',
    'A real-world example',
    'Summary & takeaways',
    'Step-by-step instructions',
  ];

  const openAIModal = () => { setAiPrompt(''); setAiBlockType('Paragraph'); setShowAIModal(true); };
  const closeAIModal = () => { setShowAIModal(false); setAiPrompt(''); };

  const addSlide = () => {
    const newSlide = createBlankSlide(slides.length + 1);
    setSlides(prev => [...prev, newSlide]);
  };

  const insertSlideNextTo = (slideId) => {
    let insertedSlideId = null;
    setSlides(prev => {
      const slideIndex = prev.findIndex(s => s.id === slideId);
      if (slideIndex < 0) return prev;
      const insertedSlide = createBlankSlide(prev.length + 1);
      insertedSlideId = insertedSlide.id;
      const nextSlides = [...prev];
      nextSlides.splice(slideIndex + 1, 0, insertedSlide);
      return nextSlides;
    });
    if (insertedSlideId) setActiveSlideId(insertedSlideId);
  };

  const deleteSlide = (slideId) => {
    setSlides(prev => prev
      .filter(s => s.id !== slideId)
      .map(s => ({
        ...s,
        elements: (s.elements || []).map(el => (
          el.type === 'button' && String(el.targetSlideId || '') === String(slideId)
            ? { ...el, targetSlideId: '' }
            : el
        )),
      })));
    if (activeSlideId === slideId) setActiveSlideId(null);
  };

  const duplicateSlide = (slideId) => {
    let duplicatedSlideId = null;
    setSlides(prev => {
      const slideIndex = prev.findIndex(s => s.id === slideId);
      if (slideIndex < 0) return prev;
      const sourceSlide = prev[slideIndex];
      const matchingCopies = prev.filter(s => String(s.title || '').startsWith(`${sourceSlide.title || 'Untitled Slide'} Copy`)).length;
      const duplicatedSlide = cloneSlideWithFreshIds(sourceSlide, matchingCopies > 0 ? matchingCopies + 1 : null);
      duplicatedSlideId = duplicatedSlide.id;
      const nextSlides = [...prev];
      nextSlides.splice(slideIndex + 1, 0, duplicatedSlide);
      return nextSlides;
    });
    if (duplicatedSlideId) setActiveSlideId(duplicatedSlideId);
  };

  const updateSlideTitle = (slideId, title) => {
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, title } : s));
  };

  const goToAdjacentSlide = (direction) => {
    if (activeSlideIndex < 0) return;
    const nextIndex = activeSlideIndex + direction;
    if (nextIndex < 0 || nextIndex >= slides.length) return;
    setActiveSlideId(slides[nextIndex].id);
  };

  const addBlock = (type) => {
    if (!activeSlideId) return;
    const newBlock = { id: Date.now(), type };
    if (type === 'heading') newBlock.content = "";
    if (type === 'text') newBlock.content = "";
    if (type === 'image') newBlock.content = "";
    if (type === 'button') {
      newBlock.content = "";
      newBlock.targetSlideId = "";
      newBlock.alignment = "center";
    }
    if (type === 'quiz') {
      newBlock.question = "";
      newBlock.options = ["", "", ""];
      newBlock.correctAnswer = 0;
      newBlock.marks = 0;
    }
    if (type === 'flashcard') {
      newBlock.front = '';
      newBlock.back = '';
    }
    if (type === 'video') {
      newBlock.videoUrl = '';
      newBlock.isLocal = false;
    }
    if (type === 'list') {
      newBlock.items = ["", "", ""];
    }
    if (type === 'quote') {
      newBlock.content = "";
      newBlock.author = "";
    }
    if (type === 'process') {
      newBlock.steps = [{ title: '', content: '' }, { title: '', content: '' }];
    }
    if (type === 'tabs') {
      newBlock.tabs = [{ title: 'Tab 1', content: '', image: null }, { title: 'Tab 2', content: '', image: null }];
    }
    if (type === 'true_false') {
      newBlock.question = '';
      newBlock.correctAnswer = true;
      newBlock.isMandatory = false;
      newBlock.marks = 0;
    }
    if (type === 'fill_blanks') {
      newBlock.question = '';
      newBlock.answer = '';
      newBlock.answers = [''];
      newBlock.caseSensitive = false;
      newBlock.isMandatory = false;
      newBlock.marks = 0;
    }
    if (type === 'multi_select') {
      newBlock.question = '';
      newBlock.options = ['', '', ''];
      newBlock.correctAnswer = [];
      newBlock.mandatory = false;
      newBlock.marks = 0;
    }
    if (type === 'matching') {
      newBlock.question = '';
      newBlock.pairs = [
        { leftItem: '', rightItem: '' },
        { leftItem: '', rightItem: '' }
      ];
      newBlock.mandatory = false;
      newBlock.marks = 0;
    }
    if (type === 'audio') {
      newBlock.label = '';
      newBlock.audioUrl = '';
      newBlock.mediaId = '';
      newBlock.isUploading = false;
      newBlock.mandatory = false;
    }
    if (type === 'table') {
      newBlock.headers = ['', ''];
      newBlock.rows = [
        ['', ''],
        ['', '']
      ];
      newBlock.tableColor = '#ffffff';
      newBlock.headerColor = '#d5b4b4';
    }
    if (type === 'columns') {
      newBlock.columns = [[], []];
    }
    if (type === 'interactive-video') {
      newBlock.videoUrl = '';
      newBlock.interactions = [];
      newBlock.mandatory = false;
    }
    if (type === 'image-hotspot') {
      newBlock.imageUrl = '';
      newBlock.hotspots = [];
    }
    if (type === 'image-stack') {
      newBlock.slides = [{ id: Date.now().toString(), type: 'image', imageUrl: '', caption: '' }];
    }
    if (type === 'scenario') {
      newBlock.slides = [];
    }
    if (type === 'canvas') {
      newBlock.items = [];
      newBlock.canvasBg = '#ffffff';
    }
    setSlides(prev => prev.map(s => {
      if (s.id !== activeSlideId) return s;
      return { ...s, elements: [...s.elements, newBlock] };
    }));
    setNewBlockIds(prev => new Set([...prev, newBlock.id]));
    setTimeout(() => setNewBlockIds(prev => { const n = new Set(prev); n.delete(newBlock.id); return n; }), 400);
  };

  const updateBlock = (id, updatedData) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== activeSlideId) return s;
      return { ...s, elements: s.elements.map(b => b.id === id ? { ...b, ...updatedData } : b) };
    }));
  };

  const deleteBlock = (id) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== activeSlideId) return s;
      return { ...s, elements: s.elements.filter(b => b.id !== id) };
    }));
  };

  const handleDragStart = (e, index) => { setDraggedIdx(index); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex || !activeSlideId) return;
    setSlides(prev => prev.map(s => {
      if (s.id !== activeSlideId) return s;
      const newElements = [...s.elements];
      const draggedBlock = newElements[draggedIdx];
      newElements.splice(draggedIdx, 1);
      newElements.splice(targetIndex, 0, draggedBlock);
      return { ...s, elements: newElements };
    }));
    setDraggedIdx(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); };

  const handleSlideDragStart = (e, index) => { setDraggedSlideIdx(index); e.dataTransfer.effectAllowed = "move"; };
  const handleSlideDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleSlideDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedSlideIdx === null || draggedSlideIdx === targetIndex) return;
    setSlides(prev => {
      const newSlides = [...prev];
      const draggedSlide = newSlides[draggedSlideIdx];
      newSlides.splice(draggedSlideIdx, 1);
      newSlides.splice(targetIndex, 0, draggedSlide);
      return newSlides;
    });
    setDraggedSlideIdx(null);
  };
  const handleSlideDragEnd = () => { setDraggedSlideIdx(null); };

  const handleBgUpload = (e) => {
    if (e.target.files && e.target.files[0] && activeSlideId) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlides(prev => prev.map(s => s.id === activeSlideId ? { ...s, background: { type: 'image', value: reader.result } } : s));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgAudioUpload = async (e) => {
    if (e.target.files && e.target.files[0] && activeSlideId) {
      const file = e.target.files[0];
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch(buildApiUrl('/api/upload/audio'), { method: 'POST', body: fd });
        if (!res.ok) throw new Error();
        const d = await res.json();
        setSlides(prev => prev.map(s => s.id === activeSlideId ? {
          ...s,
          bgAudio: { url: buildBackendAssetUrl(d.previewUrl), name: file.name, mediaId: d.mediaId }
        } : s));
      } catch {
        alert('Audio upload failed.');
      }
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      let endpoint;
      if (type === 'pptx') endpoint = '/api/upload/pptx';
      else if (type === 'pdf') endpoint = '/api/upload/pdf';
      const response = await fetch(buildApiUrl(endpoint), { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const newSlides = data.blocks.map((b, i) => {
        let background = b.background || null;
        if (background?.type === 'none' || !background?.value) {
          background = null;
        }
        if (!background) {
          if (b.backgroundColor) {
            background = { type: 'color', value: b.backgroundColor };
          } else if (b.backgroundImage) {
            background = { type: 'image', value: b.backgroundImage };
          }
        }
        let elements = (b.elements || []).map((el, j) => {
          let updatedEl = { ...el, id: Date.now() + i * 1000 + j + 1 };
          if (updatedEl.type === 'audio' && updatedEl.audioUrl && updatedEl.audioUrl.startsWith('/api/')) {
            updatedEl.audioUrl = buildBackendAssetUrl(updatedEl.audioUrl);
          }
          return updatedEl;
        });
        if (b.transition) {
          elements = [
            {
              id: Date.now() + i * 1000,
              type: 'text',
              content: `<div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#8b1a1a;background:#fff5f5;padding:4px 10px;border-radius:4px;display:inline-block;">▶ TRANSITION: ${b.transition}</div>`,
            },
            ...elements,
          ];
        }

        if (b.type === 'slide') {
          return {
            ...b,
            id: b.id || (Date.now() + i),
            background: background || undefined,
            elements,
          };
        }
        return { id: Date.now() + i, type: 'slide', title: `Imported Slide ${i + 1}`, background: background || undefined, elements: [b] };
      });
      setSlides(prev => [...prev, ...newSlides]);
    } catch {
      alert(`Failed to import ${type.toUpperCase()}.`);
    } finally {
      setIsUploading(false);
      event.target.value = null;
    }
  };

  const generateAIBlock = async () => {
    if (!aiPrompt.trim() || !activeSlideId) return;
    setShowAIModal(false);
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('prompt', aiPrompt.trim());
      formData.append('block_type', aiBlockType);
      const response = await fetch(buildApiUrl('/api/ai/generate'), { method: 'POST', body: formData });
      const data = await response.json();
      const newBlock = { id: Date.now(), type: 'text', content: data.data.content || JSON.stringify(data.data) };
      setSlides(prev => prev.map(s => {
        if (s.id !== activeSlideId) return s;
        return { ...s, elements: [...s.elements, newBlock] };
      }));
      setNewBlockIds(prev => new Set([...prev, newBlock.id]));
      setTimeout(() => setNewBlockIds(prev => { const n = new Set(prev); n.delete(newBlock.id); return n; }), 400);
    } catch {
      alert("Backend not reached.");
    } finally {
      setIsGenerating(false);
      setAiPrompt('');
    }
  };

  const validateCourseForExport = () => {
    let warnings = [];
    let emptyCount = 0;
    slides.forEach((slide, sIdx) => {
      slide.elements.forEach((block, bIdx) => {
        if (block.type === 'text' && !block.content?.trim()) emptyCount++;
        if (block.type === 'video' && !block.videoUrl) warnings.push(`Slide ${sIdx + 1}: Video block missing URL.`);
        if (block.type === 'audio' && !block.audioUrl && !block.mediaId) warnings.push(`Slide ${sIdx + 1}: Audio block missing media file.`);
        if (block.type === 'true_false' && !block.question?.trim()) warnings.push(`Slide ${sIdx + 1}: True/False block missing question.`);
        if (block.type === 'fill_blanks') {
          const answers = normalizeFillBlankAnswers(block.question, block.answers, block.answer);
          if (!block.question?.trim()) warnings.push(`Slide ${sIdx + 1}: Fill in Blank missing question.`);
          if (answers.length === 0 || answers.some(answer => !String(answer || '').trim())) warnings.push(`Slide ${sIdx + 1}: Fill in Blank has one or more empty answers.`);
        }
      });
    });
    if (emptyCount > 0) warnings.push(`${emptyCount} empty text block(s) detected.`);

    if (warnings.length > 0) {
      return window.confirm(`There are some issues with your course:\n\n- ${warnings.join('\n- ')}\n\nDo you want to proceed with export anyway?`);
    }
    return true;
  };

  const handleExportScorm = async () => {
    if (!validateCourseForExport()) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportLabel('Preparing SCORM 1.2 data…');
    try {
      setExportProgress(10);
      await new Promise(r => setTimeout(r, 200));

      setExportLabel('Uploading to server…');
      setExportProgress(25);
      const body = JSON.stringify({ title: courseTitle, blocks: slides, policy: { passingScore }, theme: null });

      let pct = 25;
      const ticker = setInterval(() => {
        pct = Math.min(pct + 3, 85);
        setExportProgress(pct);
      }, 400);

      setExportLabel('Generating SCORM 1.2 package…');
      exportAbortController.current = new AbortController();
      const response = await fetch(buildApiUrl('/api/export/scorm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: exportAbortController.current.signal
      });
      clearInterval(ticker);

      if (!response.ok) throw new Error("Export failed");

      setExportLabel('Downloading ZIP…');
      setExportProgress(90);
      const blob = await response.blob();

      setExportProgress(95);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courseTitle.replace(/\s+/g, '_')}_SCORM.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportLabel('Done!');
      setExportProgress(100);
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('SCORM export cancelled by user.');
      } else {
        alert("Failed to export SCORM 1.2 package.");
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportLabel('');
    }
  };

  const handleExportXapi = async () => {
    if (!validateCourseForExport()) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportLabel('Preparing xAPI data…');
    try {
      setExportProgress(10);
      await new Promise(r => setTimeout(r, 200));

      setExportLabel('Uploading to server…');
      setExportProgress(25);
      const body = JSON.stringify({ title: courseTitle, blocks: slides, policy: { passingScore }, theme: null });

      let pct = 25;
      const ticker = setInterval(() => {
        pct = Math.min(pct + 5, 85);
        setExportProgress(pct);
      }, 300);

      setExportLabel('Generating xAPI package…');
      exportAbortController.current = new AbortController();
      const response = await fetch(buildApiUrl('/api/export/xapi'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: exportAbortController.current.signal
      });
      clearInterval(ticker);

      if (!response.ok) throw new Error("Export failed");

      setExportLabel('Downloading ZIP…');
      setExportProgress(90);
      const blob = await response.blob();

      setExportProgress(95);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courseTitle.replace(/\s+/g, '_')}_xAPI.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportLabel('Done!');
      setExportProgress(100);
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('xAPI export cancelled by user.');
      } else {
        alert("Failed to export xAPI package.");
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportLabel('');
    }
  };

  const handleOpenPreview = async () => {
    if (slides.length === 0) { alert('Add at least one slide before previewing.'); return; }
    setIsPreviewLoading(true);
    try {
      const body = JSON.stringify({ title: courseTitle, blocks: slides, policy: { passingScore }, theme: null });
      const res = await fetch(buildApiUrl('/api/preview-html'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error('Preview generation failed');
      const html = await res.text();
      setPreviewHtml(html);
      setIsPreviewOpen(true);
    } catch (e) {
      alert('Could not build preview. Make sure the backend is running.\n' + e.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handlePreviewRestart = () => {
    const iframeWindow = previewFrameRef.current?.contentWindow;
    const runtime = iframeWindow?.__cfRuntime;
    if (runtime && typeof runtime.restartCourse === 'function') {
      runtime.restartCourse();
      return;
    }
    if (previewFrameRef.current && previewHtml) {
      // Reload by briefly clearing then resetting srcdoc
      previewFrameRef.current.srcdoc = '';
      requestAnimationFrame(() => { if (previewFrameRef.current) previewFrameRef.current.srcdoc = previewHtml; });
    }
  };

  // --- Modular renderBlock ---
  const renderBlock = (block) => {
    switch (block.type) {
      case 'heading':
      case 'heading-1':
        return <RichTextEditor className="cf-heading-input" value={block.content} onChange={(val) => updateBlock(block.id, { content: val })} placeholder="Heading..." />;
      case 'text':
      case 'ai-generated':
        return <RichTextEditor className="cf-text-area" value={block.content} onChange={(val) => updateBlock(block.id, { content: val })} placeholder="Enter your text here..." />;
      case 'image': return <ImageBlock block={block} onUpdate={updateBlock} />;
      case 'button': return <ButtonBlock block={block} onUpdate={updateBlock} slides={slides} />;
      case 'quiz': return <QuizBlock block={block} onUpdate={updateBlock} />;
      case 'flashcard': return <FlashcardBlock block={block} onUpdate={updateBlock} />;
      case 'video': return <VideoBlock block={block} onUpdate={updateBlock} />;
      case 'interactive-video': return <InteractiveVideoBlock block={block} onUpdate={updateBlock} readOnly={isPreviewOpen} />;
      case 'image-hotspot': return <ImageHotspotBlock block={block} onUpdate={updateBlock} readOnly={isPreviewOpen} />;
      case 'image-stack': return <ImageStackBlock block={block} onUpdate={updateBlock} readOnly={isPreviewOpen} />;
      case 'process': return <ProcessBlock block={block} onUpdate={updateBlock} />;
      case 'table': return <TableBlock block={block} onUpdate={updateBlock} />;
      case 'list': return <ListBlock block={block} onUpdate={updateBlock} />;
      case 'quote': return <QuoteBlock block={block} onUpdate={updateBlock} />;
      case 'multi_select': return <MultiSelectBlock block={block} onUpdate={updateBlock} />;
      case 'matching': return <MatchingBlock block={block} onUpdate={updateBlock} />;
      case 'true_false': return <TrueFalseBlock block={block} onUpdate={updateBlock} />;
      case 'fill_blanks': return <FillBlankBlock block={block} onUpdate={updateBlock} />;
      case 'columns': return <ColumnsGridBlock block={block} onUpdate={updateBlock} readOnly={isPreviewOpen} />;
      case 'audio': return <AudioBlock block={block} onUpdate={updateBlock} />;
      case 'tabs': return <TabsBlock block={block} onUpdate={updateBlock} />;
      case 'scenario': return <ScenarioBlock block={block} onUpdate={updateBlock} />;
      case 'canvas': return <CanvasBlock block={block} onUpdate={updateBlock} />;
      default:
        return (
          <div style={{ color: '#B08080', fontSize: '0.8125rem', padding: '1rem', background: '#FFF5F5', borderRadius: 8, border: '1px dashed #E8C8C8' }}>
            Unsupported block: {block.type}
          </div>
        );
    }
  };

  const loadAuthoringStateIntoEditor = (courseId, authoringState) => {
    const fallbackState = createDefaultAuthoringState();
    const nextState = authoringState || fallbackState;
    const normalizedSlides = normalizeAuthoringSlides(nextState.slides || fallbackState.slides);

    setSelectedCourseId(courseId);
    setCourseTitle(nextState.courseTitle || fallbackState.courseTitle);
    setPassingScore(nextState.passingScore ?? fallbackState.passingScore);
    setSlides(normalizedSlides);
    setActiveSlideId(null);
    setShowAIModal(false);
    setExportProgress(0);
    setExportLabel('');
    prevSavedRef.current = {
      courseTitle: nextState.courseTitle || fallbackState.courseTitle,
      passingScore: nextState.passingScore ?? fallbackState.passingScore,
      slides: normalizedSlides,
    };
    setHasUnsaved(false);
    setCurrentView('editor');
  };

  const handleCreateNewCourse = async () => {
    const authoringState = createDefaultAuthoringState();
    const course = await createLocalCourse(authoringState);
    loadAuthoringStateIntoEditor(course.id, course.authoringState);
  };

  const handleOpenCourse = (course) => {
    loadAuthoringStateIntoEditor(course.id, course.authoringState);
  };

  const handleBackToDashboard = async () => {
    const saved = await handleSave();
    if (saved) {
      setCurrentView('dashboard');
    }
  };

  if (currentView === 'dashboard') {
    return <Dashboard onCreateNew={handleCreateNewCourse} onOpenCourse={handleOpenCourse} />;
  }

  return (
    <>
      <div className="cf-root">
        {/* Header */}
        <header className="cf-header" style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 14px' }}>

          {/* ── Left: Brand + Dashboard ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div className="cf-logo">
              <div className="cf-logo-icon">
                <BookOpen style={{ width: 16, height: 16 }} />
              </div>
              <span className="cf-logo-text">CourseForge</span>
            </div>
            <div className="cf-logo-sep" />
            <button
              onClick={handleBackToDashboard}
              className="cf-btn cf-btn-xapi"
              style={{ height: 30, padding: '0 10px', fontSize: '0.73rem', gap: '4px' }}
            >
              <ChevronRight style={{ width: 12, height: 12, transform: 'rotate(180deg)' }} />
              Dashboard
            </button>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          </div>

          {/* ── Centre: Course Title ── */}
          <input
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            className="cf-title-input"
            placeholder="Untitled Course"
            style={{ flex: 1, minWidth: 0, margin: '0 10px' }}
          />

          {/* ── Right: Pass Score + Actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>

            {/* Save */}
            <button
              id="cf-save-btn"
              onClick={handleSave}
              className={`cf-btn cf-btn-save${!hasUnsaved && saveToast ? ' saved' : ''}`}
              title="Save draft (Ctrl+S)"
              style={{ height: 30, padding: '0 11px', gap: '5px' }}
            >
              {hasUnsaved && <span className="cf-unsaved-dot" title="Unsaved changes" />}
              <Save style={{ width: 12, height: 12 }} />
              Save
            </button>

            {/* Preview */}
            <button
              onClick={handleOpenPreview}
              disabled={isPreviewLoading}
              className="cf-btn cf-btn-preview"
              style={{ height: 30, padding: '0 11px', gap: '5px' }}
            >
              {isPreviewLoading
                ? <span className="cf-spin" style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                : <Eye style={{ width: 13, height: 13 }} />}
              {isPreviewLoading ? 'Building…' : 'Preview'}
            </button>

            {/* AI Generate */}
            <button
              onClick={openAIModal}
              disabled={isGenerating || !activeSlideId}
              className="cf-btn cf-btn-ai"
              title="Generate block with AI"
              style={{ height: 30, padding: '0 11px', gap: '5px' }}
            >
              {isGenerating
                ? <span className="cf-spin" style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                : <Sparkles style={{ width: 13, height: 13 }} />
              }
              {isGenerating ? 'Generating…' : 'AI'}
            </button>

            {/* Export dropdown */}
            <div ref={exportMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => !isExporting && setIsExportMenuOpen(prev => !prev)}
                disabled={isExporting}
                className="cf-btn cf-btn-scorm"
                style={{ height: 30, padding: '0 11px', gap: '5px', minWidth: 'unset' }}
              >
                <Download style={{ width: 13, height: 13 }} />
                Export
                <ChevronDown style={{ width: 11, height: 11, marginLeft: 2, transform: isExportMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
              </button>
              {isExportMenuOpen && !isExporting && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 185, background: '#fff', border: '1px solid #EAD0D0', borderRadius: 6, boxShadow: '0 8px 28px rgba(15,23,42,0.13)', padding: '4px', zIndex: 30 }}>
                  <button
                    type="button"
                    onClick={() => { setIsExportMenuOpen(false); handleExportScorm(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#8b1a1a', border: 'none', borderRadius: 4, padding: '8px 10px', cursor: 'pointer', fontFamily: 'Roboto', fontWeight: 600, fontSize: '0.8rem', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Download style={{ width: 13, height: 13 }} /> Export as SCORM 1.2
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsExportMenuOpen(false); handleExportXapi(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#8b1a1a', border: 'none', borderRadius: 4, padding: '8px 10px', cursor: 'pointer', fontFamily: 'Roboto', fontWeight: 600, fontSize: '0.8rem', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Globe style={{ width: 13, height: 13 }} /> Export as xAPI
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Export Progress Bar */}
        {isExporting && exportProgress > 0 && (
          <div style={{
            position: 'fixed', top: 64, right: 24, zIndex: 9999,
            width: 320, background: 'white', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(139,26,26,0.18), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #f0e0e0', overflow: 'hidden',
            animation: 'cf-block-enter 0.3s ease',
          }}>
            <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {exportProgress < 100 ? (
                <span className="cf-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2.5px solid #EAD0D0', borderTopColor: '#8B1A1A', borderRadius: '50%', flexShrink: 0 }} />
              ) : (
                <span style={{ fontSize: 16 }}>✅</span>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1a0a0a', fontFamily: 'Roboto' }}>
                  {exportLabel}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <div style={{ fontSize: '0.6875rem', color: '#8b6060' }}>
                    {exportProgress}%
                  </div>
                  {exportProgress < 100 && (
                    <button
                      onClick={() => exportAbortController.current?.abort()}
                      style={{ background: 'transparent', border: '1px solid #ead0d0', color: '#8b1a1a', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ height: 4, background: '#f0e0e0' }}>
              <div style={{
                height: '100%',
                width: `${exportProgress}%`,
                background: exportProgress === 100
                  ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                  : 'linear-gradient(90deg, #8B1A1A, #C0392B)',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        <div className="cf-layout">
          {/* Sidebar */}
          <aside className="cf-sidebar">
            {/* Tab Strip */}
            <div style={{ display: 'flex', gap: '3px', padding: '0 0 12px 0', borderBottom: '1px solid #f0e0e0', marginBottom: '10px' }}>
              {[
                { id: 'content', label: 'Content' },
                { id: 'assess', label: 'Quiz' },
                { id: 'slide', label: 'Slide' },
                { id: 'import', label: 'Import' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '5px 2px',
                    background: sidebarTab === tab.id ? '#8b1a1a' : 'transparent',
                    color: sidebarTab === tab.id ? '#fff' : '#8b6060',
                    border: '1px solid ' + (sidebarTab === tab.id ? '#8b1a1a' : '#ead0d0'),
                    borderRadius: '4px',
                    fontSize: '0.67rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    fontFamily: 'Roboto, sans-serif',
                    transition: 'all 0.15s',
                    textTransform: 'uppercase',
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {/* ── Content Tab ── */}
            {sidebarTab === 'content' && (
              <div className="cf-sidebar-section" style={{ opacity: activeSlideId ? 1 : 0.5, pointerEvents: activeSlideId ? 'auto' : 'none' }}>
                {!activeSlideId && (
                  <div style={{ fontSize: '0.72rem', color: '#c4a0a0', textAlign: 'center', marginBottom: '10px' }}>
                    Select a slide to add blocks.
                  </div>
                )}
                <span className="cf-sidebar-label">Content</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '12px' }}>
                  {[
                    { type: 'heading', icon: <Heading1 style={{ width: 14, height: 14 }} />, label: 'Heading' },
                    { type: 'text', icon: <Type style={{ width: 14, height: 14 }} />, label: 'Text' },
                    { type: 'image', icon: <ImageIcon style={{ width: 14, height: 14 }} />, label: 'Image' },
                    { type: 'button', icon: <MousePointerClick style={{ width: 14, height: 14 }} />, label: 'Button' },
                    { type: 'flashcard', icon: <CreditCard style={{ width: 14, height: 14 }} />, label: 'Flashcard' },
                    { type: 'video', icon: <Video style={{ width: 14, height: 14 }} />, label: 'Video' },
                    { type: 'interactive-video', icon: <Play style={{ width: 14, height: 14 }} />, label: 'Int. Video' },
                    { type: 'image-hotspot', icon: <MousePointerClick style={{ width: 14, height: 14 }} />, label: 'Image Hotspot' },
                    { type: 'image-stack', icon: <Layers style={{ width: 14, height: 14 }} />, label: 'Img Stack' },
                    { type: 'list', icon: <List style={{ width: 14, height: 14 }} />, label: 'List' },
                    { type: 'quote', icon: <Quote style={{ width: 14, height: 14 }} />, label: 'Quote' },
                    { type: 'process', icon: <Layers style={{ width: 14, height: 14 }} />, label: 'Process' },
                    { type: 'audio', icon: <Mic style={{ width: 14, height: 14 }} />, label: 'Audio' },
                    { type: 'table', icon: <Table style={{ width: 14, height: 14 }} />, label: 'Table' },
                    { type: 'columns', icon: <Layers style={{ width: 14, height: 14 }} />, label: 'Columns' },
                    { type: 'tabs', icon: <Layers style={{ width: 14, height: 14 }} />, label: 'Tabs' },
                    { type: 'scenario', icon: <BookOpen style={{ width: 14, height: 14 }} />, label: 'Scenario' },
                    { type: 'canvas', icon: <Square style={{ width: 14, height: 14 }} />, label: 'Canvas' },
                  ].map(({ type, icon, label }) => (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="cf-sidebar-btn"
                      style={{ flexDirection: 'column', gap: '5px', padding: '9px 4px', fontSize: '0.69rem', justifyContent: 'center', alignItems: 'center', textAlign: 'center', lineHeight: 1.2 }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Assess Tab ── */}
            {sidebarTab === 'assess' && (
              <div className="cf-sidebar-section" style={{ opacity: activeSlideId ? 1 : 0.5, pointerEvents: activeSlideId ? 'auto' : 'none' }}>
                {!activeSlideId && (
                  <div style={{ fontSize: '0.72rem', color: '#c4a0a0', textAlign: 'center', marginBottom: '10px' }}>
                    Select a slide to add assessments.
                  </div>
                )}
                <span className="cf-sidebar-label">Assessments</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                  {[
                    { type: 'quiz', icon: <ListChecks style={{ width: 14, height: 14 }} />, label: 'MCQ' },
                    { type: 'true_false', icon: <ToggleLeft style={{ width: 14, height: 14 }} />, label: 'True / False' },
                    { type: 'fill_blanks', icon: <PenLine style={{ width: 14, height: 14 }} />, label: 'Fill Blank' },
                    { type: 'multi_select', icon: <ListChecks style={{ width: 14, height: 14 }} />, label: 'Multi-Select' },
                    { type: 'matching', icon: <Layers style={{ width: 14, height: 14 }} />, label: 'Matching' },
                  ].map(({ type, icon, label }) => (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="cf-sidebar-btn"
                      style={{ flexDirection: 'column', gap: '5px', padding: '9px 4px', fontSize: '0.69rem', justifyContent: 'center', alignItems: 'center', textAlign: 'center', lineHeight: 1.2 }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '16px', background: '#fff5f5', borderRadius: 6, border: '1px solid #f0d8d8', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px 6px', borderBottom: '1px solid #f0d8d8' }}>
                    <ShieldCheck style={{ width: 12, height: 12, color: '#8b1a1a', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.67rem', fontWeight: 700, color: '#8b1a1a', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Passing Score</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px' }}>
                    <input
                      type="number" min="0" max="100"
                      value={passingScore}
                      onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                      style={{ width: 58, textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, padding: '4px 6px', borderRadius: 4, border: '1px solid #e8c8c8', background: '#fff', color: '#1a0a0a', outline: 'none', fontFamily: 'Roboto, sans-serif', cursor: 'text' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#8b6060', fontWeight: 600 }}>% to pass</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Slide Tab ── */}
            {sidebarTab === 'slide' && (
              activeSlideId ? (
                <div className="cf-sidebar-section">
                  <span className="cf-sidebar-label">Slide Background</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setSlides(prev => prev.map(s => s.id === activeSlideId ? { ...s, background: { ...s.background, type: 'color' } } : s))}
                        className={`cf-sidebar-toggle-btn ${(activeSlide?.background?.type || 'color') === 'color' ? 'active' : ''}`}
                      >Color</button>
                      <button
                        onClick={() => setSlides(prev => prev.map(s => s.id === activeSlideId ? { ...s, background: { ...s.background, type: 'image' } } : s))}
                        className={`cf-sidebar-toggle-btn ${(activeSlide?.background?.type || 'color') === 'image' ? 'active' : ''}`}
                      >Image</button>
                    </div>
                    {(activeSlide?.background?.type || 'color') === 'color' ? (
                      <input
                        type="color"
                        value={activeSlide?.background?.value || '#ffffff'}
                        onChange={(e) => setSlides(prev => prev.map(s => s.id === activeSlideId ? { ...s, background: { type: 'color', value: e.target.value } } : s))}
                        style={{ width: '100%', height: '36px', cursor: 'pointer', border: '1px solid #EAD0D0', borderRadius: '4px', padding: '2px', background: 'white' }}
                      />
                    ) : (
                      <label className="cf-sidebar-file-label" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <ImageIcon style={{ width: 15, height: 15, color: '#8B6060', marginRight: '6px' }} />
                        Upload Image
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
                      </label>
                    )}
                    {activeSlide?.background?.type === 'image' && activeSlide?.background?.value && activeSlide?.background?.value.startsWith('data:') && (
                      <div style={{ fontSize: '11px', color: '#10b981', textAlign: 'center', fontWeight: 600 }}>Image Set Successfully!</div>
                    )}
                  </div>
                  <div className="cf-sidebar-divider" />
                  <div style={{ marginTop: '12px' }}>
                    <span className="cf-sidebar-label" style={{ fontSize: '11px', color: '#8b6060' }}>Background Audio</span>
                    {activeSlide?.bgAudio ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff5f5', padding: '6px', borderRadius: '4px', border: '1px solid #EAD0D0', marginTop: '4px' }}>
                        <div style={{ fontSize: '11px', color: '#1a0a0a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          🎵 {activeSlide.bgAudio.name}
                        </div>
                        <button onClick={() => setSlides(prev => prev.map(s => s.id === activeSlideId ? { ...s, bgAudio: null } : s))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="cf-sidebar-file-label" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '4px' }}>
                        <Mic style={{ width: 15, height: 15, color: '#8B6060', marginRight: '6px' }} />
                        Upload Audio
                        <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleBgAudioUpload} />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                  <Layers style={{ width: 28, height: 28, color: '#ead0d0', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '0.78rem', color: '#c4a0a0', lineHeight: 1.5 }}>Select a slide to edit its background and audio.</div>
                </div>
              )
            )}

            {/* ── Import Tab ── */}
            {sidebarTab === 'import' && (
              <div className="cf-sidebar-section">
                <span className="cf-sidebar-label">Import Slides From</span>
                <label className="cf-sidebar-import-btn">
                  <FileUp className="cf-sidebar-icon" />
                  {isUploading ? 'Uploading…' : 'PowerPoint (.pptx)'}
                  <input type="file" accept=".pptx" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pptx')} />
                </label>
                <label className="cf-sidebar-import-btn">
                  <FileText className="cf-sidebar-icon" />
                  {isUploading ? 'Uploading…' : 'PDF File (.pdf)'}
                  <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pdf')} />
                </label>
                <div style={{ marginTop: '12px', padding: '10px', background: '#fff5f5', borderRadius: 6, border: '1px solid #f0d8d8', fontSize: '0.72rem', color: '#8b6060', lineHeight: 1.5 }}>
                  Imported slides will be appended to the end of your current course.
                </div>
              </div>
            )}

            {/* ── Block count hint (always visible when slide selected) ── */}
            {activeSlideId && (
              <div style={{ marginTop: 'auto', padding: '10px 0 0' }}>
                <div style={{ padding: '0.65rem 0.75rem', background: '#FFF5F5', borderRadius: 6, border: '1px solid #F0D8D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B1A1A' }}>
                      {activeSlide.elements.length} Block{activeSlide.elements.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#B08080', marginTop: '2px' }}>
                      Drag to reorder
                    </div>
                  </div>
                  <GripVertical style={{ width: 14, height: 14, color: '#e0b8b8' }} />
                </div>
              </div>
            )}
          </aside>

          {/* Canvas */}
          <div className="cf-canvas-wrap">
            {!activeSlideId ? (
              // Overview View
              <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontFamily: 'Roboto', fontSize: '2rem', color: '#1a0a0a', margin: '0 0 0.5rem 0' }}>Course Slides</h2>
                    <p style={{ margin: 0, color: '#6b3a3a', fontSize: '0.9375rem' }}>Select a slide to edit its content.</p>
                  </div>
                  <button onClick={addSlide} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#8b1a1a', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Roboto', fontWeight: 600 }}>
                    <BookOpen style={{ width: 16, height: 16 }} /> Add Slide
                  </button>
                </div>

                {slides.length === 0 ? (
                  <div className="cf-empty-state" style={{ background: 'white', borderRadius: 16, border: '1px dashed #e8d8d8' }}>
                    <div className="cf-empty-icon"><BookOpen style={{ width: 24, height: 24, color: '#C4A0A0' }} /></div>
                    <div className="cf-empty-title">No slides yet</div>
                    <div className="cf-empty-sub">Click "Add Slide" to begin building your course.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    {slides.map((slide, index) => (
                      <div key={slide.id}
                        draggable={slideDragEnabledIdx === index}
                        onDragStart={(e) => handleSlideDragStart(e, index)}
                        onDragOver={handleSlideDragOver}
                        onDrop={(e) => handleSlideDrop(e, index)}
                        onDragEnd={handleSlideDragEnd}
                        style={{ background: slide.background?.type === 'color' ? slide.background.value : (slide.background?.type === 'image' ? `url("${slide.background.value}")` : 'white'), backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', border: '1px solid #e8d8d8', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', position: 'relative', boxShadow: '0 2px 8px rgba(139,26,26,0.03)', transition: 'transform 0.15s, border-color 0.15s', opacity: draggedSlideIdx === index ? 0.4 : 1 }}
                        onClick={() => setActiveSlideId(slide.id)}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#c0392b'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#e8d8d8'}>
                        <div
                          style={{ position: 'absolute', top: 12, left: 12, cursor: 'grab', color: '#d4b0b0' }}
                          onMouseEnter={() => setSlideDragEnabledIdx(index)}
                          onMouseLeave={() => setSlideDragEnabledIdx(null)}
                        >
                          <GripVertical style={{ width: 16, height: 16 }} />
                        </div>
                        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: '0.25rem', zIndex: 2 }}>
                          <button style={{ background: 'transparent', color: '#c4a0a0', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                            onClick={(e) => { e.stopPropagation(); duplicateSlide(slide.id); }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#8b1a1a'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#c4a0a0'}
                            title="Duplicate slide">
                            <Copy style={{ width: 15, height: 15 }} />
                          </button>
                          <button style={{ background: 'transparent', color: '#c4a0a0', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                            onClick={(e) => { e.stopPropagation(); deleteSlide(slide.id); }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#8b1a1a'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#c4a0a0'}>
                            <Trash2 style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b08080', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Slide {index + 1}</div>
                        <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'Roboto', fontSize: '1.25rem', color: '#1a0a0a', lineHeight: 1.3 }}>{slide.title || 'Untitled Slide'}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#8b6060', background: '#fff5f5', padding: '0.25rem 0.5rem', borderRadius: 6, width: 'fit-content' }}>
                          <ListChecks style={{ width: 12, height: 12 }} /> {slide.elements.length} Blocks
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Detail View (Edit Slide)
              <div className="cf-canvas" style={{
                backgroundColor: (activeSlide?.background || { type: 'color', value: '#ffffff' }).type === 'color' ? (activeSlide.background || { type: 'color', value: '#ffffff' }).value : '#ffffff',
                backgroundImage: (activeSlide?.background || { type: 'color', value: '#ffffff' }).type === 'image' ? `url("${activeSlide.background.value}")` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}>
                <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #f0e0e0', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={() => setActiveSlideId(null)} style={{ background: '#fdf8f8', border: '1px solid #e8d8d8', borderRadius: 8, padding: '0.5rem', cursor: 'pointer', color: '#8b1a1a', display: 'flex', alignItems: 'center' }}>
                    <ChevronRight style={{ width: 18, height: 18, transform: 'rotate(180deg)' }} />
                  </button>
                  <input
                    className="cf-heading-input"
                    value={activeSlide.title}
                    onChange={(e) => updateSlideTitle(activeSlideId, e.target.value)}
                    placeholder="Slide Title..."
                    style={{ fontSize: '1.75rem', flex: 1 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => duplicateSlide(activeSlideId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#fff',
                        border: '1px solid #e8d8d8',
                        borderRadius: 8,
                        padding: '0.55rem 0.9rem',
                        cursor: 'pointer',
                        color: '#8b1a1a',
                        fontFamily: 'Roboto',
                        fontWeight: 600,
                      }}
                    >
                      <Copy style={{ width: 15, height: 15 }} />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSlideNextTo(activeSlideId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#fff',
                        border: '1px solid #e8d8d8',
                        borderRadius: 8,
                        padding: '0.55rem 0.9rem',
                        cursor: 'pointer',
                        color: '#8b1a1a',
                        fontFamily: 'Roboto',
                        fontWeight: 600,
                      }}
                      title="Add a new slide after this slide"
                    >
                      <Plus style={{ width: 15, height: 15 }} />
                      Add Slide
                    </button>
                    <button
                      type="button"
                      onClick={() => goToAdjacentSlide(-1)}
                      disabled={activeSlideIndex <= 0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: activeSlideIndex <= 0 ? '#f5f0ee' : '#fff',
                        border: '1px solid #e8d8d8',
                        borderRadius: 8,
                        padding: '0.55rem 0.9rem',
                        cursor: activeSlideIndex <= 0 ? 'not-allowed' : 'pointer',
                        color: activeSlideIndex <= 0 ? '#c4a0a0' : '#8b1a1a',
                        fontFamily: 'Roboto',
                        fontWeight: 600,
                      }}
                    >
                      <ChevronRight style={{ width: 16, height: 16, transform: 'rotate(180deg)' }} />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => goToAdjacentSlide(1)}
                      disabled={activeSlideIndex >= slides.length - 1}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: activeSlideIndex >= slides.length - 1 ? '#f5f0ee' : '#8b1a1a',
                        border: '1px solid #e8d8d8',
                        borderRadius: 8,
                        padding: '0.55rem 0.9rem',
                        cursor: activeSlideIndex >= slides.length - 1 ? 'not-allowed' : 'pointer',
                        color: activeSlideIndex >= slides.length - 1 ? '#c4a0a0' : '#fff',
                        fontFamily: 'Roboto',
                        fontWeight: 600,
                      }}
                    >
                      Next
                      <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>

                {activeSlide.elements.length === 0 ? (
                  <div className="cf-empty-state">
                    <div className="cf-empty-icon">
                      <BookOpen style={{ width: 24, height: 24, color: '#C4A0A0' }} />
                    </div>
                    <div className="cf-empty-title">This slide is empty</div>
                    <div className="cf-empty-sub">Add blocks from the sidebar to populate this slide.</div>
                  </div>
                ) : (
                  activeSlide.elements.map((block, index) => {
                    const fmt = block.blockFormat || {};
                    // Build wrapper inline styles from blockFormat
                    const wrapperStyle = {};
                    if (fmt.bgImage) {
                      wrapperStyle.backgroundImage = `url('${fmt.bgImage}')`;
                      wrapperStyle.backgroundSize = fmt.bgImageSize || 'cover';
                      wrapperStyle.backgroundPosition = 'center';
                      wrapperStyle.backgroundRepeat = 'no-repeat';
                    } else if (fmt.bgColor && fmt.bgColor !== 'none') {
                      const alpha = fmt.bgOpacity !== undefined ? fmt.bgOpacity : 1;
                      const hex = fmt.bgColor.replace('#', '');
                      const r = parseInt(hex.substring(0, 2), 16);
                      const g = parseInt(hex.substring(2, 4), 16);
                      const b = parseInt(hex.substring(4, 6), 16);
                      wrapperStyle.background = `rgba(${r},${g},${b},${alpha})`;
                    }
                    if (fmt.paddingV !== undefined || fmt.paddingH !== undefined) {
                      wrapperStyle.padding = `${fmt.paddingV ?? 10}px ${fmt.paddingH ?? 12}px`;
                    }
                    if (fmt.borderRadius !== undefined) {
                      wrapperStyle.borderRadius = `${fmt.borderRadius}px`;
                    }
                    if (fmt.borderWidth && fmt.borderWidth > 0) {
                      wrapperStyle.border = `${fmt.borderWidth}px solid ${fmt.borderColor || '#e8c8c8'}`;
                    }
                    if (fmt.minHeight && fmt.minHeight > 0) {
                      wrapperStyle.minHeight = `${fmt.minHeight}px`;
                    }
                    // Width/alignment
                    let blockAlignStyle = {};
                    if (fmt.width && fmt.width !== '100%') {
                      blockAlignStyle = { width: fmt.width, marginLeft: 'auto', marginRight: 'auto' };
                    }

                    const isFormatOpen = formatPopoverId === block.id;

                    return (
                      <div
                        key={block.id}
                        draggable={true}
                        onDragStart={(e) => {
                          if (e.target.closest('input, textarea, .cf-rich-text-editor, button, select')) {
                            e.preventDefault();
                            return;
                          }
                          handleDragStart(e, index);
                        }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`cf-block-wrapper ${draggedIdx === index ? 'dragging' : ''} ${newBlockIds.has(block.id) ? 'cf-block-enter' : ''}`}
                        style={wrapperStyle}
                      >
                        <div
                          className="cf-block-grip"
                          onMouseEnter={() => setDragEnabledIdx(index)}
                          onMouseLeave={() => setDragEnabledIdx(null)}
                        >
                          <GripVertical style={{ width: 15, height: 15 }} />
                        </div>
                        <div className="cf-block-controls">
                          <select
                            className="cf-animation-select"
                            value={block.animation || 'none'}
                            onChange={(e) => updateBlock(block.id, { animation: e.target.value })}
                          >
                            <option value="none">No Animation</option>
                            <option value="fade-in">Fade In</option>
                            <option value="fade-in-up">Fade In Up</option>
                            <option value="slide-in-left">Slide In Left</option>
                            <option value="slide-in-right">Slide In Right</option>
                            <option value="slide-in-up">Slide In Up</option>
                            <option value="slide-in-down">Slide In Down</option>
                            <option value="zoom-in">Zoom In</option>
                            <option value="zoom-out">Zoom Out</option>
                            <option value="flip-in">Flip In</option>
                            <option value="bounce-in">Bounce In</option>
                          </select>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            className="cf-animation-delay"
                            title="Delay (seconds)"
                            value={block.animationDelay || 0}
                            onChange={(e) => updateBlock(block.id, { animationDelay: parseFloat(e.target.value) || 0 })}
                          />
                          {/* Format button */}
                          <div style={{ position: 'relative' }}>
                            <button
                              className="cf-block-format-btn"
                              title="Block formatting"
                              onClick={(e) => { e.stopPropagation(); setFormatPopoverId(isFormatOpen ? null : block.id); }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18M9 21V9" />
                              </svg>
                            </button>
                            {isFormatOpen && (
                              <div
                                className="cf-format-panel"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="cf-format-panel-header">
                                  <span>Block Format</span>
                                  <button onClick={() => setFormatPopoverId(null)} className="cf-format-panel-close">✕</button>
                                </div>

                                {/* Width */}
                                <div className="cf-format-row">
                                  <label className="cf-format-label">Width</label>
                                  <div className="cf-format-width-btns">
                                    {['100%', '75%', '50%', '33%'].map(w => (
                                      <button
                                        key={w}
                                        onClick={() => updateBlock(block.id, { blockFormat: { ...fmt, width: w } })}
                                        className={`cf-format-width-btn ${(fmt.width || '100%') === w ? 'active' : ''}`}
                                      >{w}</button>
                                    ))}
                                  </div>
                                </div>

                                {/* Background — tabs: Color / Image */}
                                <div className="cf-format-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <label className="cf-format-label">BG Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <input
                                        type="color"
                                        value={fmt.bgColor && fmt.bgColor !== 'none' ? fmt.bgColor : '#ffffff'}
                                        onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, bgColor: e.target.value, bgImage: undefined } })}
                                        className="cf-format-color-input"
                                        title="Background colour"
                                        disabled={!!fmt.bgImage}
                                      />
                                      <input
                                        type="range"
                                        min="0" max="1" step="0.05"
                                        value={fmt.bgOpacity !== undefined ? fmt.bgOpacity : 1}
                                        onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, bgOpacity: parseFloat(e.target.value) } })}
                                        className="cf-format-range"
                                        title="Opacity"
                                        disabled={!!fmt.bgImage}
                                      />
                                      <span className="cf-format-range-val">{Math.round((fmt.bgOpacity !== undefined ? fmt.bgOpacity : 1) * 100)}%</span>
                                      {fmt.bgColor && fmt.bgColor !== 'none' && !fmt.bgImage && (
                                        <button onClick={() => updateBlock(block.id, { blockFormat: { ...fmt, bgColor: 'none' } })} className="cf-format-clear-btn" title="Remove colour">✕</button>
                                      )}
                                    </div>
                                  </div>
                                  {/* Image background */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: 4, borderTop: '1px dashed #f0d8d8' }}>
                                    <label className="cf-format-label">BG Image</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {fmt.bgImage ? (
                                        <>
                                          <div style={{ width: 28, height: 28, borderRadius: 4, backgroundImage: `url('${fmt.bgImage}')`, backgroundSize: 'cover', border: '1px solid #ead0d0', flexShrink: 0 }} />
                                          <select
                                            value={fmt.bgImageSize || 'cover'}
                                            onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, bgImageSize: e.target.value } })}
                                            style={{ fontSize: '0.65rem', border: '1px solid #ead0d0', borderRadius: 4, padding: '2px 4px', color: '#8b6060', background: '#fff' }}
                                          >
                                            <option value="cover">Cover</option>
                                            <option value="contain">Contain</option>
                                            <option value="100% 100%">Stretch</option>
                                          </select>
                                          <button onClick={() => updateBlock(block.id, { blockFormat: { ...fmt, bgImage: undefined } })} className="cf-format-clear-btn" title="Remove image">✕</button>
                                        </>
                                      ) : (
                                        <label className="cf-format-img-upload-btn">
                                          ＋ Upload
                                          <input
                                            type="file" accept="image/*" style={{ display: 'none' }}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (!file) return;
                                              const reader = new FileReader();
                                              reader.onloadend = () => updateBlock(block.id, { blockFormat: { ...fmt, bgImage: reader.result, bgColor: 'none' } });
                                              reader.readAsDataURL(file);
                                              e.target.value = null;
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Padding */}
                                <div className="cf-format-row">
                                  <label className="cf-format-label">Padding</label>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <div className="cf-format-num-wrap">
                                      <label style={{ fontSize: '0.6rem', color: '#aaa' }}>V</label>
                                      <input
                                        type="number" min="0" max="120"
                                        value={fmt.paddingV !== undefined ? fmt.paddingV : 10}
                                        onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, paddingV: parseInt(e.target.value) || 0 } })}
                                        className="cf-format-num"
                                      />
                                    </div>
                                    <div className="cf-format-num-wrap">
                                      <label style={{ fontSize: '0.6rem', color: '#aaa' }}>H</label>
                                      <input
                                        type="number" min="0" max="120"
                                        value={fmt.paddingH !== undefined ? fmt.paddingH : 12}
                                        onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, paddingH: parseInt(e.target.value) || 0 } })}
                                        className="cf-format-num"
                                      />
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: '#aaa' }}>px</span>
                                  </div>
                                </div>

                                {/* Border Radius */}
                                <div className="cf-format-row">
                                  <label className="cf-format-label">Rounding</label>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input
                                      type="range" min="0" max="32" step="1"
                                      value={fmt.borderRadius !== undefined ? fmt.borderRadius : 0}
                                      onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, borderRadius: parseInt(e.target.value) } })}
                                      className="cf-format-range"
                                    />
                                    <span className="cf-format-range-val">{fmt.borderRadius ?? 0}px</span>
                                  </div>
                                </div>

                                {/* Border */}
                                <div className="cf-format-row">
                                  <label className="cf-format-label">Border</label>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input
                                      type="color"
                                      value={fmt.borderColor || '#e8c8c8'}
                                      onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, borderColor: e.target.value, borderWidth: fmt.borderWidth || 1 } })}
                                      className="cf-format-color-input"
                                      title="Border colour"
                                    />
                                    <input
                                      type="number" min="0" max="8" step="1"
                                      value={fmt.borderWidth || 0}
                                      onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, borderWidth: parseInt(e.target.value) || 0 } })}
                                      className="cf-format-num"
                                      title="Border width (px)"
                                    />
                                    <span style={{ fontSize: '0.65rem', color: '#aaa' }}>px</span>
                                  </div>
                                </div>

                                {/* Min Height (Block Length) */}
                                <div className="cf-format-row">
                                  <label className="cf-format-label">Min Height</label>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input
                                      type="range" min="0" max="600" step="10"
                                      value={fmt.minHeight || 0}
                                      onChange={(e) => updateBlock(block.id, { blockFormat: { ...fmt, minHeight: parseInt(e.target.value) } })}
                                      className="cf-format-range"
                                      title="Minimum block height"
                                    />
                                    <span className="cf-format-range-val">{fmt.minHeight ? `${fmt.minHeight}px` : 'auto'}</span>
                                    {fmt.minHeight > 0 && (
                                      <button onClick={() => updateBlock(block.id, { blockFormat: { ...fmt, minHeight: 0 } })} className="cf-format-clear-btn" title="Reset height">✕</button>
                                    )}
                                  </div>
                                </div>

                                {/* Reset button */}
                                <button
                                  onClick={() => updateBlock(block.id, { blockFormat: {} })}
                                  className="cf-format-reset-btn"
                                >Reset formatting</button>
                              </div>
                            )}
                          </div>
                          <button className="cf-block-delete" onClick={() => deleteBlock(block.id)} title="Delete Block">
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                        <div style={blockAlignStyle}>
                          {renderBlock(block)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Generate Modal */}
      {showAIModal && (
        <div className="cf-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAIModal(); }}>
          <div className="cf-modal">
            <div className="cf-modal-header">
              <div className="cf-modal-header-top">
                <div className="cf-modal-title-row">
                  <div className="cf-modal-icon">
                    <Sparkles style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <div className="cf-modal-title">AI Content Generator</div>
                    <div className="cf-modal-subtitle">Describe what you need — AI will write it for you</div>
                  </div>
                </div>
                <button className="cf-modal-close" onClick={closeAIModal}>✕</button>
              </div>
            </div>

            <div className="cf-modal-body">
              <span className="cf-modal-field-label">Block Type</span>
              <div className="cf-modal-type-row">
                {['Paragraph', 'Heading', 'Summary', 'Quiz'].map(t => (
                  <button
                    key={t}
                    className={`cf-modal-type-btn${aiBlockType === t ? ' active' : ''}`}
                    onClick={() => setAiBlockType(t)}
                  >{t}</button>
                ))}
              </div>

              <span className="cf-modal-field-label">Your Prompt</span>
              <textarea
                className="cf-modal-textarea"
                placeholder="e.g. Write a paragraph explaining the importance of spaced repetition in learning..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generateAIBlock(); }}
                autoFocus
              />
              <div className="cf-modal-char-count">{aiPrompt.length} chars · ⌘ Enter to generate</div>

              <div className="cf-modal-chips">
                {SUGGESTED_PROMPTS.map(s => (
                  <button key={s} className="cf-modal-chip" onClick={() => setAiPrompt(s)}>{s}</button>
                ))}
              </div>
            </div>

            <div className="cf-modal-footer">
              <button className="cf-modal-cancel" onClick={closeAIModal}>Cancel</button>
              <button
                className="cf-modal-generate"
                onClick={generateAIBlock}
                disabled={!aiPrompt.trim()}
              >
                <Sparkles style={{ width: 13, height: 13 }} />
                Generate Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCORM Runtime Preview Modal */}
      {isPreviewOpen && previewHtml && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '1100px', height: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', border: '1px solid #333' }}>
            <div style={{ background: '#0f0f0f', borderBottom: '1px solid #2a2a2a', padding: '0 1.25rem', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#6b7280', fontSize: 12, fontFamily: 'Roboto, sans-serif', letterSpacing: '0.05em' }}>
                  SCORM Preview — {courseTitle}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={handlePreviewRestart}
                  style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '4px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Roboto, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RotateCcw style={{ width: 12, height: 12 }} /> Restart
                </button>
                <button
                  onClick={() => { setIsPreviewOpen(false); setPreviewHtml(null); }}
                  style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '4px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Roboto, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <X style={{ width: 12, height: 12 }} /> Close
                </button>
              </div>
            </div>
            <iframe
              ref={previewFrameRef}
              srcDoc={previewHtml || ''}
              title="SCORM Preview"
              style={{ flex: 1, border: 'none', background: '#18181b', display: 'block', width: '100%' }}
              sandbox="allow-scripts allow-forms"
            />
          </div>
        </div>
      )}

      {/* Save Toast */}
      {saveToast && (
        <div className={`cf-save-toast${saveToast === 'hiding' ? ' hiding' : ''}`}>
          <CheckCircle style={{ width: 15, height: 15 }} />
          Draft saved to browser
        </div>
      )}
    </>
  );
}

export default App;
