import React, { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import MandatorySelect from '../ui/MandatorySelect';

export default function TrueFalseBlock({ block, onUpdate }) {
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
