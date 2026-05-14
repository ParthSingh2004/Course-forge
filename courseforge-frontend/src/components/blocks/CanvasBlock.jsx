import React, { useState, useRef, useEffect } from 'react';
import {
    Trash2, Square, Circle, Triangle, Type,
    Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURAL SOLUTIONS SUMMARY
//
// 1. LAYERING (Z-INDEX):
//    Each item stores an explicit `zIndex`. Bring Forward / Send Backward swap
//    values with the nearest neighbour in z-space. Bring to Front / Send to
//    Back jump to max+1 / min-1. The sorted render order is derived each frame
//    from item data — no manual DOM reordering needed.
//
// 2. TRIANGLE BOUNDING BOX:
//    The wrapper div for triangles carries `pointerEvents: 'none'`, making its
//    invisible rectangular corners completely click-transparent. The inner SVG
//    carries `pointerEvents: 'all'`, restoring interactivity only on the actual
//    rendered polygon pixels (SVG hit-testing ignores transparent areas by
//    default). Resize handles inside the wrapper also carry `pointerEvents:
//    'all'` so they remain individually reachable.
//
// 3. RESIZE DISCREPANCIES:
//    Text boxes are dragged via a dedicated grip bar, leaving the <textarea>
//    free for user interaction. Resizing a text box adjusts width/height in %
//    and the text naturally reflows inside the fixed container (no font scaling).
//    Shapes resize by stretching their CSS dimensions; the SVG triangle uses
//    preserveAspectRatio="none" so it visually fills the bounding box at any
//    aspect ratio. Both paths are driven by the same handle logic, keeping
//    the delta math unified.
//
// 4. STATE BLOAT & PERFORMANCE:
//    During drag, position/size updates are throttled through
//    requestAnimationFrame (~60fps) and only update LOCAL React state — the
//    parent's `onUpdate` callback is NEVER called during mouse movement.
//    onUpdate fires exactly ONCE on mouseUp, with the fully-committed item
//    array. Non-drag mutations (add, delete, color change, z-order) call
//    onUpdate immediately since they are infrequent discrete events.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid = () => `_${Math.random().toString(36).slice(2, 9)}`;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '255,255,255';
};

// ─── Font families ────────────────────────────────────────────────────────────
const FONT_FAMILIES = [
    { label: 'DM Sans (default)', value: 'inherit' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
    { label: 'Impact', value: 'Impact, Haettenschweiler, sans-serif' },
    { label: 'Palatino', value: '"Palatino Linotype", Palatino, serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
];

// ─── Palette & factories ──────────────────────────────────────────────────────
const PALETTE = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
    '#111827', '#6b7280',
];
let _ci = 0;
const nextColor = () => PALETTE[_ci++ % 8]; // cycle only through vivid colours

const DEFAULT_SIZES = { rect: [22, 16], circle: [16, 16], triangle: [20, 18], text: [28, 14] };

const makeItem = (type, zIndex) => {
    const [w, h] = DEFAULT_SIZES[type];
    const isText = type === 'text';
    return {
        id: uid(), type, zIndex,
        x: 8 + Math.random() * 30,
        y: 8 + Math.random() * 30,
        w, h,
        rotation: 0,
        color: isText ? '#111827' : nextColor(),
        text: isText ? 'Text box' : '',
        // ── Typography (text items only) ──────────────────────────────────
        fontSize: isText ? 16 : undefined,
        fontFamily: isText ? 'inherit' : undefined,
        fontWeight: isText ? 'normal' : undefined,
        fontStyle: isText ? 'normal' : undefined,
        textDecoration: isText ? 'none' : undefined,
        textAlign: isText ? 'left' : undefined,
        lineHeight: isText ? 1.5 : undefined,
        letterSpacing: isText ? 0 : undefined,
        // ── Box background ────────────────────────────────────────────────
        boxBg: isText ? '#ffffff' : undefined,
        boxBgOpacity: isText ? 0 : undefined, // 0–100
    };
};

// ─── Resize handle descriptors (4 corners) ────────────────────────────────────
const HANDLES = [
    { id: 'nw', px: 0, py: 0, cursor: 'nwse-resize' },
    { id: 'ne', px: 100, py: 0, cursor: 'nesw-resize' },
    { id: 'se', px: 100, py: 100, cursor: 'nwse-resize' },
    { id: 'sw', px: 0, py: 100, cursor: 'nesw-resize' },
];

// ─── Shared handle renderer ───────────────────────────────────────────────────
function ResizeHandles({ onResizeMouseDown, extraStyle = {} }) {
    return HANDLES.map(h => (
        <div
            key={h.id}
            onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, h.id); }}
            style={{
                position: 'absolute',
                left: `${h.px}%`, top: `${h.py}%`,
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10,
                background: '#ffffff',
                border: '2px solid #3b82f6',
                borderRadius: 2,
                cursor: h.cursor,
                zIndex: 9999,
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                ...extraStyle,
            }}
        />
    ));
}

// ─── ItemElement ──────────────────────────────────────────────────────────────
function ItemElement({ item, isSelected, onMoveMouseDown, onResizeMouseDown, onTextChange }) {
    const { type, x, y, w, h, color, zIndex, text, fontSize } = item;

    const baseStyle = {
        position: 'absolute',
        left: `${x}%`, top: `${y}%`,
        width: `${w}%`, height: `${h}%`,
        zIndex,
        boxSizing: 'border-box',
        transform: `rotate(${item.rotation || 0}deg)`,
        transformOrigin: '50% 50%',
    };

    // ── Triangle: Fix #2 — wrapper is pointer-dead; SVG is pointer-alive ───────
    if (type === 'triangle') {
        return (
            <div style={{ ...baseStyle, pointerEvents: 'none' }}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"   // Fix #3 — stretches to fill bounding box
                    width="100%"
                    height="100%"
                    style={{ display: 'block', pointerEvents: 'all', cursor: 'move', overflow: 'visible' }}
                    onMouseDown={(e) => onMoveMouseDown(e, item)}
                >
                    <polygon points="50,0 100,100 0,100" fill={color} />
                    {isSelected && (
                        <polygon
                            points="50,0 100,100 0,100"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            vectorEffect="non-scaling-stroke"
                        />
                    )}
                </svg>
                {/* Fix #2 — handles re-enable pointer events individually */}
                {isSelected && (
                    <ResizeHandles
                        onResizeMouseDown={onResizeMouseDown}
                        extraStyle={{ pointerEvents: 'all' }}
                    />
                )}
            </div>
        );
    }

    // ── Text box: Fix #3 — grip bar drags; textarea edits freely ─────────────
    if (type === 'text') {
        return (
            <div style={{
                ...baseStyle,
                border: isSelected ? '2px solid #3b82f6' : '1.5px dashed #9ca3af',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.05)',
                pointerEvents: 'all',
            }}>
                {/* Drag-only grip — Fix #3: text and drag are separate zones */}
                <div
                    onMouseDown={(e) => onMoveMouseDown(e, item)}
                    style={{
                        height: 18,
                        background: isSelected ? '#3b82f6' : '#e5e7eb',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        userSelect: 'none',
                    }}
                >
                    <div style={{
                        display: 'flex', gap: 3,
                    }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{
                                width: 3, height: 3, borderRadius: '50%',
                                background: isSelected ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                            }} />
                        ))}
                    </div>
                </div>
                {/* Textarea: Fix #3 — text reflows on width resize naturally */}
                <textarea
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Type here…"
                    style={{
                        flex: 1, border: 'none', outline: 'none', resize: 'none',
                        background: 'transparent', fontFamily: "'DM Sans', 'Roboto', sans-serif",
                        fontSize: `${fontSize}px`,
                        color, padding: '4px 6px',
                        wordWrap: 'break-word', lineHeight: 1.5, cursor: 'text',
                        overflowY: 'auto',
                    }}
                />
                {isSelected && <ResizeHandles onResizeMouseDown={onResizeMouseDown} />}
            </div>
        );
    }

    // ── Rect / Circle ─────────────────────────────────────────────────────────
    return (
        <div
            onMouseDown={(e) => onMoveMouseDown(e, item)}
            style={{
                ...baseStyle,
                pointerEvents: 'all',
                cursor: 'move',
                outline: isSelected ? '2px solid #3b82f6' : 'none',
                outlineOffset: 2,
            }}
        >
            <div style={{
                width: '100%', height: '100%',
                background: color,
                borderRadius: type === 'circle' ? '50%' : 4,
            }} />
            {isSelected && <ResizeHandles onResizeMouseDown={onResizeMouseDown} />}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InfographicBlock({ block, onUpdate }) {

    // ── State ──────────────────────────────────────────────────────────────────
    const [items, setItems] = useState(() => block?.items || []);
    const [selectedId, setSelectedId] = useState(null);
    const [canvasBg, setCanvasBg] = useState(block?.canvasBg || '#ffffff');

    // ── Refs ───────────────────────────────────────────────────────────────────
    const canvasRef = useRef(null);
    const draggingRef = useRef(null);     // drag/resize state (lives outside React)
    const rafRef = useRef(null);     // RAF handle for throttling
    const onUpdateRef = useRef(onUpdate); // always-fresh onUpdate pointer
    const itemsRef = useRef(items);    // mirror for use inside mouseUp closure
    const canvasBgRef = useRef(canvasBg);

    useEffect(() => { onUpdateRef.current = onUpdate; });
    // Keep refs in sync with state so mouseUp closures see current values
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { canvasBgRef.current = canvasBg; }, [canvasBg]);

    // ── Window-level drag/resize listeners ─────────────────────────────────────
    // Fix #4: setItems throttled via RAF; onUpdate fires ONLY on mouseUp.
    useEffect(() => {
        const onMouseMove = (e) => {
            const drag = draggingRef.current;
            if (!drag || !canvasRef.current) return;

            const { canvasRect, startMouseX, startMouseY, startItem, mode, handle } = drag;
            const dx = ((e.clientX - startMouseX) / canvasRect.width) * 100;
            const dy = ((e.clientY - startMouseY) / canvasRect.height) * 100;
            const si = startItem;

            let patch;
            if (mode === 'move') {
                patch = {
                    x: clamp(si.x + dx, 0, 100 - si.w),
                    y: clamp(si.y + dy, 0, 100 - si.h),
                };
            } else {
                // Resize — Fix #3: unified delta math for all item types
                let { x, y, w, h } = si;
                if (handle.includes('e')) w = clamp(si.w + dx, 5, 100 - si.x);
                if (handle.includes('s')) h = clamp(si.h + dy, 5, 100 - si.y);
                if (handle.includes('w')) {
                    const nw = clamp(si.w - dx, 5, si.x + si.w);
                    x = si.x + si.w - nw; w = nw;
                }
                if (handle.includes('n')) {
                    const nh = clamp(si.h - dy, 5, si.y + si.h);
                    y = si.y + si.h - nh; h = nh;
                }
                patch = { x, y, w, h };
            }

            drag.latestPatch = patch;

            // Fix #4: RAF throttle keeps React renders at ≤60fps during drag
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                setItems(prev =>
                    prev.map(it => it.id === drag.itemId ? { ...it, ...patch } : it)
                );
            });
        };

        const onMouseUp = () => {
            const drag = draggingRef.current;
            if (!drag) return;

            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

            if (drag.latestPatch) {
                const { itemId, latestPatch } = drag;
                // Compute final items synchronously inside the updater,
                // then mirror to ref for the onUpdate call below.
                let finalItems;
                setItems(prev => {
                    finalItems = prev.map(it => it.id === itemId ? { ...it, ...latestPatch } : it);
                    itemsRef.current = finalItems; // keep ref hot
                    return finalItems;
                });
                // Fix #4: ONE onUpdate call after the full drag completes
                setTimeout(() => {
                    onUpdateRef.current?.(block?.id, {
                        items: itemsRef.current,
                        canvasBg: canvasBgRef.current,
                    });
                }, 0);
            }

            draggingRef.current = null;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [block?.id]);

    // ── Helper: commit state and notify parent (for non-drag mutations) ─────────
    const commitItems = (updated) => {
        setItems(updated);
        itemsRef.current = updated;
        onUpdateRef.current?.(block?.id, { items: updated, canvasBg: canvasBgRef.current });
    };

    const commitCanvasBg = (bg) => {
        setCanvasBg(bg);
        canvasBgRef.current = bg;
        onUpdateRef.current?.(block?.id, { items: itemsRef.current, canvasBg: bg });
    };

    // ── Item mutators ─────────────────────────────────────────────────────────
    const addItem = (type) => {
        const maxZ = items.length ? Math.max(...items.map(i => i.zIndex)) : 0;
        const item = makeItem(type, maxZ + 1);
        commitItems([...items, item]);
        setSelectedId(item.id);
    };

    const patchItem = (id, patch) => {
        commitItems(items.map(it => it.id === id ? { ...it, ...patch } : it));
    };

    const deleteItem = (id) => {
        commitItems(items.filter(it => it.id !== id));
        setSelectedId(null);
    };

    // ── Z-index controls — Fix #1 ──────────────────────────────────────────────
    const bringToFront = (id) => {
        const maxZ = Math.max(...items.map(i => i.zIndex));
        patchItem(id, { zIndex: maxZ + 1 });
    };

    const sendToBack = (id) => {
        const minZ = Math.min(...items.map(i => i.zIndex));
        patchItem(id, { zIndex: minZ - 1 });
    };

    const bringForward = (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const above = items
            .filter(i => i.zIndex > item.zIndex)
            .sort((a, b) => a.zIndex - b.zIndex)[0];
        if (!above) return;
        commitItems(items.map(i => {
            if (i.id === id) return { ...i, zIndex: above.zIndex };
            if (i.id === above.id) return { ...i, zIndex: item.zIndex };
            return i;
        }));
    };

    const sendBackward = (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        const below = items
            .filter(i => i.zIndex < item.zIndex)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
        if (!below) return;
        commitItems(items.map(i => {
            if (i.id === id) return { ...i, zIndex: below.zIndex };
            if (i.id === below.id) return { ...i, zIndex: item.zIndex };
            return i;
        }));
    };

    // ── Canvas event handlers ──────────────────────────────────────────────────
    const handleMoveMouseDown = (e, item) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(item.id);
        draggingRef.current = {
            itemId: item.id,
            mode: 'move',
            handle: null,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startItem: { ...item },
            canvasRect: canvasRef.current.getBoundingClientRect(),
            latestPatch: null,
        };
    };

    const handleResizeMouseDown = (e, item, handle) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(item.id);
        draggingRef.current = {
            itemId: item.id,
            mode: 'resize',
            handle,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startItem: { ...item },
            canvasRect: canvasRef.current.getBoundingClientRect(),
            latestPatch: null,
        };
    };

    const handleCanvasMouseDown = (e) => {
        if (e.target === canvasRef.current || e.target.dataset.grid) {
            setSelectedId(null);
        }
    };

    // ── Derived ────────────────────────────────────────────────────────────────
    const selectedItem = items.find(i => i.id === selectedId);
    const sortedItems = [...items].sort((a, b) => a.zIndex - b.zIndex);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            overflow: 'hidden',
            fontFamily: "'DM Sans', 'Roboto', sans-serif",
            userSelect: 'none',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        }}>

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div style={{
                background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                padding: '10px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <span style={{
                    color: '#111827', fontWeight: 700, fontSize: '0.8rem',
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                }}>
                    🗺 Infographic Block
                </span>
                <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''} ·{' '}
                    drag to move · corners to resize · click canvas to deselect
                </span>
            </div>

            {/* ── Body ──────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', height: 520 }}>

                {/* Canvas column */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Canvas */}
                    <div
                        ref={canvasRef}
                        onMouseDown={handleCanvasMouseDown}
                        style={{
                            flex: 1,
                            position: 'relative',
                            background: canvasBg,
                            overflow: 'hidden',
                            cursor: 'default',
                        }}
                    >
                        {/* Subtle dot grid overlay (pointer-dead) */}
                        <div
                            data-grid="true"
                            style={{
                                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                                backgroundImage: 'radial-gradient(circle, rgba(120,120,140,0.18) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />

                        {/* Items */}
                        {sortedItems.map(item => (
                            <ItemElement
                                key={item.id}
                                item={item}
                                isSelected={item.id === selectedId}
                                onMoveMouseDown={handleMoveMouseDown}
                                onResizeMouseDown={(e, handle) => handleResizeMouseDown(e, item, handle)}
                                onTextChange={(text) => patchItem(item.id, { text })}
                            />
                        ))}

                        {/* Empty state */}
                        {items.length === 0 && (
                            <div style={{
                                position: 'absolute', inset: 0, pointerEvents: 'none',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 10, color: '#9ca3af',
                            }}>
                                <div style={{ fontSize: '2.2rem', opacity: 0.6 }}>🖼</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                    Add shapes and text boxes using the toolbar below
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div style={{
                        height: 50, background: '#ffffff', borderTop: '1px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
                        flexShrink: 0,
                    }}>
                        {[
                            { type: 'rect', label: 'Rectangle', Icon: Square },
                            { type: 'circle', label: 'Circle', Icon: Circle },
                            { type: 'triangle', label: 'Triangle', Icon: Triangle },
                            { type: 'text', label: 'Text Box', Icon: Type },
                        ].map(({ type, label, Icon }) => (
                            <ToolbarButton key={type} onClick={() => addItem(type)} Icon={Icon} label={label} />
                        ))}

                        {/* Canvas BG picker */}
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: 600 }}>Canvas BG</span>
                            <input
                                type="color"
                                value={canvasBg}
                                onChange={e => commitCanvasBg(e.target.value)}
                                title="Canvas background color"
                                style={{
                                    width: 30, height: 30, padding: 2,
                                    border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Right sidebar ─────────────────────────────────────────── */}
                <div style={{
                    width: 224, background: '#f9fafb', borderLeft: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column',
                    padding: 16, gap: 16, overflowY: 'auto', flexShrink: 0,
                }}>
                    {selectedItem ? (
                        <SelectedPanel
                            item={selectedItem}
                            onPatch={(patch) => patchItem(selectedItem.id, patch)}
                            onDelete={() => deleteItem(selectedItem.id)}
                            onBringForward={() => bringForward(selectedItem.id)}
                            onSendBackward={() => sendBackward(selectedItem.id)}
                            onBringToFront={() => bringToFront(selectedItem.id)}
                            onSendToBack={() => sendToBack(selectedItem.id)}
                        />
                    ) : (
                        <EmptyPanel />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── SelectedPanel ─────────────────────────────────────────────────────────────
function SelectedPanel({ item, onPatch, onDelete, onBringForward, onSendBackward, onBringToFront, onSendToBack }) {
    const typeLabel = { rect: 'Rectangle', circle: 'Circle', triangle: 'Triangle', text: 'Text Box' }[item.type];

    return (
        <>
            {/* Type heading */}
            <div style={{
                color: '#111827', fontSize: '0.75rem',
                fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
                {typeLabel}
            </div>

            {/* Color */}
            <div>
                <Label>{item.type === 'text' ? 'Text Color' : 'Fill Color'}</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input
                        type="color"
                        value={item.color}
                        onChange={e => onPatch({ color: e.target.value })}
                        style={{
                            width: 34, height: 34, border: '1px solid #e5e7eb',
                            borderRadius: 6, cursor: 'pointer', padding: 2,
                        }}
                    />
                    <span style={{ color: '#6b7280', fontSize: '0.7rem', fontVariantNumeric: 'tabular-nums' }}>
                        {item.color}
                    </span>
                </div>
                {/* Quick palette */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {PALETTE.map(c => (
                        <div
                            key={c}
                            onClick={() => onPatch({ color: c })}
                            title={c}
                            style={{
                                width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer',
                                border: c === item.color ? '2px solid #111827' : '2px solid transparent',
                                boxSizing: 'border-box', flexShrink: 0,
                                transition: 'transform 0.1s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        />
                    ))}
                </div>
            </div>

            {/* Font size — text items only */}
            {item.type === 'text' && (
                <div>
                    <Label>Font Size — {item.fontSize}px</Label>
                    <input
                        type="range" min="8" max="60"
                        value={item.fontSize}
                        onChange={e => onPatch({ fontSize: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#3b82f6' }}
                    />
                </div>
            )}

            {/* Position & size — X/Y read-only, W/H typable */}
            <div>
                <Label>Position &amp; Size</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {/* X — read-only */}
                    {[['X', item.x], ['Y', item.y]].map(([lbl, val]) => (
                        <div key={lbl}>
                            <span style={{ color: '#9ca3af', fontSize: '0.6rem', display: 'block', marginBottom: 2 }}>
                                {lbl}
                            </span>
                            <div style={{
                                background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 5,
                                padding: '4px 6px', color: '#374151', fontSize: '0.7rem',
                                textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                            }}>
                                {val.toFixed(1)}%
                            </div>
                        </div>
                    ))}
                    {/* W — typable */}
                    <div>
                        <span style={{ color: '#9ca3af', fontSize: '0.6rem', display: 'block', marginBottom: 2 }}>W</span>
                        <input
                            type="number" min="5" max="100" step="0.5"
                            value={parseFloat(item.w.toFixed(1))}
                            onChange={e => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) onPatch({ w: clamp(v, 5, 100 - item.x) });
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: '#ffffff', border: '1px solid #bfdbfe',
                                borderRadius: 5, padding: '4px 6px',
                                color: '#1d4ed8', fontSize: '0.7rem',
                                textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                                outline: 'none',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 2px #bfdbfe'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                    </div>
                    {/* H — typable */}
                    <div>
                        <span style={{ color: '#9ca3af', fontSize: '0.6rem', display: 'block', marginBottom: 2 }}>H</span>
                        <input
                            type="number" min="5" max="100" step="0.5"
                            value={parseFloat(item.h.toFixed(1))}
                            onChange={e => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) onPatch({ h: clamp(v, 5, 100 - item.y) });
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: '#ffffff', border: '1px solid #bfdbfe',
                                borderRadius: 5, padding: '4px 6px',
                                color: '#1d4ed8', fontSize: '0.7rem',
                                textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                                outline: 'none',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 2px #bfdbfe'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                    </div>
                </div>
            </div>

            {/* Rotation */}
            <div>
                <Label>Rotation — {item.rotation || 0}°</Label>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={() => onPatch({ rotation: ((item.rotation || 0) + 90) % 360 })}
                        title="Rotate 90° clockwise"
                        style={{
                            flex: 1, background: '#ffffff', border: '1px solid #e5e7eb',
                            borderRadius: 5, padding: '6px 4px',
                            cursor: 'pointer', color: '#374151',
                            fontSize: '0.68rem', fontWeight: 600,
                            transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    >
                        ↻ Rotate 90°
                    </button>
                    {(item.rotation || 0) !== 0 && (
                        <button
                            onClick={() => onPatch({ rotation: 0 })}
                            title="Reset rotation"
                            style={{
                                background: '#ffffff', border: '1px solid #e5e7eb',
                                borderRadius: 5, padding: '6px 8px',
                                cursor: 'pointer', color: '#6b7280',
                                fontSize: '0.68rem', fontWeight: 600,
                                transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                        >
                            ↺ Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Z-index / layer order — Fix #1 */}
            <div>
                <Label>Layer Order</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                        { label: '↑ Forward', action: onBringForward, title: 'Bring Forward one layer' },
                        { label: '↓ Backward', action: onSendBackward, title: 'Send Backward one layer' },
                        { label: '⤒ Front', action: onBringToFront, title: 'Bring to very front' },
                        { label: '⤓ Back', action: onSendToBack, title: 'Send to very back' },
                    ].map(({ label, action, title }) => (
                        <button
                            key={title}
                            onClick={action}
                            title={title}
                            style={{
                                background: '#ffffff', border: '1px solid #e5e7eb',
                                borderRadius: 5, padding: '6px 4px',
                                cursor: 'pointer', color: '#374151',
                                fontSize: '0.65rem', fontWeight: 600,
                                transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.62rem', marginTop: 5, textAlign: 'center' }}>
                    z-index: {item.zIndex}
                </div>
            </div>

            {/* Delete */}
            <button
                onClick={onDelete}
                style={{
                    marginTop: 'auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: '#ffffff', border: '1px solid #fca5a5',
                    borderRadius: 6, padding: '8px 12px',
                    cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600,
                    transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            >
                <Trash2 style={{ width: 14, height: 14 }} /> Delete Item
            </button>
        </>
    );
}

// ─── EmptyPanel ───────────────────────────────────────────────────────────────
function EmptyPanel() {
    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: '#6b7280', fontSize: '0.75rem',
            textAlign: 'center', gap: 12, padding: '0 4px',
        }}>
            <div style={{ fontSize: '2rem', opacity: 0.5 }}>🖱️</div>
            <span style={{ lineHeight: 1.6 }}>Select an item on the canvas to configure it</span>
            <div style={{
                marginTop: 4, color: '#9ca3af', fontSize: '0.68rem',
                lineHeight: 1.8, textAlign: 'left', width: '100%',
                background: '#ffffff', borderRadius: 6,
                border: '1px solid #e5e7eb', padding: '10px 12px',
            }}>
                <div>🔷 <strong>Click</strong> to select</div>
                <div>↔ <strong>Drag</strong> shape to move</div>
                <div>⊡ <strong>Drag corner</strong> to resize</div>
                <div>✦ <strong>Drag grip bar</strong> to move text</div>
                <div>⌨ <strong>Type</strong> directly in text box</div>
                <div>⤒ <strong>Layer buttons</strong> to reorder</div>
            </div>
        </div>
    );
}

// ─── ToolbarButton ────────────────────────────────────────────────────────────
function ToolbarButton({ onClick, Icon, label }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#f9fafb', border: '1px solid #d1d5db',
                borderRadius: 6, padding: '5px 10px',
                cursor: 'pointer', color: '#374151',
                fontSize: '0.72rem', fontWeight: 600,
                flexShrink: 0, transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#1d4ed8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; }}
        >
            <Icon style={{ width: 13, height: 13 }} />
            {label}
        </button>
    );
}

// ─── Label ────────────────────────────────────────────────────────────────────
function Label({ children }) {
    return (
        <div style={{
            color: '#4b5563', fontSize: '0.65rem',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 6, fontWeight: 700,
        }}>
            {children}
        </div>
    );
}