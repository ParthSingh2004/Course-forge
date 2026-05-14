import React from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';

// Isolated state logic for this component
const FILL_BLANK_TOKEN = /____/g;
const countFillBlankPlaceholders = (question = '') => {
    const matches = String(question).match(FILL_BLANK_TOKEN);
    return matches ? matches.length : 0;
};
const normalizeFillBlankAnswers = (question = '', answers = [], legacyAnswer = '') => {
    const explicitAnswerCount = Array.isArray(answers) ? answers.length : 0;
    const desiredCount = Math.max(explicitAnswerCount, countFillBlankPlaceholders(question), 1);
    const source = Array.isArray(answers) && answers.length > 0 ? answers : [legacyAnswer || ''];
    return Array.from({ length: desiredCount }, (_, index) => source[index] ?? '');
};

export default function FillBlankBlock({ block, onUpdate }) {
    const answers = normalizeFillBlankAnswers(block.question, block.answers, block.answer);

    const updateFillBlankQuestion = (question) => {
        const nextAnswers = normalizeFillBlankAnswers(question, block.answers, block.answer);
        onUpdate(block.id, { question, answers: nextAnswers, answer: nextAnswers[0] || '' });
    };

    const updateFillBlankAnswer = (index, value) => {
        const nextAnswers = answers.map((answer, answerIndex) => (
            answerIndex === index ? value : answer
        ));
        onUpdate(block.id, { answers: nextAnswers, answer: nextAnswers[0] || '' });
    };

    const addFillBlankAnswer = () => {
        const nextAnswers = [...answers, ''];
        onUpdate(block.id, { answers: nextAnswers, answer: nextAnswers[0] || '' });
    };

    const removeFillBlankAnswer = (index) => {
        if (answers.length <= 1) return;
        const nextAnswers = answers.filter((_, answerIndex) => answerIndex !== index);
        onUpdate(block.id, { answers: nextAnswers, answer: nextAnswers[0] || '' });
    };

    return (
        <div className="cf-fitb-block">
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
                <button
                    onClick={() => onUpdate(block.id, { caseSensitive: !block.caseSensitive })}
                    style={{
                        padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                        fontSize: '0.6875rem', fontWeight: 600,
                        background: block.caseSensitive ? '#FFF0D4' : '#fff5f5',
                        color: block.caseSensitive ? '#92400E' : '#8b6060',
                        border: block.caseSensitive ? '1px solid #D97706' : '1px solid #EAD0D0',
                        transition: 'all 0.15s',
                    }}
                >
                    Aa {block.caseSensitive ? 'Case-Sensitive' : 'Case-Insensitive'}
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
                onChange={(e) => updateFillBlankQuestion(e.target.value)}
                placeholder="Enter the question or sentence..."
                rows={3}
                style={{ resize: 'vertical', minHeight: 84 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.75rem' }}>
                <p className="cf-fitb-hint" style={{ marginBottom: 0 }}>
                    Add one answer for each blank you want the learner to complete.
                </p>
                <button
                    type="button"
                    onClick={addFillBlankAnswer}
                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid #EAD0D0', background: '#fff', color: '#8b1a1a', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                    + Add Blank
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                {answers.map((answer, index) => (
                    <div key={`${block.id}-answer-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            className="cf-fitb-answer-input"
                            value={answer}
                            onChange={(e) => updateFillBlankAnswer(index, e.target.value)}
                            placeholder={`Answer for blank ${index + 1}`}
                            style={{ marginTop: 0 }}
                        />
                        <button
                            type="button"
                            onClick={() => removeFillBlankAnswer(index)}
                            disabled={answers.length <= 1}
                            style={{ background: 'transparent', color: answers.length <= 1 ? '#d4b4b4' : '#ef4444', border: 'none', cursor: answers.length <= 1 ? 'not-allowed' : 'pointer' }}
                            title={answers.length <= 1 ? 'At least one blank is required' : 'Remove blank'}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}