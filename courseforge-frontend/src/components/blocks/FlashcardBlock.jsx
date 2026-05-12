import React, { useState } from 'react';
import { CreditCard, RotateCcw } from 'lucide-react';

// --- Color Math Utilities ---
const DEFAULT_FLASHCARD_COLOR = '#8b1a1a';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const sanitizeHexColor = (value, fallback = DEFAULT_FLASHCARD_COLOR) => (
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test((value || '').trim()) ? value.trim() : fallback
);
const expandHex = (hex) => {
    const clean = sanitizeHexColor(hex).slice(1);
    return clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
};
const hexToRgb = (hex) => {
    const fullHex = expandHex(hex);
    return { r: parseInt(fullHex.slice(0, 2), 16), g: parseInt(fullHex.slice(2, 4), 16), b: parseInt(fullHex.slice(4, 6), 16) };
};
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
const mixHex = (hex, targetHex, amount) => {
    const from = hexToRgb(hex);
    const to = hexToRgb(targetHex);
    return rgbToHex({
        r: from.r + (to.r - from.r) * amount,
        g: from.g + (to.g - from.g) * amount,
        b: from.b + (to.b - from.b) * amount,
    });
};
const hexToRgba = (hex, alpha) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const getFlashcardTheme = (hex) => {
    const base = sanitizeHexColor(hex);
    return {
        base,
        frontBackground: `linear-gradient(145deg, ${mixHex(base, '#000000', 0.72)} 0%, ${mixHex(base, '#000000', 0.48)} 60%, ${mixHex(base, '#ffffff', 0.12)} 100%)`,
        frontBorder: `1px solid ${mixHex(base, '#ffffff', 0.18)}`,
        frontShadow: `0 8px 32px ${hexToRgba(base, 0.28)}`,
        backBackground: `linear-gradient(145deg, ${mixHex(base, '#ffffff', 0.94)} 0%, ${mixHex(base, '#ffffff', 0.84)} 100%)`,
        backBorder: `2px solid ${mixHex(base, '#ffffff', 0.58)}`,
        backShadow: `0 8px 32px ${hexToRgba(base, 0.14)}`,
        backAccent: mixHex(base, '#ffffff', 0.18),
        frontBadge: 'rgba(255,255,255,0.68)',
        backBadge: mixHex(base, '#ffffff', 0.28),
        frontHint: 'rgba(255,255,255,0.78)',
        backHint: mixHex(base, '#000000', 0.08),
        backText: mixHex(base, '#000000', 0.82),
        backPlaceholder: mixHex(base, '#ffffff', 0.42),
    };
};

export default function FlashcardBlock({ block, onUpdate }) {
    const [flipped, setFlipped] = useState(false);
    const theme = getFlashcardTheme(block.color);

    const stopPropAndFlip = (e) => {
        if (e.target.tagName === 'TEXTAREA') return;
        setFlipped(f => !f);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b6060', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Card Color
                </span>
                <input
                    type="color"
                    value={sanitizeHexColor(block.color)}
                    onChange={(e) => onUpdate(block.id, { color: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    title="Choose flashcard color"
                    style={{ width: 42, height: 32, border: '1px solid #EAD0D0', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                />
            </div>
            <div className="cf-flashcard-block" onClick={stopPropAndFlip} title="Click to flip">
                <div className={`cf-flashcard-inner${flipped ? ' flipped' : ''}`}>
                    {/* Front */}
                    <div
                        className="cf-flashcard-face cf-flashcard-front"
                        style={{ background: theme.frontBackground, border: theme.frontBorder, boxShadow: theme.frontShadow }}
                    >
                        <div className="cf-flashcard-badge" style={{ color: theme.frontBadge }}>
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
                            style={{ color: '#FFFFFF' }}
                        />
                        <div className="cf-flashcard-flip-hint" style={{ color: theme.frontHint }}>
                            <RotateCcw style={{ width: 10, height: 10 }} />
                            Click to reveal answer
                        </div>
                    </div>
                    {/* Back */}
                    <div
                        className="cf-flashcard-face cf-flashcard-back"
                        style={{ background: theme.backBackground, border: theme.backBorder, boxShadow: theme.backShadow }}
                    >
                        <div className="cf-flashcard-badge" style={{ color: theme.backBadge }}>
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
                            style={{ color: theme.backText }}
                        />
                        <div className="cf-flashcard-flip-hint" style={{ color: theme.backHint }}>
                            <RotateCcw style={{ width: 10, height: 10 }} />
                            Click to flip back
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}