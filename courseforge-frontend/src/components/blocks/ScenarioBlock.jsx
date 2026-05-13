import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, Trash2, Image as ImageIcon,
    AlertTriangle, MessageSquare, X, Move,
} from 'lucide-react';

// ─── Utilities ───────────────────────────────────────────────────────────────
const uid = () => `_${Math.random().toString(36).slice(2, 9)}`;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '255,255,255';
}

// ─── Action metadata ──────────────────────────────────────────────────────────
const ACTION_META = {
    next: { label: 'Advance to next slide', border: '#22c55e', badgeBg: '#dcfce7', badgeText: '#166534' },
    error: { label: 'Send to Error slide', border: '#ef4444', badgeBg: '#fee2e2', badgeText: '#991b1b' },
    restart: { label: 'Restart from slide 1', border: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#92400e' },
    static: { label: 'Static dialogue only', border: '#64748b', badgeBg: '#e2e8f0', badgeText: '#475569' },
};

// ─── Factories ────────────────────────────────────────────────────────────────
const makeSlide = (isError = false) => ({
    id: uid(),
    isErrorSlide: !!isError,
    imageSrc: null,
    dialogues: isError
        ? [{ id: uid(), text: 'Try again', x: 50, y: 75, action: 'restart' }]
        : [],
});

const makeDialogue = (isError = false) => ({
    id: uid(),
    text: 'Click here',
    x: 30 + Math.random() * 40,
    y: 30 + Math.random() * 40,
    action: isError ? 'restart' : 'next',
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function SpatialScenarioBlock({ block, onUpdate }) {

    // ── State ──────────────────────────────────────────────────────────────
    const [slides, setSlides] = useState(() =>
        block?.slides?.length >= 2
            ? block.slides
            : [makeSlide(false), makeSlide(true)]
    );
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedDialogueId, setSelectedDialogueId] = useState(null);

    // ── Refs ───────────────────────────────────────────────────────────────
    const canvasRef = useRef(null);
    const draggingRef = useRef(null);
    const onUpdateRef = useRef(onUpdate);
    useEffect(() => { onUpdateRef.current = onUpdate; });

    // ── Sync to parent on every slide mutation ─────────────────────────────
    useEffect(() => {
        if (onUpdateRef.current) {
            onUpdateRef.current(block?.id || 'temp-id', { slides });
        }
    }, [slides, block?.id]);

    // ── Global drag handlers (window-level to prevent "escape") ───────────
    useEffect(() => {
        const onMouseMove = (e) => {
            if (!draggingRef.current || !canvasRef.current) return;
            const { dialogueId, slideIndex } = draggingRef.current;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 97);
            const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 94);
            setSlides(prev => prev.map((s, i) =>
                i !== slideIndex ? s : {
                    ...s,
                    dialogues: s.dialogues.map(d => d.id === dialogueId ? { ...d, x, y } : d),
                }
            ));
        };

        const onMouseUp = () => { draggingRef.current = null; };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    // ── Mutators ───────────────────────────────────────────────────────────
    const patchSlide = (index, patch) =>
        setSlides(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));

    const addSlide = () => {
        setSlides(prev => {
            const error = prev[prev.length - 1];
            return [...prev.slice(0, -1), makeSlide(false), error];
        });
        setActiveIndex(slides.length - 1);
    };

    const deleteSlide = (index) => {
        if (slides[index].isErrorSlide) return;
        setSlides(prev => prev.filter((_, i) => i !== index));
        setActiveIndex(prev => {
            if (prev === index) return Math.max(0, index - 1);
            if (prev > index) return prev - 1;
            return prev;
        });
        setSelectedDialogueId(null);
    };

    const addDialogue = () => {
        const d = makeDialogue(slides[activeIndex].isErrorSlide);
        patchSlide(activeIndex, { dialogues: [...slides[activeIndex].dialogues, d] });
        setSelectedDialogueId(d.id);
    };

    const updateDialogue = (dialogueId, patch) =>
        patchSlide(activeIndex, {
            dialogues: slides[activeIndex].dialogues.map(d =>
                d.id === dialogueId ? { ...d, ...patch } : d
            ),
        });

    const deleteDialogue = (dialogueId) => {
        patchSlide(activeIndex, {
            dialogues: slides[activeIndex].dialogues.filter(d => d.id !== dialogueId),
        });
        setSelectedDialogueId(null);
    };

    const handleBgUpload = (e) => {
        if (!e.target.files?.[0]) return;
        const reader = new FileReader();
        reader.onloadend = () => patchSlide(activeIndex, { imageSrc: reader.result });
        reader.readAsDataURL(e.target.files[0]);
        e.target.value = '';
    };

    const handleDialogueMouseDown = (e, dialogueId) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedDialogueId(dialogueId);
        draggingRef.current = { dialogueId, slideIndex: activeIndex };
    };

    // ── Derived ────────────────────────────────────────────────────────────
    const activeSlide = slides[activeIndex];
    const selectedDialogue = activeSlide?.dialogues.find(d => d.id === selectedDialogueId);
    const availableActions = activeSlide?.isErrorSlide ? ['restart', 'static'] : ['next', 'error', 'static'];
    const sceneCount = slides.filter(s => !s.isErrorSlide).length;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            overflow: 'hidden',
            fontFamily: "'DM Sans', 'Roboto', sans-serif",
            userSelect: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={{
                background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                padding: '10px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <span style={{ color: '#111827', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    🎭 Spatial Scenario
                </span>
                <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>
                    {sceneCount} scene{sceneCount !== 1 ? 's' : ''} + error slide · drag boxes to reposition
                </span>
            </div>

            <div style={{ display: 'flex', height: 480 }}>

                {/* ── Left: Slides strip ─────────────────────────────────── */}
                <div style={{
                    width: 128,
                    background: '#f9fafb',
                    borderRight: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column',
                    overflowY: 'auto',
                    padding: '6px 0',
                    gap: 0,
                }}>
                    {slides.map((slide, idx) => (
                        <div
                            key={slide.id}
                            onClick={() => { setActiveIndex(idx); setSelectedDialogueId(null); }}
                            style={{
                                position: 'relative',
                                margin: '4px 8px',
                                borderRadius: 6,
                                border: idx === activeIndex
                                    ? `2px solid ${slide.isErrorSlide ? '#ef4444' : '#3b82f6'}`
                                    : '2px solid #e5e7eb',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                aspectRatio: '16/9',
                                background: '#ffffff',
                                flexShrink: 0,
                                transition: 'border-color 0.15s',
                            }}
                        >
                            {/* Thumbnail image */}
                            {slide.imageSrc
                                ? <img src={slide.imageSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {slide.isErrorSlide
                                            ? <AlertTriangle style={{ width: 14, height: 14, color: '#ef4444' }} />
                                            : <ImageIcon style={{ width: 14, height: 14, color: '#9ca3af' }} />
                                        }
                                    </div>
                                )
                            }

                            {/* Dialogue count dots */}
                            {slide.dialogues.length > 0 && (
                                <div style={{ position: 'absolute', top: 3, left: 3, display: 'flex', gap: 2 }}>
                                    {slide.dialogues.slice(0, 5).map(d => (
                                        <div key={d.id} style={{
                                            width: 5, height: 5, borderRadius: '50%',
                                            background: ACTION_META[d.action]?.border || '#ffffff',
                                            boxShadow: '0 0 2px rgba(0,0,0,0.5)'
                                        }} />
                                    ))}
                                </div>
                            )}

                            {/* Label bar */}
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                background: slide.isErrorSlide ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.85)',
                                color: slide.isErrorSlide ? '#ffffff' : '#374151', 
                                fontSize: '0.55rem', textAlign: 'center',
                                padding: '2px 0', fontWeight: 700, letterSpacing: '0.06em',
                                borderTop: slide.isErrorSlide ? 'none' : '1px solid #e5e7eb'
                            }}>
                                {slide.isErrorSlide ? '⚠ ERROR' : `SCENE ${idx + 1}`}
                            </div>

                            {/* Delete button */}
                            {!slide.isErrorSlide && slides.length > 2 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                                    style={{
                                        position: 'absolute', top: 2, right: 2,
                                        width: 16, height: 16, borderRadius: 4,
                                        background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb',
                                        cursor: 'pointer', color: '#ef4444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <X style={{ width: 10, height: 10 }} />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add scene */}
                    <button
                        onClick={addSlide}
                        style={{
                            margin: '2px 8px 6px',
                            padding: '6px 0',
                            background: '#ffffff',
                            border: '1px dashed #d1d5db',
                            borderRadius: 6, cursor: 'pointer',
                            color: '#4b5563', fontSize: '0.65rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            flexShrink: 0, transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = '#ffffff'; }}
                    >
                        <Plus style={{ width: 12, height: 12 }} /> Add Scene
                    </button>
                </div>

                {/* ── Centre: Canvas ─────────────────────────────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                    {/* Image canvas */}
                    <div
                        ref={canvasRef}
                        onClick={() => setSelectedDialogueId(null)}
                        style={{
                            flex: 1,
                            position: 'relative',
                            background: activeSlide?.imageSrc ? '#ffffff' : '#f3f4f6',
                            overflow: 'hidden',
                            cursor: 'default',
                        }}
                    >
                        {/* Background image */}
                        {activeSlide?.imageSrc ? (
                            <img
                                src={activeSlide.imageSrc}
                                alt=""
                                draggable={false}
                                style={{
                                    position: 'absolute', inset: 0,
                                    width: '100%', height: '100%',
                                    objectFit: 'cover',
                                    pointerEvents: 'none',
                                }}
                            />
                        ) : (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 10,
                            }}>
                                {activeSlide?.isErrorSlide
                                    ? <AlertTriangle style={{ width: 36, height: 36, color: '#f87171', opacity: 0.8 }} />
                                    : <ImageIcon style={{ width: 36, height: 36, color: '#9ca3af' }} />
                                }
                                <span style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: 500 }}>
                                    {activeSlide?.isErrorSlide ? 'Upload an error screen background' : 'Upload a background image'}
                                </span>
                            </div>
                        )}

                        {/* Error slide tint overlay */}
                        {activeSlide?.isErrorSlide && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(239,68,68,0.05)',
                                pointerEvents: 'none',
                                borderTop: '2px solid #ef4444',
                            }} />
                        )}

                        {/* Dialogue boxes */}
                        {activeSlide?.dialogues.map(d => {
                            const meta = ACTION_META[d.action] ?? ACTION_META.next;
                            const isSelected = d.id === selectedDialogueId;
                            return (
                                <div
                                    key={d.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDialogueId(d.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: `${d.x}%`,
                                        top: `${d.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: isSelected ? 10 : 5,
                                        cursor: 'grab',
                                        minWidth: 100,
                                        maxWidth: 180,
                                    }}
                                >
                                    {/* Box */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.95)',
                                        border: `2px solid ${isSelected ? '#3b82f6' : meta.border}`,
                                        borderRadius: 8,
                                        padding: '6px 10px 8px',
                                        backdropFilter: 'blur(8px)',
                                        boxShadow: isSelected
                                            ? `0 0 0 3px rgba(59,130,246,0.15), 0 8px 20px rgba(0,0,0,0.12)`
                                            : `0 4px 12px rgba(0,0,0,0.08)`,
                                        transition: 'border-color 0.12s, box-shadow 0.12s',
                                    }}>
                                        {/* Top row: drag handle + action badge */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'space-between', marginBottom: 6, gap: 6,
                                        }}>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => handleDialogueMouseDown(e, d.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 20, height: 20, border: 'none',
                                                    background: '#f3f4f6', borderRadius: 4,
                                                    padding: 0, cursor: 'grab', color: '#6b7280',
                                                    flexShrink: 0, transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
                                                title="Drag to reposition"
                                            >
                                                <Move style={{ width: 12, height: 12 }} />
                                            </button>
                                            <span style={{
                                                background: meta.badgeBg,
                                                color: meta.badgeText,
                                                fontSize: '0.55rem', fontWeight: 700,
                                                padding: '2px 6px', borderRadius: 4,
                                                letterSpacing: '0.05em', textTransform: 'uppercase',
                                                flexShrink: 0,
                                            }}>
                                                {d.action === 'static' ? 'dialogue' : d.action}
                                            </span>
                                        </div>
                                        {/* Text */}
                                        {isSelected ? (
                                            <textarea
                                                value={d.text}
                                                onChange={(e) => updateDialogue(d.id, { text: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                rows={3}
                                                placeholder="Enter dialogue text"
                                                style={{
                                                    width: '100%',
                                                    background: 'rgba(0,0,0,0.03)',
                                                    border: '1px solid rgba(0,0,0,0.08)',
                                                    borderRadius: 6,
                                                    color: '#111827',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    lineHeight: 1.4,
                                                    wordBreak: 'break-word',
                                                    resize: 'none',
                                                    outline: 'none',
                                                    padding: '6px 8px',
                                                    boxSizing: 'border-box',
                                                    fontFamily: 'inherit',
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                color: '#111827',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                lineHeight: 1.4,
                                                wordBreak: 'break-word',
                                                padding: '2px 4px'
                                            }}>
                                                {d.text}
                                            </div>
                                        )}
                                    </div>
                                    {/* Pointer triangle */}
                                    <div style={{
                                        width: 0, height: 0,
                                        borderLeft: '6px solid transparent',
                                        borderRight: '6px solid transparent',
                                        borderTop: `6px solid ${isSelected ? '#3b82f6' : meta.border}`,
                                        margin: '0 auto',
                                        transition: 'border-top-color 0.12s',
                                        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.05))'
                                    }} />
                                </div>
                            );
                        })}
                    </div>

                    {/* Canvas toolbar */}
                    <div style={{
                        height: 48, background: '#ffffff', borderTop: '1px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10,
                    }}>
                        {/* Upload BG */}
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: '#f9fafb', border: '1px solid #d1d5db',
                            borderRadius: 6, padding: '6px 12px',
                            cursor: 'pointer', color: '#4b5563', fontSize: '0.75rem', fontWeight: 600,
                            flexShrink: 0, transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; }}
                        >
                            <ImageIcon style={{ width: 14, height: 14 }} />
                            {activeSlide?.imageSrc ? 'Change BG' : 'Upload BG'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
                        </label>

                        {/* Add dialogue */}
                        <button
                            onClick={addDialogue}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: '#eff6ff', border: '1px solid #bfdbfe',
                                borderRadius: 6, padding: '6px 12px',
                                cursor: 'pointer', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 600,
                                flexShrink: 0, transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
                        >
                            <MessageSquare style={{ width: 14, height: 14 }} />
                            Add Box
                        </button>

                        {/* Error slide notice */}
                        {activeSlide?.isErrorSlide && (
                            <span style={{
                                marginLeft: 'auto',
                                background: '#fef2f2', border: '1px solid #fecaca',
                                borderRadius: 6, padding: '4px 10px',
                                color: '#b91c1c', fontSize: '0.7rem', fontWeight: 600,
                                flexShrink: 0,
                            }}>
                                ⚠ Error Slide — shown on wrong choices
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Right: Dialogue config ─────────────────────────────── */}
                <div style={{
                    width: 220,
                    background: '#f9fafb',
                    borderLeft: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column',
                    padding: 16, gap: 16,
                    overflowY: 'auto',
                }}>
                    {selectedDialogue ? (
                        <>
                            {/* Section heading */}
                            <div style={{ color: '#111827', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                                Dialogue Box
                            </div>

                            {/* Button text */}
                            <div>
                                <Label>Box Text</Label>
                                <textarea
                                    value={selectedDialogue.text}
                                    onChange={e => updateDialogue(selectedDialogue.id, { text: e.target.value })}
                                    rows={3}
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        background: '#ffffff', border: '1px solid #d1d5db',
                                        borderRadius: 6, color: '#111827', fontSize: '0.8rem',
                                        padding: '8px 10px', resize: 'none', outline: 'none',
                                        fontFamily: 'inherit', lineHeight: 1.4,
                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.2)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.05)'; }}
                                />
                            </div>

                            {/* Action */}
                            <div>
                                <Label>On Click</Label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {availableActions.map(action => {
                                        const meta = ACTION_META[action];
                                        const isActive = selectedDialogue.action === action;
                                        return (
                                            <button
                                                key={action}
                                                onClick={() => updateDialogue(selectedDialogue.id, { action })}
                                                style={{
                                                    padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                                                    border: `1px solid ${isActive ? meta.border : '#e5e7eb'}`,
                                                    background: isActive ? `rgba(${hexToRgb(meta.border)},0.08)` : '#ffffff',
                                                    color: isActive ? '#111827' : '#4b5563',
                                                    fontSize: '0.75rem', fontWeight: isActive ? 600 : 500,
                                                    textAlign: 'left', transition: 'all 0.15s',
                                                    boxShadow: isActive ? 'none' : '0 1px 2px rgba(0,0,0,0.02)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.border }} />
                                                    {meta.label}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Position readout */}
                            <div>
                                <Label>Position (% of canvas)</Label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['x', 'y'].map(axis => (
                                        <div key={axis} style={{ flex: 1 }}>
                                            <span style={{ color: '#6b7280', fontSize: '0.65rem', display: 'block', marginBottom: 4 }}>
                                                {axis.toUpperCase()}
                                            </span>
                                            <div style={{
                                                background: '#ffffff', border: '1px solid #e5e7eb',
                                                borderRadius: 6, padding: '6px 8px',
                                                color: '#374151', fontSize: '0.75rem', textAlign: 'center',
                                                fontVariantNumeric: 'tabular-nums', fontWeight: 500
                                            }}>
                                                {selectedDialogue[axis].toFixed(1)}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Delete */}
                            <button
                                onClick={() => deleteDialogue(selectedDialogue.id)}
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
                                <Trash2 style={{ width: 14, height: 14 }} /> Delete Box
                            </button>
                        </>
                    ) : (
                        /* Empty state */
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#6b7280', fontSize: '0.75rem',
                            textAlign: 'center', gap: 12, padding: '0 8px',
                        }}>
                            <MessageSquare style={{ width: 32, height: 32, color: '#d1d5db' }} />
                            <span style={{ lineHeight: 1.5 }}>
                                Select a dialogue box on the canvas to configure it
                            </span>
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                                {Object.entries(ACTION_META).map(([action, meta]) => (
                                    <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px', background: '#ffffff', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.border, flexShrink: 0 }} />
                                        <span style={{ color: '#4b5563', fontSize: '0.68rem', textAlign: 'left', fontWeight: 500 }}>{meta.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Small helper component ───────────────────────────────────────────────────
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
