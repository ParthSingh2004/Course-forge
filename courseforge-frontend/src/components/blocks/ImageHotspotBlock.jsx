import React, { useState } from 'react';
import { Image as ImageIcon, X, Trash2 } from 'lucide-react';

export default function ImageHotspotBlock({ block, onUpdate, readOnly }) {
    const [activeHotspotId, setActiveHotspotId] = useState(null);
    const imageSrc = block.imageUrl || block.image || block.src || '';

    const handleUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            onUpdate(block.id, { imageUrl: reader.result });
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    const handleImageClick = (e) => {
        if (readOnly) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (activeHotspotId) {
            updateHotspot(activeHotspotId, { x, y });
        } else {
            const newHotspot = {
                id: Date.now().toString(),
                x,
                y,
                title: "New Hotspot",
                content: "Hotspot content..."
            };
            onUpdate(block.id, { hotspots: [...(block.hotspots || []), newHotspot] });
            setActiveHotspotId(newHotspot.id);
        }
    };

    const updateHotspot = (id, data) => {
        const newHotspots = (block.hotspots || []).map(h => h.id === id ? { ...h, ...data } : h);
        onUpdate(block.id, { hotspots: newHotspots });
    };

    const removeHotspot = (id) => {
        onUpdate(block.id, { hotspots: (block.hotspots || []).filter(h => h.id !== id) });
        if (activeHotspotId === id) setActiveHotspotId(null);
    };

    const activeHotspot = (block.hotspots || []).find(h => h.id === activeHotspotId);

    return (
        <div className="cf-image-hotspot-block" style={{ width: '100%', position: 'relative' }}>
            {!imageSrc ? (
                <label className="cf-image-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, background: '#171717', border: '1px dashed #450a0a', borderRadius: 8, cursor: 'pointer', color: '#a3a3a3' }}>
                    <ImageIcon style={{ width: 28, height: 28, opacity: 0.6, marginBottom: '0.5rem' }} />
                    Click to upload image
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                </label>
            ) : (
                <div style={{ position: 'relative', width: '100%', display: 'inline-block' }}>
                    <img
                        src={imageSrc}
                        alt="Hotspot Base"
                        draggable="false"
                        style={{ width: '100%', borderRadius: 8, display: 'block', cursor: readOnly ? 'default' : (activeHotspotId ? 'crosshair' : 'copy'), userSelect: 'none' }}
                        onClick={handleImageClick}
                    />
                    {(block.hotspots || []).map(hotspot => {
                        const isActive = activeHotspotId === hotspot.id;
                        return (
                            <div
                                key={hotspot.id}
                                className="absolute w-6 h-6 bg-red-700 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, position: 'absolute', width: 24, height: 24, backgroundColor: '#b91c1c', borderRadius: '50%', border: '2px solid white', transform: 'translate(-50%, -50%)', zIndex: 10, cursor: 'pointer', boxShadow: isActive && !readOnly ? '0 0 0 4px rgba(185,28,28,0.4)' : 'none' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHotspotId(activeHotspotId === hotspot.id ? null : hotspot.id);
                                }}
                            />
                        )
                    })}

                    {activeHotspot && (
                        <div className="bg-black border border-neutral-700 text-white p-4 rounded-md shadow-xl z-50" style={{ position: 'absolute', top: `${activeHotspot.y}%`, left: `${activeHotspot.x}%`, transform: `translate(${activeHotspot.x > 50 ? '-105%' : '5%'}, ${activeHotspot.y > 50 ? '-105%' : '5%'})`, background: activeHotspot.popupColor || '#000000', border: '1px solid #404040', color: '#fff', padding: '1rem', borderRadius: 6, zIndex: 50, minWidth: 250, maxWidth: 300, pointerEvents: readOnly ? 'auto' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{activeHotspot.title}</h4>
                                {readOnly && (
                                    <button onClick={() => setActiveHotspotId(null)} style={{ background: 'transparent', border: 'none', color: '#a3a3a3', cursor: 'pointer' }}><X size={16} /></button>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{activeHotspot.content}</p>
                        </div>
                    )}
                </div>
            )}

            {!readOnly && activeHotspot && (
                <div className="bg-neutral-900 border border-red-800 p-3 mt-2 rounded" style={{ background: '#171717', border: '1px solid #991b1b', padding: '0.75rem', marginTop: '0.5rem', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 'bold' }}>Edit Hotspot</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ color: '#a3a3a3', fontSize: '0.8rem' }}>Color:</label>
                                <input
                                    type="color"
                                    value={activeHotspot.popupColor || '#000000'}
                                    onChange={(e) => updateHotspot(activeHotspot.id, { popupColor: e.target.value })}
                                    style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                                />
                            </div>
                            <button onClick={() => removeHotspot(activeHotspot.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={16} /></button>
                        </div>
                    </div>
                    <input
                        value={activeHotspot.title}
                        onChange={(e) => updateHotspot(activeHotspot.id, { title: e.target.value })}
                        placeholder="Title"
                        style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #404040', padding: '0.5rem', borderRadius: 4, marginBottom: '0.5rem', outline: 'none' }}
                    />
                    <textarea
                        value={activeHotspot.content}
                        onChange={(e) => updateHotspot(activeHotspot.id, { content: e.target.value })}
                        placeholder="Content"
                        rows={3}
                        style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #404040', padding: '0.5rem', borderRadius: 4, outline: 'none', resize: 'vertical' }}
                    />
                </div>
            )}
        </div>
    );
}