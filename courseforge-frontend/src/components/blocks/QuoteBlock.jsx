import React, { useRef } from 'react';
import RichTextEditor from '../ui/RichTextEditor';

// ─── Layout options ────────────────────────────────────────────────
// 'below-left'   – author sits bottom-left  (default)
// 'below-right'  – author sits bottom-right
// 'above-left'   – author header above the quote, left-aligned
// 'above-right'  – author header above the quote, right-aligned
// 'inline-left'  – author on same row as the quote mark, left side
// 'inline-right' – author on same row as the quote mark, right side

const LAYOUTS = [
    { value: 'below-left', label: '↙ Below left' },
    { value: 'below-right', label: '↘ Below right' },
    { value: 'above-left', label: '↖ Above left' },
    { value: 'above-right', label: '↗ Above right' },
    { value: 'inline-left', label: '← Inline left' },
    { value: 'inline-right', label: '→ Inline right' },
];

// ─── Tiny toolbar shown on hover ───────────────────────────────────
function Toolbar({ block, onUpdate, fileInputRef }) {
    const layout = block.layout || 'below-left';
    const hasBg = Boolean(block.bgImage);
    const overlay = block.bgOverlay ?? 0.45;

    return (
        <div className="qb-toolbar">
            {/* Layout picker */}
            <label className="qb-toolbar__label">Author position</label>
            <select
                className="qb-toolbar__select"
                value={layout}
                onChange={(e) => onUpdate(block.id, { layout: e.target.value })}
            >
                {LAYOUTS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                ))}
            </select>

            <div className="qb-toolbar__divider" />

            {/* Background image */}
            <label className="qb-toolbar__label">Background</label>
            <div className="qb-toolbar__row">
                <button
                    className="qb-toolbar__btn"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {hasBg ? '⇄ Change image' : '＋ Add image'}
                </button>
                {hasBg && (
                    <button
                        className="qb-toolbar__btn qb-toolbar__btn--danger"
                        onClick={() => onUpdate(block.id, { bgImage: null })}
                    >
                        ✕ Remove
                    </button>
                )}
            </div>

            {/* Overlay opacity – only when bg is set */}
            {hasBg && (
                <>
                    <label className="qb-toolbar__label">
                        Overlay opacity — {Math.round(overlay * 100)}%
                    </label>
                    <input
                        type="range" min="0" max="1" step="0.05"
                        value={overlay}
                        className="qb-toolbar__range"
                        onChange={(e) =>
                            onUpdate(block.id, { bgOverlay: parseFloat(e.target.value) })
                        }
                    />
                </>
            )}
        </div>
    );
}

// ─── Author field ───────────────────────────────────────────────────
function AuthorField({ block, onUpdate, hasBg }) {
    return (
        <input
            className={`qb-author ${hasBg ? 'qb-author--on-image' : ''}`}
            value={block.author || ''}
            onChange={(e) => onUpdate(block.id, { author: e.target.value })}
            placeholder="— Author Name"
        />
    );
}

// ─── Main component ─────────────────────────────────────────────────
export default function QuoteBlock({ block, onUpdate }) {
    const fileInputRef = useRef(null);
    const layout = block.layout || 'below-left';
    const hasBg = Boolean(block.bgImage);
    const overlay = block.bgOverlay ?? 0.45;

    // Convert uploaded file → base-64 data URL stored in block state
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onUpdate(block.id, { bgImage: ev.target.result });
        reader.readAsDataURL(file);
        e.target.value = '';            // allow re-selecting the same file
    };

    // ── build wrapper styles ──────────────────────────────────────────
    const wrapperStyle = hasBg
        ? {
            backgroundImage: `url(${block.bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
        }
        : {};

    // ── derive flex direction from layout ────────────────────────────
    const isAbove = layout.startsWith('above');
    const isInline = layout.startsWith('inline');
    const isRight = layout.endsWith('right');

    const editorAndAuthor = (
        <>
            {/* Large decorative quote mark */}
            {isInline ? (
                <div className={`qb-inline ${isRight ? 'qb-inline--right' : 'qb-inline--left'}`}>
                    <span className={`qb-quotemark ${hasBg ? 'qb-quotemark--on-image' : ''}`}>"</span>
                    <AuthorField block={block} onUpdate={onUpdate} hasBg={hasBg} />
                </div>
            ) : (
                <span className={`qb-quotemark ${hasBg ? 'qb-quotemark--on-image' : ''}`}>"</span>
            )}

            <RichTextEditor
                value={block.content}
                onChange={(val) => onUpdate(block.id, { content: val })}
                placeholder="Enter quote text…"
                style={{
                    flex: 1,
                    minHeight: '80px',
                    border: 'none',
                    background: 'transparent',
                    color: hasBg ? '#fff' : 'inherit',
                }}
            />

            {!isInline && (
                <div className={`qb-author-wrap ${isRight ? 'qb-author-wrap--right' : 'qb-author-wrap--left'}`}>
                    <AuthorField block={block} onUpdate={onUpdate} hasBg={hasBg} />
                </div>
            )}
        </>
    );

    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <div className={`cf-quote-block cf-quote-block--${layout} ${hasBg ? 'cf-quote-block--has-bg' : ''}`}
                style={wrapperStyle}>

                {/* Dark scrim when background image is active */}
                {hasBg && (
                    <div
                        className="qb-scrim"
                        style={{ backgroundColor: `rgba(0,0,0,${overlay})` }}
                    />
                )}

                <div className={`qb-inner ${isAbove ? 'qb-inner--col-reverse' : 'qb-inner--col'}`}>
                    {editorAndAuthor}
                </div>

                <Toolbar block={block} onUpdate={onUpdate} fileInputRef={fileInputRef} />
            </div>

            <style>{CSS}</style>
        </>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────
const CSS = `
  /* ── wrapper ── */
  .cf-quote-block {
    position: relative;
    border-left: 4px solid #8b1a1a;
    border-radius: 0 8px 8px 0;
    margin: 1rem 0;
    background: #fff5f5;
    overflow: hidden;
    transition: box-shadow .2s;
  }
  .cf-quote-block:hover {
    box-shadow: 0 4px 20px rgba(139,26,26,.15);
  }
  .cf-quote-block--has-bg {
    border-left: none;
    border-radius: 8px;
    min-height: 140px;
  }

  /* ── scrim ── */
  .qb-scrim {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
  }

  /* ── inner content ── */
  .qb-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: .35rem;
    padding: 1rem 1rem .6rem;
  }
  .qb-inner--col-reverse { flex-direction: column-reverse; }

  /* ── decorative quote mark ── */
  .qb-quotemark {
    display: block;
    font-size: 3.5rem;
    line-height: .6;
    color: #c0807080;
    font-family: Georgia, serif;
    user-select: none;
    margin-bottom: .15rem;
  }
  .qb-quotemark--on-image {
    color: rgba(255,255,255,.6);
  }

  /* ── inline layout helper ── */
  .qb-inline {
    display: flex;
    align-items: center;
    gap: .75rem;
  }
  .qb-inline--right { flex-direction: row-reverse; }

  /* ── author ── */
  .qb-author-wrap { display: flex; }
  .qb-author-wrap--left  { justify-content: flex-start; }
  .qb-author-wrap--right { justify-content: flex-end; }

  .qb-author {
    border: none;
    background: transparent;
    outline: none;
    font-size: .875rem;
    color: #8b6060;
    font-weight: 600;
    font-family: Georgia, serif;
    font-style: italic;
    width: auto;
    min-width: 120px;
    max-width: 100%;
    padding: 0;
    transition: color .2s;
  }
  .qb-author--on-image {
    color: rgba(255,255,255,.85);
  }
  .qb-author::placeholder { color: #c0a0a0; }
  .qb-author--on-image::placeholder { color: rgba(255,255,255,.4); }

  /* ── toolbar ── */
  .qb-toolbar {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: .4rem;
    padding: .6rem 1rem .75rem;
    background: rgba(139,26,26,.06);
    border-top: 1px solid rgba(139,26,26,.1);
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    transition: opacity .2s, max-height .25s, padding .2s;
  }
  .cf-quote-block--has-bg .qb-toolbar {
    background: rgba(0,0,0,.35);
    border-top: 1px solid rgba(255,255,255,.1);
  }
  .cf-quote-block:hover .qb-toolbar {
    opacity: 1;
    max-height: 200px;
  }

  .qb-toolbar__label {
    font-size: .7rem;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: #8b4040;
    margin-top: .25rem;
  }
  .cf-quote-block--has-bg .qb-toolbar__label { color: rgba(255,255,255,.6); }

  .qb-toolbar__select {
    font-size: .8rem;
    padding: .25rem .5rem;
    border: 1px solid #d4a0a0;
    border-radius: 4px;
    background: #fff;
    color: #5a2020;
    cursor: pointer;
    width: fit-content;
  }

  .qb-toolbar__divider {
    height: 1px;
    background: rgba(139,26,26,.12);
    margin: .15rem 0;
  }

  .qb-toolbar__row {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
  }

  .qb-toolbar__btn {
    font-size: .78rem;
    padding: .28rem .65rem;
    border: 1px solid #c08080;
    border-radius: 4px;
    background: #fff;
    color: #8b1a1a;
    cursor: pointer;
    transition: background .15s;
  }
  .qb-toolbar__btn:hover { background: #fde8e8; }
  .qb-toolbar__btn--danger { color: #b00; border-color: #e08080; }
  .qb-toolbar__btn--danger:hover { background: #ffd5d5; }

  .qb-toolbar__range {
    width: 100%;
    accent-color: #8b1a1a;
  }
`;