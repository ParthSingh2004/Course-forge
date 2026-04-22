import { useState } from 'react';
import { Sparkles, Download, Type, Heading1, Image as ImageIcon, MousePointerClick, ListChecks, Trash2, GripVertical, FileUp, Globe, FileArchive, BookOpen, ChevronRight } from 'lucide-react';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .cf-root {
    font-family: 'DM Sans', sans-serif;
    background: #F5F0EE;
    min-height: 100vh;
    color: #1A1010;
  }

  .cf-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #1A0A0A;
    border-bottom: 1px solid #3D1A1A;
    padding: 0 2.5rem;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .cf-logo {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-shrink: 0;
  }

  .cf-logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #8B1A1A, #C0392B);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .cf-logo-text {
    font-family: 'Fraunces', serif;
    font-size: 1.125rem;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }

  .cf-logo-sep {
    width: 1px;
    height: 28px;
    background: #3D1A1A;
    margin: 0 0.5rem;
  }

  .cf-title-input {
    background: transparent;
    border: none;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #E8D5D5;
    width: 100%;
    min-width: 0;
    letter-spacing: 0.01em;
  }

  .cf-title-input::placeholder { color: #6B3A3A; }

  .cf-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .cf-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4375rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
    letter-spacing: 0.02em;
    white-space: nowrap;
    text-transform: uppercase;
  }

  .cf-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .cf-btn-ai {
    background: linear-gradient(135deg, #8B1A1A 0%, #C0392B 100%);
    color: white;
    box-shadow: 0 0 0 1px rgba(192,57,43,0.3), 0 4px 12px rgba(139,26,26,0.35);
  }
  .cf-btn-ai:hover:not(:disabled) {
    background: linear-gradient(135deg, #A01F1F 0%, #D44030 100%);
    box-shadow: 0 0 0 1px rgba(192,57,43,0.5), 0 6px 16px rgba(139,26,26,0.5);
    transform: translateY(-1px);
  }

  .cf-btn-scorm {
    background: rgba(255,255,255,0.07);
    color: #E8D5D5;
    border: 1px solid #3D1A1A;
  }
  .cf-btn-scorm:hover:not(:disabled) {
    background: rgba(255,255,255,0.12);
    border-color: #6B3A3A;
  }

  .cf-btn-xapi {
    background: #8B1A1A;
    color: white;
    border: 1px solid #A52020;
  }
  .cf-btn-xapi:hover:not(:disabled) {
    background: #A01F1F;
    transform: translateY(-1px);
  }

  /* Main layout */
  .cf-layout {
    display: flex;
    min-height: calc(100vh - 64px);
  }

  /* Sidebar */
  .cf-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: #FFFFFF;
    border-right: 1px solid #E8D8D8;
    padding: 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    position: sticky;
    top: 64px;
    height: calc(100vh - 64px);
    overflow-y: auto;
  }

  .cf-sidebar-section {
    padding: 0 1rem;
    margin-bottom: 0.5rem;
  }

  .cf-sidebar-label {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #B08080;
    padding: 0 0.5rem;
    margin-bottom: 0.375rem;
    display: block;
  }

  .cf-sidebar-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.5rem 0.625rem;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: #3D1A1A;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s ease;
    text-align: left;
  }

  .cf-sidebar-btn:hover {
    background: #FDF0F0;
    color: #8B1A1A;
  }

  .cf-sidebar-btn:hover .cf-sidebar-icon {
    color: #8B1A1A;
  }

  .cf-sidebar-icon {
    width: 16px;
    height: 16px;
    color: #8B6060;
    flex-shrink: 0;
    transition: color 0.12s ease;
  }

  .cf-sidebar-divider {
    height: 1px;
    background: #F0E0E0;
    margin: 0.75rem 1rem;
  }

  .cf-sidebar-file-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.5rem 0.625rem;
    border-radius: 7px;
    color: #3D1A1A;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .cf-sidebar-file-label:hover {
    background: #FFF5F5;
    color: #8B1A1A;
  }

  /* Canvas area */
  .cf-canvas-wrap {
    flex: 1;
    padding: 2.5rem 3rem 5rem;
    max-width: 820px;
    margin: 0 auto;
    width: 100%;
  }

  .cf-canvas {
    background: #FFFFFF;
    border-radius: 16px;
    border: 1px solid #EAD8D8;
    padding: 3rem 3.5rem;
    min-height: 60vh;
    box-shadow: 0 4px 24px rgba(139,26,26,0.06), 0 1px 4px rgba(0,0,0,0.04);
  }

  .cf-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    gap: 0.75rem;
    color: #C4A0A0;
  }

  .cf-empty-icon {
    width: 48px;
    height: 48px;
    background: #FDF5F5;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.25rem;
  }

  .cf-empty-title {
    font-family: 'Fraunces', serif;
    font-size: 1.125rem;
    color: #B08080;
  }

  .cf-empty-sub {
    font-size: 0.8125rem;
    color: #C4A0A0;
  }

  /* Blocks */
  .cf-block-wrapper {
    position: relative;
    border-radius: 10px;
    padding: 0.625rem 0.75rem 0.625rem 0.75rem;
    margin-bottom: 0.375rem;
    border: 1.5px solid transparent;
    transition: all 0.15s ease;
    group: 'block';
  }

  .cf-block-wrapper:hover {
    background: #FDF7F7;
    border-color: #F0D8D8;
  }

  .cf-block-wrapper.dragging {
    opacity: 0.35;
    border: 1.5px dashed #C4A0A0;
  }

  .cf-block-grip {
    position: absolute;
    left: -22px;
    top: 50%;
    transform: translateY(-50%);
    color: #D4B0B0;
    opacity: 0;
    cursor: grab;
    transition: opacity 0.12s ease;
    padding: 2px;
  }

  .cf-block-wrapper:hover .cf-block-grip { opacity: 1; }

  .cf-block-delete {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 28px;
    height: 28px;
    background: #8B1A1A;
    color: white;
    border: none;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    cursor: pointer;
    transition: all 0.12s ease;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(139,26,26,0.4);
  }

  .cf-block-delete:hover { background: #A01F1F; transform: scale(1.1); }
  .cf-block-wrapper:hover .cf-block-delete { opacity: 1; }

  /* Block types */
  .cf-heading-input {
    width: 100%;
    font-family: 'Fraunces', serif;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
    color: #1A0A0A;
    background: transparent;
    border: none;
    outline: none;
    letter-spacing: -0.02em;
  }

  .cf-text-area {
    width: 100%;
    min-height: 90px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9375rem;
    line-height: 1.7;
    color: #3D2020;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-weight: 300;
  }

  .cf-image-block {
    width: 100%;
    min-height: 180px;
    border: 2px dashed #E8C8C8;
    border-radius: 10px;
    background: #FDF8F8;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    overflow: hidden;
    position: relative;
  }

  .cf-image-block:hover { border-color: #C0392B; background: #FFF5F5; }

  .cf-image-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #B08080;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    padding: 2rem;
    width: 100%;
    text-align: center;
    transition: color 0.12s ease;
  }
  .cf-image-label:hover { color: #8B1A1A; }

  .cf-button-block {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0;
  }

  .cf-button-input {
    background: linear-gradient(135deg, #8B1A1A, #C0392B);
    color: white;
    border: none;
    border-radius: 9px;
    padding: 0.625rem 1.75rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: text;
    outline: none;
    text-align: center;
    box-shadow: 0 4px 12px rgba(139,26,26,0.3);
    letter-spacing: 0.02em;
    min-width: 140px;
  }

  .cf-quiz-block {
    border: 2px solid #E8C8C8;
    border-radius: 12px;
    padding: 1.5rem;
    background: #FFFAFA;
  }

  .cf-quiz-block::before {
    content: 'QUIZ';
    display: block;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #8B1A1A;
    margin-bottom: 0.75rem;
  }

  .cf-quiz-q-input {
    width: 100%;
    font-family: 'Fraunces', serif;
    font-size: 1.0625rem;
    font-weight: 600;
    color: #1A0A0A;
    background: transparent;
    border: none;
    outline: none;
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .cf-quiz-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border: 1.5px solid #F0D8D8;
    border-radius: 8px;
    background: white;
    margin-bottom: 0.5rem;
    transition: all 0.12s ease;
  }

  .cf-quiz-option:has(input[type="radio"]:checked) {
    border-color: #8B1A1A;
    background: #FFF5F5;
  }

  .cf-quiz-option input[type="radio"] {
    accent-color: #8B1A1A;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .cf-quiz-option-text {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    color: #3D2020;
    font-weight: 400;
  }

  /* Block separator line */
  .cf-block-sep {
    height: 1px;
    background: linear-gradient(90deg, transparent, #F0D8D8, transparent);
    margin: 0.125rem 0;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  /* Generating spinner */
  @keyframes cf-spin { to { transform: rotate(360deg); } }
  .cf-spin { animation: cf-spin 0.8s linear infinite; }

  @keyframes cf-pulse-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .cf-block-enter { animation: cf-pulse-in 0.25s ease forwards; }

  /* Scrollbar */
  .cf-sidebar::-webkit-scrollbar { width: 4px; }
  .cf-sidebar::-webkit-scrollbar-track { background: transparent; }
  .cf-sidebar::-webkit-scrollbar-thumb { background: #E8C8C8; border-radius: 4px; }

  /* ── AI Modal ── */
  @keyframes cf-overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes cf-modal-in {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }

  .cf-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(10, 2, 2, 0.68);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: cf-overlay-in 0.2s ease forwards;
  }

  .cf-modal {
    width: 100%;
    max-width: 520px;
    background: #FFFFFF;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(139,26,26,0.22), 0 4px 16px rgba(0,0,0,0.14);
    animation: cf-modal-in 0.25s cubic-bezier(0.34, 1.3, 0.64, 1) forwards;
  }

  .cf-modal-header {
    background: linear-gradient(135deg, #1A0A0A 0%, #3D1010 60%, #6B1A1A 100%);
    padding: 1.5rem 1.75rem 1.25rem;
    position: relative;
    overflow: hidden;
  }

  .cf-modal-header::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 160px; height: 160px;
    background: radial-gradient(circle, rgba(192,57,43,0.25) 0%, transparent 70%);
    pointer-events: none;
  }

  .cf-modal-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .cf-modal-title-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .cf-modal-icon {
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, #8B1A1A, #C0392B);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 12px rgba(139,26,26,0.5);
  }

  .cf-modal-title {
    font-family: 'Fraunces', serif;
    font-size: 1.125rem;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: -0.01em;
  }

  .cf-modal-subtitle {
    font-size: 0.75rem;
    color: rgba(232,213,213,0.7);
    font-weight: 400;
    letter-spacing: 0.01em;
  }

  .cf-modal-close {
    width: 30px;
    height: 30px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    color: rgba(232,213,213,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 1rem;
    line-height: 1;
    flex-shrink: 0;
  }
  .cf-modal-close:hover {
    background: rgba(255,255,255,0.15);
    color: white;
  }

  .cf-modal-body {
    padding: 1.5rem 1.75rem;
  }

  .cf-modal-field-label {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #8B1A1A;
    margin-bottom: 0.5rem;
    display: block;
  }

  .cf-modal-textarea {
    width: 100%;
    min-height: 110px;
    padding: 0.875rem 1rem;
    background: #FDF8F8;
    border: 1.5px solid #EAD0D0;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #1A0A0A;
    resize: none;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .cf-modal-textarea:focus {
    border-color: #8B1A1A;
    box-shadow: 0 0 0 3px rgba(139,26,26,0.1);
    background: #FFFFFF;
  }
  .cf-modal-textarea::placeholder { color: #C4A0A0; }

  .cf-modal-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .cf-modal-chip {
    padding: 0.3rem 0.75rem;
    background: #FDF0F0;
    border: 1px solid #F0D8D8;
    border-radius: 20px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    color: #6B3A3A;
    cursor: pointer;
    transition: all 0.12s ease;
    font-weight: 500;
    white-space: nowrap;
  }
  .cf-modal-chip:hover {
    background: #8B1A1A;
    border-color: #8B1A1A;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(139,26,26,0.25);
  }

  .cf-modal-type-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .cf-modal-type-btn {
    flex: 1;
    padding: 0.5rem 0.25rem;
    border-radius: 9px;
    border: 1.5px solid #EAD0D0;
    background: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    color: #8B6060;
    cursor: pointer;
    text-align: center;
    transition: all 0.12s ease;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .cf-modal-type-btn:hover {
    border-color: #C0392B;
    color: #8B1A1A;
    background: #FFF5F5;
  }
  .cf-modal-type-btn.active {
    background: #8B1A1A;
    border-color: #8B1A1A;
    color: white;
    box-shadow: 0 3px 10px rgba(139,26,26,0.3);
  }

  .cf-modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.625rem;
    padding: 0 1.75rem 1.5rem;
  }

  .cf-modal-cancel {
    padding: 0.5625rem 1.25rem;
    border-radius: 9px;
    border: 1.5px solid #EAD0D0;
    background: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #8B6060;
    cursor: pointer;
    transition: all 0.12s ease;
    letter-spacing: 0.02em;
  }
  .cf-modal-cancel:hover { background: #FDF5F5; border-color: #C4A0A0; color: #3D1A1A; }

  .cf-modal-generate {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5625rem 1.375rem;
    border-radius: 9px;
    border: none;
    background: linear-gradient(135deg, #8B1A1A, #C0392B);
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    box-shadow: 0 4px 14px rgba(139,26,26,0.35);
  }
  .cf-modal-generate:hover:not(:disabled) {
    background: linear-gradient(135deg, #A01F1F, #D44030);
    box-shadow: 0 6px 18px rgba(139,26,26,0.5);
    transform: translateY(-1px);
  }
  .cf-modal-generate:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .cf-modal-char-count {
    font-size: 0.6875rem;
    color: #C4A0A0;
    text-align: right;
    margin-top: 0.375rem;
  }
`;

function App() {
  const [courseTitle, setCourseTitle] = useState("Untitled Course");
  const [blocks, setBlocks] = useState([
    { id: 1, type: 'text', content: 'Welcome to your new course. Use the sidebar to add blocks, or click AI to generate content.' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [newBlockIds, setNewBlockIds] = useState(new Set());
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBlockType, setAiBlockType] = useState('Paragraph');

  const SUGGESTED_PROMPTS = [
    'Key learning objectives',
    'A brief introduction',
    'Common misconceptions',
    'A real-world example',
    'Summary & takeaways',
    'Step-by-step instructions',
  ];

  const openAIModal = () => {
    setAiPrompt('');
    setAiBlockType('Paragraph');
    setShowAIModal(true);
  };

  const closeAIModal = () => {
    setShowAIModal(false);
    setAiPrompt('');
  };

  const addBlock = (type) => {
    const newBlock = { id: Date.now(), type };
    if (type === 'heading') newBlock.content = "New Heading";
    if (type === 'text') newBlock.content = "Type your text here...";
    if (type === 'image') newBlock.content = "Image Placeholder";
    if (type === 'button') newBlock.content = "Click Me";
    if (type === 'quiz') {
      newBlock.question = "What is the correct answer?";
      newBlock.options = ["Option A", "Option B", "Option C"];
      newBlock.correctAnswer = 0;
    }
    setBlocks(prev => [...prev, newBlock]);
    setNewBlockIds(prev => new Set([...prev, newBlock.id]));
    setTimeout(() => setNewBlockIds(prev => { const n = new Set(prev); n.delete(newBlock.id); return n; }), 400);
  };

  const updateBlock = (id, updatedData) => {
    setBlocks(blocks.map(block => block.id === id ? { ...block, ...updatedData } : block));
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    const newBlocks = [...blocks];
    const draggedBlock = newBlocks[draggedIdx];
    newBlocks.splice(draggedIdx, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);
    setBlocks(newBlocks);
    setDraggedIdx(null);
  };

  const handleDragEnd = () => { setDraggedIdx(null); };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    if (type === 'story') {
      alert("Placeholder: Articulate .story file parsing engine is not yet connected. This will convert slide assets to CourseForge blocks.");
      event.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = type === 'pptx' ? '/api/upload/pptx' : '/api/upload/xml';
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const importedBlocks = data.blocks.map((block, index) => ({ ...block, id: Date.now() + index }));
      setBlocks(prevBlocks => [...prevBlocks, ...importedBlocks]);
    } catch {
      alert(`Failed to import ${type.toUpperCase()}.`);
    } finally {
      event.target.value = null;
    }
  };

  const generateAIBlock = async () => {
    if (!aiPrompt.trim()) return;
    setShowAIModal(false);
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('prompt', aiPrompt.trim());
      formData.append('block_type', aiBlockType);
      const response = await fetch('http://127.0.0.1:8000/api/ai/generate', { method: 'POST', body: formData });
      const data = await response.json();
      const newBlock = { id: Date.now(), type: 'text', content: data.data.content || JSON.stringify(data.data) };
      setBlocks(prev => [...prev, newBlock]);
      setNewBlockIds(prev => new Set([...prev, newBlock.id]));
      setTimeout(() => setNewBlockIds(prev => { const n = new Set(prev); n.delete(newBlock.id); return n; }), 400);
    } catch {
      alert("Backend not reached.");
    } finally {
      setIsGenerating(false);
      setAiPrompt('');
    }
  };

  const handleExportScorm = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/export/scorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, blocks }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courseTitle.replace(/\s+/g, '_')}_SCORM.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export SCORM package.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportXapi = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/export/xapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: courseTitle, blocks }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courseTitle.replace(/\s+/g, '_')}_xAPI.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export xAPI package.");
    } finally {
      setIsExporting(false);
    }
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case 'heading':
      case 'heading-1':
        return (
          <input
            className="cf-heading-input"
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            placeholder="Heading..."
          />
        );
      case 'text':
      case 'ai-generated':
        return (
          <textarea
            className="cf-text-area"
            value={block.content}
            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
          />
        );
      case 'image':
        return (
          <div className="cf-image-block">
            {block.imageUrl ? (
              <img src={block.imageUrl} alt="Course content" style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }} />
            ) : (
              <label className="cf-image-label">
                <ImageIcon style={{ width: 28, height: 28, opacity: 0.6 }} />
                Click to upload image
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      updateBlock(block.id, { imageUrl: URL.createObjectURL(e.target.files[0]) });
                    }
                  }}
                />
              </label>
            )}
          </div>
        );
      case 'button':
        return (
          <div className="cf-button-block">
            <input
              className="cf-button-input"
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            />
          </div>
        );
      case 'quiz':
        return (
          <div className="cf-quiz-block">
            <input
              className="cf-quiz-q-input"
              value={block.question}
              onChange={(e) => updateBlock(block.id, { question: e.target.value })}
              placeholder="Enter your question..."
            />
            {block.options.map((option, index) => (
              <div key={index} className="cf-quiz-option">
                <input
                  type="radio"
                  name={`quiz-${block.id}`}
                  checked={block.correctAnswer === index}
                  onChange={() => updateBlock(block.id, { correctAnswer: index })}
                />
                <input
                  className="cf-quiz-option-text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...block.options];
                    newOptions[index] = e.target.value;
                    updateBlock(block.id, { options: newOptions });
                  }}
                />
              </div>
            ))}
          </div>
        );
      default:
        return <div style={{ color: '#B08080', fontSize: '0.8125rem' }}>Unknown block type</div>;
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="cf-root">
        {/* Header */}
        <header className="cf-header">
          <div className="cf-logo">
            <div className="cf-logo-icon">
              <BookOpen style={{ width: 16, height: 16 }} />
            </div>
            <span className="cf-logo-text">CourseForge</span>
          </div>
          <div className="cf-logo-sep" />
          <input
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
            className="cf-title-input"
            placeholder="Untitled Course"
          />
          <div className="cf-header-actions">
            <button onClick={openAIModal} disabled={isGenerating} className="cf-btn cf-btn-ai">
              {isGenerating
                ? <span className="cf-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                : <Sparkles style={{ width: 14, height: 14 }} />
              }
              {isGenerating ? 'Generating…' : 'AI Generate'}
            </button>
            <button onClick={handleExportScorm} disabled={isExporting} className="cf-btn cf-btn-scorm">
              <Download style={{ width: 13, height: 13 }} /> SCORM
            </button>
            <button onClick={handleExportXapi} disabled={isExporting} className="cf-btn cf-btn-xapi">
              <Globe style={{ width: 13, height: 13 }} /> xAPI
            </button>
          </div>
        </header>

        <div className="cf-layout">
          {/* Sidebar */}
          <aside className="cf-sidebar">
            <div className="cf-sidebar-section">
              <span className="cf-sidebar-label">Content Blocks</span>
              <button onClick={() => addBlock('heading')} className="cf-sidebar-btn">
                <Heading1 className="cf-sidebar-icon" /> Heading
              </button>
              <button onClick={() => addBlock('text')} className="cf-sidebar-btn">
                <Type className="cf-sidebar-icon" /> Text
              </button>
              <button onClick={() => addBlock('image')} className="cf-sidebar-btn">
                <ImageIcon className="cf-sidebar-icon" /> Image
              </button>
              <button onClick={() => addBlock('button')} className="cf-sidebar-btn">
                <MousePointerClick className="cf-sidebar-icon" /> Button
              </button>
              <button onClick={() => addBlock('quiz')} className="cf-sidebar-btn">
                <ListChecks className="cf-sidebar-icon" /> Quiz
              </button>
            </div>

            <div className="cf-sidebar-divider" />

            <div className="cf-sidebar-section">
              <span className="cf-sidebar-label">Import</span>
              <label className="cf-sidebar-file-label">
                <FileUp style={{ width: 15, height: 15, color: '#8B6060', flexShrink: 0 }} />
                PowerPoint
                <input type="file" accept=".pptx" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pptx')} />
              </label>
              <label className="cf-sidebar-file-label">
                <FileUp style={{ width: 15, height: 15, color: '#8B6060', flexShrink: 0 }} />
                XML File
                <input type="file" accept=".xml" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'xml')} />
              </label>
              <label className="cf-sidebar-file-label">
                <FileArchive style={{ width: 15, height: 15, color: '#8B6060', flexShrink: 0 }} />
                .story File
                <input type="file" accept=".story" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'story')} />
              </label>
            </div>

            <div className="cf-sidebar-divider" />

            <div className="cf-sidebar-section" style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
              <div style={{ padding: '0.75rem', background: '#FFF5F5', borderRadius: 10, border: '1px solid #F0D8D8' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B1A1A', marginBottom: '0.25rem' }}>
                  {blocks.length} Block{blocks.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#B08080', lineHeight: 1.5 }}>
                  Drag to reorder. Hover a block to delete it.
                </div>
              </div>
            </div>
          </aside>

          {/* Canvas */}
          <div className="cf-canvas-wrap">
            <div className="cf-canvas">
              {blocks.length === 0 ? (
                <div className="cf-empty-state">
                  <div className="cf-empty-icon">
                    <BookOpen style={{ width: 24, height: 24, color: '#C4A0A0' }} />
                  </div>
                  <div className="cf-empty-title">Your canvas is empty</div>
                  <div className="cf-empty-sub">Add blocks from the sidebar to start building your course</div>
                </div>
              ) : (
                blocks.map((block, index) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`cf-block-wrapper ${draggedIdx === index ? 'dragging' : ''} ${newBlockIds.has(block.id) ? 'cf-block-enter' : ''}`}
                  >
                    <div className="cf-block-grip">
                      <GripVertical style={{ width: 15, height: 15 }} />
                    </div>
                    <button className="cf-block-delete" onClick={() => deleteBlock(block.id)}>
                      <Trash2 style={{ width: 12, height: 12 }} />
                    </button>
                    {renderBlock(block)}
                  </div>
                ))
              )}
            </div>

            {/* Subtle footer hint */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#C4A0A0', fontSize: '0.75rem' }}>
              <ChevronRight style={{ width: 12, height: 12 }} />
              Use the sidebar to add blocks · Drag to reorder · Export when ready
            </div>
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
    </>
  );
}

export default App;