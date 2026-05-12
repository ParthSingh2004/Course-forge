import React from 'react';
import { ShieldCheck, Mic, X } from 'lucide-react';
import { buildApiUrl, buildBackendAssetUrl } from '../../utils/api';

export default function AudioBlock({ block, onUpdate }) {
    return (
        <div className="cf-audio-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <input
                    className="cf-audio-label-input"
                    value={block.label}
                    onChange={(e) => onUpdate(block.id, { label: e.target.value })}
                    placeholder="Track label..."
                    style={{ flex: 1, marginRight: '0.5rem' }}
                />
                <button
                    onClick={() => onUpdate(block.id, { mandatory: !block.mandatory })}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.25rem 0.625rem', borderRadius: 6, cursor: 'pointer',
                        fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                        background: block.mandatory ? '#8b1a1a' : '#fff5f5',
                        color: block.mandatory ? 'white' : '#8b6060',
                        border: block.mandatory ? '1px solid #8b1a1a' : '1px solid #EAD0D0',
                        transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                >
                    <ShieldCheck style={{ width: 12, height: 12 }} />
                    {block.mandatory ? 'MANDATORY' : 'Optional'}
                </button>
            </div>
            {block.audioUrl ? (
                <div>
                    <audio className="cf-audio-player" controls src={block.audioUrl} style={{ width: '100%' }} />
                    <button
                        type="button"
                        onClick={() => onUpdate(block.id, { audioUrl: '', mediaId: '', isUploading: false })}
                        style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #EAD0D0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                        <X style={{ width: 12, height: 12 }} /> Remove Audio
                    </button>
                </div>
            ) : (
                <label className="cf-audio-upload-zone">
                    <Mic style={{ width: 24, height: 24, opacity: 0.5, marginBottom: 6 }} />
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(232,213,213,0.6)' }}>
                        {block.isUploading ? 'Uploading…' : 'Click to upload MP3 / WAV / OGG'}
                    </div>
                    <input
                        type="file" accept="audio/*" style={{ display: 'none' }}
                        onChange={async (e) => {
                            const f = e.target.files[0];
                            if (!f) return;
                            onUpdate(block.id, { isUploading: true });
                            const fd = new FormData();
                            fd.append('file', f);
                            try {
                                const res = await fetch(buildApiUrl('/api/upload/audio'), { method: 'POST', body: fd });
                                if (!res.ok) throw new Error();
                                const d = await res.json();
                                onUpdate(block.id, {
                                    mediaId: d.mediaId,
                                    audioUrl: buildBackendAssetUrl(d.previewUrl),
                                    isUploading: false,
                                });
                            } catch {
                                alert('Audio upload failed.');
                                onUpdate(block.id, { isUploading: false });
                            }
                        }}
                    />
                </label>
            )}
        </div>
    );
}