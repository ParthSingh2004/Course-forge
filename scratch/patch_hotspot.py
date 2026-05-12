import re

def patch_app_jsx():
    with open('courseforge-frontend/src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add refs and states
    old_init = "function ImageHotspotBlock({ block, onUpdate, readOnly }) {\n  const [activeHotspotId, setActiveHotspotId] = useState(null);\n  const imageSrc = block.imageUrl || block.image || block.src || '';"
    new_init = "function ImageHotspotBlock({ block, onUpdate, readOnly }) {\n  const [activeHotspotId, setActiveHotspotId] = useState(null);\n  const [draggingDot, setDraggingDot] = useState(null);\n  const [dragPos, setDragPos] = useState(null);\n  const imageRef = useRef(null);\n  const imageSrc = block.imageUrl || block.image || block.src || '';\n\n  useEffect(() => {\n    if (!draggingDot) return;\n    const handleMouseMove = (e) => {\n      if (!imageRef.current) return;\n      const rect = imageRef.current.getBoundingClientRect();\n      let x = ((e.clientX - rect.left) / rect.width) * 100;\n      let y = ((e.clientY - rect.top) / rect.height) * 100;\n      setDragPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });\n    };\n    const handleMouseUp = () => {\n      setDraggingDot(null);\n    };\n    window.addEventListener('mousemove', handleMouseMove);\n    window.addEventListener('mouseup', handleMouseUp);\n    return () => {\n      window.removeEventListener('mousemove', handleMouseMove);\n      window.removeEventListener('mouseup', handleMouseUp);\n    };\n  }, [draggingDot]);\n\n  useEffect(() => {\n    if (!draggingDot && dragPos) {\n      const newHotspots = (block.hotspots || []).map(h => h.id === dragPos.id ? { ...h, x: dragPos.x, y: dragPos.y } : h);\n      onUpdate(block.id, { hotspots: newHotspots });\n      setDragPos(null);\n    }\n  }, [draggingDot, dragPos, block.id, block.hotspots, onUpdate]);"
    
    content = content.replace(old_init, new_init)

    # Add imageRef
    old_wrapper = "<div style={{ position: 'relative', width: '100%', display: 'inline-block' }}>\n          <img"
    new_wrapper = "<div ref={imageRef} style={{ position: 'relative', width: '100%', display: 'inline-block' }}>\n          <img"
    content = content.replace(old_wrapper, new_wrapper)

    # Update dot rendering and popup positioning
    old_dots = """          {(block.hotspots || []).map(hotspot => (
            <div
              key={hotspot.id}
              className="absolute w-6 h-6 bg-red-700 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, position: 'absolute', width: 24, height: 24, backgroundColor: '#b91c1c', borderRadius: '50%', border: '2px solid white', transform: 'translate(-50%, -50%)', zIndex: 10, cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveHotspotId(activeHotspotId === hotspot.id ? null : hotspot.id);
              }}
            />
          ))}

          {activeHotspot && readOnly && (
            <div className="bg-black border border-neutral-700 text-white p-4 rounded-md shadow-xl z-50" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#000', border: '1px solid #404040', color: '#fff', padding: '1rem', borderRadius: 6, zIndex: 50, minWidth: 250 }}>"""

    new_dots = """          {(block.hotspots || []).map(hotspot => {
            const isDragging = draggingDot === hotspot.id;
            const x = isDragging && dragPos ? dragPos.x : hotspot.x;
            const y = isDragging && dragPos ? dragPos.y : hotspot.y;
            return (
            <div
              key={hotspot.id}
              onMouseDown={(e) => {
                if (readOnly) return;
                e.stopPropagation();
                setDraggingDot(hotspot.id);
                setDragPos({ id: hotspot.id, x: hotspot.x, y: hotspot.y });
                setActiveHotspotId(hotspot.id);
              }}
              className="absolute w-6 h-6 bg-red-700 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${x}%`, top: `${y}%`, position: 'absolute', width: 24, height: 24, backgroundColor: '#b91c1c', borderRadius: '50%', border: '2px solid white', transform: 'translate(-50%, -50%)', zIndex: 10, cursor: readOnly ? 'pointer' : 'move' }}
              onClick={(e) => {
                e.stopPropagation();
                if (readOnly) setActiveHotspotId(activeHotspotId === hotspot.id ? null : hotspot.id);
              }}
            />
          )})}

          {activeHotspot && readOnly && (
            <div className="bg-black border border-neutral-700 text-white p-4 rounded-md shadow-xl z-50" style={{ position: 'absolute', top: `${activeHotspot.y}%`, left: `${activeHotspot.x}%`, transform: `translate(${activeHotspot.x > 50 ? '-105%' : '5%'}, ${activeHotspot.y > 50 ? '-105%' : '5%'})`, background: '#000', border: '1px solid #404040', color: '#fff', padding: '1rem', borderRadius: 6, zIndex: 50, minWidth: 250, maxWidth: 300 }}>"""
    content = content.replace(old_dots, new_dots)

    with open('courseforge-frontend/src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)


def patch_runtime_ts():
    with open('courseforge-frontend/scorm-runtime/src/runtime.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to change how activeHotspotPopup is styled in runtime.ts
    # Let's find the hotspot rendering logic.
    old_logic = "          activeHotspotPopup.style.top = \"50%\";\n          activeHotspotPopup.style.left = \"50%\";\n          activeHotspotPopup.style.transform = \"translate(-50%, -50%)\";"
    new_logic = "          activeHotspotPopup.style.top = hotspot.y + \"%\";\n          activeHotspotPopup.style.left = hotspot.x + \"%\";\n          activeHotspotPopup.style.transform = `translate(${hotspot.x > 50 ? '-105%' : '5%'}, ${hotspot.y > 50 ? '-105%' : '5%'})`;\n          activeHotspotPopup.style.maxWidth = \"300px\";"

    content = content.replace(old_logic, new_logic)

    with open('courseforge-frontend/scorm-runtime/src/runtime.ts', 'w', encoding='utf-8') as f:
        f.write(content)


def patch_scorm_builder():
    with open('app/processors/scorm_builder.py', 'r', encoding='utf-8') as f:
        content = f.read()

    old_logic = "                activeHotspotPopup.style.top = '50%';\n                activeHotspotPopup.style.left = '50%';\n                activeHotspotPopup.style.transform = 'translate(-50%, -50%)';"
    new_logic = "                activeHotspotPopup.style.top = hotspot.y + '%';\n                activeHotspotPopup.style.left = hotspot.x + '%';\n                activeHotspotPopup.style.transform = 'translate(' + (hotspot.x > 50 ? '-105%' : '5%') + ', ' + (hotspot.y > 50 ? '-105%' : '5%') + ')';\n                activeHotspotPopup.style.maxWidth = '300px';"

    content = content.replace(old_logic, new_logic)

    with open('app/processors/scorm_builder.py', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    patch_app_jsx()
    patch_runtime_ts()
    patch_scorm_builder()
    print("Done")
