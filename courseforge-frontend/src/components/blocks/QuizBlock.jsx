import React from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';

export default function QuizBlock({ block, onUpdate }) {
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
            <p className="cf-fitb-hint" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                Select the option that should be treated as the correct answer.
            </p>
            {block.options.map((option, index) => (
                <div key={index} className="cf-quiz-option">
                    <input
                        type="radio"
                        name={`quiz-${block.id}`}
                        checked={block.correctAnswer === index}
                        onChange={() => onUpdate(block.id, { correctAnswer: index })}
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
                        type="button"
                        onClick={() => {
                            if (block.options.length <= 2) return;
                            const newOptions = block.options.filter((_, i) => i !== index);
                            let newCorrectAnswer = block.correctAnswer;
                            if (block.correctAnswer === index) {
                                newCorrectAnswer = 0;
                            } else if (block.correctAnswer > index) {
                                newCorrectAnswer = block.correctAnswer - 1;
                            }
                            onUpdate(block.id, { options: newOptions, correctAnswer: newCorrectAnswer });
                        }}
                        disabled={block.options.length <= 2}
                        style={{ background: 'transparent', color: block.options.length <= 2 ? '#d4b4b4' : '#ef4444', border: 'none', cursor: block.options.length <= 2 ? 'not-allowed' : 'pointer' }}
                        title={block.options.length <= 2 ? 'A quiz needs at least two options' : 'Remove option'}
                    >
                        <Trash2 size={14} />
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