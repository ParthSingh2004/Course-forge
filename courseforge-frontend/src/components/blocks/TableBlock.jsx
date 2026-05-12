import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import RichTextEditor from '../ui/RichTextEditor';

function darkenColor(hex, amount = 30) {
    if (!hex) return '#f0f0f0';
    let usePound = false;
    if (hex[0] === "#") {
        hex = hex.slice(1);
        usePound = true;
    }
    const num = parseInt(hex, 16);
    let r = (num >> 16) - amount;
    if (r < 0) r = 0;
    let g = ((num >> 8) & 0x00FF) - amount;
    if (g < 0) g = 0;
    let b = (num & 0x0000FF) - amount;
    if (b < 0) b = 0;
    return (usePound ? "#" : "") + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
}

function TableCellEditor({ value, onChange, bgColor, isHeader }) {
    const [editing, setEditing] = useState(false);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
    const cellRef = useRef(null);
    const popupRef = useRef(null);

    const openEditor = () => {
        if (cellRef.current) {
            const rect = cellRef.current.getBoundingClientRect();
            const popupWidth = 340;
            let left = rect.left;
            if (left + popupWidth > window.innerWidth - 8) {
                left = window.innerWidth - popupWidth - 8;
            }
            setPopupPos({ top: rect.bottom + 6, left: Math.max(8, left) });
        }
        setEditing(true);
    };

    useEffect(() => {
        if (!editing) return;
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) &&
                cellRef.current && !cellRef.current.contains(e.target)) {
                setEditing(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [editing]);

    return (
        <>
            <div
                ref={cellRef}
                onClick={openEditor}
                title="Click to edit"
                style={{
                    minHeight: 28, cursor: 'text', padding: '2px 4px',
                    fontWeight: isHeader ? 700 : 400,
                    color: '#1A0A0A', fontSize: 14, lineHeight: 1.4,
                    outline: 'none', minWidth: 80,
                    border: editing ? '1.5px solid #8b1a1a' : '1.5px solid transparent',
                    borderRadius: 3,
                }}
                dangerouslySetInnerHTML={{ __html: value || `<span style="color:#aaa">${isHeader ? 'Header…' : 'Cell…'}</span>` }}
            />
            {editing && (
                <div
                    ref={popupRef}
                    style={{
                        position: 'fixed',
                        top: popupPos.top,
                        left: popupPos.left,
                        width: 340,
                        zIndex: 99999,
                        background: 'white',
                        border: '1px solid #EAD0D0',
                        borderRadius: 10,
                        boxShadow: '0 8px 32px rgba(139,26,26,0.18), 0 2px 8px rgba(0,0,0,0.10)',
                        overflow: 'hidden',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div style={{ padding: '6px 10px', background: '#FDF8F8', borderBottom: '1px solid #EAD0D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8b6060', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            {isHeader ? 'Edit Header' : 'Edit Cell'}
                        </span>
                        <button
                            onMouseDown={(e) => { e.preventDefault(); setEditing(false); }}
                            style={{ background: '#8b1a1a', color: 'white', border: 'none', borderRadius: 5, padding: '3px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                        >
                            Done
                        </button>
                    </div>
                    <RichTextEditor
                        value={value}
                        onChange={onChange}
                        compactToolbar
                        style={{ border: 'none', borderRadius: 0 }}
                    />
                </div>
            )}
        </>
    );
}

export default function TableBlock({ block, onUpdate }) {
    const updateHeader = (colIdx, val) => {
        const newHeaders = [...block.headers];
        newHeaders[colIdx] = val;
        onUpdate(block.id, { headers: newHeaders });
    };
    const updateCell = (rowIdx, colIdx, val) => {
        const newRows = block.rows.map(r => [...r]);
        newRows[rowIdx][colIdx] = val;
        onUpdate(block.id, { rows: newRows });
    };
    const addRow = () => {
        const newRow = new Array(block.headers.length).fill('');
        onUpdate(block.id, { rows: [...block.rows, newRow] });
    };
    const addCol = () => {
        const newHeaders = [...block.headers, ''];
        const newRows = block.rows.map(row => [...row, '']);
        onUpdate(block.id, { headers: newHeaders, rows: newRows });
    };
    const deleteRow = (rIdx) => {
        if (block.rows.length <= 1) return;
        const newRows = block.rows.filter((_, i) => i !== rIdx);
        onUpdate(block.id, { rows: newRows });
    };
    const deleteCol = (cIdx) => {
        if (block.headers.length <= 1) return;
        const newHeaders = block.headers.filter((_, i) => i !== cIdx);
        const newRows = block.rows.map(row => row.filter((_, i) => i !== cIdx));
        onUpdate(block.id, { headers: newHeaders, rows: newRows });
    };

    const tableColor = block.tableColor || '#ffffff';
    const headerColor = block.headerColor || darkenColor(tableColor, 20);

    return (
        <div className="cf-table-block" style={{ background: 'white', borderRadius: 12, border: '1px solid #EAD0D0', padding: '1rem', overflowX: 'auto' }}>
            <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={addRow} style={{ padding: '0.25rem 0.625rem', borderRadius: 4, border: '1px solid #EAD0D0', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}>+ Row</button>
                <button onClick={addCol} style={{ padding: '0.25rem 0.625rem', borderRadius: 4, border: '1px solid #EAD0D0', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}>+ Column</button>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#8b6060', fontWeight: 600, cursor: 'pointer' }}>
                        Header Color
                        <input
                            type="color"
                            value={headerColor}
                            onChange={(e) => onUpdate(block.id, { headerColor: e.target.value })}
                            style={{ width: 28, height: 28, padding: 0, border: '1px solid #EAD0D0', borderRadius: 4, cursor: 'pointer' }}
                        />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#8b6060', fontWeight: 600, cursor: 'pointer' }}>
                        Cell Color
                        <input
                            type="color"
                            value={tableColor}
                            onChange={(e) => onUpdate(block.id, { tableColor: e.target.value })}
                            style={{ width: 28, height: 28, padding: 0, border: '1px solid #EAD0D0', borderRadius: 4, cursor: 'pointer' }}
                        />
                    </label>
                </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #F0E0E0' }}>
                <thead>
                    <tr>
                        {block.headers.map((h, i) => (
                            <th key={i} style={{ border: '1px solid #E0D0D0', padding: '0.5rem', background: headerColor, position: 'relative', verticalAlign: 'top' }}>
                                <TableCellEditor value={h} onChange={(v) => updateHeader(i, v)} bgColor={headerColor} isHeader />
                                {block.headers.length > 1 && (
                                    <button onClick={() => deleteCol(i)} style={{ position: 'absolute', right: 3, top: 3, background: 'none', border: 'none', color: '#C4A0A0', cursor: 'pointer', padding: 0 }} title="Delete column">
                                        <Trash2 style={{ width: 11, height: 11 }} />
                                    </button>
                                )}
                            </th>
                        ))}
                        <th style={{ width: 36, border: '1px solid #E0D0D0', background: headerColor }}></th>
                    </tr>
                </thead>
                <tbody>
                    {block.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                                <td key={cIdx} style={{ border: '1px solid #F0E0E0', padding: '0.5rem', background: tableColor, verticalAlign: 'top' }}>
                                    <TableCellEditor value={cell} onChange={(v) => updateCell(rIdx, cIdx, v)} bgColor={tableColor} isHeader={false} />
                                </td>
                            ))}
                            <td style={{ border: '1px solid #F0E0E0', textAlign: 'center', width: 36, background: tableColor, verticalAlign: 'middle' }}>
                                {block.rows.length > 1 && (
                                    <button onClick={() => deleteRow(rIdx)} style={{ background: 'none', border: 'none', color: '#C4A0A0', cursor: 'pointer' }} title="Delete row">
                                        <Trash2 style={{ width: 14, height: 14 }} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.6875rem', color: '#8b6060' }}>Click any cell to open the rich text editor · Done to save</p>
        </div>
    );
}