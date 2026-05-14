import React, { useRef, useState, useEffect, useCallback } from 'react';
import RichTextEditor from '../ui/RichTextEditor';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return 'tl-' + Math.random().toString(36).slice(2, 8);
}

const IMAGE_HEIGHTS = [
  { value: '220px', label: 'S – 220 px' },
  { value: '380px', label: 'M – 380 px' },
  { value: '520px', label: 'L – 520 px' },
  { value: '700px', label: 'XL – 700 px' },
];

// ─── Single draggable text layer ──────────────────────────────────────────────

const TextLayer = React.memo(function TextLayer({
  layer,
  isSelected,
  onSelect,
  onContentChange,
  onRemove,
  onDragStart,
  elRef,
  index,
}) {
  return (
    <div
      ref={elRef}
      className={`itb-layer${isSelected ? ' itb-layer--selected' : ''}`}
      style={{ left: `${layer.x}%`, top: `${layer.y}%` }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* ── drag handle bar ── */}
      <div
        className="itb-layer__bar"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDragStart(e); }}
        title="Drag to reposition"
      >
        <div className="itb-layer__bar-left">
          <span className="itb-layer__grip">
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
              <circle cx="2.5" cy="2.5"  r="1.4" fill="currentColor"/>
              <circle cx="7.5" cy="2.5"  r="1.4" fill="currentColor"/>
              <circle cx="2.5" cy="7"    r="1.4" fill="currentColor"/>
              <circle cx="7.5" cy="7"    r="1.4" fill="currentColor"/>
              <circle cx="2.5" cy="11.5" r="1.4" fill="currentColor"/>
              <circle cx="7.5" cy="11.5" r="1.4" fill="currentColor"/>
            </svg>
          </span>
          <span className="itb-layer__label">Text {index + 1}</span>
        </div>

        <button
          className="itb-layer__del"
          title="Remove text layer"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <line x1="1" y1="1" x2="8" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="8" y1="1" x2="1" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── editor ── */}
      <div className="itb-layer__editor">
        <RichTextEditor
          value={layer.content}
          onChange={onContentChange}
          placeholder="Type here…"
          style={{
            border: 'none',
            background: 'transparent',
            color: '#1a1a1a',
            minWidth: '140px',
            minHeight: '1.6em',
            '--rte-text-color': '#1a1a1a',
            '--rte-placeholder-color': 'rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </div>
  );
});

// ─── Upload placeholder ───────────────────────────────────────────────────────

function UploadPlaceholder({ onClick }) {
  return (
    <button className="itb-upload" onClick={onClick}>
      <span className="itb-upload__icon">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect x="1" y="1" width="42" height="42" rx="9"
            stroke="#d4d4cf" strokeWidth="1.5" strokeDasharray="5 3.5"/>
          <path d="M22 13v12M16 19l6-6 6 6"
            stroke="#c0c0bb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 31h18"
            stroke="#d4d4cf" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </span>
      <span className="itb-upload__title">Upload an image</span>
      <span className="itb-upload__hint">PNG · JPG · GIF · WebP</span>
    </button>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({ block, onUpdate, fileInputRef, onAddLayer }) {
  const hasImage   = Boolean(block.image);
  const height     = block.imageHeight ?? '380px';
  const layerCount = (block.textLayers ?? []).length;

  return (
    <div className="itb-toolbar">
      {/* Image controls */}
      <div className="itb-tg">
        <span className="itb-tg__label">Image</span>
        <div className="itb-tg__row">
          <button className="itb-btn" onClick={() => fileInputRef.current?.click()}>
            {hasImage ? 'Replace' : 'Upload'}
          </button>
          {hasImage && (
            <button
              className="itb-btn itb-btn--ghost-red"
              onClick={() => onUpdate(block.id, { image: null, textLayers: [] })}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {hasImage && (
        <>
          <div className="itb-sep" />

          {/* Height */}
          <div className="itb-tg">
            <span className="itb-tg__label">Height</span>
            <select
              className="itb-select"
              value={height}
              onChange={(e) => onUpdate(block.id, { imageHeight: e.target.value })}
            >
              {IMAGE_HEIGHTS.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>

          <div className="itb-sep" />

          {/* Text layer add */}
          <div className="itb-tg">
            <span className="itb-tg__label">
              Text layers{layerCount > 0 ? ` (${layerCount})` : ''}
            </span>
            <button className="itb-btn itb-btn--primary" onClick={onAddLayer}>
              + Add text
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImageTextBlock({ block, onUpdate }) {
  const fileInputRef = useRef(null);
  const canvasRef    = useRef(null);
  const draggingRef  = useRef(null);
  const layerElsRef  = useRef({});
  const blockRef     = useRef(block);

  useEffect(() => { blockRef.current = block; }, [block]);

  const [selectedId, setSelectedId] = useState(null);

  const layers   = block.textLayers ?? [];
  const hasImage = Boolean(block.image);
  const height   = block.imageHeight ?? '380px';

  // ── file upload ────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpdate(block.id, { image: ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── layer helpers ──────────────────────────────────────────────────────────
  const addLayer = useCallback(() => {
    const id  = uid();
    const cur = blockRef.current;
    const n   = (cur.textLayers ?? []).length;
    onUpdate(block.id, {
      textLayers: [
        ...(cur.textLayers ?? []),
        { id, content: '', x: 8 + (n % 6) * 5, y: 8 + (n % 4) * 6 },
      ],
    });
    setSelectedId(id);
  }, [block.id, onUpdate]);

  const updateLayerContent = useCallback((layerId, content) => {
    const cur = blockRef.current;
    onUpdate(block.id, {
      textLayers: (cur.textLayers ?? []).map((l) =>
        l.id === layerId ? { ...l, content } : l
      ),
    });
  }, [block.id, onUpdate]);

  const removeLayer = useCallback((layerId) => {
    const cur = blockRef.current;
    onUpdate(block.id, {
      textLayers: (cur.textLayers ?? []).filter((l) => l.id !== layerId),
    });
    setSelectedId((id) => (id === layerId ? null : id));
  }, [block.id, onUpdate]);

  const commitPosition = useCallback((layerId, x, y) => {
    const cur = blockRef.current;
    onUpdate(block.id, {
      textLayers: (cur.textLayers ?? []).map((l) =>
        l.id === layerId ? { ...l, x, y } : l
      ),
    });
  }, [block.id, onUpdate]);

  // ── drag ───────────────────────────────────────────────────────────────────
  const startDrag = useCallback((e, layer) => {
    setSelectedId(layer.id);
    draggingRef.current = {
      id:      layer.id,
      startMX: e.clientX,
      startMY: e.clientY,
      startX:  layer.x,
      startY:  layer.y,
      curX:    layer.x,
      curY:    layer.y,
    };
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const d = draggingRef.current;
      if (!d || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const dx   = ((e.clientX - d.startMX) / rect.width)  * 100;
      const dy   = ((e.clientY - d.startMY) / rect.height) * 100;

      d.curX = Math.max(0, Math.min(88, d.startX + dx));
      d.curY = Math.max(0, Math.min(88, d.startY + dy));

      // Direct DOM write = silky 60 fps, zero React re-renders during drag
      const el = layerElsRef.current[d.id];
      if (el) {
        el.style.left = `${d.curX}%`;
        el.style.top  = `${d.curY}%`;
      }
    };

    const onUp = () => {
      const d = draggingRef.current;
      if (d) commitPosition(d.id, d.curX, d.curY);
      draggingRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [commitPosition]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="cf-itb">

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          className={`itb-canvas${hasImage ? ' itb-canvas--loaded' : ' itb-canvas--empty'}`}
          style={
            hasImage
              ? { height, backgroundImage: `url(${block.image})` }
              : { height: '200px' }
          }
          onClick={() => setSelectedId(null)}
        >
          {!hasImage && (
            <UploadPlaceholder onClick={() => fileInputRef.current?.click()} />
          )}

          {layers.map((layer, index) => (
            <TextLayer
              key={layer.id}
              layer={layer}
              index={index}
              isSelected={selectedId === layer.id}
              onSelect={() => setSelectedId(layer.id)}
              onContentChange={(val) => updateLayerContent(layer.id, val)}
              onRemove={() => removeLayer(layer.id)}
              onDragStart={(e) => startDrag(e, layer)}
              elRef={(el) => {
                if (el) layerElsRef.current[layer.id] = el;
                else    delete layerElsRef.current[layer.id];
              }}
            />
          ))}
        </div>

        {/* ── Toolbar ── */}
        <Toolbar
          block={block}
          onUpdate={onUpdate}
          fileInputRef={fileInputRef}
          onAddLayer={addLayer}
        />
      </div>

      <style>{CSS}</style>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
  /* ── block wrapper ── */
  .cf-itb {
    margin: 1rem 0;
    border-radius: 12px;
    border: 1px solid #e4e4e0;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0,0,0,.05), 0 2px 12px rgba(0,0,0,.04);
    transition: box-shadow .2s;
  }
  .cf-itb:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,.07), 0 6px 24px rgba(0,0,0,.06);
  }

  /* ── image canvas ── */
  .itb-canvas {
    position: relative;
    width: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    overflow: hidden;
    transition: height .22s ease;
    cursor: default;
    user-select: none;
  }
  .itb-canvas--empty {
    background-color: #fafaf8;
  }

  /* ── upload placeholder ── */
  .itb-upload {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: .55rem;
    background: transparent; border: none; cursor: pointer; width: 100%;
    transition: background .15s;
  }
  .itb-upload:hover { background: rgba(0,0,0,.02); }
  .itb-upload__icon  { opacity: .65; }
  .itb-upload__title {
    font-size: .88rem; font-weight: 600; color: #909090;
    letter-spacing: .01em;
  }
  .itb-upload__hint  { font-size: .7rem; color: #c0c0bc; letter-spacing: .05em; }

  /* ── text layer ── */
  .itb-layer {
    position: absolute;
    display: inline-flex;
    flex-direction: column;
    z-index: 10;
    min-width: 100px;
  }

  /* selection ring */
  .itb-layer--selected .itb-layer__editor {
    outline: 1.5px dashed rgba(99, 102, 241, 0.5);
    outline-offset: 2px;
    border-radius: 0 6px 6px 6px;
  }

  /* ── drag handle bar ── */
  .itb-layer__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px;
    gap: .4rem;
    background: #ffffff;
    border: 1px solid #e4e4e0;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    cursor: grab;
    user-select: none;
    box-shadow: 0 -1px 4px rgba(0,0,0,.04);
    /* hidden by default, visible on hover or selection */
    opacity: 0;
    transition: opacity .14s;
  }
  .itb-layer__bar:active { cursor: grabbing; }
  .itb-layer:hover .itb-layer__bar,
  .itb-layer--selected .itb-layer__bar { opacity: 1; }

  .itb-layer__bar-left {
    display: flex;
    align-items: center;
    gap: .35rem;
  }

  .itb-layer__grip {
    color: #b0b0ac;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .itb-layer__label {
    font-size: .65rem;
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: #b0b0ac;
    white-space: nowrap;
  }

  .itb-layer__del {
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; padding: 2px 3px;
    color: #c0c0bc; cursor: pointer;
    border-radius: 3px;
    transition: color .1s, background .1s;
    line-height: 1;
    flex-shrink: 0;
  }
  .itb-layer__del:hover { color: #e05050; background: rgba(220,50,50,.08); }

  /* ── editor area ── */
  .itb-layer__editor {
    padding: 4px 7px;
    min-width: 90px;
    background: rgba(255,255,255,0.88);
    border: 1px solid rgba(228,228,224,0.9);
    border-top: none;
    border-radius: 0 6px 6px 6px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* Force dark text inside RichTextEditor */
  .itb-layer__editor [contenteditable],
  .itb-layer__editor p,
  .itb-layer__editor span,
  .itb-layer__editor div {
    color: #1a1a1a !important;
    caret-color: #1a1a1a;
  }
  .itb-layer__editor [contenteditable]:empty::before,
  .itb-layer__editor [placeholder]::before {
    color: rgba(0,0,0,.28) !important;
  }

  /* ── toolbar ── */
  .itb-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: .5rem 1.2rem;
    padding: .65rem 1rem;
    background: #ffffff;
    border-top: 1px solid #f0f0ed;
  }

  .itb-tg  { display: flex; flex-direction: column; gap: .28rem; }
  .itb-tg__label {
    font-size: .61rem; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: #c0c0bc;
  }
  .itb-tg__row { display: flex; gap: .38rem; flex-wrap: wrap; }

  .itb-sep {
    width: 1px; align-self: stretch; background: #efefed; flex-shrink: 0;
  }

  .itb-select {
    font-size: .77rem; padding: .26rem .5rem;
    border: 1px solid #e4e4e0; border-radius: 6px;
    background: #fafaf8; color: #333; cursor: pointer;
    outline: none; transition: border-color .15s;
  }
  .itb-select:focus { border-color: #c0c0bc; }

  .itb-btn {
    font-size: .74rem; font-weight: 500; padding: .28rem .64rem;
    border: 1px solid #e4e4e0; border-radius: 6px;
    background: #fafaf8; color: #444; cursor: pointer;
    white-space: nowrap; line-height: 1.45;
    transition: background .12s, border-color .12s;
  }
  .itb-btn:hover { background: #f2f2ef; border-color: #d0d0cc; }

  .itb-btn--primary {
    background: #18181b; color: #fff; border-color: #18181b;
  }
  .itb-btn--primary:hover { background: #27272a; border-color: #27272a; }

  .itb-btn--ghost-red { color: #c03030; border-color: #edd8d8; background: #fff; }
  .itb-btn--ghost-red:hover { background: #fdf4f4; border-color: #ddb8b8; }
`;