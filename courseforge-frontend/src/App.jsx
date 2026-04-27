import { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, Type, Heading1, Image as ImageIcon, MousePointerClick, ListChecks, Trash2, GripVertical, FileUp, Globe, FileArchive, BookOpen, ChevronRight, CreditCard, Video, RotateCcw, Play, List, Quote, Layers, AlignLeft, AlignCenter, AlignRight, AlignJustify, ShieldCheck } from 'lucide-react';

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
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Roboto', sans-serif;
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
    font-family: 'Roboto', sans-serif;
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
`;

function RichTextEditor({ value, onChange, placeholder, style, className }) {
  const editorRef = useRef(null);
  const isEditing = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isEditing.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command, val = null) => {
    document.execCommand(command, false, val);
    handleInput();
  };

  return (
    <div className={`cf-rich-text-editor ${className || ''}`} style={{ border: '1px solid #EAD0D0', borderRadius: 8, overflow: 'hidden', background: 'white', ...style }}>
      <div className="cf-rte-toolbar" style={{ display: 'flex', gap: '4px', padding: '6px 8px', background: '#FDF8F8', borderBottom: '1px solid #EAD0D0', alignItems: 'center' }}>
        <button onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>B</button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontStyle: 'italic' }}>I</button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>U</button>
        <div style={{ width: '1px', height: '16px', background: '#EAD0D0', margin: '0 4px' }} />
        <select onChange={(e) => { e.preventDefault(); exec('fontSize', e.target.value); e.target.value = ''; }} defaultValue="" style={{ padding: '2px 4px', border: '1px solid #EAD0D0', borderRadius: 4, fontSize: '0.8125rem' }}>
          <option value="" disabled>Size</option>
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>
        <button onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <List style={{ width: 14, height: 14 }} />
        </button>
        <div style={{ width: '1px', height: '16px', background: '#EAD0D0', margin: '0 4px' }} />
        <button onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <AlignLeft style={{ width: 14, height: 14 }} />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <AlignCenter style={{ width: 14, height: 14 }} />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('justifyRight'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <AlignRight style={{ width: 14, height: 14 }} />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('justifyFull'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <AlignJustify style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => { isEditing.current = true; }}
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

// ── Video component (self-contained URL state) ──
function VideoBlock({ block, onUpdate }) {
  const [urlDraft, setUrlDraft] = useState(block.videoUrl || '');

  const applyUrl = () => {
    onUpdate(block.id, { videoUrl: urlDraft.trim() });
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Use data URI so the video can be bundled into SCORM exports
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result;
      setUrlDraft(file.name);
      onUpdate(block.id, { videoUrl: dataUri, isLocal: true });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  const embedUrl = getEmbedUrl(block.videoUrl);
  const isLocal = block.isLocal;

  return (
    <div className="cf-video-block">
      <div className="cf-video-toolbar">
        <span className="cf-video-toolbar-label">VIDEO</span>
        <input
          className="cf-video-url-input"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
          placeholder="Paste YouTube, Vimeo, or direct video URL…"
        />
        <button className="cf-video-apply-btn" onClick={applyUrl}>
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

// ── Main App ──
function App() {
  const [courseTitle, setCourseTitle] = useState("Untitled Course");
  const [slides, setSlides] = useState([
    { id: 1, type: 'slide', title: 'Slide 1', elements: [
      { id: 101, type: 'text', content: 'Welcome to your new course. Use the sidebar to add blocks, or click AI to generate content.' }
    ]}
  ]);
  const [activeSlideId, setActiveSlideId] = useState(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
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
    setSlides(prev => prev.filter(s => s.id !== slideId));
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
    if (type === 'button') newBlock.content = "Click Me";
    if (type === 'quiz') {
      newBlock.question = "What is the correct answer?";
      newBlock.options = ["Option A", "Option B", "Option C"];
      newBlock.correctAnswer = 0;
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

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      let endpoint;
      if (type === 'pptx') endpoint = '/api/upload/pptx';
      else if (type === 'xml') endpoint = '/api/upload/xml';
      else if (type === 'story') endpoint = '/api/upload/story';
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      const importedBlocks = data.blocks.map((block, index) => ({ ...block, id: Date.now() + index }));
      const newSlides = importedBlocks.map((b, i) => b.type === 'slide' ? b : { id: Date.now() + i, type: 'slide', title: `Imported Slide ${i+1}`, elements: [b] });
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

  const handleExportScorm = async () => {
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
      const body = JSON.stringify({ title: courseTitle, blocks: slides });

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
    setIsExporting(true);
    setExportProgress(0);
    setExportLabel('Preparing xAPI data…');
    try {
      setExportProgress(10);
      await new Promise(r => setTimeout(r, 200));

      setExportLabel('Uploading to server…');
      setExportProgress(25);
      const body = JSON.stringify({ title: courseTitle, blocks: slides });

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
          <RichTextEditor
            className="cf-text-area"
            value={block.content}
            onChange={(val) => updateBlock(block.id, { content: val })}
            placeholder="Enter your text here..."
          />
        );
      case 'image':
        return (
          <div className="cf-image-block" style={{ textAlign: 'center' }}>
            {(block.image || block.imageUrl) ? (
              <div style={{ position: 'relative', display: 'inline-block', width: block.width || '100%' }}>
                <img src={block.image || block.imageUrl} alt="Course content" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, background: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                   <select 
                     value={block.width || '100%'} 
                     onChange={(e) => updateBlock(block.id, { width: e.target.value })}
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
                  onChange={(e) => updateBlock(block.id, { caption: e.target.value })} 
                  style={{ width: '100%', marginTop: 8, padding: 8, border: '1px solid #EAD0D0', borderRadius: 6, fontSize: '0.875rem', textAlign: 'center', fontFamily: 'Roboto', color: '#666' }}
                />
              </div>
            ) : (
              <label className="cf-image-label">
                <ImageIcon style={{ width: 28, height: 28, opacity: 0.6 }} />
                Click to upload image
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onloadend = () => updateBlock(block.id, { image: reader.result });
                      reader.readAsDataURL(file);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
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
      case 'process':
        return <ProcessBlock block={block} onUpdate={updateBlock} />;
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
      default:
        return (
          <div style={{ color: '#B08080', fontSize: '0.8125rem', padding: '1rem', background: '#FFF5F5', borderRadius: 8, border: '1px dashed #E8C8C8' }}>
            Unsupported block: {block.type}
          </div>
        );
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
              <button onClick={() => addBlock('quiz')} className="cf-sidebar-btn">
                <ListChecks className="cf-sidebar-icon" /> Quiz
              </button>
              <button onClick={() => addBlock('flashcard')} className="cf-sidebar-btn">
                <CreditCard className="cf-sidebar-icon" /> Flashcard
              </button>
              <button onClick={() => addBlock('video')} className="cf-sidebar-btn">
                <Video className="cf-sidebar-icon" /> Video
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
            </div>

            <div className="cf-sidebar-divider" />

            <div className="cf-sidebar-section">
              <span className="cf-sidebar-label">Import</span>
              <label className="cf-sidebar-file-label">
                <FileUp style={{ width: 15, height: 15, color: '#8B6060', flexShrink: 0 }} />
                {isUploading ? 'Uploading…' : 'PowerPoint'}
                <input type="file" accept=".pptx" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'pptx')} />
              </label>
              <label className="cf-sidebar-file-label">
                <FileUp style={{ width: 15, height: 15, color: '#8B6060', flexShrink: 0 }} />
                {isUploading ? 'Uploading…' : 'XML File'}
                <input type="file" accept=".xml" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'xml')} />
              </label>
              <label className="cf-sidebar-file-label">
                <FileArchive style={{ width: 15, height: 15, color: '#8B6060', flexShrink: 0 }} />
                {isUploading ? 'Uploading…' : '.story File'}
                <input type="file" accept=".story" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'story')} />
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
                           style={{ background: 'white', border: '1px solid #e8d8d8', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', position: 'relative', boxShadow: '0 2px 8px rgba(139,26,26,0.03)', transition: 'transform 0.15s, border-color 0.15s' }}
                           onClick={() => setActiveSlideId(slide.id)}
                           onMouseOver={(e) => e.currentTarget.style.borderColor = '#c0392b'}
                           onMouseOut={(e) => e.currentTarget.style.borderColor = '#e8d8d8'}>
                        <button style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', color: '#c4a0a0', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
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
              <div className="cf-canvas">
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
    </>
  );
}

export default App;
