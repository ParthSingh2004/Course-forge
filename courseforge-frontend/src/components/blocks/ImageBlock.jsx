import React, { useState, useRef, useCallback } from 'react';
import { Image as ImageIcon, Globe, X, Crop, Check } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { buildApiUrl, buildBackendAssetUrl } from '../../utils/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a completed crop + the rendered <img> into a data-URL string. */
function getCroppedDataUrl(image, crop, scale = 1) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = Math.floor(crop.width * scaleX * scale);
    canvas.height = Math.floor(crop.height * scaleY * scale);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    return canvas.toDataURL('image/jpeg', 0.95);
}

/** Returns a centred initial crop at the given aspect ratio (or free if undefined). */
function centredCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
        makeAspectCrop(
            { unit: '%', width: 80 },
            aspect ?? mediaWidth / mediaHeight,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    );
}

// ---------------------------------------------------------------------------
// Sub-component: CropModal
// ---------------------------------------------------------------------------

const ASPECT_OPTIONS = [
    { label: 'Free', value: undefined },
    { label: '1 : 1', value: 1 },
    { label: '4 : 3', value: 4 / 3 },
    { label: '16 : 9', value: 16 / 9 },
    { label: '3 : 4', value: 3 / 4 },
];

function CropModal({ src, onConfirm, onCancel }) {
    const imgRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState();
    const [aspect, setAspect] = useState(undefined);

    const onImageLoad = useCallback((e) => {
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
        setCrop(centredCrop(w, h, aspect));
    }, [aspect]);

    const handleAspectChange = (newAspect) => {
        setAspect(newAspect);
        if (imgRef.current) {
            const { naturalWidth: w, naturalHeight: h } = imgRef.current;
            setCrop(centredCrop(w, h, newAspect));
        }
    };

    const handleConfirm = () => {
        if (!completedCrop || !imgRef.current) return;
        const dataUrl = getCroppedDataUrl(imgRef.current, completedCrop);
        onConfirm(dataUrl);
    };

    return (
        /* Overlay */
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {/* Modal card */}
            <div style={{
                background: '#171717', border: '1px solid #991b1b',
                borderRadius: 12, padding: '1.5rem',
                maxWidth: '90vw', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Crop style={{ width: 16, height: 16, color: '#ef4444' }} />
                        Crop Image
                    </span>
                    <button onClick={onCancel} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a3a3a3' }}>
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Aspect-ratio toggles */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {ASPECT_OPTIONS.map(opt => (
                        <button
                            key={opt.label}
                            onClick={() => handleAspectChange(opt.value)}
                            style={{
                                padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem',
                                cursor: 'pointer', border: '1px solid',
                                borderColor: aspect === opt.value ? '#ef4444' : '#404040',
                                background: aspect === opt.value ? '#7f1d1d' : 'transparent',
                                color: '#fff', fontWeight: aspect === opt.value ? 600 : 400,
                                transition: 'all 0.15s',
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Crop area */}
                <div style={{
                    overflow: 'auto', maxHeight: 'calc(80vh - 180px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <ReactCrop
                        crop={crop}
                        onChange={(_, pct) => setCrop(pct)}
                        onComplete={(px) => setCompletedCrop(px)}
                        aspect={aspect}
                        style={{ maxWidth: '100%' }}
                    >
                        <img
                            ref={imgRef}
                            src={src}
                            onLoad={onImageLoad}
                            alt="Crop preview"
                            style={{ maxWidth: '70vw', maxHeight: 'calc(80vh - 200px)', display: 'block' }}
                        />
                    </ReactCrop>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent', color: '#a3a3a3',
                            border: '1px solid #404040', padding: '0.5rem 1.25rem',
                            borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem',
                        }}
                    >
                        Skip crop
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!completedCrop?.width || !completedCrop?.height}
                        style={{
                            background: completedCrop?.width ? '#991b1b' : '#4a0e0e',
                            color: '#fff', border: 'none',
                            padding: '0.5rem 1.25rem', borderRadius: 6,
                            cursor: completedCrop?.width ? 'pointer' : 'not-allowed',
                            fontSize: '0.875rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}
                    >
                        <Check style={{ width: 15, height: 15 }} />
                        Apply Crop
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ImageBlock({ block, onUpdate }) {
    const [isSearching, setIsSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAiMode, setIsAiMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');

    // Crop state
    const [cropSrc, setCropSrc] = useState(null); // triggers modal when set

    const UNSPLASH_ACCESS_KEY = 'MGjPRsN98K3iYFnC8T_XqwV3oVZApm9x9IoZjhlTfeQ';

    // ------------------------------------------------------------------
    // Shared: open crop modal with any image src
    // ------------------------------------------------------------------
    const openCrop = (src) => setCropSrc(src);

    const handleCropConfirm = (croppedDataUrl) => {
        onUpdate(block.id, { image: croppedDataUrl });
        setCropSrc(null);
    };

    const handleCropCancel = () => {
        // "Skip crop" — commit the original uncropped image
        if (cropSrc) onUpdate(block.id, { image: cropSrc });
        setCropSrc(null);
    };

    // ------------------------------------------------------------------
    // Upload
    // ------------------------------------------------------------------
    const handleUpload = (e) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onloadend = () => openCrop(reader.result);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    // ------------------------------------------------------------------
    // Unsplash
    // ------------------------------------------------------------------
    const handleSearch = async () => {
        if (!searchTerm) return;
        setIsLoading(true);
        try {
            const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=12`);
            const data = await res.json();
            if (data.results) setResults(data.results);
        } catch (err) {
            console.error(err);
        }
        setIsLoading(false);
    };

    const handleSelectUnsplash = async (photo) => {
        setIsLoading(true);
        try {
            const res = await fetch(buildApiUrl('/api/unsplash-download'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: photo.urls.regular, download_location: photo.links.download_location }),
            });
            const data = await res.json();
            if (data.dataUri) {
                setIsSearching(false);
                openCrop(data.dataUri);
            }
        } catch (err) {
            console.error(err);
        }
        setIsLoading(false);
    };

    // ------------------------------------------------------------------
    // AI generation
    // ------------------------------------------------------------------
    const handleGenerateImage = async () => {
        if (!aiPrompt) return;
        setIsGenerating(true);
        try {
            const res = await fetch(buildApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt }),
            });
            if (!res.ok) throw new Error('Generation failed');
            const data = await res.json();
            if (data.localUrl) {
                setIsAiMode(false);
                openCrop(buildBackendAssetUrl(data.localUrl));
            }
        } catch (err) {
            console.error(err);
            alert('Error generating image');
        }
        setIsGenerating(false);
    };

    // ------------------------------------------------------------------
    // Render: image already set
    // ------------------------------------------------------------------
    if (block.image || block.imageUrl || block.src) {
        const src = block.image || block.imageUrl || block.src;
        return (
            <>
                {cropSrc && (
                    <CropModal
                        src={cropSrc}
                        onConfirm={handleCropConfirm}
                        onCancel={handleCropCancel}
                    />
                )}
                <div className="cf-image-block" style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block', width: block.width || '100%' }}>
                        <img
                            src={src}
                            alt="Course content"
                            style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
                        />

                        {/* Toolbar */}
                        <div style={{
                            position: 'absolute', top: 8, right: 8,
                            display: 'flex', gap: 4,
                            background: 'rgba(255,255,255,0.9)', padding: 4,
                            borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}>
                            <select
                                value={block.width || '100%'}
                                onChange={(e) => onUpdate(block.id, { width: e.target.value })}
                                style={{ fontSize: 12, padding: 2, border: '1px solid #ddd', borderRadius: 4 }}
                            >
                                <option value="25%">25%</option>
                                <option value="50%">50%</option>
                                <option value="75%">75%</option>
                                <option value="100%">100%</option>
                            </select>

                            {/* ── Crop button ── */}
                            <button
                                type="button"
                                onClick={() => openCrop(src)}
                                title="Crop image"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    background: 'transparent', border: '1px solid #d0d5dd',
                                    borderRadius: 4, padding: '2px 8px',
                                    cursor: 'pointer', color: '#344054',
                                    fontSize: '0.7rem', fontWeight: 600,
                                }}
                            >
                                <Crop style={{ width: 11, height: 11 }} /> Crop
                            </button>

                            <button
                                type="button"
                                onClick={() => onUpdate(block.id, { image: null, imageUrl: null, src: null, caption: '' })}
                                title="Remove image"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    background: 'transparent', border: '1px solid #EAD0D0',
                                    borderRadius: 4, padding: '2px 8px',
                                    cursor: 'pointer', color: '#8b1a1a',
                                    fontSize: '0.7rem', fontWeight: 600,
                                }}
                            >
                                <X style={{ width: 11, height: 11 }} /> Remove
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="Add a caption..."
                            value={block.caption || ''}
                            onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
                            style={{
                                width: '100%', marginTop: 8, padding: 8,
                                border: '1px solid #EAD0D0', borderRadius: 6,
                                fontSize: '0.875rem', textAlign: 'center',
                                fontFamily: 'Roboto', color: '#666',
                            }}
                        />
                    </div>
                </div>
            </>
        );
    }

    // ------------------------------------------------------------------
    // Render: no image yet (picker UI) + crop modal if pending
    // ------------------------------------------------------------------
    return (
        <>
            {cropSrc && (
                <CropModal
                    src={cropSrc}
                    onConfirm={handleCropConfirm}
                    onCancel={handleCropCancel}
                />
            )}

            <div className="cf-image-block" style={{ width: '100%' }}>
                {!isSearching && !isAiMode ? (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <label style={tileStyle}>
                            <ImageIcon style={tileIconStyle} />
                            Upload File
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                        </label>

                        <div onClick={() => setIsSearching(true)} style={tileStyle}>
                            <Globe style={tileIconStyle} />
                            Search Unsplash
                        </div>

                        <div onClick={() => setIsAiMode(true)} style={tileStyle}>
                            <ImageIcon style={tileIconStyle} />
                            Generate with AI
                        </div>
                    </div>

                ) : isSearching ? (
                    <div style={panelStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Search Unsplash..."
                                style={inputStyle}
                            />
                            <button onClick={handleSearch} disabled={isLoading} style={primaryBtnStyle}>
                                {isLoading ? '...' : 'Search'}
                            </button>
                            <button onClick={() => setIsSearching(false)} style={ghostBtnStyle}>Cancel</button>
                        </div>

                        {results.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '16rem', overflowY: 'auto' }}>
                                {results.map(photo => (
                                    <div
                                        key={photo.id}
                                        onClick={() => handleSelectUnsplash(photo)}
                                        style={{ position: 'relative', cursor: 'pointer', borderRadius: 4, overflow: 'hidden', height: '8rem' }}
                                    >
                                        <img src={photo.urls.small} alt={photo.alt_description} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.75rem', padding: '0.25rem' }}>
                                            {photo.user.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                ) : (
                    <div style={panelStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGenerateImage()}
                                placeholder="Describe the image you want to generate..."
                                style={inputStyle}
                                disabled={isGenerating}
                            />
                            <button onClick={handleGenerateImage} disabled={isGenerating} style={primaryBtnStyle}>
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </button>
                            <button onClick={() => setIsAiMode(false)} disabled={isGenerating} style={ghostBtnStyle}>Cancel</button>
                        </div>
                        {isGenerating && (
                            <div style={{ color: '#fff', textAlign: 'center' }}>Generating image… Please wait</div>
                        )}
                    </div>
                )}

                {isLoading && isSearching && (
                    <div style={{ color: '#fff', marginTop: '0.5rem', textAlign: 'center' }}>Processing…</div>
                )}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Shared style objects (keeps JSX less noisy)
// ---------------------------------------------------------------------------
const tileStyle = {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    width: '12rem', height: '8rem',
    background: '#171717', border: '1px solid #991b1b',
    borderRadius: 8, cursor: 'pointer', color: '#fff',
};
const tileIconStyle = { width: 28, height: 28, opacity: 0.8, marginBottom: '0.5rem' };
const panelStyle = {
    background: '#171717', border: '1px solid #991b1b',
    padding: '1rem', borderRadius: 8, color: '#fff',
};
const inputStyle = {
    flex: 1, background: '#000', border: '1px solid #7f1d1d',
    color: '#fff', padding: '0.5rem', borderRadius: 4, outline: 'none',
};
const primaryBtnStyle = {
    background: '#991b1b', color: '#fff',
    padding: '0.5rem 1rem', border: 'none', borderRadius: 4, cursor: 'pointer',
};
const ghostBtnStyle = {
    background: 'transparent', color: '#a3a3a3',
    border: '1px solid #404040', padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer',
};