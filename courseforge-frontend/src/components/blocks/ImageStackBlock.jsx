import React, { useState } from 'react';
import { Image as ImageIcon, RefreshCw, X } from 'lucide-react';

export default function ImageStackBlock({ block, onUpdate, readOnly }) {
    const slides = block.slides || [{ id: Date.now().toString(), type: 'image', imageUrl: '', caption: '' }];
    const [currentIdx, setCurrentIdx] = useState(0);
    const [quizState, setQuizState] = useState({});

    const currentSlide = slides[currentIdx];
    const qState = quizState[currentSlide?.id] || {};

    const updateSlide = (idx, data) => {
        const next = slides.map((s, i) => i === idx ? { ...s, ...data } : s);
        onUpdate(block.id, { slides: next });
    };

    const addImageSlide = () => {
        const s = { id: Date.now().toString(), type: 'image', imageUrl: '', caption: '' };
        onUpdate(block.id, { slides: [...slides, s] });
        setCurrentIdx(slides.length);
    };

    const addQuizSlide = () => {
        const s = {
            id: Date.now().toString(),
            type: 'quiz',
            question: '',
            options: ['', ''],
            correctIndex: 0,
        };
        onUpdate(block.id, { slides: [...slides, s] });
        setCurrentIdx(slides.length);
    };

    const deleteCurrentSlide = () => {
        if (slides.length <= 1) return;
        const next = slides.filter((_, i) => i !== currentIdx);
        onUpdate(block.id, { slides: next });
        setCurrentIdx(Math.min(currentIdx, next.length - 1));
    };

    const handleImageUpload = (e, idx) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => updateSlide(idx, { imageUrl: reader.result });
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    const isQuizBlocked = () => {
        if (!readOnly || currentSlide.type !== 'quiz') return false;
        return qState.result !== 'correct';
    };

    const canGoNext = () => {
        if (currentIdx >= slides.length - 1) return false;
        return !isQuizBlocked();
    };

    const goNext = () => { if (canGoNext()) setCurrentIdx(i => i + 1); };
    const goPrev = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1); };

    const handleQuizAnswer = (optIdx) => {
        const correct = optIdx === currentSlide.correctIndex;
        setQuizState(prev => ({
            ...prev,
            [currentSlide.id]: { selected: optIdx, result: correct ? 'correct' : 'wrong' }
        }));
    };

    const resetQuiz = () => {
        setQuizState(prev => {
            const n = { ...prev };
            delete n[currentSlide.id];
            return n;
        });
    };

    const updateOption = (slideIdx, optIdx, val) => {
        const opts = [...slides[slideIdx].options];
        opts[optIdx] = val;
        updateSlide(slideIdx, { options: opts });
    };

    const addOption = (slideIdx) => {
        const opts = [...slides[slideIdx].options, ''];
        updateSlide(slideIdx, { options: opts });
    };

    const removeOption = (slideIdx, optIdx) => {
        const opts = slides[slideIdx].options.filter((_, i) => i !== optIdx);
        const correctIndex = slides[slideIdx].correctIndex >= opts.length
            ? opts.length - 1 : slides[slideIdx].correctIndex;
        updateSlide(slideIdx, { options: opts, correctIndex });
    };

    const pct = Math.round(((currentIdx + 1) / slides.length) * 100);

    return (
        <div style={{ width: '100%', fontFamily: 'Roboto, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#a3a3a3' }}>
                    {currentSlide.type === 'quiz' ? '🧩 Quiz' : `Slide ${currentIdx + 1} of ${slides.length}`}
                </span>
                <div style={{ flex: 1, margin: '0 0.75rem', height: 4, borderRadius: 2, background: '#2a2a2a', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#8B1A1A', transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '0.8rem', color: '#a3a3a3' }}>{pct}%</span>
            </div>

            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a2a', minHeight: 200, background: '#111' }}>
                {currentSlide.type === 'image' && (
                    <div>
                        {currentSlide.imageUrl ? (
                            <img src={currentSlide.imageUrl} alt={currentSlide.caption || 'Slide image'}
                                style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
                        ) : !readOnly ? (
                            <label style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                height: 200, cursor: 'pointer', color: '#a3a3a3', gap: '0.5rem'
                            }}>
                                <ImageIcon style={{ width: 32, height: 32, opacity: 0.5 }} />
                                <span style={{ fontSize: '0.85rem' }}>Click to upload image</span>
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, currentIdx)} />
                            </label>
                        ) : (
                            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                                No image
                            </div>
                        )}

                        {!readOnly ? (
                            <div style={{ padding: '0.75rem', background: '#171717', borderTop: '1px solid #2a2a2a' }}>
                                <input
                                    value={currentSlide.caption || ''}
                                    onChange={e => updateSlide(currentIdx, { caption: e.target.value })}
                                    placeholder="Caption (optional)..."
                                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#d4d4d4', fontSize: '0.9rem' }}
                                />
                                {currentSlide.imageUrl && (
                                    <label style={{
                                        marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: 4,
                                        fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer'
                                    }}>
                                        <RefreshCw style={{ width: 12, height: 12 }} /> Replace image
                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, currentIdx)} />
                                    </label>
                                )}
                            </div>
                        ) : currentSlide.caption ? (
                            <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.6)', color: '#d4d4d4', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {currentSlide.caption}
                            </div>
                        ) : null}
                    </div>
                )}

                {currentSlide.type === 'quiz' && (
                    <div style={{ padding: '1.25rem' }}>
                        {!readOnly ? (
                            <input
                                value={currentSlide.question || ''}
                                onChange={e => updateSlide(currentIdx, { question: e.target.value })}
                                placeholder="Quiz question..."
                                style={{
                                    width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #404040',
                                    outline: 'none', color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.5rem'
                                }}
                            />
                        ) : (
                            <p style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginBottom: '1rem', marginTop: 0 }}>
                                {currentSlide.question || 'Quiz question...'}
                            </p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(currentSlide.options || []).map((opt, oi) => {
                                const isSelected = qState.selected === oi;
                                const isCorrectOpt = oi === currentSlide.correctIndex;

                                let optBg = '#1c1c1c', optBorder = '#404040', optColor = '#d4d4d4';
                                if (readOnly && qState.result) {
                                    if (isSelected && qState.result === 'correct') { optBg = '#052e16'; optBorder = '#166534'; optColor = '#4ade80'; }
                                    if (isSelected && qState.result === 'wrong') { optBg = '#2a0a0a'; optBorder = '#7f1d1d'; optColor = '#f87171'; }
                                }

                                return (
                                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {readOnly ? (
                                            <button
                                                onClick={() => !qState.result && handleQuizAnswer(oi)}
                                                disabled={!!qState.result}
                                                style={{
                                                    flex: 1, textAlign: 'left', background: optBg, border: `1px solid ${optBorder}`,
                                                    color: optColor, padding: '0.6rem 1rem', borderRadius: 6, cursor: qState.result ? 'default' : 'pointer',
                                                    fontSize: '0.9rem', transition: 'all 0.2s'
                                                }}>
                                                {opt || `Option ${oi + 1}`}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    title="Mark as correct answer"
                                                    onClick={() => updateSlide(currentIdx, { correctIndex: oi })}
                                                    style={{
                                                        flexShrink: 0, width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isCorrectOpt ? '#4ade80' : '#404040'}`,
                                                        background: isCorrectOpt ? '#052e16' : 'transparent', cursor: 'pointer', padding: 0
                                                    }}>
                                                </button>
                                                <input
                                                    value={opt}
                                                    onChange={e => updateOption(currentIdx, oi, e.target.value)}
                                                    placeholder={`Option ${oi + 1}`}
                                                    style={{
                                                        flex: 1, background: '#1c1c1c', border: '1px solid #404040', color: '#d4d4d4',
                                                        borderRadius: 6, padding: '0.5rem 0.75rem', outline: 'none', fontSize: '0.9rem'
                                                    }}
                                                />
                                                {(currentSlide.options || []).length > 2 && (
                                                    <button onClick={() => removeOption(currentIdx, oi)}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {!readOnly && (
                            <button onClick={() => addOption(currentIdx)}
                                style={{
                                    marginTop: '0.75rem', background: 'transparent', border: '1px dashed #404040',
                                    color: '#6b7280', padding: '0.4rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem'
                                }}>
                                + Add Option
                            </button>
                        )}

                        {readOnly && qState.result === 'wrong' && (
                            <div style={{
                                marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#2a0a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '0.6rem 1rem'
                            }}>
                                <span style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>❌ Incorrect — try again!</span>
                                <button onClick={resetQuiz}
                                    style={{
                                        background: '#7f1d1d', border: 'none', color: '#fca5a5', borderRadius: 4,
                                        padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem'
                                    }}>
                                    Try Again
                                </button>
                            </div>
                        )}
                        {readOnly && qState.result === 'correct' && (
                            <div style={{
                                marginTop: '1rem', background: '#052e16', border: '1px solid #166534', borderRadius: 6,
                                padding: '0.6rem 1rem', color: '#4ade80', fontSize: '0.9rem', fontWeight: 600
                            }}>
                                ✅ Correct! You can continue.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                <button onClick={goPrev} disabled={currentIdx === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '0.4rem 0.9rem', borderRadius: 6,
                        border: '1px solid #2a2a2a', background: currentIdx === 0 ? '#111' : '#1c1c1c',
                        color: currentIdx === 0 ? '#555' : '#d4d4d4', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
                    }}>
                    ← Prev
                </button>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {slides.map((s, i) => (
                        <div key={s.id}
                            onClick={() => { if (!readOnly) setCurrentIdx(i); }}
                            style={{
                                width: i === currentIdx ? 20 : 8, height: 8, borderRadius: 4,
                                background: i === currentIdx ? '#8B1A1A' : s.type === 'quiz' ? '#4b5563' : '#3a3a3a',
                                transition: 'all 0.2s', cursor: readOnly ? 'default' : 'pointer'
                            }}
                            title={s.type === 'quiz' ? 'Quiz' : `Image ${i + 1}`}
                        />
                    ))}
                </div>

                <button
                    onClick={readOnly ? goNext : () => setCurrentIdx(i => Math.min(i + 1, slides.length - 1))}
                    disabled={readOnly ? !canGoNext() : currentIdx >= slides.length - 1}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '0.4rem 0.9rem', borderRadius: 6,
                        border: '1px solid #2a2a2a', cursor: (readOnly ? !canGoNext() : currentIdx >= slides.length - 1) ? 'not-allowed' : 'pointer',
                        background: (readOnly && isQuizBlocked()) ? '#2a0a0a' : '#1c1c1c',
                        color: (readOnly ? !canGoNext() : currentIdx >= slides.length - 1) ? '#555' : '#d4d4d4', fontSize: '0.85rem'
                    }}>
                    {readOnly && isQuizBlocked() ? '🔒 Answer to continue' : 'Next →'}
                </button>
            </div>

            {!readOnly && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={addImageSlide}
                        style={{
                            background: '#1c1c1c', border: '1px solid #404040', color: '#d4d4d4',
                            padding: '0.35rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4
                        }}>
                        <ImageIcon style={{ width: 13, height: 13 }} /> Add Image
                    </button>
                    <button onClick={addQuizSlide}
                        style={{
                            background: '#1c1c1c', border: '1px solid #404040', color: '#d4d4d4',
                            padding: '0.35rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem'
                        }}>
                        ＋ Add Quiz
                    </button>
                    {slides.length > 1 && (
                        <button onClick={deleteCurrentSlide}
                            style={{
                                background: 'transparent', border: '1px solid #7f1d1d', color: '#ef4444',
                                padding: '0.35rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', marginLeft: 'auto'
                            }}>
                            Delete Slide
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}