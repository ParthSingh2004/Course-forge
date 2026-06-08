import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

import {
    Trash2, Square, Circle, Triangle, Type,
    Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Image as ImageIcon, Copy, Shapes,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURAL SOLUTIONS SUMMARY
//
// 1. LAYERING (Z-INDEX): Each item stores an explicit `zIndex`.
// 2. TRIANGLE BOUNDING BOX: pointer-events trick for click-transparent corners.
// 3. RESIZE DISCREPANCIES: unified delta math for all item types.
// 4. STATE BLOAT & PERFORMANCE: RAF-throttled drag, onUpdate fires once on mouseUp.
// 5. FREE ROTATION: mode:'rotate' in drag state machine, atan2 angle math.
// 6. STROKE/BORDER: strokeColor + strokeWidth on non-text items.
// 7. TEXT BOX BG: boxBg + boxBgOpacity + boxBorderRadius wired in authoring & runtime.
// 8. DUPLICATE: duplicateItem() + Ctrl+D shortcut.
// 9. EXTENDED SHAPES: SHAPE_PATHS map drives generic SVG renderer.
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
    { label: 'Roboto', value: 'Roboto, sans-serif' },
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
const nextColor = () => PALETTE[_ci++ % 8];

// ─── Extended shape SVG paths (viewBox 0 0 100 100) ──────────────────────────
// Each entry: { points | path } — polygon points string OR SVG path d string.
const SHAPE_PATHS = {
    // Right-pointing chevron arrow
    'arrow-right': {
        type: 'path',
        d: 'M10,30 L65,30 L65,15 L90,50 L65,85 L65,70 L10,70 Z',
    },
    // 5-pointed star
    'star': {
        type: 'polygon',
        points: '50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35',
    },
    // Flat-top hexagon
    'hexagon': {
        type: 'polygon',
        points: '50,2 93,26 93,74 50,98 7,74 7,26',
    },
    // Diamond / rhombus
    'diamond': {
        type: 'polygon',
        points: '50,2 98,50 50,98 2,50',
    },
    // Regular pentagon
    'pentagon': {
        type: 'polygon',
        points: '50,3 97,36 79,95 21,95 3,36',
    },
    // Speech bubble (rounded rect with bottom-left tail)
    'speech-bubble': {
        type: 'path',
        d: 'M10,10 Q10,2 18,2 L82,2 Q90,2 90,10 L90,62 Q90,70 82,70 L38,70 L20,88 L24,70 L18,70 Q10,70 10,62 Z',
    },
    // Up-pointing arrow
    'arrow-up': {
        type: 'path',
        d: 'M30,90 L30,45 L15,45 L50,10 L85,45 L70,45 L70,90 Z',
    },
    // Cylinder-like parallelogram banner
    'banner': {
        type: 'path',
        d: 'M5,20 L95,20 Q98,50 95,80 L5,80 Q2,50 5,20 Z',
    },
};

const SHAPE_TYPE_LABELS = {
    rect: 'Rectangle', circle: 'Circle', triangle: 'Triangle',
    text: 'Text Box', image: 'Image',
    'arrow-right': 'Arrow →', 'arrow-up': 'Arrow ↑',
    star: 'Star', hexagon: 'Hexagon', diamond: 'Diamond',
    pentagon: 'Pentagon', 'speech-bubble': 'Speech Bubble', banner: 'Banner',
};

const DEFAULT_SIZES = {
    rect: [22, 16], circle: [16, 16], triangle: [20, 18],
    text: [28, 14], image: [30, 25],
    'arrow-right': [24, 16], 'arrow-up': [16, 22],
    star: [18, 18], hexagon: [18, 20], diamond: [16, 20],
    pentagon: [18, 20], 'speech-bubble': [26, 20], banner: [30, 16],
};

const makeItem = (type, zIndex) => {
    const [w, h] = DEFAULT_SIZES[type] || [20, 16];
    const isText = type === 'text';
    return {
        id: uid(), type, zIndex,
        x: 8 + Math.random() * 30,
        y: 8 + Math.random() * 30,
        w, h,
        rotation: 0,
        color: isText ? '#111827' : nextColor(),
        text: isText ? 'Text box' : '',
        animation: 'none',
        animationDelay: 0,
        // ── Typography (text items only) ──────────────────────────────────
        fontSize: isText ? 16 : undefined,
        fontFamily: isText ? 'inherit' : undefined,
        fontWeight: isText ? 'normal' : undefined,
        fontStyle: isText ? 'normal' : undefined,
        textDecoration: isText ? 'none' : undefined,
        textAlign: isText ? 'left' : undefined,
        lineHeight: isText ? 1.5 : undefined,
        letterSpacing: isText ? 0 : undefined,
        // ── Box background (text items) ───────────────────────────────────
        boxBg: isText ? '#ffffff' : undefined,
        boxBgOpacity: isText ? 0 : undefined,       // 0–100
        boxBorderRadius: isText ? 4 : undefined,    // px
        // ── Stroke / border (non-text, non-image items) ───────────────────
        strokeColor: (!isText && type !== 'image') ? '#111827' : undefined,
        strokeWidth: (!isText && type !== 'image') ? 0 : undefined,
        // ── Image ─────────────────────────────────────────────────────────
        src: type === 'image' ? '' : undefined,
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

// ─── Rotation handle ─────────────────────────────────────────────────────────
function RotationHandle({ onRotateMouseDown, extraStyle = {} }) {
    return (
        <div
            onMouseDown={(e) => { e.stopPropagation(); onRotateMouseDown(e); }}
            title="Drag to rotate"
            style={{
                position: 'absolute',
                left: '50%',
                top: -26,
                transform: 'translateX(-50%)',
                width: 14, height: 14,
                background: '#ffffff',
                border: '2px solid #3b82f6',
                borderRadius: '50%',
                cursor: 'grab',
                zIndex: 9999,
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...extraStyle,
            }}
        >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
        </div>
    );
}

// ─── Generic SVG shape renderer (for SHAPE_PATHS types) ──────────────────────
function SvgShape({ item, isSelected, onMoveMouseDown, onResizeMouseDown, onRotateMouseDown }) {
    const def = SHAPE_PATHS[item.type];
    const strokeProps = item.strokeWidth > 0
        ? { stroke: item.strokeColor || '#111827', strokeWidth: item.strokeWidth, vectorEffect: 'non-scaling-stroke' }
        : { stroke: 'none' };

    const baseStyle = {
        position: 'absolute',
        left: `${item.x}%`, top: `${item.y}%`,
        width: `${item.w}%`, height: `${item.h}%`,
        zIndex: item.zIndex,
        boxSizing: 'border-box',
        transform: `rotate(${item.rotation || 0}deg)`,
        transformOrigin: '50% 50%',
        pointerEvents: 'none',
    };

    return (
        <div style={baseStyle}>
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                width="100%" height="100%"
                style={{ display: 'block', pointerEvents: 'all', cursor: 'move', overflow: 'visible', filter: 'drop-shadow(0px 4px 6px rgba(17,24,39,0.12))' }}
                onMouseDown={(e) => onMoveMouseDown(e, item)}
            >
                {def.type === 'polygon' ? (
                    <polygon
                        points={def.points}
                        fill={item.color}
                        {...strokeProps}
                    />
                ) : (
                    <path
                        d={def.d}
                        fill={item.color}
                        {...strokeProps}
                    />
                )}
                {isSelected && (
                    def.type === 'polygon' ? (
                        <polygon
                            points={def.points}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            vectorEffect="non-scaling-stroke"
                        />
                    ) : (
                        <path
                            d={def.d}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            vectorEffect="non-scaling-stroke"
                        />
                    )
                )}
            </svg>
            {isSelected && (
                <>
                    <ResizeHandles onResizeMouseDown={onResizeMouseDown} extraStyle={{ pointerEvents: 'all' }} />
                    <RotationHandle onRotateMouseDown={onRotateMouseDown} extraStyle={{ pointerEvents: 'all' }} />
                </>
            )}
        </div>
    );
}

// ─── ItemElement ──────────────────────────────────────────────────────────────
function ItemElement({ item, isSelected, onMoveMouseDown, onResizeMouseDown, onRotateMouseDown, onTextChange, canvasRef, onHeightChange }) {
    const { type, x, y, w, h, color, zIndex, text, fontSize } = item;

    const textareaRef = useRef(null);
    const wrapperRef = useRef(null);

    // Auto-expand textarea and measure height
    useEffect(() => {
        if (type !== 'text') return;

        const textarea = textareaRef.current;
        const wrapper = wrapperRef.current;
        const canvas = canvasRef?.current;
        if (!textarea || !wrapper || !canvas) return;

        const updateHeights = () => {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;

            const canvasRect = canvas.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();
            if (canvasRect.height > 0) {
                const calculatedH = (wrapperRect.height / canvasRect.height) * 100;
                if (Math.abs(item.h - calculatedH) > 0.2) {
                    onHeightChange(item.id, { h: calculatedH });
                }
            }
        };

        updateHeights();

        const resizeObserver = new ResizeObserver(() => {
            updateHeights();
        });

        resizeObserver.observe(wrapper);
        resizeObserver.observe(canvas);

        return () => {
            resizeObserver.disconnect();
        };
    }, [text, item.w, fontSize, item.fontFamily, item.lineHeight, canvasRef, type, onHeightChange, item.h, item.id]);

    const baseStyle = {
        position: 'absolute',
        left: `${x}%`, top: `${y}%`,
        width: `${w}%`,
        height: type === 'text' ? 'auto' : `${h}%`,
        zIndex,
        boxSizing: 'border-box',
        transform: `rotate(${item.rotation || 0}deg)`,
        transformOrigin: '50% 50%',
    };

    // ── Extended SVG shapes ───────────────────────────────────────────────────
    if (SHAPE_PATHS[type]) {
        return (
            <SvgShape
                item={item}
                isSelected={isSelected}
                onMoveMouseDown={onMoveMouseDown}
                onResizeMouseDown={onResizeMouseDown}
                onRotateMouseDown={onRotateMouseDown}
            />
        );
    }

    // ── Triangle ──────────────────────────────────────────────────────────────
    if (type === 'triangle') {
        const strokeProps = item.strokeWidth > 0
            ? { stroke: item.strokeColor || '#111827', strokeWidth: item.strokeWidth, vectorEffect: 'non-scaling-stroke' }
            : { stroke: 'none' };
        return (
            <div style={{ ...baseStyle, pointerEvents: 'none' }}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    width="100%"
                    height="100%"
                    style={{ display: 'block', pointerEvents: 'all', cursor: 'move', overflow: 'visible', filter: 'drop-shadow(0px 4px 6px rgba(17,24,39,0.15)) drop-shadow(0px 1px 3px rgba(17,24,39,0.08))' }}
                    onMouseDown={(e) => onMoveMouseDown(e, item)}
                >
                    <polygon points="50,0 100,100 0,100" fill={color} {...strokeProps} />
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
                {isSelected && (
                    <>
                        <ResizeHandles onResizeMouseDown={onResizeMouseDown} extraStyle={{ pointerEvents: 'all' }} />
                        <RotationHandle onRotateMouseDown={onRotateMouseDown} extraStyle={{ pointerEvents: 'all' }} />
                    </>
                )}
            </div>
        );
    }

    // ── Text box ──────────────────────────────────────────────────────────────
    if (type === 'text') {
        const bgRgb = item.boxBg ? hexToRgb(item.boxBg) : '255,255,255';
        const bgOpacity = (item.boxBgOpacity ?? 0) / 100;
        const boxBackground = bgOpacity > 0
            ? `rgba(${bgRgb},${bgOpacity})`
            : 'transparent';

        return (
            <div
                ref={wrapperRef}
                style={{
                    ...baseStyle,
                    border: isSelected ? '2px solid #3b82f6' : '1.5px dashed #9ca3af',
                    borderRadius: item.boxBorderRadius ?? 4,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: boxBackground,
                    pointerEvents: 'all',
                }}
            >
                {/* Drag-only grip */}
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
                    <div style={{ display: 'flex', gap: 3 }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{
                                width: 3, height: 3, borderRadius: '50%',
                                background: isSelected ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                            }} />
                        ))}
                    </div>
                </div>
                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Type here…"
                    style={{
                        width: '100%', border: 'none', outline: 'none', resize: 'none',
                        background: 'transparent',
                        fontFamily: item.fontFamily === 'inherit' || !item.fontFamily ? "'DM Sans', 'Roboto', sans-serif" : item.fontFamily,
                        fontSize: `${fontSize}px`,
                        color, padding: '4px 6px',
                        wordWrap: 'break-word',
                        lineHeight: item.lineHeight || 1.5,
                        fontWeight: item.fontWeight || 'normal',
                        fontStyle: item.fontStyle || 'normal',
                        textDecoration: item.textDecoration || 'none',
                        textAlign: item.textAlign || 'left',
                        cursor: 'text',
                        overflow: 'hidden',
                        height: 'auto',
                    }}
                />
                {isSelected && <ResizeHandles onResizeMouseDown={onResizeMouseDown} />}
                {isSelected && <RotationHandle onRotateMouseDown={onRotateMouseDown} />}
            </div>
        );
    }

    // ── Image ──────────────────────────────────────────────────────────────────
    if (type === 'image') {
        const strokeBorder = item.strokeWidth > 0
            ? `${item.strokeWidth}px solid ${item.strokeColor || '#111827'}`
            : 'none';
        return (
            <div
                onMouseDown={(e) => onMoveMouseDown(e, item)}
                style={{
                    ...baseStyle,
                    pointerEvents: 'all',
                    cursor: 'move',
                    outline: isSelected ? '2px solid #3b82f6' : 'none',
                    outlineOffset: 2,
                    border: strokeBorder,
                    boxSizing: 'border-box',
                    borderRadius: item.strokeWidth > 0 ? 4 : 0,
                }}
            >
                <img
                    src={item.src}
                    alt="Canvas"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        display: 'block',
                    }}
                />
                {isSelected && <ResizeHandles onResizeMouseDown={onResizeMouseDown} />}
                {isSelected && <RotationHandle onRotateMouseDown={onRotateMouseDown} />}
            </div>
        );
    }

    // ── Rect / Circle ─────────────────────────────────────────────────────────
    const strokeBorder = item.strokeWidth > 0
        ? `${item.strokeWidth}px solid ${item.strokeColor || '#111827'}`
        : '1px solid rgba(17, 24, 39, 0.08)';

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
                boxShadow: '0 4px 10px rgba(17, 24, 39, 0.15), 0 1px 4px rgba(17, 24, 39, 0.08)',
                border: strokeBorder,
                boxSizing: 'border-box',
            }} />
            {isSelected && <ResizeHandles onResizeMouseDown={onResizeMouseDown} />}
            {isSelected && <RotationHandle onRotateMouseDown={onRotateMouseDown} />}
        </div>
    );
}

// ─── Shape Picker Popover ─────────────────────────────────────────────────────
function ShapePickerPopover({ onAdd, onClose }) {
    const groups = [
        {
            label: 'Basic',
            shapes: [
                { type: 'rect', label: 'Rect', icon: '▭' },
                { type: 'circle', label: 'Circle', icon: '●' },
                { type: 'triangle', label: 'Triangle', icon: '▲' },
            ],
        },
        {
            label: 'Extended',
            shapes: [
                { type: 'diamond', label: 'Diamond', icon: '◆' },
                { type: 'hexagon', label: 'Hexagon', icon: '⬡' },
                { type: 'pentagon', label: 'Pentagon', icon: '⬠' },
                { type: 'star', label: 'Star', icon: '★' },
                { type: 'arrow-right', label: 'Arrow →', icon: '➜' },
                { type: 'arrow-up', label: 'Arrow ↑', icon: '⬆' },
                { type: 'speech-bubble', label: 'Speech', icon: '💬' },
                { type: 'banner', label: 'Banner', icon: '⬭' },
            ],
        },
    ];

    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
                position: 'absolute',
                bottom: 54, left: 0,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                padding: '12px 14px',
                zIndex: 10000,
                minWidth: 240,
                fontFamily: "'DM Sans', 'Roboto', sans-serif",
            }}
        >
            {groups.map(g => (
                <div key={g.label} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>
                        {g.label}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {g.shapes.map(s => (
                            <button
                                key={s.type}
                                onClick={() => { onAdd(s.type); onClose(); }}
                                title={s.label}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: 3, width: 52, height: 52,
                                    background: '#f9fafb', border: '1px solid #e5e7eb',
                                    borderRadius: 8, cursor: 'pointer',
                                    fontSize: '1.3rem', color: '#374151',
                                    transition: 'all 0.12s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                            >
                                <span>{s.icon}</span>
                                <span style={{ fontSize: '0.55rem', fontWeight: 600, color: '#6b7280', letterSpacing: '0.03em' }}>{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
const CanvasBlock = forwardRef(({ block, onUpdate, isSlide = false, selectedId: externalSelectedId, onSelectId: externalSetSelectedId }, ref) => {

    // ── State ──────────────────────────────────────────────────────────────────
    const [items, setItems] = useState(() => block?.items || []);
    const [localSelectedId, setLocalSelectedId] = useState(null);
    const selectedId = externalSelectedId !== undefined ? externalSelectedId : localSelectedId;
    const setSelectedId = externalSetSelectedId !== undefined ? externalSetSelectedId : setLocalSelectedId;
    const [canvasBg, setCanvasBg] = useState(block?.canvasBg || '#ffffff');

    // ── Refs ───────────────────────────────────────────────────────────────────
    const canvasRef = useRef(null);
    const draggingRef = useRef(null);
    const rafRef = useRef(null);
    const onUpdateRef = useRef(onUpdate);
    const itemsRef = useRef(items);
    const canvasBgRef = useRef(canvasBg);
    const imageInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const maxZ = items.length ? Math.max(...items.map(i => i.zIndex)) : 0;
            const item = { ...makeItem('image', maxZ + 1), src: dataUrl };
            commitItems([...items, item]);
            setSelectedId(item.id);
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    useEffect(() => { onUpdateRef.current = onUpdate; });
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { canvasBgRef.current = canvasBg; }, [canvasBg]);

    // ── Ctrl+D keyboard shortcut for duplicate; Backspace/Delete to remove ──────
    useEffect(() => {
        const onKeyDown = (e) => {
            // Don't intercept keys while typing in an input/textarea/contenteditable
            const tag = document.activeElement?.tagName;
            const isEditing =
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                document.activeElement?.isContentEditable;

            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                const sel = selectedId;
                if (!sel) return;
                e.preventDefault();
                duplicateItem(sel);
            }

            if (!isEditing && (e.key === 'Backspace' || e.key === 'Delete')) {
                const sel = selectedId;
                if (!sel) return;
                e.preventDefault();
                deleteItem(sel);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, items]);

    // ── Window-level drag/resize/rotate listeners ──────────────────────────────
    useEffect(() => {
        const onMouseMove = (e) => {
            const drag = draggingRef.current;
            if (!drag || !canvasRef.current) return;

            const { canvasRect, startMouseX, startMouseY, startItem, mode, handle } = drag;

            if (mode === 'rotate') {
                // Compute center of item in screen pixels
                const canvasEl = canvasRef.current;
                const cRect = canvasEl.getBoundingClientRect();
                const centerX = cRect.left + (startItem.x + startItem.w / 2) / 100 * cRect.width;
                const centerY = cRect.top + (startItem.y + startItem.h / 2) / 100 * cRect.height;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
                const patch = { rotation: ((angle % 360) + 360) % 360 };
                drag.latestPatch = patch;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = requestAnimationFrame(() => {
                    setItems(prev => prev.map(it => it.id === drag.itemId ? { ...it, ...patch } : it));
                });
                return;
            }

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
                let { x, y, w, h } = si;
                const isText = si.type === 'text';
                if (handle.includes('e')) w = clamp(si.w + dx, 5, 100 - si.x);
                if (!isText && handle.includes('s')) h = clamp(si.h + dy, 5, 100 - si.y);
                if (handle.includes('w')) {
                    const nw = clamp(si.w - dx, 5, si.x + si.w);
                    x = si.x + si.w - nw; w = nw;
                }
                if (!isText && handle.includes('n')) {
                    const nh = clamp(si.h - dy, 5, si.y + si.h);
                    y = si.y + si.h - nh; h = nh;
                }
                patch = isText ? { x, w } : { x, y, w, h };
            }

            drag.latestPatch = patch;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                setItems(prev => prev.map(it => it.id === drag.itemId ? { ...it, ...patch } : it));
            });
        };

        const onMouseUp = () => {
            const drag = draggingRef.current;
            if (!drag) return;

            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

            if (drag.latestPatch) {
                const { itemId, latestPatch } = drag;
                let finalItems;
                setItems(prev => {
                    finalItems = prev.map(it => it.id === itemId ? { ...it, ...latestPatch } : it);
                    itemsRef.current = finalItems;
                    return finalItems;
                });
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

    // ── Helper: commit state ───────────────────────────────────────────────────
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

    const duplicateItem = (id) => {
        const source = itemsRef.current.find(i => i.id === id);
        if (!source) return;
        const maxZ = itemsRef.current.length ? Math.max(...itemsRef.current.map(i => i.zIndex)) : 0;
        const clone = {
            ...source,
            id: uid(),
            x: Math.min(source.x + 2, 100 - source.w),
            y: Math.min(source.y + 2, 100 - source.h),
            zIndex: maxZ + 1,
        };
        const updated = [...itemsRef.current, clone];
        commitItems(updated);
        setSelectedId(clone.id);
    };

    // ── Z-index controls ───────────────────────────────────────────────────────
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
        const above = items.filter(i => i.zIndex > item.zIndex).sort((a, b) => a.zIndex - b.zIndex)[0];
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
        const below = items.filter(i => i.zIndex < item.zIndex).sort((a, b) => b.zIndex - a.zIndex)[0];
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

    const handleRotateMouseDown = (e, item) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(item.id);
        draggingRef.current = {
            itemId: item.id,
            mode: 'rotate',
            handle: null,
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

    useImperativeHandle(ref, () => ({
        addItem,
        patchItem,
        deleteItem,
        duplicateItem,
        bringForward,
        sendBackward,
        bringToFront,
        sendToBack,
        commitCanvasBg,
        triggerImageUpload: () => imageInputRef.current?.click(),
    }));

    // ── Derived ────────────────────────────────────────────────────────────────
    const selectedItem = items.find(i => i.id === selectedId);
    const sortedItems = [...items].sort((a, b) => a.zIndex - b.zIndex);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={{
            background: '#ffffff',
            border: 'none',
            borderRadius: 0,
            overflow: 'hidden',
            fontFamily: "'DM Sans', 'Roboto', sans-serif",
            userSelect: 'none',
            boxShadow: 'none',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
        }}>



            {/* ── Body ────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flex: 1, height: '100%', minHeight: 0 }}>

                {/* Canvas column */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minHeight: 0 }}>

                    {/* Canvas area — always 16:10 so % positions match SCORM export */}
                    <div style={{
                        flex: 'none',
                        width: '100%',
                        aspectRatio: '16 / 10',
                        position: 'relative',
                    }}>
                        <div
                            ref={canvasRef}
                            onMouseDown={handleCanvasMouseDown}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: canvasBg,
                                overflow: 'hidden',
                                cursor: 'default',
                            }}
                        >
                            {/* Dot grid overlay */}
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
                                    onRotateMouseDown={(e) => handleRotateMouseDown(e, item)}
                                    onTextChange={(text) => patchItem(item.id, { text })}
                                    canvasRef={canvasRef}
                                    onHeightChange={patchItem}
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
                                        Add elements using the sidebar on the left
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hidden image upload input (triggered via ref from sidebar) */}
                    <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                </div>


            </div>
        </div>
    );
});


export default CanvasBlock;


// ─── SelectedPanel ─────────────────────────────────────────────────────────────
function SelectedPanel({ item, onPatch, onDelete, onDuplicate, onBringForward, onSendBackward, onBringToFront, onSendToBack }) {
    const typeLabel = SHAPE_TYPE_LABELS[item.type] || item.type;

    return (
        <>
            {/* Type heading */}
            <div style={{
                color: '#111827', fontSize: '0.75rem',
                fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
                {typeLabel}
            </div>

            {/* Fill Color */}
            {item.type !== 'image' && (
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
            )}

            {/* ── Stroke / Border (non-text items) ──────────────────────────────── */}
            {item.type !== 'text' && (
                <div>
                    <Label>Border / Stroke</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <input
                            type="color"
                            value={item.strokeColor || '#111827'}
                            onChange={e => onPatch({ strokeColor: e.target.value })}
                            style={{ width: 30, height: 30, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                            title="Stroke color"
                        />
                        <span style={{ color: '#6b7280', fontSize: '0.65rem', flex: 1 }}>
                            Width: {item.strokeWidth ?? 0}px
                        </span>
                        <button
                            onClick={() => onPatch({ strokeWidth: 0 })}
                            style={{ fontSize: '0.6rem', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                            title="Remove stroke"
                        >✕</button>
                    </div>
                    <input
                        type="range" min={0} max={12} step={1}
                        value={item.strokeWidth ?? 0}
                        onChange={e => onPatch({ strokeWidth: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#3b82f6' }}
                    />
                </div>
            )}

            {/* ── Text Box Background ───────────────────────────────────────────── */}
            {item.type === 'text' && (
                <div>
                    <Label>Box Background</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <input
                            type="color"
                            value={item.boxBg || '#ffffff'}
                            onChange={e => onPatch({ boxBg: e.target.value })}
                            style={{ width: 30, height: 30, border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                            title="Box background color"
                        />
                        <span style={{ color: '#6b7280', fontSize: '0.65rem' }}>
                            Opacity: {item.boxBgOpacity ?? 0}%
                        </span>
                    </div>
                    <input
                        type="range" min={0} max={100} step={1}
                        value={item.boxBgOpacity ?? 0}
                        onChange={e => onPatch({ boxBgOpacity: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#3b82f6', marginBottom: 8 }}
                    />
                    <Label>Box Corner Radius — {item.boxBorderRadius ?? 4}px</Label>
                    <input
                        type="range" min={0} max={32} step={1}
                        value={item.boxBorderRadius ?? 4}
                        onChange={e => onPatch({ boxBorderRadius: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#3b82f6' }}
                    />
                </div>
            )}

            {/* ── Font family & size (text only) ───────────────────────────────── */}
            {item.type === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                        <Label>Font Family</Label>
                        <select
                            value={item.fontFamily || 'inherit'}
                            onChange={e => onPatch({ fontFamily: e.target.value })}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: '#ffffff', border: '1px solid #e5e7eb',
                                borderRadius: 5, padding: '6px 8px',
                                color: '#374151', fontSize: '0.75rem',
                                outline: 'none',
                            }}
                        >
                            {FONT_FAMILIES.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label>Font Size — {item.fontSize}px</Label>
                        <input
                            type="range" min="8" max="60"
                            value={item.fontSize}
                            onChange={e => onPatch({ fontSize: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: '#3b82f6' }}
                        />
                    </div>
                    {/* Text formatting buttons */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {[
                            { Icon: Bold, prop: 'fontWeight', on: 'bold', off: 'normal' },
                            { Icon: Italic, prop: 'fontStyle', on: 'italic', off: 'normal' },
                            { Icon: Underline, prop: 'textDecoration', on: 'underline', off: 'none' },
                        ].map(({ Icon, prop, on, off }) => (
                            <button
                                key={prop}
                                onClick={() => onPatch({ [prop]: item[prop] === on ? off : on })}
                                style={{
                                    background: item[prop] === on ? '#eff6ff' : '#ffffff',
                                    border: `1px solid ${item[prop] === on ? '#bfdbfe' : '#e5e7eb'}`,
                                    borderRadius: 5, padding: '5px 8px', cursor: 'pointer',
                                    color: item[prop] === on ? '#1d4ed8' : '#374151',
                                }}
                            >
                                <Icon style={{ width: 12, height: 12 }} />
                            </button>
                        ))}
                        {[
                            { Icon: AlignLeft, val: 'left' },
                            { Icon: AlignCenter, val: 'center' },
                            { Icon: AlignRight, val: 'right' },
                        ].map(({ Icon, val }) => (
                            <button
                                key={val}
                                onClick={() => onPatch({ textAlign: val })}
                                style={{
                                    background: item.textAlign === val ? '#eff6ff' : '#ffffff',
                                    border: `1px solid ${item.textAlign === val ? '#bfdbfe' : '#e5e7eb'}`,
                                    borderRadius: 5, padding: '5px 8px', cursor: 'pointer',
                                    color: item.textAlign === val ? '#1d4ed8' : '#374151',
                                }}
                            >
                                <Icon style={{ width: 12, height: 12 }} />
                            </button>
                        ))}
                    </div>
                    <div>
                        <Label>Line Height — {(item.lineHeight || 1.5).toFixed(1)}</Label>
                        <input
                            type="range" min="1" max="3" step="0.1"
                            value={item.lineHeight || 1.5}
                            onChange={e => onPatch({ lineHeight: parseFloat(e.target.value) })}
                            style={{ width: '100%', accentColor: '#3b82f6' }}
                        />
                    </div>
                </div>
            )}

            {/* ── Position & size ───────────────────────────────────────────────── */}
            <div>
                <Label>Position &amp; Size</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
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
                    {/* W */}
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
                                textAlign: 'center', outline: 'none',
                            }}
                        />
                    </div>
                    {/* H */}
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
                                textAlign: 'center', outline: 'none',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Rotation ─────────────────────────────────────────────────────── */}
            <div>
                <Label>Rotation</Label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <input
                        type="number" min="0" max="359" step="1"
                        value={Math.round(item.rotation || 0)}
                        onChange={e => {
                            const v = parseInt(e.target.value);
                            if (!isNaN(v)) onPatch({ rotation: ((v % 360) + 360) % 360 });
                        }}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                            width: 56, background: '#ffffff', border: '1px solid #e5e7eb',
                            borderRadius: 5, padding: '4px 6px',
                            color: '#374151', fontSize: '0.7rem',
                            textAlign: 'center', outline: 'none',
                        }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>deg</span>
                    <button
                        onClick={() => onPatch({ rotation: ((item.rotation || 0) + 90) % 360 })}
                        title="Rotate 90° clockwise"
                        style={{
                            flex: 1, background: '#ffffff', border: '1px solid #e5e7eb',
                            borderRadius: 5, padding: '5px 4px',
                            cursor: 'pointer', color: '#374151',
                            fontSize: '0.68rem', fontWeight: 600,
                            transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    >
                        ↻ +90°
                    </button>
                    {(item.rotation || 0) !== 0 && (
                        <button
                            onClick={() => onPatch({ rotation: 0 })}
                            title="Reset rotation"
                            style={{
                                background: '#ffffff', border: '1px solid #e5e7eb',
                                borderRadius: 5, padding: '5px 6px',
                                cursor: 'pointer', color: '#6b7280',
                                fontSize: '0.68rem', fontWeight: 600,
                                transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                        >
                            ↺
                        </button>
                    )}
                </div>
                <input
                    type="range" min="0" max="359" step="1"
                    value={item.rotation || 0}
                    onChange={e => onPatch({ rotation: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: '#3b82f6' }}
                />
            </div>

            {/* ── Animation ────────────────────────────────────────────────────── */}
            <div>
                <Label>Animation</Label>
                <select
                    value={item.animation || 'none'}
                    onChange={e => onPatch({ animation: e.target.value })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#ffffff', border: '1px solid #e5e7eb',
                        borderRadius: 5, padding: '6px 8px',
                        color: '#374151', fontSize: '0.75rem',
                        outline: 'none', marginBottom: 8,
                    }}
                >
                    <option value="none">None</option>
                    <option value="fade-in">Fade In</option>
                    <option value="slide-in-left">Slide In Left</option>
                    <option value="slide-in-right">Slide In Right</option>
                    <option value="slide-in-up">Slide In Up</option>
                    <option value="slide-in-down">Slide In Down</option>
                    <option value="zoom-in">Zoom In</option>
                    <option value="zoom-out">Zoom Out</option>
                    <option value="flip-in">Flip In</option>
                    <option value="bounce-in">Bounce In</option>
                    <option value="fade-in-up">Fade In Up</option>
                </select>
                {(item.animation || 'none') !== 'none' && (
                    <div>
                        <Label>Animation Delay — {(item.animationDelay || 0).toFixed(1)}s</Label>
                        <input
                            type="range" min="0" max="10" step="0.1"
                            value={item.animationDelay || 0}
                            onChange={e => onPatch({ animationDelay: parseFloat(e.target.value) })}
                            onMouseDown={e => e.stopPropagation()}
                            style={{ width: '100%', accentColor: '#3b82f6' }}
                        />
                    </div>
                )}
            </div>

            {/* ── Layer Order ───────────────────────────────────────────────────── */}
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

            {/* ── Duplicate & Delete ────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <button
                    onClick={onDuplicate}
                    title="Duplicate item (Ctrl+D)"
                    style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        background: '#ffffff', border: '1px solid #d1d5db',
                        borderRadius: 6, padding: '8px 8px',
                        cursor: 'pointer', color: '#374151', fontSize: '0.72rem', fontWeight: 600,
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; e.currentTarget.style.color = '#166534'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; }}
                >
                    <Copy style={{ width: 13, height: 13 }} /> Duplicate
                </button>
                <button
                    onClick={onDelete}
                    style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        background: '#ffffff', border: '1px solid #fca5a5',
                        borderRadius: 6, padding: '8px 8px',
                        cursor: 'pointer', color: '#dc2626', fontSize: '0.72rem', fontWeight: 600,
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                >
                    <Trash2 style={{ width: 13, height: 13 }} /> Delete
                </button>
            </div>
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
                <div>○ <strong>Drag circle</strong> to rotate freely</div>
                <div>✦ <strong>Drag grip bar</strong> to move text</div>
                <div>⌨ <strong>Type</strong> directly in text box</div>
                <div>⌨ <strong>Ctrl+D</strong> to duplicate selected</div>
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