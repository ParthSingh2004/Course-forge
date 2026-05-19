import React from 'react';
import { Mic, X } from 'lucide-react';
import { buildApiUrl, buildBackendAssetUrl } from '../../utils/api';
import MandatorySelect from '../ui/MandatorySelect';

export default function AudioBlock({ block, onUpdate }) {
    return (
        <div
            className="cf-audio-block"
            style={{
                backgroundColor: '#ffffff',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.05)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                    className="cf-audio-label-input"
                    value={block.label}
                    onChange={(e) => onUpdate(block.id, { label: e.target.value })}
                    placeholder="Track label..."
                    style={{
                        flex: 1,
                        marginRight: '1rem',
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#1f2937',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#fca5a5'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <MandatorySelect
                    value={!!block.mandatory}
                    onChange={(mandatory) => onUpdate(block.id, { mandatory })}
                    size="compact"
                    style={{ flexShrink: 0 }}
                />
            </div>
            {block.audioUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <audio className="cf-audio-player" controls src={block.audioUrl} style={{ width: '100%', height: '40px' }} />
                    <button
                        type="button"
                        onClick={() => onUpdate(block.id, { audioUrl: '', mediaId: '', isUploading: false })}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start',
                            background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '6px',
                            padding: '6px 12px', cursor: 'pointer', color: '#ef4444',
                            fontSize: '0.75rem', fontWeight: 500, transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                        <X style={{ width: 14, height: 14 }} /> Remove Audio
                    </button>
                </div>
            ) : (
                <label
                    className="cf-audio-upload-zone"
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '2rem 1rem', border: '2px dashed #fca5a5', borderRadius: '8px',
                        cursor: 'pointer', backgroundColor: '#ffffff', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                    <Mic style={{ width: 28, height: 28, color: '#ef4444', marginBottom: '8px', opacity: 0.8 }} />
                    <div style={{ fontSize: '0.875rem', color: '#4b5563', fontWeight: 500 }}>
                        {block.isUploading ? (
                            <span style={{ color: '#ef4444' }}>Uploading...</span>
                        ) : (
                            <span>Click to upload <span style={{ color: '#ef4444' }}>MP3 / WAV / OGG</span></span>
                        )}
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
