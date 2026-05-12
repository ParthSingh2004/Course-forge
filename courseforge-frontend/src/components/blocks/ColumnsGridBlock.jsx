import React from 'react';
import { Layers, Image as ImageIcon } from 'lucide-react';
import RichTextEditor from '../ui/RichTextEditor';

export default function ColumnsGridBlock({ block, onUpdate, readOnly }) {
  const columns = Array.isArray(block.columns) && block.columns.length > 0
    ? block.columns
    : [[], []];

  const updateColumns = (newCols) => onUpdate(block.id, { columns: newCols });

  const updateSubBlock = (colIdx, sbId, newData) => {
    const newCols = columns.map((col, i) =>
      i === colIdx ? col.map(sb => sb.id === sbId ? { ...sb, ...newData } : sb) : col
    );
    updateColumns(newCols);
  };

  const removeSubBlock = (colIdx, sbId) => {
    const newCols = columns.map((col, i) =>
      i === colIdx ? col.filter(sb => sb.id !== sbId) : col
    );
    updateColumns(newCols);
  };

  const addSubBlock = (colIdx, type) => {
    const newItem = type === 'text'
      ? { id: Date.now() + colIdx, type: 'text', content: '' }
      : { id: Date.now() + colIdx, type: 'image', image: null };
    const newCols = columns.map((col, i) =>
      i === colIdx ? [...col, newItem] : col
    );
    updateColumns(newCols);
  };

  const addColumn = () => updateColumns([...columns, []]);
  
  const removeColumn = (colIdx) => {
    if (columns.length <= 1) return;
    updateColumns(columns.filter((_, i) => i !== colIdx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', width: '100%', margin: '0.5rem 0' }}>
      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b6060', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Columns: {columns.length}
          </span>
          <button
            type="button"
            onClick={addColumn}
            style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid #EAD0D0', background: '#fff', color: '#8b1a1a', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
          >
            + Add Column
          </button>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))`,
          gap: '1.25rem',
          width: '100%',
        }}
      >
      {columns.map((col, colIdx) => (
        <div key={colIdx} style={{
          border: !readOnly && col.length === 0 ? '2px dashed #EAD0D0' : '1px solid #f5e8e8',
          borderRadius: 12,
          minHeight: !readOnly && col.length === 0 ? 140 : 'auto',
          padding: '1rem',
          background: col.length === 0 ? '#fffafa' : '#fff',
          display: 'flex', flexDirection: 'column', gap: '0.875rem',
          minWidth: 0,
        }}>
          {!readOnly && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b6060', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Column {colIdx + 1}
              </span>
              {columns.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeColumn(colIdx)}
                  style={{ background: 'none', border: 'none', color: '#c24141', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, padding: 0 }}
                  title="Remove column"
                >
                  Remove
                </button>
              )}
            </div>
          )}
          {col.map(sb => (
            <div key={sb.id} style={{ position: 'relative' }}>
              {!readOnly && (
                <button
                  onClick={() => removeSubBlock(colIdx, sb.id)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  title="Remove"
                >x</button>
              )}
              {sb.type === 'text' ? (
                <RichTextEditor
                  className="cf-text-area"
                  value={sb.content}
                  onChange={(val) => updateSubBlock(colIdx, sb.id, { content: val })}
                  placeholder="Type here..."
                  compactToolbar
                  style={{ border: '1px solid #f0e0e0' }}
                />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  {sb.image ? (
                    <img src={sb.image} alt="" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
                  ) : !readOnly ? (
                    <label className="cf-image-label" style={{ cursor: 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                      <ImageIcon style={{ width: 20, height: 20, opacity: 0.5 }} />
                      <span style={{ fontSize: '0.75rem' }}>Upload Image</span>
                      <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const r = new FileReader();
                          r.onload = (ev) => updateSubBlock(colIdx, sb.id, { image: ev.target.result });
                          r.readAsDataURL(e.target.files[0]);
                        }
                      }} />
                    </label>
                  ) : null}
                </div>
              )}
            </div>
          ))}

          {!readOnly && col.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1, color: '#C4A0A0', gap: 8 }}>
              <Layers style={{ width: 22, height: 22, opacity: 0.4 }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Empty Column</span>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button onClick={() => addSubBlock(colIdx, 'text')} className="cf-btn" style={{ height: 26, fontSize: '0.6875rem', padding: '0 8px' }}>+ Text</button>
                <button onClick={() => addSubBlock(colIdx, 'image')} className="cf-btn" style={{ height: 26, fontSize: '0.6875rem', padding: '0 8px' }}>+ Image</button>
              </div>
            </div>
          )}
          {!readOnly && col.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button onClick={() => addSubBlock(colIdx, 'text')} style={{ flex: 1, background: 'none', border: '1px dashed #EAD0D0', color: '#8b6060', fontSize: '0.6875rem', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }}>+ Text</button>
              <button onClick={() => addSubBlock(colIdx, 'image')} style={{ flex: 1, background: 'none', border: '1px dashed #EAD0D0', color: '#8b6060', fontSize: '0.6875rem', padding: '4px 6px', borderRadius: 6, cursor: 'pointer' }}>+ Image</button>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
