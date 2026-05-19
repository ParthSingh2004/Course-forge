import React, { useState, useRef, useEffect } from 'react';
import { List, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder, style, className, compactToolbar = false }) {
  const editorRef = useRef(null);
  const isEditing = useRef(false);
  const savedSelectionRef = useRef(null);
  const [currentFont, setCurrentFont] = useState('');
  const [currentSize, setCurrentSize] = useState('16');

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
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return '16';

    let node = selection.anchorNode;
    if (!node || !editorRef.current.contains(node)) return '16';
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    while (node && node !== editorRef.current) {
      if (node.style?.fontSize) {
        return String(parseInt(node.style.fontSize, 10));
      }
      node = node.parentElement;
    }

    return '16';
  };

  const updateToolbarState = () => {
    saveSelection();
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

  const handlePaste = (e) => {
    e.preventDefault();
    const plainText = e.clipboardData?.getData('text/plain') || '';
    restoreSelection();
    document.execCommand('insertText', false, plainText);
    handleInput();
    saveSelection();
  };

  const exec = (command, val = null) => {
    if (editorRef.current) editorRef.current.focus();
    restoreSelection();
    document.execCommand(command, false, val);
    handleInput();
  };

  const applyTextColor = (color) => {
    if (!editorRef.current || !color) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    handleInput();
    saveSelection();
  };

  const execFontSize = (size) => {
    const numericSize = Number(size);
    if (!Number.isFinite(numericSize) || numericSize < 8 || numericSize > 96) return;
    restoreSelection();
    document.execCommand('fontSize', false, '7');
    const fontElements = editorRef.current.querySelectorAll('font[size="7"]');
    fontElements.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = numericSize + 'px';
    });
    setCurrentSize(String(numericSize));
    handleInput();
    saveSelection();
  };

  const applyTypedFontSize = () => {
    execFontSize(currentSize);
  };

  return (
    <div className={`cf-rich-text-editor ${className || ''}`} style={{ border: '1px solid #EAD0D0', borderRadius: 8, overflow: 'hidden', background: 'white', ...style }}>
      <div className="cf-rte-toolbar" style={{ display: 'flex', gap: '4px', padding: '6px 8px', background: '#FDF8F8', borderBottom: '1px solid #EAD0D0', alignItems: 'center', fontSize: '13px', fontWeight: '400', fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal', color: '#333', flexWrap: compactToolbar ? 'wrap' : 'nowrap' }}>
        <button onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: 'inherit' }}>B</button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontStyle: 'italic', fontSize: '13px', color: 'inherit' }}>I</button>
        <button onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', color: 'inherit' }}>U</button>
        <div style={{ width: '1px', height: '16px', background: '#EAD0D0', margin: '0 4px' }} />
        <select value={currentFont} onMouseDown={saveSelection} onChange={(e) => { e.preventDefault(); exec('fontName', e.target.value); }} style={{ padding: '2px 4px', border: '1px solid #EAD0D0', borderRadius: 4, fontSize: '12px', background: 'white', maxWidth: compactToolbar ? 110 : 'none' }}>
          <option value="" disabled>Font</option>
          <option value="Roboto">Roboto</option>
          <option value="Open Sans">Open Sans</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Lato">Lato</option>
          <option value="Playfair Display">Playfair Display</option>
          <option value="Lora">Lora</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Calibri">Calibri</option>
          <option value="Courier New">Courier</option>
        </select>
        <input
          type="number"
          min="8"
          max="96"
          step="1"
          value={currentSize}
          onMouseDown={saveSelection}
          onFocus={saveSelection}
          onChange={(e) => setCurrentSize(e.target.value)}
          onBlur={applyTypedFontSize}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyTypedFontSize();
            }
          }}
          style={{ width: compactToolbar ? 60 : 72, padding: '2px 6px', border: '1px solid #EAD0D0', borderRadius: 4, fontSize: '12px', background: 'white' }}
          title="Font size in pixels"
        />
        <div style={{ width: '1px', height: '16px', background: '#EAD0D0', margin: '0 4px' }} />
        <input
          type="color"
          onMouseDown={saveSelection}
          onInput={(e) => applyTextColor(e.target.value)}
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
        className="cf-rich-text-input"
        contentEditable
        onInput={handleInput}
        onKeyUp={updateToolbarState}
        onMouseUp={updateToolbarState}
        onSelect={updateToolbarState}
        onPaste={handlePaste}
        onFocus={() => { isEditing.current = true; updateToolbarState(); }}
        onBlur={() => { isEditing.current = false; handleInput(); }}
        style={{ padding: '12px', minHeight: '80px', outline: 'none', color: 'inherit', fontFamily: 'inherit' }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
