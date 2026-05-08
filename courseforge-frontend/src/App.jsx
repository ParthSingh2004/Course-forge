import { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, Type, Heading1, Image as ImageIcon, MousePointerClick, ListChecks, Trash2, GripVertical, FileUp, Globe, FileArchive, BookOpen, ChevronRight, CreditCard, Video, RotateCcw, Play, List, Quote, Layers, AlignLeft, AlignCenter, AlignRight, AlignJustify, ShieldCheck, ToggleLeft, PenLine, Mic, FileText, Table, Save, CheckCircle, Eye, X } from 'lucide-react';
import Dashboard from './Dashboard';
import { createLocalCourse, saveCourseToBrowser } from './utils/storage';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .cf-root {
    font-family: 'Roboto', sans-serif;
    background: #F5F0EE;
    min-height: 100vh;
    color: #1A1010;
  }

  .cf-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #121212;
    border-bottom: 1px solid #450a0a;
    padding: 0 1.5rem;
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
    font-family: 'Roboto', sans-serif;
    font-size: 1.125rem;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }

  .cf-logo-sep {
    width: 1px;
    height: 24px;
    background: #7f1d1d;
    margin: 0 1.25rem;
  }

  .cf-title-input {
    background: transparent;
    border: none;
    outline: none;
    font-family: 'Roboto', sans-serif;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #e5e7eb;
    width: 100%;
    min-width: 0;
    letter-spacing: 0.01em;
  }

  .cf-title-input::placeholder { color: #450a0a; }

  .cf-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .cf-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 1rem;
    height: 38px;
    border-radius: 6px;
    font-family: 'Roboto', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    white-space: nowrap;
  }

  .cf-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .cf-btn-ai {
    background: #b91c1c;
    color: white;
    font-weight: 600;
  }
  .cf-btn-ai:hover:not(:disabled) {
    background: #dc2626;
  }

  .cf-btn-save, .cf-btn-preview {
    background: #4a1111;
    border: 1px solid #991b1b;
    color: white;
  }
  .cf-btn-save:hover:not(:disabled), .cf-btn-preview:hover:not(:disabled) {
    background: #2d0a0a;
  }

  .cf-btn-scorm, .cf-btn-xapi {
    background: transparent;
    border: 1px solid #525252;
    color: #d4d4d4;
  }
  .cf-btn-scorm:hover:not(:disabled), .cf-btn-xapi:hover:not(:disabled) {
    background: #262626;
    color: white;
    border-color: #991b1b;
  }



  .cf-btn-save {
    position: relative;
  }
  .cf-btn-save.saved {
    background: #16a34a;
  }

  .cf-unsaved-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 7px;
    height: 7px;
    background: #F59E0B;
    border-radius: 50%;
    border: 1.5px solid #1A0A0A;
    animation: cf-dot-pulse 2s ease infinite;
  }

  @keyframes cf-dot-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.8); }
  }

  /* ── Save Toast ── */
  @keyframes cf-toast-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cf-toast-out {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(16px); }
  }
  .cf-save-toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #1A1A1A;
    color: #4ade80;
    padding: 0.625rem 1.25rem;
    border-radius: 40px;
    font-family: 'Roboto', sans-serif;
    font-size: 0.8125rem;
    font-weight: 600;
    box-shadow: 0 8px 28px rgba(0,0,0,0.35);
    pointer-events: none;
    animation: cf-toast-in 0.25s cubic-bezier(0.34,1.3,0.64,1) forwards;
  }
  .cf-save-toast.hiding {
    animation: cf-toast-out 0.3s ease forwards;
  }

  /* ── Audio Block ── */
  .cf-audio-block {
    border: 2px solid #E8C8C8;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, #1A0A0A 0%, #2D1010 100%);
    color: white;
  }
  .cf-audio-block::before {
    content: 'AUDIO';
    display: block;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #C0392B;
    margin-bottom: 0.75rem;
  }
  .cf-audio-label-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    font-family: 'Roboto', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #E8D5D5;
    margin-bottom: 0.75rem;
  }
  .cf-audio-label-input::placeholder { color: rgba(232,213,213,0.4); }
  .cf-audio-upload-zone {
    border: 2px dashed rgba(192,57,43,0.5);
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .cf-audio-upload-zone:hover { border-color: #C0392B; background: rgba(192,57,43,0.08); }
  .cf-audio-player { width: 100%; margin-top: 0.75rem; border-radius: 8px; }

  /* ── True/False Block ── */
  .cf-tf-block {
    border: 2px solid #E8C8C8;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    background: #FFFAFA;
  }
  .cf-tf-block::before {
    content: 'TRUE / FALSE';
    display: block;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #8B1A1A;
    margin-bottom: 0.75rem;
  }
  .cf-tf-options {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
  .cf-tf-btn {
    flex: 1;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    border: 2px solid #F0D8D8;
    background: white;
    font-family: 'Roboto', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    color: #3D2020;
  }
  .cf-tf-btn.selected-true  { background: #DCFCE7; border-color: #16A34A; color: #15803D; }
  .cf-tf-btn.selected-false { background: #FEE2E2; border-color: #DC2626; color: #B91C1C; }

  /* ── Fill-in-the-Blanks Block ── */
  .cf-fitb-block {
    border: 2px solid #E8C8C8;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    background: #FFFAFA;
  }
  .cf-fitb-block::before {
    content: 'FILL IN THE BLANK';
    display: block;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #8B1A1A;
    margin-bottom: 0.75rem;
  }
  .cf-fitb-hint {
    font-size: 0.7rem;
    color: #B08080;
    margin-bottom: 0.5rem;
  }
  .cf-fitb-answer-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1.5px solid #E8D0D0;
    border-radius: 8px;
    font-family: 'Roboto', sans-serif;
    font-size: 0.875rem;
    color: #1A0A0A;
    background: white;
    outline: none;
    margin-top: 0.5rem;
    transition: border-color 0.15s;
  }
  .cf-fitb-answer-input:focus { border-color: #8B1A1A; }

  /* ── Shared assessment meta row ── */
  .cf-assess-meta {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .cf-assess-meta-label {
    font-size: 0.6875rem;
    color: #B08080;
    font-weight: 500;
  }
  .cf-weightage-input {
    width: 56px;
    padding: 0.2rem 0.4rem;
    border: 1px solid #EAD0D0;
    border-radius: 5px;
    font-family: 'Roboto', sans-serif;
    font-size: 0.8125rem;
    color: #3D2020;
    outline: none;
    text-align: center;
  }

  /* Main layout */
  .cf-layout {
    display: flex;
    min-height: calc(100vh - 64px);
  }

  /* Sidebar */
  .cf-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: #ffffff;
    border-right: 1px solid #e5e7eb;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    position: sticky;
    top: 56px;
    height: calc(100vh - 56px);
    overflow-y: auto;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
  }

  .cf-sidebar-section {
    padding: 0 0.5rem;
    margin-bottom: 0.5rem;
  }

  .cf-sidebar-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #000000;
    padding: 0 0.75rem;
    margin-bottom: 0.75rem;
    margin-top: 1.5rem;
    display: block;
  }

  .cf-sidebar-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.625rem 0.75rem;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #374151;
    font-family: 'Roboto', sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    margin-bottom: 0.125rem;
  }

  .cf-sidebar-btn:hover {
    background: #fff1f2;
    color: #991b1b;
  }

  .cf-sidebar-btn.active {
    background: #fff1f2;
    color: #991b1b;
    font-weight: 600;
    border-left: 3px solid #991b1b;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    padding-left: 0.5625rem;
  }

  .cf-sidebar-icon {
    width: 16px;
    height: 16px;
    color: #991b1b;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .cf-sidebar-divider {
    height: 1px;
    background: #F0E0E0;
    margin: 0.75rem 1rem;
  }

  .cf-sidebar-import-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.625rem;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    color: #374151;
    font-family: 'Roboto', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 0.5rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  .cf-sidebar-import-btn:hover {
    border-color: #fca5a5;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .cf-sidebar-toggle-btn {
    flex: 1;
    padding: 8px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .cf-sidebar-toggle-btn.active {
    background: #991b1b;
    color: #ffffff;
    border-color: #991b1b;
  }
  .cf-sidebar-toggle-btn:not(.active) {
    background: #ffffff;
    color: #6b7280;
  }

  /* Canvas area */
  .cf-canvas-wrap {
    flex: 1;
    padding: 2.5rem 3rem 5rem;
    max-width: 1200px;
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
    font-family: 'Roboto', sans-serif;
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

  .cf-block-controls {
    position: absolute;
    top: -14px;
    right: -10px;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    opacity: 0;
    transition: opacity 0.12s ease;
    z-index: 10;
  }
  .cf-block-wrapper:hover .cf-block-controls { opacity: 1; }

  .cf-animation-select, .cf-animation-delay {
    height: 28px;
    background: #FFFFFF;
    border: 1px solid #EAD8D8;
    border-radius: 6px;
    font-family: 'Roboto', sans-serif;
    font-size: 0.75rem;
    color: #3D1A1A;
    outline: none;
    padding: 0 0.4rem;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    cursor: pointer;
  }
  .cf-animation-delay {
    width: 50px;
    text-align: center;
    cursor: text;
  }
  
  .cf-block-delete {
    width: 28px;
    height: 28px;
    background: #8B1A1A;
    color: white;
    border: none;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.12s ease;
    box-shadow: 0 2px 8px rgba(139,26,26,0.4);
  }
  .cf-block-delete:hover { background: #A01F1F; transform: scale(1.05); }

  /* Slide Specific */
  .cf-slide-container {
    border: 1px solid #E8D8D8;
    background: #FFF;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.03);
  }

  .cf-slide-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #F0E0E0;
    padding-bottom: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .cf-slide-title-input {
    font-family: 'Roboto', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1A0A0A;
    background: transparent;
    border: none;
    outline: none;
    width: 80%;
  }

  .cf-slide-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    background: #FDF0F0;
    color: #8B1A1A;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cf-slide-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cf-slide-element-wrap { width: 100%; }

  /* Block types */
  .cf-heading-input {
    width: 100%;
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Roboto', sans-serif;
    font-size: 0.875rem;
    color: #3D2020;
    font-weight: 400;
  }

  /* ── Flashcard Block ── */
  .cf-flashcard-block {
    perspective: 1200px;
    width: 100%;
    min-height: 200px;
    cursor: pointer;
    user-select: none;
  }

  .cf-flashcard-inner {
    position: relative;
    width: 100%;
    min-height: 200px;
    transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1);
    transform-style: preserve-3d;
  }

  .cf-flashcard-inner.flipped {
    transform: rotateY(180deg);
  }

  .cf-flashcard-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: 14px;
    padding: 1.75rem 2rem;
    display: flex;
    flex-direction: column;
    min-height: 200px;
  }

  .cf-flashcard-front {
    background: linear-gradient(145deg, #1A0A0A 0%, #3D1010 60%, #6B1A1A 100%);
    border: 1px solid #4D2020;
    box-shadow: 0 8px 32px rgba(139,26,26,0.25);
  }

  .cf-flashcard-back {
    background: linear-gradient(145deg, #FFFAF9 0%, #FFF0EE 100%);
    border: 2px solid #E8C8C8;
    box-shadow: 0 8px 32px rgba(139,26,26,0.12);
    transform: rotateY(180deg);
  }

  .cf-flashcard-badge {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .cf-flashcard-front .cf-flashcard-badge {
    color: rgba(232,213,213,0.55);
  }

  .cf-flashcard-back .cf-flashcard-badge {
    color: #C4A0A0;
  }

  .cf-flashcard-textarea {
    width: 100%;
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-family: 'Roboto', sans-serif;
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.5;
    resize: none;
    min-height: 100px;
    cursor: text;
  }

  .cf-flashcard-front .cf-flashcard-textarea {
    color: #FFFFFF;
  }

  .cf-flashcard-front .cf-flashcard-textarea::placeholder {
    color: rgba(232,213,213,0.35);
  }

  .cf-flashcard-back .cf-flashcard-textarea {
    color: #1A0A0A;
  }

  .cf-flashcard-back .cf-flashcard-textarea::placeholder {
    color: #C4A0A0;
  }

  .cf-flashcard-flip-hint {
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 1rem;
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }

  .cf-flashcard-block:hover .cf-flashcard-flip-hint { opacity: 0.85; }

  .cf-flashcard-front .cf-flashcard-flip-hint { color: #E8D5D5; }
  .cf-flashcard-back .cf-flashcard-flip-hint { color: #8B1A1A; }

  .cf-flashcard-placeholder-wrap {
    position: relative;
    width: 100%;
    min-height: 200px;
  }

  /* ── Video Block ── */
  .cf-video-block {
    border-radius: 14px;
    overflow: hidden;
    background: #0A0404;
    border: 1px solid #3D1A1A;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  }

  .cf-video-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #150808;
    border-bottom: 1px solid #2D1010;
  }

  .cf-video-toolbar-label {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #8B4040;
    flex-shrink: 0;
  }

  .cf-video-url-input {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border: 1px solid #3D1A1A;
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
    font-family: 'Roboto', sans-serif;
    font-size: 0.8125rem;
    color: #E8C8C8;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .cf-video-url-input::placeholder { color: #6B3A3A; }
  .cf-video-url-input:focus { border-color: #8B1A1A; }

  .cf-video-apply-btn {
    padding: 0.375rem 0.875rem;
    background: linear-gradient(135deg, #8B1A1A, #C0392B);
    color: white;
    border: none;
    border-radius: 6px;
    font-family: 'Roboto', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }
  .cf-video-apply-btn:hover { background: linear-gradient(135deg, #A01F1F, #D44030); transform: translateY(-1px); }

  .cf-video-player-area {
    position: relative;
    width: 100%;
    background: #050202;
  }

  .cf-video-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3.5rem 2rem;
    color: #4D2020;
  }

  .cf-video-empty-icon {
    width: 56px;
    height: 56px;
    background: rgba(139,26,26,0.12);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cf-video-empty-text {
    font-family: 'Roboto', sans-serif;
    font-size: 0.9375rem;
    color: #6B3A3A;
  }

  .cf-video-empty-sub {
    font-size: 0.75rem;
    color: #4D2020;
    text-align: center;
    max-width: 280px;
    line-height: 1.6;
  }

  .cf-video-embed {
    width: 100%;
    aspect-ratio: 16/9;
    border: none;
    display: block;
  }

  .cf-video-native {
    width: 100%;
    max-height: 420px;
    display: block;
    background: #000;
  }

  .cf-video-upload-label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.375rem 0.875rem;
    background: rgba(139,26,26,0.15);
    border: 1px solid #3D1A1A;
    border-radius: 6px;
    color: #C08080;
    font-family: 'Roboto', sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .cf-video-upload-label:hover { background: rgba(139,26,26,0.25); color: #E8C8C8; }

  /* Animations */
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
  @keyframes cf-overlay-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cf-modal-in {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
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
    font-family: 'Roboto', sans-serif;
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
  .cf-modal-close:hover { background: rgba(255,255,255,0.15); color: white; }

  .cf-modal-body { padding: 1.5rem 1.75rem; }

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
    font-family: 'Roboto', sans-serif;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #1A0A0A;
    resize: none;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .cf-modal-textarea:focus { border-color: #8B1A1A; }

  .cf-modal-type-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .cf-modal-type-btn {
    padding: 0.375rem 0.875rem;
    border-radius: 20px;
    border: 1.5px solid #EAD0D0;
    background: white;
    color: #8B6060;
    font-family: 'Roboto', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .cf-modal-type-btn:hover { border-color: #8B1A1A; color: #8B1A1A; }
  .cf-modal-type-btn.active {
    background: #8B1A1A;
    border-color: #8B1A1A;
    color: white;
  }

  .cf-modal-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: 0.875rem;
  }

  .cf-modal-chip {
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    border: 1px solid #EAD0D0;
    background: #FDF8F8;
    color: #8B6060;
    font-family: 'Roboto', sans-serif;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .cf-modal-chip:hover { background: #FFF0F0; border-color: #C0392B; color: #8B1A1A; }

  .cf-modal-footer {
    padding: 1rem 1.75rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.625rem;
    border-top: 1px solid #F0E0E0;
  }

  .cf-modal-cancel {
    padding: 0.5625rem 1.25rem;
    border-radius: 9px;
    border: 1.5px solid #EAD0D0;
    background: white;
    color: #8B6060;
    font-family: 'Roboto', sans-serif;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .cf-modal-cancel:hover { border-color: #C4A0A0; color: #3D1A1A; }

  .cf-modal-generate {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5625rem 1.375rem;
    border-radius: 9px;
    border: none;
    background: linear-gradient(135deg, #8B1A1A, #C0392B);
    color: white;
    font-family: 'Roboto', sans-serif;
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

  .cf-pass-container {
    display: flex;
    align-items: center;
    background: #262626;
    border: 1px solid #404040;
    border-radius: 6px;
    height: 38px;
    padding: 0 12px;
    margin-left: auto;
    transition: all 0.2s ease;
    position: relative;
    cursor: help;
  }
  .cf-pass-container::after {
    content: "Set the passing percentage for your lesson!";
    position: absolute;
    bottom: -40px;
    right: 0;
    background: #1a1a1a;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    border: 1px solid #450a0a;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 100;
  }
  .cf-pass-container:hover::after {
    opacity: 1;
    visibility: visible;
    bottom: -45px;
  }
  .cf-pass-container:focus-within {
    border-color: #dc2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
  }
  .cf-pass-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #f87171;
    letter-spacing: 0.05em;
    margin-right: 10px;
    border-right: 1px solid #450a0a;
    padding-right: 10px;
    height: 12px;
    display: flex;
    align-items: center;
  }
  .cf-pass-input-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .cf-pass-input {
    width: 26px;
    border: none;
    background: transparent;
    outline: none;
    font-family: 'Roboto', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    text-align: right;
    padding: 0;
  }
  .cf-pass-input::-webkit-inner-spin-button, 
  .cf-pass-input::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
  }
  .cf-pass-percent {
    font-size: 12px;
    font-weight: 600;
    color: #ffffff;
  }
`;

function RichTextEditor({ value, onChange, placeholder, style, className }) {
  const editorRef = useRef(null);
  const isEditing = useRef(false);
  const savedSelectionRef = useRef(null);
  const [currentFont, setCurrentFont] = useState('');
  const [currentSize, setCurrentSize] = useState('');

  const selectionIsInsideEditor = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return false;
    const range = selection.getRangeAt(0);
    return editorRef.current.contains(range.commonAncestorContainer);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selectionIsInsideEditor()) return;
    savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedSelectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(savedSelectionRef.current);
  };

  const getSelectedFontSize = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return '';

    let node = selection.anchorNode;
    if (!node || !editorRef.current.contains(node)) return '';
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    while (node && node !== editorRef.current) {
      if (node.style?.fontSize) {
        return String(parseInt(node.style.fontSize, 10));
      }
      node = node.parentElement;
    }

    return '';
  };

  const updateToolbarState = () => {
    saveSelection();
    // queryCommandValue sometimes returns quoted strings like '"Times New Roman"'
    let font = document.queryCommandValue('fontName') || '';
    if (font.startsWith('"') && font.endsWith('"')) {
      font = font.substring(1, font.length - 1);
    }
    setCurrentFont(font);
    setCurrentSize(getSelectedFontSize());
  };

  useEffect(() => {
    if (editorRef.current && !isEditing.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateToolbarState();
  };

  const exec = (command, val = null) => {
    restoreSelection();
    document.execCommand(command, false, val);
    handleInput();
  };

  const execFontSize = (size) => {
    restoreSelection();
    // execCommand fontSize 1-7 is too limited. We'll use a trick to apply px.
    document.execCommand('fontSize', false, '7');
    const fontElements = editorRef.current.querySelectorAll('font[size="7"]');
    fontElements.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = size + 'px';
    });
    setCurrentSize(String(size));
    handleInput();
    saveSelection();
  };

  return (
    <div className={`cf-rich-text-editor ${className || ''}`} style={{ border: '1px solid #EAD0D0', borderRadius: 8, overflow: 'hidden', background: 'white', ...style }}>
      <div className="cf-rte-toolbar" style={{ display: 'flex', gap: '4px', padding: '6px 8px', background: '#FDF8F8', borderBottom: '1px solid #EAD0D0', alignItems: 'center', fontSize: '13px', fontWeight: '400', fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal', color: '#333' }}>
        <button onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: 'inherit' }}>B</button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontStyle: 'italic', fontSize: '13px', color: 'inherit' }}>I</button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', color: 'inherit' }}>U</button>
        <div style={{ width: '1px', height: '16px', background: '#EAD0D0', margin: '0 4px' }} />
        <select value={currentFont} onMouseDown={saveSelection} onChange={(e) => { e.preventDefault(); exec('fontName', e.target.value); }} style={{ padding: '2px 4px', border: '1px solid #EAD0D0', borderRadius: 4, fontSize: '12px', background: 'white' }}>
          <option value="" disabled>Font</option>
          <option value="Roboto">Roboto</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Calibri">Calibri</option>
          <option value="Courier New">Courier</option>
        </select>
        <select value={currentSize} onMouseDown={saveSelection} onChange={(e) => { e.preventDefault(); execFontSize(e.target.value); }} style={{ padding: '2px 4px', border: '1px solid #EAD0D0', borderRadius: 4, fontSize: '12px', background: 'white' }}>
          <option value="" disabled>Size</option>
          {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].map(size => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
        <div style={{ width: '1px', height: '16px', background: '#EAD0D0', margin: '0 4px' }} />
        <input
          type="color"
          onInput={(e) => exec('foreColor', e.target.value)}
          style={{ width: '20px', height: '20px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
          title="Text Color"
        />
        <div style={{ width: '1px', height: '16px', background: '#EAD0D0', margin: '0 4px' }} />
        <button onMouseDown={(e) => {
          e.preventDefault();
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const text = selection.toString();
            const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || text.split('\n').filter(s => s.trim());
            if (sentences.length > 0) {
              const ul = document.createElement('ul');
              sentences.forEach(sentence => {
                const li = document.createElement('li');
                li.textContent = sentence.trim();
                ul.appendChild(li);
              });
              range.deleteContents();
              range.insertNode(ul);
              handleInput();
              return;
            }
          }
          exec('insertUnorderedList');
        }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}>
          <List style={{ width: 14, height: 14 }} />
        </button>
        <div style={{ width: '1px', height: '16px', background: '#EAD0D0', margin: '0 4px' }} />
        <button onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}>
          <AlignLeft style={{ width: 14, height: 14 }} />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}>
          <AlignCenter style={{ width: 14, height: 14 }} />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('justifyRight'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}>
          <AlignRight style={{ width: 14, height: 14 }} />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('justifyFull'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}>
          <AlignJustify style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyUp={updateToolbarState}
        onMouseUp={updateToolbarState}
        onSelect={updateToolbarState}
        onFocus={() => { isEditing.current = true; updateToolbarState(); }}
        onBlur={() => { isEditing.current = false; handleInput(); }}
        style={{ padding: '12px', minHeight: '80px', outline: 'none', fontSize: '1rem', color: '#1A0A0A', fontFamily: 'Roboto' }}
        data-placeholder={placeholder}
      />
    </div>
  );
}

// ── Flashcard component (self-contained flip state) ──
function FlashcardBlock({ block, onUpdate }) {
  const [flipped, setFlipped] = useState(false);

  const stopPropAndFlip = (e) => {
    // Only flip if not clicking a textarea
    if (e.target.tagName === 'TEXTAREA') return;
    setFlipped(f => !f);
  };

  return (
    <div className="cf-flashcard-block" onClick={stopPropAndFlip} title="Click to flip">
      <div className={`cf-flashcard-inner${flipped ? ' flipped' : ''}`}>
        {/* Front */}
        <div className="cf-flashcard-face cf-flashcard-front">
          <div className="cf-flashcard-badge">
            <CreditCard style={{ width: 10, height: 10 }} />
            Front · Question
          </div>
          <textarea
            className="cf-flashcard-textarea"
            value={block.front || ''}
            placeholder="Type the question or term…"
            onChange={(e) => onUpdate(block.id, { front: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            rows={3}
          />
          <div className="cf-flashcard-flip-hint">
            <RotateCcw style={{ width: 10, height: 10 }} />
            Click to reveal answer
          </div>
        </div>
        {/* Back */}
        <div className="cf-flashcard-face cf-flashcard-back">
          <div className="cf-flashcard-badge">
            <CreditCard style={{ width: 10, height: 10 }} />
            Back · Answer
          </div>
          <textarea
            className="cf-flashcard-textarea"
            value={block.back || ''}
            placeholder="Type the answer or definition…"
            onChange={(e) => onUpdate(block.id, { back: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            rows={3}
          />
          <div className="cf-flashcard-flip-hint">
            <RotateCcw style={{ width: 10, height: 10 }} />
            Click to flip back
          </div>
        </div>
      </div>
    </div>
  );
}
// ── Image Block Component ──
function ImageBlock({ block, onUpdate }) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const UNSPLASH_ACCESS_KEY = "MGjPRsN98K3iYFnC8T_XqwV3oVZApm9x9IoZjhlTfeQ";

  const handleGenerateImage = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      if (data.localUrl) {
        onUpdate(block.id, { image: `http://127.0.0.1:8000${data.localUrl}` });
      }
    } catch (err) {
      console.error(err);
      alert('Error generating image');
    }
    setIsGenerating(false);
    setIsAiMode(false);
  };

  const handleUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => onUpdate(block.id, { image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=12`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleSelectUnsplash = async (photo) => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/unsplash-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: photo.urls.regular,
          download_location: photo.links.download_location
        })
      });
      const data = await res.json();
      if (data.dataUri) {
        onUpdate(block.id, { image: data.dataUri });
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
    setIsSearching(false);
  };

  if (block.image || block.imageUrl || block.src) {
    return (
      <div className="cf-image-block" style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block', width: block.width || '100%' }}>
          <img src={block.image || block.imageUrl || block.src} alt="Course content" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }} />
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, background: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <select
              value={block.width || '100%'}
              onChange={(e) => onUpdate(block.id, { width: e.target.value })}
              style={{ fontSize: 12, padding: 2, border: '1px solid #ddd', borderRadius: 4 }}
            >
              <option value="25%">25%</option>
              <option value="50%">50%</option>
              <option value="75%">75%</option>
              <option value="100%">100%</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Add a caption..."
            value={block.caption || ''}
            onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
            style={{ width: '100%', marginTop: 8, padding: 8, border: '1px solid #EAD0D0', borderRadius: 6, fontSize: '0.875rem', textAlign: 'center', fontFamily: 'Roboto', color: '#666' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cf-image-block" style={{ width: '100%' }}>
      {!isSearching && !isAiMode ? (
        <div className="flex gap-4 justify-center" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <label className="bg-neutral-900 border border-red-800 text-white" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '12rem', height: '8rem', background: '#171717', border: '1px solid #991b1b', borderRadius: 8, cursor: 'pointer', color: '#fff' }}>
            <ImageIcon style={{ width: 28, height: 28, opacity: 0.8, marginBottom: '0.5rem' }} />
            Upload File
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
          </label>
          <div onClick={() => setIsSearching(true)} className="bg-neutral-900 border border-red-800 text-white" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '12rem', height: '8rem', background: '#171717', border: '1px solid #991b1b', borderRadius: 8, cursor: 'pointer', color: '#fff' }}>
            <Globe style={{ width: 28, height: 28, opacity: 0.8, marginBottom: '0.5rem' }} />
            Search Unsplash
          </div>
          <div onClick={() => setIsAiMode(true)} className="bg-neutral-900 border border-red-800 text-white" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '12rem', height: '8rem', background: '#171717', border: '1px solid #991b1b', borderRadius: 8, cursor: 'pointer', color: '#fff' }}>
            <ImageIcon style={{ width: 28, height: 28, opacity: 0.8, marginBottom: '0.5rem' }} />
            Generate with AI
          </div>
        </div>
      ) : isSearching ? (
        <div className="bg-neutral-900 border border-red-800 text-white p-4 rounded" style={{ background: '#171717', border: '1px solid #991b1b', padding: '1rem', borderRadius: 8, color: '#fff' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search Unsplash..."
              className="bg-black border-red-900"
              style={{ flex: 1, background: '#000', border: '1px solid #7f1d1d', color: '#fff', padding: '0.5rem', borderRadius: 4, outline: 'none' }}
            />
            <button onClick={handleSearch} disabled={isLoading} style={{ background: '#991b1b', color: '#fff', padding: '0.5rem 1rem', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              {isLoading ? '...' : 'Search'}
            </button>
            <button onClick={() => setIsSearching(false)} style={{ background: 'transparent', color: '#a3a3a3', border: '1px solid #404040', padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
          </div>
          {results.length > 0 && (
            <div className="grid-cols-2 gap-2 max-h-64 overflow-y-auto" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '16rem', overflowY: 'auto' }}>
              {results.map(photo => (
                <div key={photo.id} onClick={() => handleSelectUnsplash(photo)} style={{ position: 'relative', cursor: 'pointer', borderRadius: 4, overflow: 'hidden', height: '8rem' }}>
                  <img src={photo.urls.small} alt={photo.alt_description} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.75rem', padding: '0.25rem' }}>
                    {photo.user.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-red-800 text-white p-4 rounded" style={{ background: '#171717', border: '1px solid #991b1b', padding: '1rem', borderRadius: 8, color: '#fff' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerateImage()}
              placeholder="Describe the image you want to generate..."
              className="bg-black border border-red-900 text-white w-full"
              style={{ flex: 1, background: '#000', border: '1px solid #7f1d1d', color: '#fff', padding: '0.5rem', borderRadius: 4, outline: 'none' }}
              disabled={isGenerating}
            />
            <button onClick={handleGenerateImage} disabled={isGenerating} style={{ background: '#991b1b', color: '#fff', padding: '0.5rem 1rem', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
            <button onClick={() => setIsAiMode(false)} disabled={isGenerating} style={{ background: 'transparent', color: '#a3a3a3', border: '1px solid #404040', padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
          </div>
          {isGenerating && <div style={{ color: '#fff', marginTop: '0.5rem', textAlign: 'center' }}>Generating image... Please wait</div>}
        </div>
      )}
      {isLoading && isSearching && <div style={{ color: '#fff', marginTop: '0.5rem', textAlign: 'center' }}>Processing...</div>}
    </div>
  );
}

// ── Image Hotspot Component ──
function ImageHotspotBlock({ block, onUpdate, readOnly }) {
  const [activeHotspotId, setActiveHotspotId] = useState(null);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdate(block.id, { imageUrl: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleImageClick = (e) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newHotspot = {
      id: Date.now().toString(),
      x,
      y,
      title: "New Hotspot",
      content: "Hotspot content..."
    };
    onUpdate(block.id, { hotspots: [...(block.hotspots || []), newHotspot] });
    setActiveHotspotId(newHotspot.id);
  };

  const updateHotspot = (id, data) => {
    const newHotspots = (block.hotspots || []).map(h => h.id === id ? { ...h, ...data } : h);
    onUpdate(block.id, { hotspots: newHotspots });
  };

  const removeHotspot = (id) => {
    onUpdate(block.id, { hotspots: (block.hotspots || []).filter(h => h.id !== id) });
    if (activeHotspotId === id) setActiveHotspotId(null);
  };

  const activeHotspot = (block.hotspots || []).find(h => h.id === activeHotspotId);

  return (
    <div className="cf-image-hotspot-block" style={{ width: '100%', position: 'relative' }}>
      {!block.imageUrl ? (
        <label className="cf-image-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, background: '#171717', border: '1px dashed #450a0a', borderRadius: 8, cursor: 'pointer', color: '#a3a3a3' }}>
          <ImageIcon style={{ width: 28, height: 28, opacity: 0.6, marginBottom: '0.5rem' }} />
          Click to upload image
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        </label>
      ) : (
        <div style={{ position: 'relative', width: '100%', display: 'inline-block' }}>
          <img
            src={block.imageUrl}
            alt="Hotspot Base"
            style={{ width: '100%', borderRadius: 8, display: 'block', cursor: readOnly ? 'default' : 'crosshair' }}
            onClick={handleImageClick}
          />
          {(block.hotspots || []).map(hotspot => (
            <div
              key={hotspot.id}
              className="absolute w-6 h-6 bg-red-700 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, position: 'absolute', width: 24, height: 24, backgroundColor: '#b91c1c', borderRadius: '50%', border: '2px solid white', transform: 'translate(-50%, -50%)', zIndex: 10, cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveHotspotId(activeHotspotId === hotspot.id ? null : hotspot.id);
              }}
            />
          ))}

          {activeHotspot && readOnly && (
            <div className="bg-black border border-neutral-700 text-white p-4 rounded-md shadow-xl z-50" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#000', border: '1px solid #404040', color: '#fff', padding: '1rem', borderRadius: 6, zIndex: 50, minWidth: 250 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{activeHotspot.title}</h4>
                <button onClick={() => setActiveHotspotId(null)} style={{ background: 'transparent', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{activeHotspot.content}</p>
            </div>
          )}
        </div>
      )}

      {!readOnly && activeHotspot && (
        <div className="bg-neutral-900 border border-red-800 p-3 mt-2 rounded" style={{ background: '#171717', border: '1px solid #991b1b', padding: '0.75rem', marginTop: '0.5rem', borderRadius: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 'bold' }}>Edit Hotspot</span>
            <button onClick={() => removeHotspot(activeHotspot.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
          </div>
          <input
            value={activeHotspot.title}
            onChange={(e) => updateHotspot(activeHotspot.id, { title: e.target.value })}
            placeholder="Title"
            style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #404040', padding: '0.5rem', borderRadius: 4, marginBottom: '0.5rem', outline: 'none' }}
          />
          <textarea
            value={activeHotspot.content}
            onChange={(e) => updateHotspot(activeHotspot.id, { content: e.target.value })}
            placeholder="Content"
            rows={3}
            style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #404040', padding: '0.5rem', borderRadius: 4, outline: 'none', resize: 'vertical' }}
          />
        </div>
      )}
    </div>
  );
}

// ── Interactive Video Component ──
function InteractiveVideoBlock({ block, onUpdate, readOnly }) {
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const videoRef = useRef(null);
  const interactions = block.interactions || [];

  const handleTimeUpdate = (e) => {
    if (!readOnly || activeQuiz) return;
    const currentTime = e.target.currentTime;
    const hit = interactions.find(int =>
      !int.completed && Math.abs(int.timestamp - currentTime) < 0.5
    );
    if (hit) {
      e.target.pause();
      setIsCorrect(false);
      setHasAttempted(false);
      setActiveQuiz(hit);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result;
      onUpdate(block.id, { videoUrl: dataUri, isLocal: true, fileName: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const addInteraction = () => {
    const newInt = {
      id: Date.now().toString(),
      timestamp: 0,
      question: "New Question",
      options: ["Option 1", "Option 2"],
      correctAnswerIndex: 0,
      completed: false
    };
    onUpdate(block.id, { interactions: [...interactions, newInt] });
  };

  const updateInteraction = (id, data) => {
    const newInts = interactions.map(int => int.id === id ? { ...int, ...data } : int);
    onUpdate(block.id, { interactions: newInts });
  };

  const removeInteraction = (id) => {
    onUpdate(block.id, { interactions: interactions.filter(int => int.id !== id) });
  };

  const handleQuizAnswer = (idx) => {
    setHasAttempted(true);
    if (idx === activeQuiz.correctAnswerIndex) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  const resumeVideo = () => {
    const newInts = interactions.map(int => int.id === activeQuiz.id ? { ...int, completed: true } : int);
    onUpdate(block.id, { interactions: newInts });
    setActiveQuiz(null);
    if (videoRef.current) videoRef.current.play();
  };

  return (
    <div style={{ position: 'relative', background: readOnly ? 'transparent' : '#0a0000', padding: readOnly ? 0 : '1rem', borderRadius: 8 }}>
      {!readOnly && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#171717', border: '1px solid #7f1d1d', borderRadius: 6, display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#d4d4d4', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {block.fileName || (block.videoUrl ? 'Uploaded video selected' : 'Upload a video file to add quiz interactions.')}
          </div>
          <label style={{ background: '#171717', color: '#fff', padding: '0.5rem 1rem', border: '1px solid #450a0a', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUp style={{ width: 14, height: 14 }} /> Upload
            <input type="file" accept="video/*" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {block.videoUrl ? (
          <video
            ref={videoRef}
            src={block.videoUrl}
            controls={!activeQuiz}
            style={{ width: '100%', borderRadius: 8, background: '#000', display: 'block' }}
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <div style={{ width: '100%', height: 300, background: '#171717', border: '1px solid #450a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#525252', borderRadius: 8 }}>No video uploaded</div>
        )}

        {readOnly && activeQuiz && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 10, padding: '2rem' }}>
            <div style={{ textAlign: 'center', width: '100%', maxWidth: 500 }}>
              <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>{activeQuiz.question}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeQuiz.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => !isCorrect && handleQuizAnswer(i)}
                    style={{
                      background: isCorrect && i === activeQuiz.correctAnswerIndex ? '#16a34a' : '#171717',
                      color: '#fff',
                      border: '1px solid #450a0a',
                      padding: '0.75rem',
                      borderRadius: 6,
                      cursor: isCorrect ? 'default' : 'pointer',
                      transition: 'background 0.2s',
                      fontSize: '1rem',
                      opacity: isCorrect && i !== activeQuiz.correctAnswerIndex ? 0.5 : 1
                    }}
                    onMouseOver={e => !isCorrect && (e.currentTarget.style.background = '#7f1d1d')}
                    onMouseOut={e => !isCorrect && (e.currentTarget.style.background = isCorrect && i === activeQuiz.correctAnswerIndex ? '#16a34a' : '#171717')}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {hasAttempted && (
                <div style={{ marginTop: '1.5rem' }}>
                  {isCorrect ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <p style={{ color: '#4ade80', fontWeight: 600, margin: 0 }}>Correct! You can now continue.</p>
                      <button
                        onClick={resumeVideo}
                        style={{ background: '#8b1a1a', color: '#fff', padding: '0.75rem 2rem', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, animation: 'pulse 2s infinite' }}
                      >
                        Continue Video
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: '#f87171', fontWeight: 600 }}>Incorrect answer. Please try again.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!readOnly && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>Quiz Interactions</h4>
            <button onClick={addInteraction} style={{ background: '#991b1b', color: '#fff', padding: '0.4rem 0.8rem', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem' }}>+ Add Quiz Point</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {interactions.map(int => (
              <div key={int.id} style={{ background: '#0a0000', borderLeft: '4px solid #991b1b', padding: '1rem', borderRadius: '0 6px 6px 0', border: '1px solid #262626', borderLeftWidth: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <input
                    type="number"
                    value={int.timestamp}
                    onChange={e => updateInteraction(int.id, { timestamp: Number(e.target.value) })}
                    placeholder="Timestamp (seconds)"
                    style={{ background: '#171717', color: '#fff', border: '1px solid #404040', padding: '0.4rem 0.5rem', borderRadius: 4, width: '140px', outline: 'none' }}
                  />
                  <button onClick={() => removeInteraction(int.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
                <input
                  value={int.question}
                  onChange={e => updateInteraction(int.id, { question: e.target.value })}
                  placeholder="Question text"
                  style={{ width: '100%', background: '#171717', color: '#fff', border: '1px solid #404040', padding: '0.5rem', borderRadius: 4, marginBottom: '0.75rem', outline: 'none' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {int.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="radio"
                        name={`quiz-${int.id}`}
                        checked={int.correctAnswerIndex === i}
                        onChange={() => updateInteraction(int.id, { correctAnswerIndex: i })}
                        style={{ cursor: 'pointer' }}
                      />
                      <input
                        value={opt}
                        onChange={e => {
                          const newOpts = [...int.options];
                          newOpts[i] = e.target.value;
                          updateInteraction(int.id, { options: newOpts });
                        }}
                        style={{ flex: 1, background: '#171717', color: '#fff', border: '1px solid #404040', padding: '0.4rem 0.5rem', borderRadius: 4, outline: 'none' }}
                      />
                      <button onClick={() => {
                        const newOpts = int.options.filter((_, idx) => idx !== i);
                        updateInteraction(int.id, {
                          options: newOpts,
                          correctAnswerIndex: int.correctAnswerIndex >= i ? Math.max(0, int.correctAnswerIndex - 1) : int.correctAnswerIndex
                        });
                      }} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => updateInteraction(int.id, { options: [...int.options, "New Option"] })} style={{ alignSelf: 'flex-start', background: 'transparent', color: '#991b1b', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginTop: '0.25rem' }}>+ Add Option</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Video component (self-contained URL state) ──
function VideoBlock({ block, onUpdate }) {
  const [urlDraft, setUrlDraft] = useState(block.videoUrl || '');

  const applyUrl = () => {
    const nextUrl = urlDraft.trim();
    onUpdate(block.id, { videoUrl: nextUrl, isLocal: false });
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Use data URI so the video can be bundled into SCORM exports
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result;
      setUrlDraft(file.name);
      onUpdate(block.id, { videoUrl: dataUri, isLocal: true, fileName: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  const embedUrl = getEmbedUrl(block.videoUrl);

  return (
    <div className="cf-video-block">
      <div className="cf-video-toolbar">
        <span className="cf-video-toolbar-label">VIDEO</span>
        <input
          className="cf-video-url-input"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyUrl();
            }
          }}
          placeholder="Paste YouTube, Vimeo, or direct video URL…"
        />
        <button type="button" className="cf-video-apply-btn" onClick={applyUrl}>
          <Play style={{ width: 11, height: 11 }} />
          Apply
        </button>
        <label className="cf-video-upload-label">
          <FileUp style={{ width: 11, height: 11 }} />
          Upload
          <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleUpload} />
        </label>
      </div>
      <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f0e0e0', display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => onUpdate(block.id, { mandatory: !block.mandatory })}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
            fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
            background: block.mandatory ? '#8b1a1a' : '#fff5f5',
            color: block.mandatory ? 'white' : '#8b6060',
            border: block.mandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
            transition: 'all 0.15s',
          }}
        >
          <ShieldCheck style={{ width: 12, height: 12 }} />
          {block.mandatory ? 'MANDATORY' : 'Optional'}
        </button>
      </div>
      <div className="cf-video-player-area">
        {!block.videoUrl ? (
          <div className="cf-video-empty">
            <div className="cf-video-empty-icon">
              <Video style={{ width: 26, height: 26, color: '#6B2020' }} />
            </div>
            <div className="cf-video-empty-text">No video yet</div>
            <div className="cf-video-empty-sub">
              Paste a YouTube or Vimeo link above, or upload a video file from your device.
            </div>
          </div>
        ) : embedUrl ? (
          <iframe
            className="cf-video-embed"
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded video"
          />
        ) : (
          <video
            className="cf-video-native"
            src={block.videoUrl}
            controls
          />
        )}
      </div>
    </div>
  );
}

// ── Process component (multiple steps) ──
function ProcessBlock({ block, onUpdate }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = block.steps || [{ title: 'Step 1', content: '' }];

  const nextStep = (e) => {
    e.stopPropagation();
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
  };

  const prevStep = (e) => {
    e.stopPropagation();
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const addStep = (e) => {
    e.stopPropagation();
    const newSteps = [...steps, { title: `Step ${steps.length + 1}`, content: '' }];
    onUpdate(block.id, { steps: newSteps });
    setCurrentStep(newSteps.length - 1);
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    onUpdate(block.id, { steps: newSteps });
  };

  const deleteStep = (e, index) => {
    e.stopPropagation();
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== index);
    onUpdate(block.id, { steps: newSteps });
    if (currentStep >= newSteps.length) setCurrentStep(newSteps.length - 1);
  };

  return (
    <div className="cf-process-block" style={{ background: 'white', borderRadius: 12, border: '1px solid #EAD0D0', padding: '1.5rem', boxShadow: '0 4px 12px rgba(139,26,26,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8B1A1A', fontWeight: 600, fontSize: '0.875rem' }}>
          <Layers style={{ width: 16, height: 16 }} />
          Process Step {currentStep + 1} of {steps.length}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={prevStep} disabled={currentStep === 0} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #EAD0D0', background: currentStep === 0 ? '#F5F0EE' : 'white', color: currentStep === 0 ? '#C4A0A0' : '#8B1A1A', cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}>
            Prev
          </button>
          <button onClick={nextStep} disabled={currentStep === steps.length - 1} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #EAD0D0', background: currentStep === steps.length - 1 ? '#F5F0EE' : 'white', color: currentStep === steps.length - 1 ? '#C4A0A0' : '#8B1A1A', cursor: currentStep === steps.length - 1 ? 'not-allowed' : 'pointer' }}>
            Next
          </button>
          <button onClick={addStep} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: 'none', background: '#8B1A1A', color: 'white', cursor: 'pointer', marginLeft: '0.5rem' }}>
            + Add Step
          </button>
        </div>
      </div>

      <div style={{ background: '#FDF8F8', borderRadius: 8, padding: '1rem', border: '1px solid #F0E0E0', position: 'relative' }}>
        {steps.length > 1 && (
          <button onClick={(e) => deleteStep(e, currentStep)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#C4A0A0', cursor: 'pointer' }} title="Delete step">
            <Trash2 style={{ width: 14, height: 14 }} />
          </button>
        )}
        <input
          value={steps[currentStep].title}
          onChange={(e) => updateStep(currentStep, 'title', e.target.value)}
          placeholder="Step Title"
          style={{ width: 'calc(100% - 2rem)', border: 'none', background: 'transparent', outline: 'none', fontSize: '1.125rem', fontWeight: 600, color: '#1A0A0A', marginBottom: '0.5rem', fontFamily: 'Roboto' }}
        />
        <RichTextEditor
          value={steps[currentStep].content}
          onChange={(val) => updateStep(currentStep, 'content', val)}
          placeholder="Describe this step in the process..."
          style={{ border: 'none', background: 'transparent', marginTop: '0.5rem' }}
        />
      </div>

      {/* Progress Indicator */}
      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '1rem', justifyContent: 'center' }}>
        {steps.map((_, i) => (
          <div key={i} onClick={() => setCurrentStep(i)} style={{ width: i === currentStep ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === currentStep ? '#8B1A1A' : '#EAD0D0', cursor: 'pointer', transition: 'all 0.2s' }} />
        ))}
      </div>
    </div>
  );
}

// ── Table component ──
function TableBlock({ block, onUpdate }) {
  const updateHeader = (colIdx, val) => {
    const newHeaders = [...block.headers];
    newHeaders[colIdx] = val;
    onUpdate(block.id, { headers: newHeaders });
  };
  const updateCell = (rowIdx, colIdx, val) => {
    const newRows = [...block.rows];
    newRows[rowIdx][colIdx] = val;
    onUpdate(block.id, { rows: newRows });
  };
  const addRow = () => {
    const newRow = new Array(block.headers.length).fill('');
    onUpdate(block.id, { rows: [...block.rows, newRow] });
  };
  const addCol = () => {
    const newHeaders = [...block.headers, `Header ${block.headers.length + 1}`];
    const newRows = block.rows.map(row => [...row, '']);
    onUpdate(block.id, { headers: newHeaders, rows: newRows });
  };
  const deleteRow = (rIdx) => {
    if (block.rows.length <= 1) return;
    const newRows = block.rows.filter((_, i) => i !== rIdx);
    onUpdate(block.id, { rows: newRows });
  };
  const deleteCol = (cIdx) => {
    if (block.headers.length <= 1) return;
    const newHeaders = block.headers.filter((_, i) => i !== cIdx);
    const newRows = block.rows.map(row => row.filter((_, i) => i !== cIdx));
    onUpdate(block.id, { headers: newHeaders, rows: newRows });
  };

  return (
    <div className="cf-table-block" style={{ background: 'white', borderRadius: 12, border: '1px solid #EAD0D0', padding: '1rem', overflowX: 'auto' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={addRow} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #EAD0D0', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}>+ Add Row</button>
        <button onClick={addCol} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #EAD0D0', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}>+ Add Column</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #F0E0E0' }}>
        <thead>
          <tr>
            {block.headers.map((h, i) => (
              <th key={i} style={{ border: '1px solid #F0E0E0', padding: '0.5rem', background: '#FDF8F8', position: 'relative' }}>
                <input value={h} onChange={(e) => updateHeader(i, e.target.value)} style={{ width: 'calc(100% - 20px)', border: 'none', background: 'transparent', fontWeight: 600, outline: 'none', color: '#1A0A0A' }} placeholder="Header..." />
                {block.headers.length > 1 && (
                  <button onClick={() => deleteCol(i)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#C4A0A0', cursor: 'pointer', padding: 0 }} title="Delete column">
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                )}
              </th>
            ))}
            <th style={{ width: 40, border: '1px solid #F0E0E0', background: '#FDF8F8' }}></th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={{ border: '1px solid #F0E0E0', padding: '0.5rem' }}>
                  <input value={cell} onChange={(e) => updateCell(rIdx, cIdx, e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: '#1A0A0A' }} placeholder="Cell data..." />
                </td>
              ))}
              <td style={{ border: '1px solid #F0E0E0', textAlign: 'center', width: 40 }}>
                {block.rows.length > 1 && (
                  <button onClick={() => deleteRow(rIdx)} style={{ background: 'none', border: 'none', color: '#C4A0A0', cursor: 'pointer' }} title="Delete row">
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main App ──
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
  const initialState = draft ?? createDefaultAuthoringState();

  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseTitle, setCourseTitle] = useState(initialState.courseTitle);
  const [passingScore, setPassingScore] = useState(initialState.passingScore);
  const [slides, setSlides] = useState(initialState.slides);
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);


  // Save / unsaved tracking
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [saveToast, setSaveToast] = useState(false); // 'visible' | 'hiding' | false
  const toastTimerRef = useRef(null);

  // Track unsaved changes whenever authoring state mutates
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

      // Show toast
      setSaveToast('visible');
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setSaveToast('hiding');
        toastTimerRef.current = setTimeout(() => setSaveToast(false), 350);
      }, 2000);
      return true;
    } catch {
      alert('Could not save this course to browser storage. Your browser storage may be full (large images/videos can exceed the quota).');
      return false;
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
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

  const activeSlide = activeSlideId ? slides.find(s => s.id === activeSlideId) : null;

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
    const newSlide = { id: Date.now(), type: 'slide', title: `Slide ${slides.length + 1}`, elements: [] };
    setSlides(prev => [...prev, newSlide]);
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

  const updateSlideTitle = (slideId, title) => {
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, title } : s));
  };

  const addBlock = (type) => {
    if (!activeSlideId) return;
    const newBlock = { id: Date.now(), type };
    if (type === 'heading') newBlock.content = "New Heading";
    if (type === 'text') newBlock.content = "Type your text here...";
    if (type === 'image') newBlock.content = "Image Placeholder";
    if (type === 'button') {
      newBlock.content = "Click Me";
      newBlock.targetSlideId = "";
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
      newBlock.items = ["List item 1", "List item 2", "List item 3"];
    }
    if (type === 'quote') {
      newBlock.content = "Quote text here...";
      newBlock.author = "Author Name";
    }
    if (type === 'process') {
      newBlock.steps = [{ title: 'Step 1', content: '' }, { title: 'Step 2', content: '' }];
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
      newBlock.caseSensitive = false;
      newBlock.isMandatory = false;
      newBlock.marks = 0;
    }
    if (type === 'multi_select') {
      newBlock.question = '';
      newBlock.options = ['Option 1', 'Option 2', 'Option 3'];
      newBlock.correctAnswer = ['0'];
      newBlock.mandatory = false;
      newBlock.marks = 0;
    }
    if (type === 'matching') {
      newBlock.question = '';
      newBlock.pairs = [
        { leftItem: 'Concept 1', rightItem: 'Definition 1' },
        { leftItem: 'Concept 2', rightItem: 'Definition 2' }
      ];
      newBlock.mandatory = false;
      newBlock.marks = 0;
    }
    if (type === 'audio') {
      newBlock.label = 'Audio Track';
      newBlock.audioUrl = '';
      newBlock.mediaId = '';
      newBlock.isUploading = false;
      newBlock.mandatory = false;
    }
    if (type === 'table') {
      newBlock.headers = ['Header 1', 'Header 2'];
      newBlock.rows = [
        ['Row 1 Col 1', 'Row 1 Col 2'],
        ['Row 2 Col 1', 'Row 2 Col 2']
      ];
    }
    if (type === 'columns') {
      newBlock.columns = [[], []];
    }
    if (type === 'interactive-video') {
      newBlock.videoUrl = '';
      newBlock.interactions = [];
    }
    if (type === 'image-hotspot') {
      newBlock.imageUrl = '';
      newBlock.hotspots = [];
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
        const res = await fetch('http://127.0.0.1:8000/api/upload/audio', { method: 'POST', body: fd });
        if (!res.ok) throw new Error();
        const d = await res.json();
        setSlides(prev => prev.map(s => s.id === activeSlideId ? {
          ...s,
          bgAudio: { url: `http://127.0.0.1:8000${d.previewUrl}`, name: file.name, mediaId: d.mediaId }
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
      else if (type === 'story') endpoint = '/api/upload/story';
      else if (type === 'pdf') endpoint = '/api/upload/pdf';
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const importedBlocks = data.blocks.map((block, index) => ({ ...block, id: Date.now() + index }));
      const newSlides = importedBlocks.map((b, i) => {
        if (b.type === 'slide') {
          return {
            ...b,
            id: b.id || Date.now() + i,
            elements: (b.elements || []).map((el, j) => ({ ...el, id: Date.now() + i * 1000 + j }))
          };
        }
        return { id: Date.now() + i, type: 'slide', title: `Imported Slide ${i + 1}`, elements: [b] };
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
      const response = await fetch('http://127.0.0.1:8000/api/ai/generate', { method: 'POST', body: formData });
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
        if (block.type === 'fill_blanks' && (!block.question?.trim() || !block.answer?.trim())) warnings.push(`Slide ${sIdx + 1}: Fill in Blank missing question or answer.`);
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
    setExportLabel('Preparing course data…');
    try {
      // Stage 1: Preparing
      setExportProgress(10);
      await new Promise(r => setTimeout(r, 200));

      // Stage 2: Uploading
      setExportLabel('Uploading to server…');
      setExportProgress(25);
      const body = JSON.stringify({ title: courseTitle, blocks: slides, policy: { passingScore }, theme: null });

      // Start ticking progress while we wait
      let pct = 25;
      const ticker = setInterval(() => {
        pct = Math.min(pct + 3, 85);
        setExportProgress(pct);
      }, 400);

      setExportLabel('Generating SCORM package…');
      const response = await fetch('http://127.0.0.1:8000/api/export/scorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      clearInterval(ticker);

      if (!response.ok) throw new Error("Export failed");

      // Stage 3: Downloading
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
    } catch {
      alert("Failed to export SCORM package.");
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
      const response = await fetch('http://127.0.0.1:8000/api/export/xapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
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
    } catch {
      alert("Failed to export xAPI package.");
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
      const res = await fetch('http://127.0.0.1:8000/api/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error('Preview generation failed');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      // Revoke any previous blob URL to avoid memory leaks
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setIsPreviewOpen(true);
    } catch (e) {
      alert('Could not build preview. Make sure the backend is running.\n' + e.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case 'heading':
      case 'heading-1':
        return (
          <RichTextEditor
            className="cf-heading-input"
            value={block.content}
            onChange={(val) => updateBlock(block.id, { content: val })}
            placeholder="Heading..."
          />
        );
      case 'text':
      case 'ai-generated':
        return (
          <RichTextEditor
            className="cf-text-area"
            value={block.content}
            onChange={(val) => updateBlock(block.id, { content: val })}
            placeholder="Enter your text here..."
          />
        );
      case 'image':
        return <ImageBlock block={block} onUpdate={updateBlock} />;
      case 'button':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div className="cf-button-block">
              <input
                className="cf-button-input"
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b6060', whiteSpace: 'nowrap' }}>
                Jump to
              </span>
              <select
                value={block.targetSlideId || ''}
                onChange={(e) => updateBlock(block.id, { targetSlideId: e.target.value })}
                style={{
                  flex: 1,
                  height: 34,
                  border: '1px solid #EAD0D0',
                  borderRadius: 6,
                  background: '#fff',
                  color: '#3d2020',
                  fontFamily: 'Roboto',
                  fontSize: '0.8125rem',
                  padding: '0 0.5rem',
                  outline: 'none',
                }}
              >
                <option value="">No jump</option>
                {slides.map((slide, index) => (
                  <option key={slide.id} value={String(slide.id)}>
                    Slide {index + 1}: {slide.title || 'Untitled Slide'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      case 'quiz':
        return (
          <div className="cf-quiz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <button
                onClick={() => updateBlock(block.id, { mandatory: !block.mandatory })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                  background: block.mandatory ? '#8b1a1a' : '#fff5f5',
                  color: block.mandatory ? 'white' : '#8b6060',
                  border: block.mandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                  transition: 'all 0.15s',
                }}
              >
                <ShieldCheck style={{ width: 12, height: 12 }} />
                {block.mandatory ? 'MANDATORY' : 'Optional'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b6060', whiteSpace: 'nowrap' }}>Marks:</span>
                <input
                  type="number" min="0" step="1"
                  value={block.marks ?? ''}
                  onChange={(e) => updateBlock(block.id, { marks: e.target.value === '' ? '' : parseInt(e.target.value) })}
                  style={{
                    width: 52, padding: '0.2rem 0.4rem', borderRadius: 6, border: '1px solid #EAD0D0',
                    fontSize: '0.75rem', fontWeight: 700, color: '#8b1a1a', textAlign: 'center',
                    background: '#fff5f5', outline: 'none', fontFamily: 'Roboto',
                  }}
                />
              </div>
            </div>
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
                  placeholder={`Option ${index + 1}...`}
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
      case 'flashcard':
        return <FlashcardBlock block={block} onUpdate={updateBlock} />;
      case 'video':
        return <VideoBlock block={block} onUpdate={updateBlock} />;
      case 'interactive-video':
        return <InteractiveVideoBlock block={block} onUpdate={updateBlock} readOnly={isPreviewOpen} />;
      case 'image-hotspot':
        return <ImageHotspotBlock block={block} onUpdate={updateBlock} readOnly={isPreviewOpen} />;
      case 'process':
        return <ProcessBlock block={block} onUpdate={updateBlock} />;
      case 'table':
        return <TableBlock block={block} onUpdate={updateBlock} />;
      case 'list':
        return (
          <div className="cf-list-block" style={{ padding: '0.5rem 1rem' }}>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#1a0a0a', fontFamily: 'Roboto' }}>
              {block.items.map((item, index) => (
                <li key={index} style={{ marginBottom: '0.5rem' }}>
                  <input
                    value={item}
                    onChange={(e) => {
                      const newItems = [...block.items];
                      newItems[index] = e.target.value;
                      updateBlock(block.id, { items: newItems });
                    }}
                    style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', color: '#1a0a0a' }}
                  />
                </li>
              ))}
            </ul>
            <button
              onClick={() => updateBlock(block.id, { items: [...block.items, "New item"] })}
              style={{ marginTop: '0.5rem', background: 'transparent', border: '1px dashed #e8d8d8', color: '#8b6060', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
            >
              + Add Item
            </button>
          </div>
        );
      case 'quote':
        return (
          <div className="cf-quote-block" style={{ borderLeft: '4px solid #8b1a1a', paddingLeft: '1rem', margin: '1rem 0', background: '#fff5f5', padding: '1rem', borderRadius: '0 8px 8px 0' }}>
            <RichTextEditor
              value={block.content}
              onChange={(val) => updateBlock(block.id, { content: val })}
              placeholder="Enter quote text..."
              style={{ flex: 1, minHeight: '80px', border: 'none', background: 'transparent' }}
            />
            <input
              value={block.author}
              onChange={(e) => updateBlock(block.id, { author: e.target.value })}
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', color: '#8b6060', marginTop: '0.5rem', fontWeight: 600, fontFamily: 'Roboto' }}
              placeholder="Author Name"
            />
          </div>
        );
      case 'multi_select':
        return (
          <div className="cf-quiz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <button
                onClick={() => updateBlock(block.id, { mandatory: !block.mandatory })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                  background: block.mandatory ? '#8b1a1a' : '#fff5f5',
                  color: block.mandatory ? 'white' : '#8b6060',
                  border: block.mandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                  transition: 'all 0.15s',
                }}
              >
                <ShieldCheck style={{ width: 12, height: 12 }} />
                {block.mandatory ? 'MANDATORY' : 'Optional'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b6060', whiteSpace: 'nowrap' }}>Marks:</span>
                <input
                  type="number" min="0" step="1"
                  value={block.marks ?? ''}
                  onChange={(e) => updateBlock(block.id, { marks: e.target.value === '' ? '' : parseInt(e.target.value) })}
                  style={{
                    width: 52, padding: '0.2rem 0.4rem', borderRadius: 6, border: '1px solid #EAD0D0',
                    fontSize: '0.75rem', fontWeight: 700, color: '#8b1a1a', textAlign: 'center',
                    background: '#fff5f5', outline: 'none', fontFamily: 'Roboto',
                  }}
                />
              </div>
            </div>
            <input
              className="cf-quiz-q-input"
              value={block.question}
              onChange={(e) => updateBlock(block.id, { question: e.target.value })}
              placeholder="Enter your question..."
            />
            {block.options.map((option, index) => (
              <div key={index} className="cf-quiz-option">
                <input
                  type="checkbox"
                  name={`ms-${block.id}`}
                  checked={block.correctAnswer.includes(index.toString())}
                  onChange={(e) => {
                    const newCorrect = new Set(block.correctAnswer);
                    if (e.target.checked) newCorrect.add(index.toString());
                    else newCorrect.delete(index.toString());
                    updateBlock(block.id, { correctAnswer: Array.from(newCorrect) });
                  }}
                />
                <input
                  className="cf-quiz-option-text"
                  value={option}
                  placeholder={`Option ${index + 1}...`}
                  onChange={(e) => {
                    const newOptions = [...block.options];
                    newOptions[index] = e.target.value;
                    updateBlock(block.id, { options: newOptions });
                  }}
                />
                <button
                  onClick={() => {
                    const newOptions = block.options.filter((_, i) => i !== index);
                    const newCorrect = block.correctAnswer.filter(ans => ans !== index.toString()).map(ans => parseInt(ans) > index ? (parseInt(ans) - 1).toString() : ans);
                    updateBlock(block.id, { options: newOptions, correctAnswer: newCorrect });
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateBlock(block.id, { options: [...block.options, "New Option"] })}
              style={{ marginTop: '0.5rem', background: 'transparent', border: '1px dashed #e8d8d8', color: '#8b6060', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
            >
              + Add Option
            </button>
          </div>
        );
      case 'matching':
        return (
          <div className="cf-quiz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <button
                onClick={() => updateBlock(block.id, { mandatory: !block.mandatory })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                  background: block.mandatory ? '#8b1a1a' : '#fff5f5',
                  color: block.mandatory ? 'white' : '#8b6060',
                  border: block.mandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                  transition: 'all 0.15s',
                }}
              >
                <ShieldCheck style={{ width: 12, height: 12 }} />
                {block.mandatory ? 'MANDATORY' : 'Optional'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b6060', whiteSpace: 'nowrap' }}>Marks:</span>
                <input
                  type="number" min="0" step="1"
                  value={block.marks ?? ''}
                  onChange={(e) => updateBlock(block.id, { marks: e.target.value === '' ? '' : parseInt(e.target.value) })}
                  style={{
                    width: 52, padding: '0.2rem 0.4rem', borderRadius: 6, border: '1px solid #EAD0D0',
                    fontSize: '0.75rem', fontWeight: 700, color: '#8b1a1a', textAlign: 'center',
                    background: '#fff5f5', outline: 'none', fontFamily: 'Roboto',
                  }}
                />
              </div>
            </div>
            <input
              className="cf-quiz-q-input"
              value={block.question}
              onChange={(e) => updateBlock(block.id, { question: e.target.value })}
              placeholder="Enter your matching instruction..."
            />
            {block.pairs.map((pair, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #e8d8d8', borderRadius: 4 }}
                  value={pair.leftItem}
                  onChange={(e) => {
                    const newPairs = [...block.pairs];
                    newPairs[index].leftItem = e.target.value;
                    updateBlock(block.id, { pairs: newPairs });
                  }}
                  placeholder="Left item"
                />
                <input
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #e8d8d8', borderRadius: 4 }}
                  value={pair.rightItem}
                  onChange={(e) => {
                    const newPairs = [...block.pairs];
                    newPairs[index].rightItem = e.target.value;
                    updateBlock(block.id, { pairs: newPairs });
                  }}
                  placeholder="Right match"
                />
                <button
                  onClick={() => {
                    const newPairs = block.pairs.filter((_, i) => i !== index);
                    updateBlock(block.id, { pairs: newPairs });
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', padding: '0.5rem' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateBlock(block.id, { pairs: [...block.pairs, { leftItem: "New Left", rightItem: "New Right" }] })}
              style={{ marginTop: '0.5rem', background: 'transparent', border: '1px dashed #e8d8d8', color: '#8b6060', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
            >
              + Add Pair
            </button>
          </div>
        );
      case 'true_false':
        return (
          <div className="cf-tf-block">
            <div className="cf-assess-meta">
              <button
                onClick={() => updateBlock(block.id, { isMandatory: !block.isMandatory })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                  background: block.isMandatory ? '#8b1a1a' : '#fff5f5',
                  color: block.isMandatory ? 'white' : '#8b6060',
                  border: block.isMandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                  transition: 'all 0.15s',
                }}
              >
                <ShieldCheck style={{ width: 12, height: 12 }} />
                {block.isMandatory ? 'MANDATORY' : 'Optional'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b6060', whiteSpace: 'nowrap' }}>Marks:</span>
                <input
                  type="number" min="1" step="1"
                  value={block.marks ?? 1}
                  onChange={(e) => updateBlock(block.id, { marks: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={{
                    width: 52, padding: '0.2rem 0.4rem', borderRadius: 6, border: '1px solid #EAD0D0',
                    fontSize: '0.75rem', fontWeight: 700, color: '#8b1a1a', textAlign: 'center',
                    background: '#fff5f5', outline: 'none', fontFamily: 'Roboto',
                  }}
                />
              </div>
            </div>
            <input
              className="cf-quiz-q-input"
              value={block.question}
              onChange={(e) => updateBlock(block.id, { question: e.target.value })}
              placeholder="Enter a statement..."
            />
            <div className="cf-tf-options">
              <button
                className={`cf-tf-btn${block.correctAnswer === true ? ' selected-true' : ''}`}
                onClick={() => updateBlock(block.id, { correctAnswer: true })}
              >✓ True</button>
              <button
                className={`cf-tf-btn${block.correctAnswer === false ? ' selected-false' : ''}`}
                onClick={() => updateBlock(block.id, { correctAnswer: false })}
              >✗ False</button>
            </div>
          </div>
        );
      case 'fill_blanks':
        return (
          <div className="cf-fitb-block">
            <div className="cf-assess-meta">
              <button
                onClick={() => updateBlock(block.id, { isMandatory: !block.isMandatory })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                  background: block.isMandatory ? '#8b1a1a' : '#fff5f5',
                  color: block.isMandatory ? 'white' : '#8b6060',
                  border: block.isMandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                  transition: 'all 0.15s',
                }}
              >
                <ShieldCheck style={{ width: 12, height: 12 }} />
                {block.isMandatory ? 'MANDATORY' : 'Optional'}
              </button>
              <button
                onClick={() => updateBlock(block.id, { caseSensitive: !block.caseSensitive })}
                style={{
                  padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 600,
                  background: block.caseSensitive ? '#FFF0D4' : '#fff5f5',
                  color: block.caseSensitive ? '#92400E' : '#8b6060',
                  border: block.caseSensitive ? '1px solid #D97706' : '1px solid #EAD0D0',
                  transition: 'all 0.15s',
                }}
              >
                Aa {block.caseSensitive ? 'Case-Sensitive' : 'Case-Insensitive'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b6060', whiteSpace: 'nowrap' }}>Marks:</span>
                <input
                  type="number" min="1" step="1"
                  value={block.marks ?? 1}
                  onChange={(e) => updateBlock(block.id, { marks: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={{
                    width: 52, padding: '0.2rem 0.4rem', borderRadius: 6, border: '1px solid #EAD0D0',
                    fontSize: '0.75rem', fontWeight: 700, color: '#8b1a1a', textAlign: 'center',
                    background: '#fff5f5', outline: 'none', fontFamily: 'Roboto',
                  }}
                />
              </div>
            </div>
            <input
              className="cf-quiz-q-input"
              value={block.question}
              onChange={(e) => updateBlock(block.id, { question: e.target.value })}
              placeholder="Use ____ to mark blank. e.g. The capital of France is ____."
            />
            <p className="cf-fitb-hint">Correct answer (learner must match this exactly):</p>
            <input
              className="cf-fitb-answer-input"
              value={block.answer}
              onChange={(e) => updateBlock(block.id, { answer: e.target.value })}
              placeholder="e.g. Paris"
            />
          </div>
        );
      case 'columns': {
        const updateSubBlock = (colIdx, sbId, newData) => {
          const newCols = block.columns.map((col, i) =>
            i === colIdx ? col.map(sb => sb.id === sbId ? { ...sb, ...newData } : sb) : col
          );
          updateBlock(block.id, { columns: newCols });
        };
        const removeSubBlock = (colIdx, sbId) => {
          const newCols = block.columns.map((col, i) =>
            i === colIdx ? col.filter(sb => sb.id !== sbId) : col
          );
          updateBlock(block.id, { columns: newCols });
        };
        const addSubBlock = (colIdx, type) => {
          const newItem = type === 'text'
            ? { id: Date.now() + colIdx, type: 'text', content: '' }
            : { id: Date.now() + colIdx, type: 'image', image: null };
          const newCols = block.columns.map((col, i) =>
            i === colIdx ? [...col, newItem] : col
          );
          updateBlock(block.id, { columns: newCols });
        };

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', width: '100%', margin: '0.5rem 0' }}>
            {block.columns.map((col, colIdx) => (
              <div key={colIdx} style={{
                border: !isPreviewOpen && col.length === 0 ? '2px dashed #EAD0D0' : '1px solid #f5e8e8',
                borderRadius: 12,
                minHeight: !isPreviewOpen && col.length === 0 ? 140 : 'auto',
                padding: '1rem',
                background: col.length === 0 ? '#fffafa' : '#fff',
                display: 'flex', flexDirection: 'column', gap: '0.875rem',
              }}>
                {col.map(sb => (
                  <div key={sb.id} style={{ position: 'relative' }}>
                    {!isPreviewOpen && (
                      <button
                        onClick={() => removeSubBlock(colIdx, sb.id)}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                        title="Remove"
                      >x</button>
                    )}
                    {sb.type === 'text' ? (
                      <RichTextEditor
                        className="cf-text-area"
                        value={sb.content}
                        onChange={(val) => updateSubBlock(colIdx, sb.id, { content: val })}
                        placeholder="Type here..."
                        style={{ border: '1px solid #f0e0e0' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        {sb.image ? (
                          <img src={sb.image} alt="" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                        ) : !isPreviewOpen ? (
                          <label className="cf-image-label" style={{ cursor: 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                            <ImageIcon style={{ width: 20, height: 20, opacity: 0.5 }} />
                            <span style={{ fontSize: '0.75rem' }}>Upload Image</span>
                            <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const r = new FileReader();
                                r.onload = (ev) => updateSubBlock(colIdx, sb.id, { image: ev.target.result });
                                r.readAsDataURL(e.target.files[0]);
                              }
                            }} />
                          </label>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}

                {!isPreviewOpen && col.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, color: '#C4A0A0', gap: 8 }}>
                    <Layers style={{ width: 22, height: 22, opacity: 0.4 }} />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Empty Column</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button onClick={() => addSubBlock(colIdx, 'text')} className="cf-btn" style={{ height: 26, fontSize: '0.6875rem', padding: '0 8px' }}>+ Text</button>
                      <button onClick={() => addSubBlock(colIdx, 'image')} className="cf-btn" style={{ height: 26, fontSize: '0.6875rem', padding: '0 8px' }}>+ Image</button>
                    </div>
                  </div>
                )}
                {!isPreviewOpen && col.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button onClick={() => addSubBlock(colIdx, 'text')} style={{ flex: 1, background: 'none', border: '1px dashed #EAD0D0', color: '#8b6060', fontSize: '0.6875rem', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }}>+ Text</button>
                    <button onClick={() => addSubBlock(colIdx, 'image')} style={{ flex: 1, background: 'none', border: '1px dashed #EAD0D0', color: '#8b6060', fontSize: '0.6875rem', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }}>+ Image</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
      case 'audio':
        return (
          <div className="cf-audio-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                className="cf-audio-label-input"
                value={block.label}
                onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                placeholder="Track label..."
                style={{ flex: 1, marginRight: '0.5rem' }}
              />
              <button
                onClick={() => updateBlock(block.id, { mandatory: !block.mandatory })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                  background: block.mandatory ? '#8b1a1a' : '#fff5f5',
                  color: block.mandatory ? 'white' : '#8b6060',
                  border: block.mandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                  transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <ShieldCheck style={{ width: 12, height: 12 }} />
                {block.mandatory ? 'MANDATORY' : 'Optional'}
              </button>
            </div>
            {block.audioUrl ? (
              <audio className="cf-audio-player" controls src={block.audioUrl} />
            ) : (
              <label className="cf-audio-upload-zone">
                <Mic style={{ width: 24, height: 24, opacity: 0.5, marginBottom: 6 }} />
                <div style={{ fontSize: '0.8125rem', color: 'rgba(232,213,213,0.6)' }}>
                  {block.isUploading ? 'Uploading…' : 'Click to upload MP3 / WAV / OGG'}
                </div>
                <input
                  type="file" accept="audio/*" style={{ display: 'none' }}
                  onChange={async (e) => {
                    const f = e.target.files[0];
                    if (!f) return;
                    updateBlock(block.id, { isUploading: true });
                    const fd = new FormData();
                    fd.append('file', f);
                    try {
                      const res = await fetch('http://127.0.0.1:8000/api/upload/audio', { method: 'POST', body: fd });
                      if (!res.ok) throw new Error();
                      const d = await res.json();
                      updateBlock(block.id, {
                        mediaId: d.mediaId,
                        audioUrl: `http://127.0.0.1:8000${d.previewUrl}`,
                        isUploading: false,
                      });
                    } catch {
                      alert('Audio upload failed.');
                      updateBlock(block.id, { isUploading: false });
                    }
                  }}
                />
              </label>
            )}
          </div>
        );
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

    setSelectedCourseId(courseId);
    setCourseTitle(nextState.courseTitle || fallbackState.courseTitle);
    setPassingScore(nextState.passingScore ?? fallbackState.passingScore);
    setSlides(nextState.slides || fallbackState.slides);
    setActiveSlideId(null);
    setShowAIModal(false);
    setExportProgress(0);
    setExportLabel('');
    prevSavedRef.current = {
      courseTitle: nextState.courseTitle || fallbackState.courseTitle,
      passingScore: nextState.passingScore ?? fallbackState.passingScore,
      slides: nextState.slides || fallbackState.slides,
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
          <div className="cf-pass-container">
            <span className="cf-pass-label">Pass Score</span>
            <div className="cf-pass-input-group">
              <input
                type="number" min="0" max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                className="cf-pass-input"
              />
              <span className="cf-pass-percent">%</span>
            </div>
          </div>
          <div className="cf-header-actions">
            <button
              onClick={handleBackToDashboard}
              className="cf-btn cf-btn-xapi"
            >
              <ChevronRight style={{ width: 13, height: 13, transform: 'rotate(180deg)' }} />
              Dashboard
            </button>
            <button
              id="cf-save-btn"
              onClick={handleSave}
              className={`cf-btn cf-btn-save${!hasUnsaved && saveToast ? ' saved' : ''}`}
              title="Save draft (Ctrl+S)"
            >
              {hasUnsaved && <span className="cf-unsaved-dot" title="Unsaved changes" />}
              <Save style={{ width: 13, height: 13 }} />
              Save
            </button>
            <button
              onClick={handleOpenPreview}
              disabled={isPreviewLoading}
              className="cf-btn cf-btn-preview"
            >
              {isPreviewLoading
                ? <span className="cf-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                : <Eye style={{ width: 14, height: 14 }} />}
              {isPreviewLoading ? 'Building…' : 'Preview'}
            </button>
            <button onClick={openAIModal} disabled={isGenerating || !activeSlideId} className="cf-btn cf-btn-ai">
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
                <div style={{ fontSize: '0.6875rem', color: '#8b6060', marginTop: 2 }}>
                  {exportProgress}%
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
            <div className="cf-sidebar-section" style={{ opacity: activeSlideId ? 1 : 0.5, pointerEvents: activeSlideId ? 'auto' : 'none' }}>
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
              <button onClick={() => addBlock('flashcard')} className="cf-sidebar-btn">
                <CreditCard className="cf-sidebar-icon" /> Flashcard
              </button>
              <button onClick={() => addBlock('video')} className="cf-sidebar-btn">
                <Video className="cf-sidebar-icon" /> Video
              </button>
              <button onClick={() => addBlock('interactive-video')} className="cf-sidebar-btn">
                <Play className="cf-sidebar-icon" /> Interactive Video
              </button>
              <button onClick={() => addBlock('image-hotspot')} className="cf-sidebar-btn">
                <MousePointerClick className="cf-sidebar-icon" /> Image Hotspot
              </button>
              <button onClick={() => addBlock('list')} className="cf-sidebar-btn">
                <List className="cf-sidebar-icon" /> List
              </button>
              <button onClick={() => addBlock('quote')} className="cf-sidebar-btn">
                <Quote className="cf-sidebar-icon" /> Quote
              </button>
              <button onClick={() => addBlock('process')} className="cf-sidebar-btn">
                <Layers className="cf-sidebar-icon" /> Process
              </button>
              <button onClick={() => addBlock('audio')} className="cf-sidebar-btn">
                <Mic className="cf-sidebar-icon" /> Audio
              </button>
              <button onClick={() => addBlock('table')} className="cf-sidebar-btn">
                <Table className="cf-sidebar-icon" /> Table
              </button>
              <button onClick={() => addBlock('columns')} className="cf-sidebar-btn">
                <Layers className="cf-sidebar-icon" /> Columns / Grid
              </button>
              <span className="cf-sidebar-label">Assessments</span>
              <button onClick={() => addBlock('quiz')} className="cf-sidebar-btn">
                <ListChecks className="cf-sidebar-icon" /> Quiz
              </button>
              <button onClick={() => addBlock('true_false')} className="cf-sidebar-btn">
                <ToggleLeft className="cf-sidebar-icon" /> True / False
              </button>
              <button onClick={() => addBlock('fill_blanks')} className="cf-sidebar-btn">
                <PenLine className="cf-sidebar-icon" /> Fill in Blank
              </button>
              <button onClick={() => addBlock('multi_select')} className="cf-sidebar-btn">
                <ListChecks className="cf-sidebar-icon" /> Multi-Select
              </button>
              <button onClick={() => addBlock('matching')} className="cf-sidebar-btn">
                <Layers className="cf-sidebar-icon" /> Match the Following
              </button>
            </div>

            {activeSlideId && (
              <>
                <div className="cf-sidebar-divider" />
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
              </>
            )}

            <div className="cf-sidebar-divider" />

            <div className="cf-sidebar-section">
              <span className="cf-sidebar-label">Import</span>
              <label className="cf-sidebar-import-btn">
                <FileUp className="cf-sidebar-icon" />
                {isUploading ? 'Uploading…' : 'PowerPoint'}
                <input type="file" accept=".pptx" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pptx')} />
              </label>
              <label className="cf-sidebar-import-btn">
                <FileArchive className="cf-sidebar-icon" />
                {isUploading ? 'Uploading…' : '.story File'}
                <input type="file" accept=".story" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'story')} />
              </label>
              <label className="cf-sidebar-import-btn">
                <FileText className="cf-sidebar-icon" />
                {isUploading ? 'Uploading…' : 'PDF File'}
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pdf')} />
              </label>
            </div>

            <div className="cf-sidebar-divider" />

            {activeSlideId && (
              <div className="cf-sidebar-section" style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <div style={{ padding: '0.75rem', background: '#FFF5F5', borderRadius: 10, border: '1px solid #F0D8D8' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B1A1A', marginBottom: '0.25rem' }}>
                    {activeSlide.elements.length} Block{activeSlide.elements.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#B08080', lineHeight: 1.5 }}>
                    Drag to reorder. Hover a block to delete it.
                  </div>
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
                        <button style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', color: '#c4a0a0', border: 'none', cursor: 'pointer', transition: 'color 0.15s', zIndex: 2 }}
                          onClick={(e) => { e.stopPropagation(); deleteSlide(slide.id); }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#8b1a1a'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#c4a0a0'}>
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </button>
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
                <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #f0e0e0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                  activeSlide.elements.map((block, index) => (
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
                        <button className="cf-block-delete" onClick={() => deleteBlock(block.id)} title="Delete Block">
                          <Trash2 style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      {renderBlock(block)}
                    </div>
                  ))
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
      {isPreviewOpen && previewBlobUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '1100px', height: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', border: '1px solid #333' }}>
            {/* LMS chrome bar */}
            <div style={{ background: '#0f0f0f', borderBottom: '1px solid #2a2a2a', padding: '0 1.25rem', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#6b7280', fontSize: 12, fontFamily: 'Roboto, sans-serif', letterSpacing: '0.05em' }}>
                  SCORM Preview — {courseTitle}
                </span>
              </div>
              <button
                onClick={() => { setIsPreviewOpen(false); if (previewBlobUrl) { URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); } }}
                style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '4px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Roboto, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <X style={{ width: 12, height: 12 }} /> Close
              </button>
            </div>
            {/* iframe — loads the actual SCORM runtime HTML */}
            <iframe
              src={previewBlobUrl}
              title="SCORM Preview"
              style={{ flex: 1, border: 'none', background: '#18181b', display: 'block', width: '100%' }}
              sandbox="allow-scripts allow-same-origin allow-forms"
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
