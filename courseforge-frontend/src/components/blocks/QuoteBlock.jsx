import React from 'react';
import RichTextEditor from '../ui/RichTextEditor';

export default function QuoteBlock({ block, onUpdate }) {
    return (
        <div className="cf-quote-block" style={{ borderLeft: '4px solid #8b1a1a', paddingLeft: '1rem', margin: '1rem 0', background: '#fff5f5', padding: '1rem', borderRadius: '0 8px 8px 0' }}>
            <RichTextEditor
                value={block.content}
                onChange={(val) => onUpdate(block.id, { content: val })}
                placeholder="Enter quote text..."
                style={{ flex: 1, minHeight: '80px', border: 'none', background: 'transparent' }}
            />
            <input
                value={block.author || ''}
                onChange={(e) => onUpdate(block.id, { author: e.target.value })}
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', color: '#8b6060', marginTop: '0.5rem', fontWeight: 600, fontFamily: 'Roboto' }}
                placeholder="Author Name"
            />
        </div>
    );
}