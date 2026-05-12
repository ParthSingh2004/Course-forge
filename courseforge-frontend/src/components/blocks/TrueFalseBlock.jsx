import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function TrueFalseBlock({ block, onUpdate }) {
    return (
        <div className="cf-tf-block">
            <div className="cf-assess-meta">
                <button
                    onClick={() => onUpdate(block.id, { isMandatory: !block.isMandatory })}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                        fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                        background: block.isMandatory ? '#8b1a1a' : '#fff5f5',
                        color: block.isMandatory ? 'white' : '#8b6060',
                        border: block.isMandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                        transition: 'all 0.15s',
                    }}
                >
                    <ShieldCheck style={{ width: 12, height: 12 }} />
                    {block.isMandatory ? 'MANDATORY' : 'Optional'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b6060', whiteSpace: 'nowrap' }}>Marks:</span>
                    <input
                        type="number" min="1" step="1"
                        value={block.marks ?? 1}
                        onChange={(e) => onUpdate(block.id, { marks: Math.max(1, parseInt(e.target.value) || 1) })}
                        style={{
                            width: 52, padding: '0.2rem 0.4rem', borderRadius: 6, border: '1px solid #EAD0D0',
                            fontSize: '0.75rem', fontWeight: 700, color: '#8b1a1a', textAlign: 'center',
                            background: '#fff5f5', outline: 'none', fontFamily: 'Roboto',
                        }}
                    />
                </div>
            </div>
            <textarea
                className="cf-quiz-q-input"
                value={block.question}
                onChange={(e) => onUpdate(block.id, { question: e.target.value })}
                placeholder="Enter a statement..."
                rows={3}
                style={{ resize: 'vertical', minHeight: 84 }}
            />
            <div className="cf-tf-options">
                <button
                    className={`cf-tf-btn${block.correctAnswer === true ? ' selected-true' : ''}`}
                    onClick={() => onUpdate(block.id, { correctAnswer: true })}
                >✓ True</button>
                <button
                    className={`cf-tf-btn${block.correctAnswer === false ? ' selected-false' : ''}`}
                    onClick={() => onUpdate(block.id, { correctAnswer: false })}
                >✗ False</button>
            </div>
        </div>
    );
}