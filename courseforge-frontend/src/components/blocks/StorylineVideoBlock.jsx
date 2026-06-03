import React, { useState, useRef, useEffect } from 'react';
import { FileUp, Trash2, Plus, Play, Pause, Move, Settings, X, RefreshCw, Eye, User } from 'lucide-react';
import MandatorySelect from '../ui/MandatorySelect';

export default function StorylineVideoBlock({ block, onUpdate, readOnly, slides = [] }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedOverlayId, setSelectedOverlayId] = useState(null);

    const overlays = block.overlays || [];

    // Sync playback states
    const handleTimeUpdate = (e) => {
        setCurrentTime(e.target.currentTime);
    };

    const handleLoadedMetadata = (e) => {
        setDuration(e.target.duration);
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
            setSelectedOverlayId(null); // Deselect on play
        }
    };

    // File Upload Handler
    const handleUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            onUpdate(block.id, { 
                videoUrl: reader.result, 
                isLocal: true, 
                fileName: file.name,
                overlays: block.overlays || []
            });
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    // Overlay CRUD
    const addOverlay = (type) => {
        const triggerAt = Math.round(currentTime * 10) / 10;
        const defaultEnd = Math.min(Math.round((triggerAt + 5) * 10) / 10, duration || triggerAt + 5);
        const newOverlay = {
            id: Date.now().toString(),
            type, // 'button' | 'flashcard' | 'dialogue' | 'avatar'
            x: 50.0,
            y: type === 'avatar' ? 80.0 : 50.0,
            startTime: triggerAt,
            endTime: defaultEnd,
            text: type === 'button' ? 'Click Me' : type === 'flashcard' ? 'Question?' : type === 'avatar' ? 'Hello! I\'m here to guide you through this section.' : 'Prompt question:',
            color: '#8b1a1a',
            textColor: '#ffffff',
            action: 'resume',
            targetSlideId: '',
            errorMsg: 'Incorrect! Let\'s watch again.',
            flashcardBackText: 'Answer details go here.',
            avatarSrc: '',
            avatarName: type === 'avatar' ? 'Instructor' : '',
            side: 'left',
            dialogueOptions: type === 'dialogue' ? [
                { text: 'Correct Answer', action: 'resume', targetSlideId: '', errorMsg: '' },
                { text: 'Incorrect Answer', action: 'error', targetSlideId: '', errorMsg: 'Oops! Let\'s watch again.' }
            ] : []
        };
        const updated = [...overlays, newOverlay];
        onUpdate(block.id, { overlays: updated });
        setSelectedOverlayId(newOverlay.id);
    };

    const updateOverlay = (id, fields) => {
        const updated = overlays.map(ov => ov.id === id ? { ...ov, ...fields } : ov);
        onUpdate(block.id, { overlays: updated });
    };

    const deleteOverlay = (id) => {
        onUpdate(block.id, { overlays: overlays.filter(ov => ov.id !== id) });
        if (selectedOverlayId === id) setSelectedOverlayId(null);
    };

    // Pointer-based absolute dragging
    const handleDragStart = (e, overlayId) => {
        if (readOnly) return;
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        const handleDragMove = (moveEvent) => {
            const newX = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
            const newY = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
            
            // Snap rounding to 1 decimal place
            updateOverlay(overlayId, { 
                x: Math.round(newX * 10) / 10, 
                y: Math.round(newY * 10) / 10 
            });
        };

        const handleDragEnd = () => {
            window.removeEventListener('pointermove', handleDragMove);
            window.removeEventListener('pointerup', handleDragEnd);
        };

        window.addEventListener('pointermove', handleDragMove);
        window.addEventListener('pointerup', handleDragEnd);
    };

    const selectedOverlay = overlays.find(ov => ov.id === selectedOverlayId);

    // Format timestamps beautifully
    const formatTime = (secs) => {
        if (isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            background: readOnly ? 'transparent' : '#0e0e0f', 
            padding: readOnly ? 0 : '1.25rem', 
            borderRadius: 12,
            border: readOnly ? 'none' : '1px solid #1f1f22',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            gap: '1rem'
        }}>
            
            {/* --- Top Upload Bar --- */}
            {!readOnly && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '0.65rem 1rem', 
                    background: '#161618', 
                    border: '1px solid #2d2d30', 
                    borderRadius: 8,
                    gap: '1rem' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                        <MandatorySelect
                            value={!!block.mandatory}
                            onChange={(mandatory) => onUpdate(block.id, { mandatory })}
                            size="compact"
                        />
                        <div style={{ color: '#a1a1aa', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {block.fileName ? `Uploaded: ${block.fileName}` : 'Interactive Storyline Video: Upload an MP4 to overlay branching hotspots.'}
                        </div>
                    </div>
                    <label style={{ 
                        background: '#222', 
                        color: '#fff', 
                        padding: '0.45rem 1rem', 
                        border: '1px solid #333', 
                        borderRadius: 6, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        transition: 'background 0.15s'
                    }}>
                        <FileUp style={{ width: 14, height: 14 }} /> Upload MP4
                        <input type="file" accept="video/mp4" onChange={handleUpload} style={{ display: 'none' }} />
                    </label>
                </div>
            )}

            {/* --- Main Video Workstation (Split Editor) --- */}
            {block.videoUrl ? (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: readOnly ? '1fr' : '1.8fr 1.2fr', 
                    gap: '1.25rem',
                    alignItems: 'start'
                }}>
                    
                    {/* Left Panel: Visual Video Display */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div 
                            ref={containerRef}
                            style={{ 
                                position: 'relative', 
                                width: '100%', 
                                borderRadius: 8, 
                                overflow: 'hidden', 
                                background: '#000',
                                border: '1px solid #1f1f22',
                                aspectRatio: '16/9'
                            }}
                        >
                            <video
                                ref={videoRef}
                                src={block.videoUrl}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onClick={togglePlay}
                            />

                            {/* Editor Overlays Placement Layer */}
                            {!readOnly && (
                                <div style={{ 
                                    position: 'absolute', 
                                    inset: 0, 
                                    pointerEvents: 'none', // click through to play/pause
                                    zIndex: 5 
                                }}>
                                    {overlays.map((ov) => {
                                        // Show within the authored [startTime, endTime] window, or always if selected
                                        const ovEnd = ov.endTime != null ? ov.endTime : ov.startTime + 5;
                                        const isVisible = selectedOverlayId === ov.id ||
                                            (currentTime >= ov.startTime && currentTime <= ovEnd);

                                        if (!isVisible) return null;

                                        const isSelected = selectedOverlayId === ov.id;

                                        return (
                                            <div
                                                key={ov.id}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${ov.x}%`,
                                                    top: `${ov.y}%`,
                                                    transform: 'translate(-50%, -50%)',
                                                    pointerEvents: 'auto',
                                                    cursor: isSelected ? 'move' : 'pointer',
                                                    zIndex: isSelected ? 30 : 20,
                                                    transition: 'transform 0.15s ease'
                                                }}
                                                onPointerDown={(e) => {
                                                    setSelectedOverlayId(ov.id);
                                                    handleDragStart(e, ov.id);
                                                }}
                                            >
                                                {/* Render Overlay Element Previews */}
                                                {ov.type === 'button' && (
                                                    <button
                                                        type="button"
                                                        style={{
                                                            background: ov.color || '#8b1a1a',
                                                            color: ov.textColor || '#ffffff',
                                                            padding: '0.45rem 1rem',
                                                            borderRadius: 6,
                                                            border: isSelected ? '2px dashed #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 600,
                                                            boxShadow: isSelected ? '0 0 12px #0284c7' : '0 4px 10px rgba(0,0,0,0.3)',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {ov.text || 'Button'}
                                                    </button>
                                                )}

                                                {ov.type === 'flashcard' && (
                                                    <div style={{
                                                        width: 140,
                                                        height: 90,
                                                        background: 'linear-gradient(135deg, #1d1010, #4c1d1d)',
                                                        border: isSelected ? '2.5px dashed #38bdf8' : '1px solid #5c2c2c',
                                                        borderRadius: 8,
                                                        padding: '0.5rem',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        boxShadow: '0 6px 14px rgba(0,0,0,0.3)',
                                                    }}>
                                                        <div style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                            {ov.text || 'Question?'}
                                                        </div>
                                                        <div style={{ color: '#fca5a5', fontSize: '0.55rem', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                            🎴 Flip Card
                                                        </div>
                                                    </div>
                                                )}

                                                {ov.type === 'dialogue' && (
                                                    <div style={{
                                                        background: '#ffffff',
                                                        border: isSelected ? '2.5px dashed #38bdf8' : '1px solid #ead0d0',
                                                        padding: '0.6rem 0.8rem',
                                                        borderRadius: 8,
                                                        width: 160,
                                                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                                        color: '#1a0a0a',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.4rem'
                                                    }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8b1a1a' }}>💬 Dialogue Prompt</div>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 500, opacity: 0.9, color: '#1a0a0a' }}>{ov.text || 'Prompt...'}</div>
                                                    </div>
                                                )}

                                                {ov.type === 'avatar' && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-end',
                                                        gap: 8,
                                                        flexDirection: ov.side === 'right' ? 'row-reverse' : 'row',
                                                        filter: isSelected ? 'drop-shadow(0 0 8px #38bdf8)' : 'none',
                                                    }}>
                                                        {/* Avatar circle */}
                                                        <div style={{
                                                            width: 48, height: 48, borderRadius: '50%',
                                                            border: isSelected ? '2px dashed #38bdf8' : '2.5px solid #8b1a1a',
                                                            overflow: 'hidden', flexShrink: 0,
                                                            background: '#1a0a0a',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                                        }}>
                                                            {ov.avatarSrc
                                                                ? <img src={ov.avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                : <User size={22} color="#8b1a1a" />}
                                                        </div>
                                                        {/* Speech bubble */}
                                                        <div style={{
                                                            background: '#fff',
                                                            border: '1px solid #ead0d0',
                                                            borderRadius: 10,
                                                            borderBottomLeftRadius: ov.side === 'right' ? 10 : 0,
                                                            borderBottomRightRadius: ov.side === 'right' ? 0 : 10,
                                                            padding: '6px 10px',
                                                            fontSize: '0.63rem',
                                                            fontWeight: 500,
                                                            color: '#1a0a0a',
                                                            maxWidth: 130,
                                                            wordBreak: 'break-word',
                                                            lineHeight: 1.4,
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
                                                        }}>
                                                            {ov.avatarName && <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#8b1a1a', marginBottom: 2 }}>{ov.avatarName}</div>}
                                                            {ov.text || 'Hello!'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Custom Scrubber Timeline */}
                        {!readOnly && (
                            <div style={{ background: '#131315', padding: '0.75rem', borderRadius: 8, border: '1px solid #1f1f22' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                    <button 
                                        onClick={togglePlay}
                                        style={{ 
                                            background: '#8b1a1a', 
                                            color: '#fff', 
                                            border: 'none', 
                                            width: 32, 
                                            height: 32, 
                                            borderRadius: '50%', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                    </button>
                                    <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace', minWidth: 80 }}>
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </div>
                                    <div style={{ flex: 1, position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
                                        {/* Slider bar */}
                                        <input
                                            type="range"
                                            min={0}
                                            max={duration || 100}
                                            step={0.1}
                                            value={currentTime}
                                            onChange={(e) => {
                                                if (videoRef.current) {
                                                    videoRef.current.currentTime = parseFloat(e.target.value);
                                                    setCurrentTime(parseFloat(e.target.value));
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                accentColor: '#8b1a1a',
                                                cursor: 'pointer',
                                                zIndex: 15,
                                                background: 'transparent'
                                            }}
                                        />

                                        {/* Overlay markers */}
                                        <div style={{ position: 'absolute', left: 0, right: 0, height: 6, background: '#2c2c2e', borderRadius: 3, top: 11, pointerEvents: 'none' }} />
                                        <div style={{ 
                                            position: 'absolute', 
                                            left: 0, 
                                            width: `${duration ? (currentTime / duration) * 100 : 0}%`, 
                                            height: 6, 
                                            background: '#8b1a1a', 
                                            borderRadius: '3px 0 0 3px', 
                                            top: 11, 
                                            pointerEvents: 'none' 
                                        }} />
                                        
                                        {overlays.map((ov) => {
                                            const startPct = duration ? (ov.startTime / duration) * 100 : 0;
                                            const ovEnd = ov.endTime != null ? ov.endTime : ov.startTime + 5;
                                            const endPct = duration ? Math.min((ovEnd / duration) * 100, 100) : startPct;
                                            const widthPct = Math.max(endPct - startPct, 0.5);
                                            const isSel = ov.id === selectedOverlayId;
                                            return (
                                                <div
                                                    key={ov.id}
                                                    title={`Overlay: ${formatTime(ov.startTime)} → ${formatTime(ovEnd)}`}
                                                    onClick={() => {
                                                        if (videoRef.current) {
                                                            videoRef.current.currentTime = ov.startTime;
                                                            setCurrentTime(ov.startTime);
                                                        }
                                                        setSelectedOverlayId(ov.id);
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${startPct}%`,
                                                        width: `${widthPct}%`,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        background: isSel
                                                            ? 'linear-gradient(90deg,#38bdf8,#7dd3fc)'
                                                            : 'linear-gradient(90deg,#e11d48,#fb7185)',
                                                        border: isSel ? '1px solid #bae6fd' : '1px solid rgba(255,255,255,0.35)',
                                                        top: 10,
                                                        cursor: 'pointer',
                                                        zIndex: 20,
                                                        boxShadow: isSel ? '0 0 6px #38bdf8' : 'none',
                                                        transition: 'background 0.15s, box-shadow 0.15s'
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Add overlay buttons */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button 
                                        onClick={() => addOverlay('button')}
                                        style={{ background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', fontSize: '0.72rem', padding: '0.35rem 0.65rem', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                        <Plus size={12} /> Add Button
                                    </button>
                                    <button 
                                        onClick={() => addOverlay('flashcard')}
                                        style={{ background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', fontSize: '0.72rem', padding: '0.35rem 0.65rem', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                        <Plus size={12} /> Add Flashcard
                                    </button>
                                    <button 
                                        onClick={() => addOverlay('dialogue')}
                                        style={{ background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', fontSize: '0.72rem', padding: '0.35rem 0.65rem', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                        <Plus size={12} /> Add Prompt Dialogue
                                    </button>
                                    <button 
                                        onClick={() => addOverlay('avatar')}
                                        style={{ background: '#1c1c1f', border: '1px solid #4a3040', color: '#e879a0', fontSize: '0.72rem', padding: '0.35rem 0.65rem', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                        <User size={12} /> Add Avatar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Overlay Properties Inspector */}
                    {!readOnly && (
                        <div style={{ 
                            background: '#131315', 
                            border: '1px solid #1f1f22', 
                            borderRadius: 8, 
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            minHeight: 280
                        }}>
                            {selectedOverlay ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '0.5rem' }}>
                                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Settings size={14} className="text-red-500" /> Overlay Settings
                                        </div>
                                        <button 
                                            onClick={() => deleteOverlay(selectedOverlay.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                                            title="Delete Overlay"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>

                                    {/* Start Time slider */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                                            Trigger Start: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{formatTime(selectedOverlay.startTime)}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={duration || 100}
                                            step={0.1}
                                            value={selectedOverlay.startTime}
                                            onChange={(e) => {
                                                const newStart = parseFloat(e.target.value);
                                                const currentEnd = selectedOverlay.endTime != null ? selectedOverlay.endTime : selectedOverlay.startTime + 5;
                                                // Keep endTime at least 0.5s after startTime
                                                const newEnd = Math.max(currentEnd, newStart + 0.5);
                                                updateOverlay(selectedOverlay.id, { startTime: newStart, endTime: Math.min(newEnd, duration || newEnd) });
                                            }}
                                            style={{ width: '100%', accentColor: '#ef4444' }}
                                        />
                                    </div>

                                    {/* End Time slider */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                                            Trigger End: <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{formatTime(selectedOverlay.endTime != null ? selectedOverlay.endTime : selectedOverlay.startTime + 5)}</span>
                                            <span style={{ color: '#4b5563', fontWeight: 400, marginLeft: '0.4rem' }}>
                                                ({((selectedOverlay.endTime ?? selectedOverlay.startTime + 5) - selectedOverlay.startTime).toFixed(1)}s visible)
                                            </span>
                                        </label>
                                        <input
                                            type="range"
                                            min={selectedOverlay.startTime + 0.5}
                                            max={duration || 100}
                                            step={0.1}
                                            value={selectedOverlay.endTime != null ? selectedOverlay.endTime : selectedOverlay.startTime + 5}
                                            onChange={(e) => updateOverlay(selectedOverlay.id, { endTime: parseFloat(e.target.value) })}
                                            style={{ width: '100%', accentColor: '#38bdf8' }}
                                        />
                                    </div>

                                    {/* Text field — hidden for avatar (uses dedicated speech text field below) */}
                                    {selectedOverlay.type !== 'avatar' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                                                {selectedOverlay.type === 'button' ? 'Button Label' : selectedOverlay.type === 'flashcard' ? 'Question (Front)' : 'Dialogue Prompt Question'}
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedOverlay.text || ''}
                                                onChange={(e) => updateOverlay(selectedOverlay.id, { text: e.target.value })}
                                                style={{ width: '100%', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none' }}
                                            />
                                        </div>
                                    )}

                                    {/* TYPE-SPECIFIC CONTROLS */}
                                    {selectedOverlay.type === 'button' && (
                                        <>
                                            {/* Button actions */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                                                    Interaction Click Action
                                                </label>
                                                <select
                                                    value={selectedOverlay.action || 'resume'}
                                                    onChange={(e) => updateOverlay(selectedOverlay.id, { action: e.target.value })}
                                                    style={{ width: '100%', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none' }}
                                                >
                                                    <option value="resume">Resume Video Playback</option>
                                                    <option value="next">Go to Next Slide</option>
                                                    <option value="slide">Jump to Specific Slide</option>
                                                    <option value="error">Trigger Error (Restart Video)</option>
                                                </select>
                                            </div>

                                            {/* Conditionally reveal action details */}
                                            {selectedOverlay.action === 'slide' && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                                                        Target Slide Jump
                                                    </label>
                                                    <select
                                                        value={selectedOverlay.targetSlideId || ''}
                                                        onChange={(e) => updateOverlay(selectedOverlay.id, { targetSlideId: e.target.value })}
                                                        style={{ width: '100%', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none' }}
                                                    >
                                                        <option value="">Choose Target Slide...</option>
                                                        {slides.map((s, idx) => (
                                                            <option key={s.id} value={s.id}>Slide {idx + 1}: {s.title || 'Untitled'}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {selectedOverlay.action === 'error' && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                                                        Error Message Toast
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={selectedOverlay.errorMsg || ''}
                                                        onChange={(e) => updateOverlay(selectedOverlay.id, { errorMsg: e.target.value })}
                                                        style={{ width: '100%', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none' }}
                                                    />
                                                </div>
                                            )}

                                            {/* Button aesthetics */}
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.65rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.25rem' }}>Btn BG</label>
                                                    <input
                                                        type="color"
                                                        value={selectedOverlay.color || '#8b1a1a'}
                                                        onChange={(e) => updateOverlay(selectedOverlay.id, { color: e.target.value })}
                                                        style={{ width: '100%', height: 32, padding: 2, background: '#1c1c1f', border: '1px solid #2d2d30', borderRadius: 4, cursor: 'pointer' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.65rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.25rem' }}>Btn Text</label>
                                                    <input
                                                        type="color"
                                                        value={selectedOverlay.textColor || '#ffffff'}
                                                        onChange={(e) => updateOverlay(selectedOverlay.id, { textColor: e.target.value })}
                                                        style={{ width: '100%', height: 32, padding: 2, background: '#1c1c1f', border: '1px solid #2d2d30', borderRadius: 4, cursor: 'pointer' }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {selectedOverlay.type === 'flashcard' && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                                                Flashcard Answer (Back side)
                                            </label>
                                            <textarea
                                                value={selectedOverlay.flashcardBackText || ''}
                                                onChange={(e) => updateOverlay(selectedOverlay.id, { flashcardBackText: e.target.value })}
                                                rows={3}
                                                style={{ width: '100%', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none', resize: 'none' }}
                                            />
                                        </div>
                                    )}

                                    {/* ── Avatar Controls ── */}
                                    {selectedOverlay.type === 'avatar' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                                            {/* Photo upload */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.45rem' }}>Character Photo</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: 60, height: 60, borderRadius: '50%',
                                                        border: '2px solid #8b1a1a',
                                                        overflow: 'hidden', flexShrink: 0,
                                                        background: '#1a0a0a',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {selectedOverlay.avatarSrc
                                                            ? <img src={selectedOverlay.avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : <User size={26} color="#8b1a1a" />}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        <label style={{
                                                            background: '#1c1c1f', border: '1px dashed #555',
                                                            borderRadius: 6, padding: '5px 12px',
                                                            cursor: 'pointer', color: '#a1a1aa',
                                                            fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 5
                                                        }}>
                                                            <FileUp size={11} /> Upload Photo
                                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => updateOverlay(selectedOverlay.id, { avatarSrc: reader.result });
                                                                reader.readAsDataURL(file);
                                                                e.target.value = null;
                                                            }} />
                                                        </label>
                                                        {selectedOverlay.avatarSrc && (
                                                            <button onClick={() => updateOverlay(selectedOverlay.id, { avatarSrc: '' })}
                                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.68rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                                                                ✕ Remove photo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Character name */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>Character Name</label>
                                                <input
                                                    type="text"
                                                    value={selectedOverlay.avatarName || ''}
                                                    onChange={(e) => updateOverlay(selectedOverlay.id, { avatarName: e.target.value })}
                                                    placeholder="e.g. Dr. Smith"
                                                    style={{ width: '100%', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none' }}
                                                />
                                            </div>

                                            {/* Speech text */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>Speech / Dialogue</label>
                                                <textarea
                                                    value={selectedOverlay.text || ''}
                                                    onChange={(e) => updateOverlay(selectedOverlay.id, { text: e.target.value })}
                                                    rows={3}
                                                    placeholder="What does the character say?"
                                                    style={{ width: '100%', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none', resize: 'none' }}
                                                />
                                            </div>

                                            {/* Side toggle */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>Character Position</label>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {['left', 'right'].map(s => (
                                                        <button key={s}
                                                            onClick={() => updateOverlay(selectedOverlay.id, { side: s })}
                                                            style={{
                                                                flex: 1, padding: '0.4rem',
                                                                borderRadius: 5, fontSize: '0.75rem', fontWeight: 600,
                                                                cursor: 'pointer', border: '1px solid',
                                                                background: (selectedOverlay.side || 'left') === s ? '#8b1a1a' : '#1c1c1f',
                                                                color: (selectedOverlay.side || 'left') === s ? '#fff' : '#a1a1aa',
                                                                borderColor: (selectedOverlay.side || 'left') === s ? '#8b1a1a' : '#2d2d30',
                                                            }}>
                                                            {s === 'left' ? '◀ Left' : 'Right ▶'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* After Continue action */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>After Continue</label>
                                                <select
                                                    value={selectedOverlay.action || 'resume'}
                                                    onChange={(e) => updateOverlay(selectedOverlay.id, { action: e.target.value })}
                                                    style={{ width: '100%', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none' }}
                                                >
                                                    <option value="resume">Resume Video</option>
                                                    <option value="next">Go to Next Slide</option>
                                                    <option value="slide">Jump to Specific Slide</option>
                                                </select>
                                                {selectedOverlay.action === 'slide' && (
                                                    <select
                                                        value={selectedOverlay.targetSlideId || ''}
                                                        onChange={(e) => updateOverlay(selectedOverlay.id, { targetSlideId: e.target.value })}
                                                        style={{ width: '100%', marginTop: '0.35rem', background: '#1c1c1f', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.4rem 0.5rem', fontSize: '0.78rem', outline: 'none' }}
                                                    >
                                                        <option value="">Choose Target Slide...</option>
                                                        {slides.map((s, idx) => (
                                                            <option key={s.id} value={s.id}>Slide {idx + 1}: {s.title || 'Untitled'}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedOverlay.type === 'dialogue' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600 }}>Dialogue Answers</span>
                                                <button
                                                    onClick={() => {
                                                        const currentOpts = selectedOverlay.dialogueOptions || [];
                                                        updateOverlay(selectedOverlay.id, {
                                                            dialogueOptions: [...currentOpts, { text: 'New Option', action: 'resume', targetSlideId: '', errorMsg: '' }]
                                                        });
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                                                >
                                                    + Add Option
                                                </button>
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.50rem', maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                                                {(selectedOverlay.dialogueOptions || []).map((opt, oIdx) => (
                                                    <div 
                                                        key={oIdx} 
                                                        style={{ 
                                                            background: '#1c1c1f', 
                                                            border: '1px solid #28282b', 
                                                            borderRadius: 6, 
                                                            padding: '0.5rem',
                                                            display: 'flex', 
                                                            flexDirection: 'column', 
                                                            gap: '0.4rem' 
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                                            <input
                                                                type="text"
                                                                value={opt.text}
                                                                onChange={(e) => {
                                                                    const updatedOpts = [...selectedOverlay.dialogueOptions];
                                                                    updatedOpts[oIdx].text = e.target.value;
                                                                    updateOverlay(selectedOverlay.id, { dialogueOptions: updatedOpts });
                                                                }}
                                                                placeholder="Option text"
                                                                style={{ flex: 1, background: '#131315', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.25rem 0.4rem', fontSize: '0.75rem', outline: 'none' }}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const updatedOpts = selectedOverlay.dialogueOptions.filter((_, idx) => idx !== oIdx);
                                                                    updateOverlay(selectedOverlay.id, { dialogueOptions: updatedOpts });
                                                                }}
                                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                        
                                                        {/* Choice Action config */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.35rem' }}>
                                                            <select
                                                                value={opt.action}
                                                                onChange={(e) => {
                                                                    const updatedOpts = [...selectedOverlay.dialogueOptions];
                                                                    updatedOpts[oIdx].action = e.target.value;
                                                                    updateOverlay(selectedOverlay.id, { dialogueOptions: updatedOpts });
                                                                }}
                                                                style={{ width: '100%', background: '#131315', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.25rem', fontSize: '0.7rem', outline: 'none' }}
                                                            >
                                                                <option value="resume">Resume Playback</option>
                                                                <option value="next">Go to Next</option>
                                                                <option value="slide">Jump to Slide</option>
                                                                <option value="error">Error (Restart)</option>
                                                            </select>
                                                            
                                                            {opt.action === 'slide' && (
                                                                <select
                                                                    value={opt.targetSlideId || ''}
                                                                    onChange={(e) => {
                                                                        const updatedOpts = [...selectedOverlay.dialogueOptions];
                                                                        updatedOpts[oIdx].targetSlideId = e.target.value;
                                                                        updateOverlay(selectedOverlay.id, { dialogueOptions: updatedOpts });
                                                                    }}
                                                                    style={{ width: '100%', background: '#131315', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.25rem', fontSize: '0.7rem', outline: 'none' }}
                                                                >
                                                                    <option value="">Slide...</option>
                                                                    {slides.map((s, idx) => (
                                                                        <option key={s.id} value={s.id}>Slide {idx + 1}</option>
                                                                    ))}
                                                                </select>
                                                            )}

                                                            {opt.action === 'error' && (
                                                                <input
                                                                    type="text"
                                                                    value={opt.errorMsg || ''}
                                                                    onChange={(e) => {
                                                                        const updatedOpts = [...selectedOverlay.dialogueOptions];
                                                                        updatedOpts[oIdx].errorMsg = e.target.value;
                                                                        updateOverlay(selectedOverlay.id, { dialogueOptions: updatedOpts });
                                                                    }}
                                                                    placeholder="Error msg"
                                                                    style={{ width: '100%', background: '#131315', border: '1px solid #2d2d30', color: '#fff', borderRadius: 4, padding: '0.25rem 0.4rem', fontSize: '0.7rem', outline: 'none' }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    color: '#52525b', 
                                    textAlign: 'center',
                                    gap: '0.5rem',
                                    padding: '1rem'
                                }}>
                                    <Move size={24} />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>
                                        Pause the video and select/add an overlay marker to configure its interactive properties.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            ) : (
                <div style={{ 
                    width: '100%', 
                    height: 240, 
                    background: '#161618', 
                    border: '1px dashed #2d2d30', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#52525b', 
                    borderRadius: 8,
                    gap: '0.75rem' 
                }}>
                    <Eye size={36} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#71717a' }}>No video uploaded yet</div>
                </div>
            )}

        </div>
    );
}
