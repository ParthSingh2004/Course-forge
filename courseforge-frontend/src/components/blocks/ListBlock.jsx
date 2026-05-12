import React from 'react';

export default function ListBlock({ block, onUpdate }) {
    return (
        <div className="cf-list-block" style={{ padding: '0.5rem 1rem' }}>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#1a0a0a', fontFamily: 'Roboto' }}>
                {block.items.map((item, index) => (
                    <li key={index} style={{ marginBottom: '0.5rem' }}>
                        <input
                            value={item}
                            onChange={(e) => {
                                const newItems = [...block.items];
                                newItems[index] = e.target.value;
                                onUpdate(block.id, { items: newItems });
                            }}
                            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', color: '#1a0a0a' }}
                            placeholder={`List item ${index + 1}...`}
                        />
                    </li>
                ))}
            </ul>
            <button
                onClick={() => onUpdate(block.id, { items: [...block.items, ""] })}
                style={{ marginTop: '0.5rem', background: 'transparent', border: '1px dashed #e8d8d8', color: '#8b6060', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
            >
                + Add Item
            </button>
        </div>
    );
}