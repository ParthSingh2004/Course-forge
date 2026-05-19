import React from 'react';
import MandatorySelect from '../ui/MandatorySelect';

export default function TrueFalseBlock({ block, onUpdate }) {
    return (
        <div className="cf-tf-block">
            <div className="cf-assess-meta">
                <MandatorySelect
                    value={!!block.isMandatory}
                    onChange={(isMandatory) => onUpdate(block.id, { isMandatory })}
                    size="compact"
                />
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
