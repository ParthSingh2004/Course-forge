import React, { useRef } from 'react';
import { Trash2, ImagePlus, X } from 'lucide-react';
import MandatorySelect from '../ui/MandatorySelect';

export default function QuizBlock({ block, onUpdate }) {
    const imgInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => onUpdate(block.id, { questionImage: reader.result });
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    return (
        <div className="cf-quiz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                <MandatorySelect
                    value={!!block.mandatory}
                    onChange={(mandatory) => onUpdate(block.id, { mandatory })}
                    size="compact"
                />
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

            {/* Question image */}
            {block.questionImage ? (
                <div className="cf-quiz-img-preview">
                    <img src={block.questionImage} alt="Question" className="cf-quiz-img" />
                    <button
                        type="button"
                        className="cf-quiz-img-remove"
                        onClick={() => onUpdate(block.id, { questionImage: null })}
                        title="Remove image"
                    >
                        <X size={13} />
                    </button>
                </div>
            ) : (
                <label className="cf-quiz-img-upload-btn" title="Add an image to this question">
                    <ImagePlus size={13} />
                    Add Image
                    <input
                        ref={imgInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                    />
                </label>
            )}

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
