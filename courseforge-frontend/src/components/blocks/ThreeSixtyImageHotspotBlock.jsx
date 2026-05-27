import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Image as ImageIcon, X, Trash2, Globe, RotateCcw } from 'lucide-react';

export default function ThreeSixtyImageHotspotBlock({ block, onUpdate, readOnly }) {
    const [activeHotspotId, setActiveHotspotId] = useState(null);
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const hotspotRefs = useRef({});
    
    // Three.js instances
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const sphereMeshRef = useRef(null);
    const textureLoaderRef = useRef(null);
    const animationFrameIdRef = useRef(null);

    // Navigation and coordinates
    const yawRef = useRef(0);
    const pitchRef = useRef(0);
    const isDraggingRef = useRef(false);
    const startMouseRef = useRef({ x: 0, y: 0 });
    const startYawRef = useRef(0);
    const startPitchRef = useRef(0);
    const clickMovedRef = useRef(false);

    const imageSrc = block.imageUrl || block.image || block.src || '';

    // Handle upload of a 360 equirectangular image
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

    // Reset camera look direction to origin
    const handleResetView = () => {
        yawRef.current = 0;
        pitchRef.current = 0;
    };

    // Initialize Three.js scene
    useEffect(() => {
        if (!imageSrc || !containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth || 600;
        const height = 400; // Fixed visual height in editor

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera - pointing inside
        const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
        camera.target = new THREE.Vector3(0, 0, 0);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Texture Loader & Sphere Mesh
        const textureLoader = new THREE.TextureLoader();
        textureLoaderRef.current = textureLoader;

        // Create Sphere Geometry (Inverted, so we look at the inner walls)
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // Invert geometry on x-axis

        // Create Material (initially black/empty until texture loads)
        const material = new THREE.MeshBasicMaterial({
            color: 0x222222,
            side: THREE.DoubleSide
        });
        const sphereMesh = new THREE.Mesh(geometry, material);
        scene.add(sphereMesh);
        sphereMeshRef.current = sphereMesh;

        // Load the 360 image
        textureLoader.load(imageSrc, (texture) => {
            texture.minFilter = THREE.LinearFilter;
            material.color.setHex(0xffffff);
            material.map = texture;
            material.needsUpdate = true;
        });

        // Window resize listener
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = 400;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Frame rendering and projection loop
        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

            // Lock pitch (latitude) to 0 for horizontal-only panning
            pitchRef.current = 0;

            // Convert to spherical look-at vector
            const phi = THREE.MathUtils.degToRad(90);
            const theta = THREE.MathUtils.degToRad(yawRef.current);

            const target = new THREE.Vector3();
            target.x = Math.sin(phi) * Math.cos(theta);
            target.y = Math.cos(phi);
            target.z = Math.sin(phi) * Math.sin(theta);
            cameraRef.current.lookAt(target);

            // Render 3D scene
            rendererRef.current.render(sceneRef.current, cameraRef.current);

            // Project 3D positions of hotspots onto 2D HTML overlays
            const w = container.clientWidth;
            const h = 400;
            const hotspotsList = block.hotspots || [];

            hotspotsList.forEach(hotspot => {
                const el = hotspotRefs.current[hotspot.id];
                if (!el) return;

                const hPhi = THREE.MathUtils.degToRad(90 - hotspot.pitch);
                const hTheta = THREE.MathUtils.degToRad(hotspot.yaw);

                // Derive 3D coordinate of hotspot on the sphere using consistent custom mapping
                const pos = new THREE.Vector3();
                pos.x = Math.sin(hPhi) * Math.cos(hTheta);
                pos.y = Math.cos(hPhi);
                pos.z = Math.sin(hPhi) * Math.sin(hTheta);
                pos.multiplyScalar(500);

                // Project to clip space (-1 to 1)
                pos.project(cameraRef.current);

                // Check if the point is behind the camera (z > 1 in clip space)
                const isBehind = pos.z > 1;

                if (isBehind) {
                    el.style.display = 'none';
                } else {
                    el.style.display = 'block';
                    // Map to 2D pixels
                    const x = (pos.x * 0.5 + 0.5) * w;
                    const y = (-(pos.y * 0.5) + 0.5) * h;
                    el.style.left = `${x}px`;
                    el.style.top = `${y}px`;
                }
            });
        };

        animate();

        // Cleanup function
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            window.removeEventListener('resize', handleResize);
            
            if (renderer.domElement && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }

            geometry.dispose();
            if (material.map) material.map.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, [imageSrc, block.hotspots]);

    // Handle Drag start
    const handleMouseDown = (e) => {
        isDraggingRef.current = true;
        clickMovedRef.current = false;
        startMouseRef.current = { x: e.clientX, y: e.clientY };
        startYawRef.current = yawRef.current;
        startPitchRef.current = pitchRef.current;
    };

    // Handle Drag/Move
    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;
        const deltaX = e.clientX - startMouseRef.current.x;

        if (Math.abs(deltaX) > 4) {
            clickMovedRef.current = true;
        }

        // Camera panning speed factor (0.15 is smooth)
        yawRef.current = startYawRef.current - deltaX * 0.15;
        pitchRef.current = 0;
    };

    // Handle Raycast on Click (MouseUp when drag was negligible)
    const handleMouseUp = (e) => {
        isDraggingRef.current = false;
        if (clickMovedRef.current || readOnly) return;

        // Perform raycast on sphere to add/move hotspot
        if (!containerRef.current || !cameraRef.current || !sphereMeshRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const mouse = new THREE.Vector2(
            (clientX / rect.width) * 2 - 1,
            -(clientY / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObject(sphereMeshRef.current);

        if (intersects.length > 0) {
            // Local intersection point vector
            const localPoint = intersects[0].point.clone().normalize();
            
            // Convert back to yaw angle, pitch is locked to 0
            const theta = Math.atan2(localPoint.z, localPoint.x);

            const pitch = 0;
            const yaw = THREE.MathUtils.radToDeg(theta);

            if (activeHotspotId) {
                // Move active hotspot to new coordinate
                updateHotspot(activeHotspotId, { yaw, pitch });
            } else {
                // Place new hotspot
                const newHotspot = {
                    id: Date.now().toString(),
                    yaw,
                    pitch,
                    title: "New Hotspot",
                    content: "Enter description..."
                };
                onUpdate(block.id, { hotspots: [...(block.hotspots || []), newHotspot] });
                setActiveHotspotId(newHotspot.id);
            }
        }
    };

    // Update hotspot details
    const updateHotspot = (id, data) => {
        const newHotspots = (block.hotspots || []).map(h => h.id === id ? { ...h, ...data } : h);
        onUpdate(block.id, { hotspots: newHotspots });
    };

    // Delete hotspot
    const removeHotspot = (id) => {
        onUpdate(block.id, { hotspots: (block.hotspots || []).filter(h => h.id !== id) });
        if (activeHotspotId === id) setActiveHotspotId(null);
    };

    const activeHotspot = (block.hotspots || []).find(h => h.id === activeHotspotId);

    return (
        <div className="cf-360-image-hotspot-block" style={{ width: '100%', position: 'relative' }}>
            {!imageSrc ? (
                <label className="cf-image-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, background: '#171717', border: '1px dashed #404040', borderRadius: 8, cursor: 'pointer', color: '#a3a3a3' }}>
                    <Globe style={{ width: 32, height: 32, opacity: 0.6, marginBottom: '0.5rem' }} />
                    <span style={{ fontWeight: '500' }}>Click to upload 360° Panorama Image</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: 4 }}>Supports standard equirectangular panoramic formats</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                </label>
            ) : (
                <div style={{ position: 'relative', width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #262626' }}>
                    
                    {/* View Reset Button */}
                    <button 
                        onClick={handleResetView}
                        style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 4, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 30 }}
                        title="Reset View Orientation"
                    >
                        <RotateCcw size={16} />
                    </button>

                    {/* Instruction Tag */}
                    {!readOnly && (
                        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.6)', color: '#e5e5e5', fontSize: '0.75rem', padding: '6px 10px', borderRadius: 4, zIndex: 30, border: '1px solid rgba(255,255,255,0.1)' }}>
                            {activeHotspotId ? "Click anywhere to reposition active hotspot" : "Click and drag to look around. Click to place hotspot."}
                        </div>
                    )}

                    {/* Three.js Container */}
                    <div
                        ref={containerRef}
                        style={{ width: '100%', height: 400, cursor: isDraggingRef.current ? 'grabbing' : 'grab', outline: 'none', userSelect: 'none' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    />

                    {/* Hotspot Markers Overlay */}
                    {(block.hotspots || []).map(hotspot => {
                        const isActive = activeHotspotId === hotspot.id;
                        return (
                            <div
                                key={hotspot.id}
                                ref={el => hotspotRefs.current[hotspot.id] = el}
                                style={{
                                    position: 'absolute',
                                    width: 24,
                                    height: 24,
                                    backgroundColor: hotspot.popupColor || '#b91c1c',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    boxShadow: isActive ? '0 0 0 5px rgba(255,255,255,0.4), 0 4px 10px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.4)',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isActive ? 25 : 20,
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.15s, transform 0.15s',
                                    display: 'none' // Position loop will show it if in-view
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHotspotId(activeHotspotId === hotspot.id ? null : hotspot.id);
                                }}
                            />
                        );
                    })}

                    {/* Preview details box inside the editor */}
                    {activeHotspot && (
                        <div 
                            style={{ 
                                position: 'absolute', 
                                bottom: 16, 
                                left: '50%', 
                                transform: 'translateX(-50%)', 
                                background: activeHotspot.popupColor || '#000000', 
                                border: '1px solid rgba(255,255,255,0.15)', 
                                color: '#fff', 
                                padding: '12px 16px', 
                                borderRadius: 6, 
                                zIndex: 40, 
                                minWidth: 260, 
                                maxWidth: 350,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>{activeHotspot.title}</h4>
                                <button 
                                    onClick={() => setActiveHotspotId(null)} 
                                    style={{ background: 'transparent', border: 'none', color: '#a3a3a3', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{activeHotspot.content}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Authoring Editing panel */}
            {!readOnly && activeHotspot && (
                <div style={{ background: '#171717', border: '1px solid #333333', padding: '1rem', marginTop: '0.75rem', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Globe size={14} style={{ color: '#ef4444' }} /> Edit Hotspot Settings
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ color: '#a3a3a3', fontSize: '0.75rem' }}>Color:</label>
                                <input
                                    type="color"
                                    value={activeHotspot.popupColor || '#b91c1c'}
                                    onChange={(e) => updateHotspot(activeHotspot.id, { popupColor: e.target.value })}
                                    style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                                />
                            </div>
                            <button 
                                onClick={() => removeHotspot(activeHotspot.id)} 
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>
                    <input
                        value={activeHotspot.title}
                        onChange={(e) => updateHotspot(activeHotspot.id, { title: e.target.value })}
                        placeholder="Hotspot Title"
                        style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #333333', padding: '0.5rem', borderRadius: 4, marginBottom: '0.5rem', outline: 'none', fontSize: '0.85rem' }}
                    />
                    <textarea
                        value={activeHotspot.content}
                        onChange={(e) => updateHotspot(activeHotspot.id, { content: e.target.value })}
                        placeholder="Describe what appears when learners click this hotspot..."
                        rows={3}
                        style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid #333333', padding: '0.5rem', borderRadius: 4, outline: 'none', resize: 'vertical', fontSize: '0.82rem', lineHeight: 1.4 }}
                    />
                </div>
            )}
        </div>
    );
}
