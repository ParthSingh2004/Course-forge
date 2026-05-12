import React, { useState, useRef } from 'react';
import { ShieldCheck, FileUp, Trash2, X } from 'lucide-react';

export default function InteractiveVideoBlock({ block, onUpdate, readOnly }) {
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [isCorrect, setIsCorrect] = useState(false);
    const [hasAttempted, setHasAttempted] = useState(false);
    const videoRef = useRef(null);
    const interactions = block.interactions || [];

    const handleTimeUpdate = (e) => {
        if (!readOnly || activeQuiz) return;
        const currentTime = e.target.currentTime;
        const hit = interactions.find(int =>
            !int.completed && Math.abs(int.timestamp - currentTime) < 0.5
        );
        if (hit) {
            e.target.pause();
            setIsCorrect(false);
            setHasAttempted(false);
            setActiveQuiz(hit);
        }
    };

    const handleUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUri = reader.result;
            onUpdate(block.id, { videoUrl: dataUri, isLocal: true, fileName: file.name });
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    const addInteraction = () => {
        const newInt = {
            id: Date.now().toString(),
            timestamp: 0,
            question: "",
            options: ["", ""],
            correctAnswerIndex: 0,
            requireCorrectToContinue: true,
            completed: false
        };
        onUpdate(block.id, { interactions: [...interactions, newInt] });
    };

    const updateInteraction = (id, data) => {
        const newInts = interactions.map(int => int.id === id ? { ...int, ...data } : int);
        onUpdate(block.id, { interactions: newInts });
    };

    const removeInteraction = (id) => {
        onUpdate(block.id, { interactions: interactions.filter(int => int.id !== id) });
    };

    const handleQuizAnswer = (idx) => {
        setHasAttempted(true);
        const answeredCorrectly = idx === activeQuiz.correctAnswerIndex;
        if (answeredCorrectly) {
            setIsCorrect(true);
        } else if (activeQuiz?.requireCorrectToContinue === false) {
            setIsCorrect(true);
        } else {
            setIsCorrect(false);
        }
    };

    const canContinueAfterWrong = activeQuiz?.requireCorrectToContinue === false;
    const answeredCorrectly = !!activeQuiz && hasAttempted && isCorrect;
    const answeredIncorrectly = !!activeQuiz && hasAttempted && !isCorrect;
    const canContinue = !!activeQuiz && hasAttempted && (answeredCorrectly || canContinueAfterWrong);

    const resumeVideo = () => {
        const newInts = interactions.map(int => int.id === activeQuiz.id ? { ...int, completed: true } : int);
        onUpdate(block.id, { interactions: newInts });
        setActiveQuiz(null);
        if (videoRef.current) videoRef.current.play();
    };

    return (
        <div style={{ position: 'relative', background: readOnly ? 'transparent' : '#0a0000', padding: readOnly ? 0 : '1rem', borderRadius: 8 }}>
            {!readOnly && (
                <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#171717', border: '1px solid #7f1d1d', borderRadius: 6, display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                        <button
                            type="button"
                            onClick={() => onUpdate(block.id, { mandatory: !block.mandatory })}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                                fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                                background: block.mandatory ? '#8b1a1a' : '#fff5f5',
                                color: block.mandatory ? 'white' : '#8b6060',
                                border: block.mandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                                transition: 'all 0.15s',
                                flexShrink: 0,
                            }}
                        >
                            <ShieldCheck style={{ width: 12, height: 12 }} />
                            {block.mandatory ? 'MANDATORY' : 'Optional'}
                        </button>
                        <div style={{ color: '#d4d4d4', fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {block.fileName || (block.videoUrl ? 'Uploaded video selected' : 'Upload a video file to add quiz interactions.')}
                        </div>
                    </div>
                    <label style={{ background: '#171717', color: '#fff', padding: '0.5rem 1rem', border: '1px solid #450a0a', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileUp style={{ width: 14, height: 14 }} /> Upload
                        <input type="file" accept="video/*" onChange={handleUpload} style={{ display: 'none' }} />
                    </label>
                </div>
            )}

            <div style={{ position: 'relative' }}>
                {block.videoUrl ? (
                    <video
                        ref={videoRef}
                        src={block.videoUrl}
                        controls={!activeQuiz}
                        style={{ width: '100%', borderRadius: 8, background: '#000', display: 'block' }}
                        onTimeUpdate={handleTimeUpdate}
                    />
                ) : (
                    <div style={{ width: '100%', height: 300, background: '#171717', border: '1px solid #450a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#525252', borderRadius: 8 }}>No video uploaded</div>
                )}

                {readOnly && activeQuiz && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 10, padding: '2rem' }}>
                        <div style={{ textAlign: 'center', width: '100%', maxWidth: 500 }}>
                            <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>{activeQuiz.question}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {activeQuiz.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => !canContinue && handleQuizAnswer(i)}
                                        style={{
                                            background: answeredCorrectly && i === activeQuiz.correctAnswerIndex ? '#16a34a' : '#ffffff',
                                            color: answeredCorrectly && i === activeQuiz.correctAnswerIndex ? '#fff' : '#1a0a0a',
                                            border: '1px solid #ead0d0',
                                            padding: '0.75rem',
                                            borderRadius: 6,
                                            cursor: canContinue ? 'default' : 'pointer',
                                            transition: 'background 0.2s',
                                            fontSize: '1rem',
                                            opacity: answeredCorrectly && i !== activeQuiz.correctAnswerIndex ? 0.5 : 1
                                        }}
                                        onMouseOver={e => !canContinue && (e.currentTarget.style.background = '#fff5f5')}
                                        onMouseOut={e => !canContinue && (e.currentTarget.style.background = answeredCorrectly && i === activeQuiz.correctAnswerIndex ? '#16a34a' : '#ffffff')}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>

                            {hasAttempted && (
                                <div style={{ marginTop: '1.5rem' }}>
                                    {canContinue ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <p style={{ color: answeredCorrectly ? '#4ade80' : '#fbbf24', fontWeight: 600, margin: 0 }}>
                                                {answeredCorrectly ? 'Correct! You can now continue.' : 'Incorrect, but the author allows you to continue.'}
                                            </p>
                                            <button
                                                onClick={resumeVideo}
                                                style={{ background: '#8b1a1a', color: '#fff', padding: '0.75rem 2rem', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, animation: 'pulse 2s infinite' }}
                                            >
                                                Continue Video
                                            </button>
                                        </div>
                                    ) : answeredIncorrectly ? (
                                        <p style={{ color: '#f87171', fontWeight: 600 }}>Incorrect answer. Please try again.</p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {!readOnly && (
                <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>Quiz Interactions</h4>
                        <button onClick={addInteraction} style={{ background: '#991b1b', color: '#fff', padding: '0.4rem 0.8rem', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem' }}>+ Add Quiz Point</button>
                    </div>
                    <p style={{ color: '#d4d4d4', margin: '0 0 0.85rem 0', fontSize: '0.85rem' }}>
                        The counter is the number of seconds into the video when the quiz will pop up.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {interactions.map(int => (
                            <div key={int.id} style={{ background: '#0a0000', borderLeft: '4px solid #991b1b', padding: '1rem', borderRadius: '0 6px 6px 0', border: '1px solid #262626', borderLeftWidth: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <input
                                        type="number"
                                        value={int.timestamp}
                                        onChange={e => updateInteraction(int.id, { timestamp: Number(e.target.value) })}
                                        placeholder="Timestamp (seconds)"
                                        style={{ background: '#171717', color: '#fff', border: '1px solid #404040', padding: '0.4rem 0.5rem', borderRadius: 4, width: '140px', outline: 'none' }}
                                    />
                                    <button onClick={() => removeInteraction(int.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>
                                <input
                                    value={int.question}
                                    onChange={e => updateInteraction(int.id, { question: e.target.value })}
                                    placeholder="Question text"
                                    style={{ width: '100%', background: '#171717', color: '#fff', border: '1px solid #404040', padding: '0.5rem', borderRadius: 4, marginBottom: '0.75rem', outline: 'none' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#d4d4d4', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={int.requireCorrectToContinue !== false}
                                            onChange={(e) => updateInteraction(int.id, { requireCorrectToContinue: e.target.checked })}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        Learner must answer correctly to continue
                                    </label>
                                    {int.options.map((opt, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input
                                                type="radio"
                                                name={`quiz-${int.id}`}
                                                checked={int.correctAnswerIndex === i}
                                                onChange={() => updateInteraction(int.id, { correctAnswerIndex: i })}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <input
                                                value={opt}
                                                onChange={e => {
                                                    const newOpts = [...int.options];
                                                    newOpts[i] = e.target.value;
                                                    updateInteraction(int.id, { options: newOpts });
                                                }}
                                                style={{ flex: 1, background: '#fff', color: '#1a0a0a', border: '1px solid #ead0d0', padding: '0.4rem 0.5rem', borderRadius: 4, outline: 'none' }}
                                            />
                                            <button onClick={() => {
                                                const newOpts = int.options.filter((_, idx) => idx !== i);
                                                updateInteraction(int.id, {
                                                    options: newOpts,
                                                    correctAnswerIndex: int.correctAnswerIndex >= i ? Math.max(0, int.correctAnswerIndex - 1) : int.correctAnswerIndex
                                                });
                                            }} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => updateInteraction(int.id, { options: [...int.options, ""] })} style={{ alignSelf: 'flex-start', background: 'transparent', color: '#991b1b', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginTop: '0.25rem' }}>+ Add Option</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}