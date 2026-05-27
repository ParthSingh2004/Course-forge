import React, { useState, useEffect } from 'react';
import { Sparkles, X, Sliders, Image, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

const STATUS_MESSAGES = [
    "Gemini 2.5 Pro is brainstorming the course structure...",
    "Outlining slide flow and pedagogical objectives...",
    "Drafting detailed educational text and headings...",
    "Creating interactive checks (quizzes, matching, fill-in-blanks)...",
    "Designing canvas layout grids and positioning coordinates...",
    "Fetching matching stock photos from Unsplash...",
    "Generating custom high-definition images using Imagen AI...",
    "Running final content checks and packing JSON..."
];

export default function AICourseGeneratorModal({ isOpen, onClose, onGenerate }) {
    const [prompt, setPrompt] = useState('');
    const [numSlides, setNumSlides] = useState(5);
    const [imageType, setImageType] = useState('unsplash'); // 'unsplash' or 'ai'
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Rotate status messages when generating
    useEffect(() => {
        let interval;
        if (isGenerating) {
            interval = setInterval(() => {
                setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
            }, 4500);
        } else {
            setStatusIndex(0);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Timer when generating
    useEffect(() => {
        let timer;
        if (isGenerating) {
            setElapsedTime(0);
            timer = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(timer);
    }, [isGenerating]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsGenerating(true);
        try {
            await onGenerate(prompt, numSlides, imageType);
            onClose();
        } catch (err) {
            alert(err.message || 'Failed to generate course.');
        } finally {
            setIsGenerating(false);
        }
    };

    const suggestedTopics = [
        "Workplace Fire Safety & Evacuation",
        "Introduction to Python Programming",
        "Effective Communication in Remote Teams",
        "Customer Service & De-escalation Techniques",
        "Understanding Web Accessibility (WCAG 2.2)"
    ];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            fontFamily: "'DM Sans', 'Inter', sans-serif",
            padding: '16px',
            boxSizing: 'border-box'
        }}>
            {/* --- LOADING SCREEN --- */}
            {isGenerating ? (
                <div style={{
                    width: '100%',
                    maxWidth: '540px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    padding: '40px',
                    textAlign: 'center',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    color: '#ffffff',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ position: 'relative', marginBottom: '32px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            border: '4px solid rgba(99, 102, 241, 0.15)',
                            borderTop: '4px solid #6366f1',
                            animation: 'spin 1.2s linear infinite'
                        }} />
                        <Sparkles style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '32px',
                            height: '32px',
                            color: '#818cf8',
                            animation: 'pulse 2s ease-in-out infinite'
                        }} />
                    </div>

                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        marginBottom: '12px',
                        background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Generating Your Course
                    </h2>

                    <p style={{
                        fontSize: '0.95rem',
                        color: '#94a3b8',
                        minHeight: '48px',
                        lineHeight: '1.5',
                        maxWidth: '400px',
                        marginBottom: '24px'
                    }}>
                        {STATUS_MESSAGES[statusIndex]}
                    </p>

                    {/* Progress Bar */}
                    <div style={{
                        width: '100%',
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            width: `${Math.min(95, elapsedTime * 2.5)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                            borderRadius: '10px',
                            transition: 'width 1s ease-out'
                        }} />
                    </div>

                    <div style={{
                        fontSize: '0.8rem',
                        color: '#64748b',
                        fontWeight: 600,
                        letterSpacing: '0.05em'
                    }}>
                        ELAPSED TIME: {elapsedTime}s (typically takes 15-45s)
                    </div>
                </div>
            ) : (
                /* --- FORM DIALOG --- */
                <div style={{
                    width: '100%',
                    maxWidth: '620px',
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(99, 102, 241, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: '#0f172a'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '24px 32px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                        borderBottom: '1px solid rgba(99, 102, 241, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                            }}>
                                <Sparkles style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                                    AI Course Generator
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 500 }}>
                                    Powered by Gemini 2.5 Pro & Imagen 4.0
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b',
                                transition: 'background-color 0.2s, color 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                        >
                            <X style={{ width: '20px', height: '20px' }} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Topic Input */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                What is your course about?
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the topic in detail (e.g., 'A course on active listening skills for project managers, including a feedback quiz...')"
                                required
                                rows={3}
                                style={{
                                    width: '100%',
                                    borderRadius: '12px',
                                    border: '1.5px solid #cbd5e1',
                                    padding: '12px 16px',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                    resize: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {/* Suggestions */}
                        {prompt.trim() === '' && (
                            <div style={{ marginTop: '-8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                                    Or try one of these topics:
                                </span>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {suggestedTopics.map((topic) => (
                                        <button
                                            key={topic}
                                            type="button"
                                            onClick={() => setPrompt(topic)}
                                            style={{
                                                border: '1px solid #e2e8f0',
                                                background: '#f8fafc',
                                                borderRadius: '20px',
                                                padding: '6px 14px',
                                                fontSize: '0.78rem',
                                                color: '#475569',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#f8fafc'; }}
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Slide count & Image selection */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            {/* Slide Count */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Slide Count: <span style={{ color: '#6366f1', fontWeight: 800 }}>{numSlides}</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        type="range"
                                        min="3"
                                        max="10"
                                        value={numSlides}
                                        onChange={(e) => setNumSlides(parseInt(e.target.value))}
                                        style={{
                                            flex: 1,
                                            height: '6px',
                                            borderRadius: '5px',
                                            background: '#cbd5e1',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                                        {numSlides}
                                    </span>
                                </div>
                            </div>

                            {/* Image Preference */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Image Settings
                                </label>
                                <div style={{
                                    display: 'flex',
                                    background: '#f1f5f9',
                                    borderRadius: '10px',
                                    padding: '4px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setImageType('unsplash')}
                                        style={{
                                            flex: 1,
                                            border: 'none',
                                            background: imageType === 'unsplash' ? '#ffffff' : 'transparent',
                                            color: imageType === 'unsplash' ? '#0f172a' : '#64748b',
                                            boxShadow: imageType === 'unsplash' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Image style={{ width: '14px', height: '14px' }} />
                                        Stock Photo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImageType('ai')}
                                        style={{
                                            flex: 1,
                                            border: 'none',
                                            background: imageType === 'ai' ? '#ffffff' : 'transparent',
                                            color: imageType === 'ai' ? '#0f172a' : '#64748b',
                                            boxShadow: imageType === 'ai' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Sparkles style={{ width: '14px', height: '14px', color: imageType === 'ai' ? '#a855f7' : '#64748b' }} />
                                        Imagen AI
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '16px',
                                borderRadius: '14px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                color: '#ffffff',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.45)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.35)'; }}
                        >
                            <Sparkles style={{ width: '18px', height: '18px' }} />
                            Generate Complete Course
                        </button>
                    </form>
                </div>
            )}

            {/* Animations Injection */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.15); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            ` }} />
        </div>
    );
}
