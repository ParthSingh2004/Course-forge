import React from 'react';
import { ShieldCheck, X } from 'lucide-react';

export default function MultiSelectBlock({ block, onUpdate }) {
    return (
        <div className="cf-quiz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                <button
                    onClick={() => onUpdate(block.id, { mandatory: !block.mandatory })}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                        fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                        background: block.mandatory ? '#8b1a1a' : '#fff5f5',
                        color: block.mandatory ? 'white' : '#8b6060',
                        border: block.mandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                        transition: 'all 0.15s',
                    }}
                >
                    <ShieldCheck style={{ width: 12, height: 12 }} />
                    {block.mandatory ? 'MANDATORY' : 'Optional'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b6060', whiteSpace: 'nowrap' }}>Marks:</span>
                    <input
                        type="number" min="0" step="1"
                        value={block.marks ?? ''}
                        onChange={(e) => onUpdate(block.id, { marks: e.target.value === '' ? '' : parseInt(e.target.value) })}
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
                placeholder="Enter your question..."
                rows={3}
                style={{ resize: 'vertical', minHeight: 84 }}
            />
            {block.options.map((option, index) => (
                <div key={index} className="cf-quiz-option">
                    <input
                        type="checkbox"
                        name={`ms-${block.id}`}
                        checked={block.correctAnswer.includes(index.toString())}
                        onChange={(e) => {
                            const newCorrect = new Set(block.correctAnswer);
                            if (e.target.checked) newCorrect.add(index.toString());
                            else newCorrect.delete(index.toString());
                            onUpdate(block.id, { correctAnswer: Array.from(newCorrect) });
                        }}
                    />
                    <input
                        className="cf-quiz-option-text"
                        value={option}
                        placeholder={`Option ${index + 1}...`}
                        onChange={(e) => {
                            const newOptions = [...block.options];
                            newOptions[index] = e.target.value;
                            onUpdate(block.id, { options: newOptions });
                        }}
                    />
                    <button
                        onClick={() => {
                            const newOptions = block.options.filter((_, i) => i !== index);
                            const newCorrect = block.correctAnswer.filter(ans => ans !== index.toString()).map(ans => parseInt(ans) > index ? (parseInt(ans) - 1).toString() : ans);
                            onUpdate(block.id, { options: newOptions, correctAnswer: newCorrect });
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
            <button
                onClick={() => onUpdate(block.id, { options: [...block.options, ""] })}
                style={{ marginTop: '0.5rem', background: 'transparent', border: '1px dashed #e8d8d8', color: '#8b6060', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
            >
                + Add Option
            </button>
        </div>
    );
}