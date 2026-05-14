import React, { useState, useRef, useCallback } from 'react';
import { Trash2, Plus, ChevronDown, GripVertical, Image, Type, X } from 'lucide-react';

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid = () => `_${Math.random().toString(36).slice(2, 9)}`;

const makeTopic = (index) => ({
    id:    uid(),
    title: `Topic ${index}`,
    // Each topic holds an ordered list of content items (text or image)
    items: [],
});

const makeTextItem  = () => ({ id: uid(), type: 'text',  value: '' });
const makeImageItem = () => ({ id: uid(), type: 'image', src: '', alt: '', caption: '' });

// ─── Shared tiny components ────────────────────────────────────────────────────
function IconBtn({ onClick, title, danger = false, children, style = {} }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            title={title}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: hover
                    ? (danger ? '#fef2f2' : '#f3f4f6')
                    : 'transparent',
                color: hover ? (danger ? '#dc2626' : '#111827') : '#6b7280',
                transition: 'all 0.12s', flexShrink: 0,
                ...style,
            }}
        >
            {children}
        </button>
    );
}

// ─── Content item renderers ────────────────────────────────────────────────────
function TextContentItem({ item, onChange, onDelete }) {
    return (
        <div style={{ position: 'relative' }}>
            <textarea
                value={item.value}
                onChange={e => onChange({ value: e.target.value })}
                placeholder="Enter content text…"
                rows={4}
                style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1px solid #e5e7eb', borderRadius: 6,
                    padding: '8px 36px 8px 10px',
                    fontFamily: 'inherit', fontSize: '0.82rem',
                    color: '#111827', lineHeight: 1.6,
                    resize: 'vertical', outline: 'none',
                    background: '#ffffff',
                }}
                onFocus={e  => { e.target.style.borderColor = '#d1d5db'; }}
                onBlur={e   => { e.target.style.borderColor = '#e5e7eb'; }}
            />
            <IconBtn
                onClick={onDelete}
                title="Remove"
                danger
                style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24 }}
            >
                <X style={{ width: 12, height: 12 }} />
            </IconBtn>
        </div>
    );
}

function ImageContentItem({ item, onChange, onDelete }) {
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onChange({ src: ev.target.result });
        reader.readAsDataURL(file);
    };

    return (
        <div style={{
            border: '1px solid #e5e7eb', borderRadius: 6,
            overflow: 'hidden', background: '#ffffff',
        }}>
            {/* Image area */}
            {item.src ? (
                <div style={{ position: 'relative' }}>
                    <img
                        src={item.src}
                        alt={item.alt || ''}
                        style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'contain', background: '#f9fafb' }}
                    />
                    <IconBtn
                        onClick={onDelete}
                        title="Remove image block"
                        danger
                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.9)' }}
                    >
                        <X style={{ width: 13, height: 13 }} />
                    </IconBtn>
                    <button
                        onClick={() => fileRef.current?.click()}
                        style={{
                            position: 'absolute', bottom: 8, right: 8,
                            background: 'rgba(0,0,0,0.55)', color: '#fff',
                            border: 'none', borderRadius: 5, padding: '4px 9px',
                            fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600,
                        }}
                    >
                        Replace
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                        height: 100, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 6,
                        cursor: 'pointer', color: '#9ca3af', background: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; }}
                >
                    <Image style={{ width: 22, height: 22 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>Click to upload image</span>
                </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

            {/* Alt text + caption */}
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                    type="text"
                    value={item.alt}
                    onChange={e => onChange({ alt: e.target.value })}
                    placeholder="Alt text (accessibility)…"
                    style={{
                        border: '1px solid #e5e7eb', borderRadius: 5, padding: '5px 8px',
                        fontSize: '0.72rem', color: '#374151', outline: 'none', width: '100%',
                        boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                />
                <input
                    type="text"
                    value={item.caption}
                    onChange={e => onChange({ caption: e.target.value })}
                    placeholder="Caption (optional)…"
                    style={{
                        border: '1px solid #e5e7eb', borderRadius: 5, padding: '5px 8px',
                        fontSize: '0.72rem', color: '#374151', outline: 'none', width: '100%',
                        boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                />
                {!item.src && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <IconBtn onClick={onDelete} title="Remove image block" danger>
                            <Trash2 style={{ width: 12, height: 12 }} />
                        </IconBtn>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Single accordion topic (editor view) ─────────────────────────────────────
function TopicEditor({ topic, isOpen, onToggle, onUpdateTitle, onAddItem, onUpdateItem, onDeleteItem, onDelete, isDragging }) {
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const dragItemIdx = useRef(null);

    // Simple drag-to-reorder for content items
    const handleDragStart = (e, idx) => {
        dragItemIdx.current = idx;
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e, idx) => {
        e.preventDefault();
        setDragOverIdx(idx);
    };
    const handleDrop = (e, idx) => {
        e.preventDefault();
        const from = dragItemIdx.current;
        if (from === null || from === idx) { setDragOverIdx(null); return; }
        const reordered = [...topic.items];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(idx, 0, moved);
        // Replace entire items array
        reordered.forEach((item, i) => onUpdateItem(item.id, {})); // trigger re-render via parent
        onAddItem('__reorder__', reordered); // special signal handled in parent
        dragItemIdx.current = null;
        setDragOverIdx(null);
    };

    return (
        <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#ffffff',
            boxShadow: isDragging ? '0 4px 20px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.15s',
        }}>

            {/* ── Topic header ─────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 12px', minHeight: 48,
                background: isOpen ? '#fafafa' : '#ffffff',
                borderBottom: isOpen ? '1px solid #e5e7eb' : 'none',
                transition: 'background 0.15s',
            }}>
                {/* Drag grip */}
                <div
                    data-drag-handle
                    style={{ cursor: 'grab', color: '#d1d5db', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                >
                    <GripVertical style={{ width: 16, height: 16 }} />
                </div>

                {/* Editable title */}
                <input
                    type="text"
                    value={topic.title}
                    onChange={e => onUpdateTitle(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Topic title…"
                    style={{
                        flex: 1, border: 'none', outline: 'none', background: 'transparent',
                        fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
                        color: '#111827', cursor: 'text', minWidth: 0,
                    }}
                />

                {/* Expand/collapse toggle */}
                <button
                    onClick={onToggle}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: '#6b7280', padding: '4px 6px', borderRadius: 5,
                        fontSize: '0.7rem', fontWeight: 600, flexShrink: 0,
                    }}
                >
                    <ChevronDown style={{
                        width: 16, height: 16,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                    }} />
                </button>

                {/* Delete topic */}
                <IconBtn onClick={onDelete} title="Delete topic" danger>
                    <Trash2 style={{ width: 13, height: 13 }} />
                </IconBtn>
            </div>

            {/* ── Topic body (content editor) ───────────────────────────────── */}
            {isOpen && (
                <div style={{ padding: '14px 14px 10px' }}>

                    {/* Content items */}
                    {topic.items.length === 0 && (
                        <div style={{
                            textAlign: 'center', color: '#9ca3af',
                            fontSize: '0.75rem', padding: '20px 0 14px',
                            borderBottom: '1px dashed #e5e7eb', marginBottom: 12,
                        }}>
                            No content yet — add a text block or image below.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                        {topic.items.map((item, idx) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={e => handleDragStart(e, idx)}
                                onDragOver={e => handleDragOver(e, idx)}
                                onDrop={e => handleDrop(e, idx)}
                                onDragLeave={() => setDragOverIdx(null)}
                                style={{
                                    borderRadius: 6,
                                    outline: dragOverIdx === idx ? '2px solid #111827' : '2px solid transparent',
                                    transition: 'outline 0.1s',
                                }}
                            >
                                {item.type === 'text' ? (
                                    <TextContentItem
                                        item={item}
                                        onChange={patch => onUpdateItem(item.id, patch)}
                                        onDelete={() => onDeleteItem(item.id)}
                                    />
                                ) : (
                                    <ImageContentItem
                                        item={item}
                                        onChange={patch => onUpdateItem(item.id, patch)}
                                        onDelete={() => onDeleteItem(item.id)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add content buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[
                            { label: '+ Text',  type: 'text',  Icon: Type  },
                            { label: '+ Image', type: 'image', Icon: Image },
                        ].map(({ label, type, Icon }) => (
                            <button
                                key={type}
                                onClick={() => onAddItem(type)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    border: '1px dashed #d1d5db', borderRadius: 6,
                                    padding: '5px 12px', cursor: 'pointer',
                                    background: '#fafafa', color: '#374151',
                                    fontSize: '0.72rem', fontWeight: 600,
                                    transition: 'all 0.12s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.background = '#f3f4f6'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#fafafa'; }}
                            >
                                <Icon style={{ width: 12, height: 12 }} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── AccordionBlock (main) ────────────────────────────────────────────────────
export default function AccordionBlock({ block, onUpdate }) {

    const [topics, setTopics]       = useState(() => block?.topics || []);
    const [openIds, setOpenIds]     = useState(() => new Set());
    const [dragTopicIdx, setDragTopicIdx] = useState(null);
    const [dropTopicIdx, setDropTopicIdx] = useState(null);
    const onUpdateRef = useRef(onUpdate);
    React.useEffect(() => { onUpdateRef.current = onUpdate; });

    // ── Commit helpers ──────────────────────────────────────────────────────────
    const commit = useCallback((updated) => {
        setTopics(updated);
        onUpdateRef.current?.(block?.id, { topics: updated });
    }, [block?.id]);

    // ── Topic mutations ─────────────────────────────────────────────────────────
    const addTopic = () => {
        const t = makeTopic(topics.length + 1);
        const next = [...topics, t];
        commit(next);
        setOpenIds(prev => new Set([...prev, t.id]));
    };

    const deleteTopic = (id) => {
        commit(topics.filter(t => t.id !== id));
        setOpenIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    };

    const updateTopicTitle = (id, title) => {
        commit(topics.map(t => t.id === id ? { ...t, title } : t));
    };

    const toggleOpen = (id) => {
        setOpenIds(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    // ── Content item mutations ──────────────────────────────────────────────────
    const addItem = (topicId, type, reorderedItems) => {
        commit(topics.map(t => {
            if (t.id !== topicId) return t;
            if (type === '__reorder__') return { ...t, items: reorderedItems };
            const newItem = type === 'text' ? makeTextItem() : makeImageItem();
            return { ...t, items: [...t.items, newItem] };
        }));
    };

    const updateItem = (topicId, itemId, patch) => {
        commit(topics.map(t => {
            if (t.id !== topicId) return t;
            return { ...t, items: t.items.map(it => it.id === itemId ? { ...it, ...patch } : it) };
        }));
    };

    const deleteItem = (topicId, itemId) => {
        commit(topics.map(t => {
            if (t.id !== topicId) return t;
            return { ...t, items: t.items.filter(it => it.id !== itemId) };
        }));
    };

    // ── Topic drag-to-reorder ───────────────────────────────────────────────────
    const handleTopicDragStart = (e, idx) => {
        // Only allow drag from the grip handle
        if (!e.target.closest('[data-drag-handle]')) { e.preventDefault(); return; }
        setDragTopicIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleTopicDragOver = (e, idx) => {
        e.preventDefault();
        setDropTopicIdx(idx);
    };
    const handleTopicDrop = (e, idx) => {
        e.preventDefault();
        if (dragTopicIdx === null || dragTopicIdx === idx) { reset(); return; }
        const reordered = [...topics];
        const [moved] = reordered.splice(dragTopicIdx, 1);
        reordered.splice(idx, 0, moved);
        commit(reordered);
        reset();
    };
    const reset = () => { setDragTopicIdx(null); setDropTopicIdx(null); };

    // ── Derived ─────────────────────────────────────────────────────────────────
    const totalItems = topics.reduce((s, t) => s + t.items.length, 0);

    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            overflow: 'hidden',
            fontFamily: "'DM Sans', 'Roboto', Arial, sans-serif",
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            color: '#111827',
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
                    ☰ Accordion Block
                </span>
                <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>
                    {topics.length} topic{topics.length !== 1 ? 's' : ''} · {totalItems} content item{totalItems !== 1 ? 's' : ''} · drag grip to reorder
                </span>
            </div>

            {/* ── Body ──────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', minHeight: 420 }}>

                {/* ── Topics list ───────────────────────────────────────────── */}
                <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>

                    {topics.length === 0 && (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#9ca3af', fontSize: '0.8rem', gap: 10, padding: '40px 0',
                        }}>
                            <div style={{ fontSize: '2rem', opacity: 0.5 }}>📋</div>
                            <span>No topics yet. Add your first topic to get started.</span>
                        </div>
                    )}

                    {topics.map((topic, idx) => (
                        <div
                            key={topic.id}
                            draggable
                            onDragStart={e => handleTopicDragStart(e, idx)}
                            onDragOver={e => handleTopicDragOver(e, idx)}
                            onDrop={e => handleTopicDrop(e, idx)}
                            onDragEnd={reset}
                            style={{
                                borderRadius: 8,
                                outline: dropTopicIdx === idx && dragTopicIdx !== idx
                                    ? '2px solid #111827' : '2px solid transparent',
                                opacity: dragTopicIdx === idx ? 0.45 : 1,
                                transition: 'opacity 0.15s, outline 0.1s',
                            }}
                        >
                            <TopicEditor
                                topic={topic}
                                isOpen={openIds.has(topic.id)}
                                onToggle={() => toggleOpen(topic.id)}
                                onUpdateTitle={title => updateTopicTitle(topic.id, title)}
                                onAddItem={(type, reordered) => addItem(topic.id, type, reordered)}
                                onUpdateItem={(itemId, patch) => updateItem(topic.id, itemId, patch)}
                                onDeleteItem={itemId => deleteItem(topic.id, itemId)}
                                onDelete={() => deleteTopic(topic.id)}
                                isDragging={dragTopicIdx === idx}
                            />
                        </div>
                    ))}

                    {/* Add Topic button */}
                    <button
                        onClick={addTopic}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            border: '1.5px dashed #d1d5db', borderRadius: 8,
                            padding: '11px 0', cursor: 'pointer',
                            background: '#fafafa', color: '#374151',
                            fontSize: '0.78rem', fontWeight: 600,
                            transition: 'all 0.14s', marginTop: 2,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#111827'; e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#111827'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.color = '#374151'; }}
                    >
                        <Plus style={{ width: 15, height: 15 }} />
                        Add Topic
                    </button>
                </div>


            </div>
        </div>
    );
}