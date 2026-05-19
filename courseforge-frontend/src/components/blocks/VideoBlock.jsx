import React, { useState } from 'react';
import { Play, FileUp, Video, X } from 'lucide-react';
import MandatorySelect from '../ui/MandatorySelect';

export default function VideoBlock({ block, onUpdate }) {
    const [urlDraft, setUrlDraft] = useState(block.videoUrl || '');

    const applyUrl = () => {
        const nextUrl = urlDraft.trim();
        onUpdate(block.id, { videoUrl: nextUrl, isLocal: false });
    };

    const handleUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUri = reader.result;
            setUrlDraft(file.name);
            onUpdate(block.id, { videoUrl: dataUri, isLocal: true, fileName: file.name });
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    const getEmbedUrl = (url) => {
        if (!url) return null;
        const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        return null;
    };

    const embedUrl = getEmbedUrl(block.videoUrl);

    return (
        <div className="cf-video-block">
            <div className="cf-video-toolbar">
                <span className="cf-video-toolbar-label">VIDEO</span>
                <input
                    className="cf-video-url-input"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            applyUrl();
                        }
                    }}
                    placeholder="Paste YouTube, Vimeo, or direct video URL…"
                />
                <button type="button" className="cf-video-apply-btn" onClick={applyUrl}>
                    <Play style={{ width: 11, height: 11 }} />
                    Apply
                </button>
                <label className="cf-video-upload-label">
                    <FileUp style={{ width: 11, height: 11 }} />
                    Upload
                    <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleUpload} />
                </label>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f0e0e0', display: 'flex', alignItems: 'center' }}>
                <MandatorySelect
                    value={!!block.mandatory}
                    onChange={(mandatory) => onUpdate(block.id, { mandatory })}
                    size="compact"
                />
            </div>
            <div className="cf-video-player-area">
                {!block.videoUrl ? (
                    <div className="cf-video-empty">
                        <div className="cf-video-empty-icon">
                            <Video style={{ width: 26, height: 26, color: '#6B2020' }} />
                        </div>
                        <div className="cf-video-empty-text">No video yet</div>
                        <div className="cf-video-empty-sub">
                            Paste a YouTube or Vimeo link above, or upload a video file from your device.
                        </div>
                    </div>
                ) : embedUrl ? (
                    <div style={{ position: 'relative' }}>
                        <iframe
                            className="cf-video-embed"
                            src={embedUrl}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Embedded video"
                        />
                        <button
                            type="button"
                            onClick={() => { onUpdate(block.id, { videoUrl: '', isLocal: false, fileName: '' }); setUrlDraft(''); }}
                            title="Remove video"
                            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <X style={{ width: 12, height: 12 }} /> Remove Video
                        </button>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <video
                            className="cf-video-native"
                            src={block.videoUrl}
                            controls
                            style={{ width: '100%', display: 'block' }}
                        />
                        <button
                            type="button"
                            onClick={() => { onUpdate(block.id, { videoUrl: '', isLocal: false, fileName: '' }); setUrlDraft(''); }}
                            title="Remove video"
                            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <X style={{ width: 12, height: 12 }} /> Remove Video
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
