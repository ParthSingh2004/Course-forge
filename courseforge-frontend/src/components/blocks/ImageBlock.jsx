import React, { useState } from 'react';
import { Image as ImageIcon, Globe, X } from 'lucide-react';
import { buildApiUrl, buildBackendAssetUrl } from '../../utils/api';

export default function ImageBlock({ block, onUpdate }) {
    const [isSearching, setIsSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAiMode, setIsAiMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");

    const UNSPLASH_ACCESS_KEY = "MGjPRsN98K3iYFnC8T_XqwV3oVZApm9x9IoZjhlTfeQ";

    const handleGenerateImage = async () => {
        if (!aiPrompt) return;
        setIsGenerating(true);
        try {
            const res = await fetch(buildApiUrl('/api/generate-image'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt })
            });
            if (!res.ok) throw new Error('Generation failed');
            const data = await res.json();
            if (data.localUrl) {
                onUpdate(block.id, { image: buildBackendAssetUrl(data.localUrl) });
            }
        } catch (err) {
            console.error(err);
            alert('Error generating image');
        }
        setIsGenerating(false);
        setIsAiMode(false);
    };

    const handleUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => onUpdate(block.id, { image: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm) return;
        setIsLoading(true);
        try {
            const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=12`);
            const data = await res.json();
            if (data.results) {
                setResults(data.results);
            }
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
                body: JSON.stringify({
                    url: photo.urls.regular,
                    download_location: photo.links.download_location
                })
            });
            const data = await res.json();
            if (data.dataUri) {
                onUpdate(block.id, { image: data.dataUri });
            }
        } catch (err) {
            console.error(err);
        }
        setIsLoading(false);
        setIsSearching(false);
    };

    if (block.image || block.imageUrl || block.src) {
        return (
            <div className="cf-image-block" style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block', width: block.width || '100%' }}>
                    <img src={block.image || block.imageUrl || block.src} alt="Course content" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }} />
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, background: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
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
                        <button
                            type="button"
                            onClick={() => onUpdate(block.id, { image: null, imageUrl: null, src: null, caption: '' })}
                            title="Remove image"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid #EAD0D0', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: '#8b1a1a', fontSize: '0.7rem', fontWeight: 600 }}
                        >
                            <X style={{ width: 11, height: 11 }} /> Remove
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Add a caption..."
                        value={block.caption || ''}
                        onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
                        style={{ width: '100%', marginTop: 8, padding: 8, border: '1px solid #EAD0D0', borderRadius: 6, fontSize: '0.875rem', textAlign: 'center', fontFamily: 'Roboto', color: '#666' }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="cf-image-block" style={{ width: '100%' }}>
            {!isSearching && !isAiMode ? (
                <div className="flex gap-4 justify-center" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <label className="bg-neutral-900 border border-red-800 text-white" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '12rem', height: '8rem', background: '#171717', border: '1px solid #991b1b', borderRadius: 8, cursor: 'pointer', color: '#fff' }}>
                        <ImageIcon style={{ width: 28, height: 28, opacity: 0.8, marginBottom: '0.5rem' }} />
                        Upload File
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                    </label>
                    <div onClick={() => setIsSearching(true)} className="bg-neutral-900 border border-red-800 text-white" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '12rem', height: '8rem', background: '#171717', border: '1px solid #991b1b', borderRadius: 8, cursor: 'pointer', color: '#fff' }}>
                        <Globe style={{ width: 28, height: 28, opacity: 0.8, marginBottom: '0.5rem' }} />
                        Search Unsplash
                    </div>
                    <div onClick={() => setIsAiMode(true)} className="bg-neutral-900 border border-red-800 text-white" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '12rem', height: '8rem', background: '#171717', border: '1px solid #991b1b', borderRadius: 8, cursor: 'pointer', color: '#fff' }}>
                        <ImageIcon style={{ width: 28, height: 28, opacity: 0.8, marginBottom: '0.5rem' }} />
                        Generate with AI
                    </div>
                </div>
            ) : isSearching ? (
                <div className="bg-neutral-900 border border-red-800 text-white p-4 rounded" style={{ background: '#171717', border: '1px solid #991b1b', padding: '1rem', borderRadius: 8, color: '#fff' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Search Unsplash..."
                            className="bg-black border-red-900"
                            style={{ flex: 1, background: '#000', border: '1px solid #7f1d1d', color: '#fff', padding: '0.5rem', borderRadius: 4, outline: 'none' }}
                        />
                        <button onClick={handleSearch} disabled={isLoading} style={{ background: '#991b1b', color: '#fff', padding: '0.5rem 1rem', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                            {isLoading ? '...' : 'Search'}
                        </button>
                        <button onClick={() => setIsSearching(false)} style={{ background: 'transparent', color: '#a3a3a3', border: '1px solid #404040', padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                    </div>
                    {results.length > 0 && (
                        <div className="grid-cols-2 gap-2 max-h-64 overflow-y-auto" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '16rem', overflowY: 'auto' }}>
                            {results.map(photo => (
                                <div key={photo.id} onClick={() => handleSelectUnsplash(photo)} style={{ position: 'relative', cursor: 'pointer', borderRadius: 4, overflow: 'hidden', height: '8rem' }}>
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
                <div className="bg-neutral-900 border border-red-800 text-white p-4 rounded" style={{ background: '#171717', border: '1px solid #991b1b', padding: '1rem', borderRadius: 8, color: '#fff' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleGenerateImage()}
                            placeholder="Describe the image you want to generate..."
                            className="bg-black border border-red-900 text-white w-full"
                            style={{ flex: 1, background: '#000', border: '1px solid #7f1d1d', color: '#fff', padding: '0.5rem', borderRadius: 4, outline: 'none' }}
                            disabled={isGenerating}
                        />
                        <button onClick={handleGenerateImage} disabled={isGenerating} style={{ background: '#991b1b', color: '#fff', padding: '0.5rem 1rem', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                            {isGenerating ? 'Generating...' : 'Generate'}
                        </button>
                        <button onClick={() => setIsAiMode(false)} disabled={isGenerating} style={{ background: 'transparent', color: '#a3a3a3', border: '1px solid #404040', padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                    </div>
                    {isGenerating && <div style={{ color: '#fff', marginTop: '0.5rem', textAlign: 'center' }}>Generating image... Please wait</div>}
                </div>
            )}
            {isLoading && isSearching && <div style={{ color: '#fff', marginTop: '0.5rem', textAlign: 'center' }}>Processing...</div>}
        </div>
    );
}