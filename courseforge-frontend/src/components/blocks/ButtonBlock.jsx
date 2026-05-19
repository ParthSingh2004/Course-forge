import React from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export default function ButtonBlock({ block, onUpdate, slides = [] }) {
    // Generate a safe, unique class name for this specific block to avoid style bleeding
    const uniqueButtonClass = `cf-btn-${block.id || Math.random().toString(36).substr(2, 9)}`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', width: '100%' }}>

            {/* Dynamic Style Injection to force !important and beat app.css */}
            <style>{`
                .${uniqueButtonClass} {
                    background: ${block.color || '#8b1a1a'} !important;
                    background-color: ${block.color || '#8b1a1a'} !important;
                }
            `}</style>

            {/* Button Preview/Input */}
            <div
                className="cf-button-block"
                style={{
                    display: 'flex',
                    justifyContent:
                        block.alignment === 'left'
                            ? 'flex-start'
                            : block.alignment === 'right'
                                ? 'flex-end'
                                : 'center',
                }}
            >
                <input
                    className={`cf-button-input ${uniqueButtonClass}`}
                    value={block.content || ''}
                    onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                    style={{ textAlign: 'center' }}
                    placeholder="Button label..."
                />
            </div>

            {/* Alignment Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b6060', whiteSpace: 'nowrap' }}>
                    Align
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {[
                        { value: 'left', icon: AlignLeft, label: 'Align left' },
                        { value: 'center', icon: AlignCenter, label: 'Align center' },
                        { value: 'right', icon: AlignRight, label: 'Align right' },
                    ].map(({ value, icon: Icon, label }) => {
                        const isActive = (block.alignment || 'center') === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => onUpdate(block.id, { alignment: value })}
                                title={label}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 6,
                                    border: `1px solid ${isActive ? '#8b1a1a' : '#EAD0D0'}`,
                                    background: isActive ? '#fff1f1' : '#fff',
                                    color: isActive ? '#8b1a1a' : '#8b6060',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <Icon size={14} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Color Picker Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b6060', whiteSpace: 'nowrap' }}>
                    Color
                </span>
                <input
                    type="color"
                    value={block.color || '#8b1a1a'}
                    onChange={(e) => onUpdate(block.id, { color: e.target.value })}
                    style={{
                        width: 34,
                        height: 34,
                        padding: 0,
                        border: '1px solid #EAD0D0',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: '#fff',
                    }}
                    title="Choose button color"
                />
            </div>

            {/* Jump To Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b6060', whiteSpace: 'nowrap' }}>
                    Jump to
                </span>
                <select
                    value={block.targetSlideId || ''}
                    onChange={(e) => onUpdate(block.id, { targetSlideId: e.target.value })}
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
}