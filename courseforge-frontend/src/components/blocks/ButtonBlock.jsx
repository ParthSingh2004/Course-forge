import React from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export default function ButtonBlock({ block, onUpdate, slides = [] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', width: '100%' }}>
            <div
                className="cf-button-block"
                style={{
                    justifyContent:
                        block.alignment === 'left'
                            ? 'flex-start'
                            : block.alignment === 'right'
                                ? 'flex-end'
                                : 'center',
                }}
            >
                <input
                    className="cf-button-input"
                    value={block.content || ''}
                    onChange={(e) => onUpdate(block.id, { content: e.target.value })}
                    style={{ textAlign: 'center' }}
                    placeholder="Button label..."
                />
            </div>
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