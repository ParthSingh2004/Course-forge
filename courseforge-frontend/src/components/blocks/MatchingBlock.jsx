import React from 'react';
import { Trash2 } from 'lucide-react';
import MandatorySelect from '../ui/MandatorySelect';

export default function MatchingBlock({ block, onUpdate }) {
    return (
        <div className="cf-quiz-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                <MandatorySelect
                    value={!!block.mandatory}
                    onChange={(mandatory) => onUpdate(block.id, { mandatory })}
                    size="compact"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b6060', whiteSpace: 'nowrap' }}>Marks:</span>
                    <input
                        type="number" min="0" step="1"
                        value={block.marks ?? ''}
                        onChange={(e) => onUpdate(block.id, { marks: e.target.value === '' ? '' : parseInt(e.target.value) })}
                        style={{
                            width: 52, padding: '0.2rem 0.4rem', borderRadius: 6, border: '1px solid #EAD0D0',
                            fontSize: '0.75rem', fontWeight: 700, color: '#8b1a1a', textAlign: 'center',
                            background: '#fff5f5', outline: 'none', fontFamily: 'Roboto',
                        }}
                    />
                </div>
            </div>
            <input
                className="cf-quiz-q-input"
                value={block.question}
                onChange={(e) => onUpdate(block.id, { question: e.target.value })}
                placeholder="Enter your matching instruction..."
            />
            {block.pairs.map((pair, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #e8d8d8', borderRadius: 4 }}
                        value={pair.leftItem}
                        onChange={(e) => {
                            const newPairs = [...block.pairs];
                            newPairs[index].leftItem = e.target.value;
                            onUpdate(block.id, { pairs: newPairs });
                        }}
                        placeholder="Left item"
                    />
                    <input
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #e8d8d8', borderRadius: 4 }}
                        value={pair.rightItem}
                        onChange={(e) => {
                            const newPairs = [...block.pairs];
                            newPairs[index].rightItem = e.target.value;
                            onUpdate(block.id, { pairs: newPairs });
                        }}
                        placeholder="Right match"
                    />
                    <button
                        onClick={() => {
                            const newPairs = block.pairs.filter((_, i) => i !== index);
                            onUpdate(block.id, { pairs: newPairs });
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', padding: '0.5rem' }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            <button
                onClick={() => onUpdate(block.id, { pairs: [...block.pairs, { leftItem: "", rightItem: "" }] })}
                style={{ marginTop: '0.5rem', background: 'transparent', border: '1px dashed #e8d8d8', color: '#8b6060', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
            >
                + Add Pair
            </button>
        </div>
    );
}
