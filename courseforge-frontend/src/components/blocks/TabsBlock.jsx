import React, { useState } from 'react';
import { Layout, Trash2, Image as ImageIcon, X } from 'lucide-react';
import RichTextEditor from '../ui/RichTextEditor';

export default function TabsBlock({ block, onUpdate }) {
    const [currentTab, setCurrentTab] = useState(0);

    const tabs = block.tabs || [{ title: 'Tab 1', content: '', image: null }];

    const nextTab = (e) => {
        e.stopPropagation();
        if (currentTab < tabs.length - 1) setCurrentTab(s => s + 1);
    };

    const prevTab = (e) => {
        e.stopPropagation();
        if (currentTab > 0) setCurrentTab(s => s - 1);
    };

    const addTab = (e) => {
        e.stopPropagation();
        const newTabs = [...tabs, { title: `Tab ${tabs.length + 1}`, content: '', image: null }];
        onUpdate(block.id, { tabs: newTabs });
        setCurrentTab(newTabs.length - 1);
    };

    const updateTab = (index, field, value) => {
        const newTabs = [...tabs];
        newTabs[index] = { ...newTabs[index], [field]: value };
        onUpdate(block.id, { tabs: newTabs });
    };

    const deleteTab = (e, index) => {
        e.stopPropagation();
        if (tabs.length <= 1) return;
        const newTabs = tabs.filter((_, i) => i !== index);
        onUpdate(block.id, { tabs: newTabs });
        if (currentTab >= newTabs.length) setCurrentTab(newTabs.length - 1);
    };

    const handleImageUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => updateTab(currentTab, 'image', reader.result);
            reader.readAsDataURL(file);
            e.target.value = null;
        }
    };

    return (
        <div className="cf-tabs-block" style={{ background: 'white', borderRadius: 12, border: '1px solid #EAD0D0', padding: '1.5rem', boxShadow: '0 4px 12px rgba(139,26,26,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8B1A1A', fontWeight: 600, fontSize: '0.875rem' }}>
                    <Layout style={{ width: 16, height: 16 }} />
                    Interactive Tabs
                </div>
                <button onClick={addTab} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: 'none', background: '#8B1A1A', color: 'white', cursor: 'pointer' }}>
                    + Add Tab
                </button>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #EAD0D0', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {tabs.map((tab, i) => (
                    <div
                        key={i}
                        onClick={() => setCurrentTab(i)}
                        style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontWeight: i === currentTab ? 600 : 400,
                            color: i === currentTab ? '#8B1A1A' : '#666',
                            borderBottom: i === currentTab ? '2px solid #8B1A1A' : '2px solid transparent',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {tab.title || `Tab ${i + 1}`}
                        {tabs.length > 1 && i === currentTab && (
                            <button onClick={(e) => deleteTab(e, i)} style={{ background: 'transparent', border: 'none', color: '#C4A0A0', cursor: 'pointer', display: 'flex', padding: 0 }} title="Delete Tab">
                                <Trash2 style={{ width: 12, height: 12 }} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Tab Content Area */}
            <div style={{ background: '#FDF8F8', borderRadius: 8, padding: '1.5rem', border: '1px solid #F0E0E0' }}>
                <input
                    value={tabs[currentTab].title}
                    onChange={(e) => updateTab(currentTab, 'title', e.target.value)}
                    placeholder="Tab Title"
                    style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '1.25rem', fontWeight: 600, color: '#1A0A0A', marginBottom: '1rem', fontFamily: 'Roboto' }}
                />

                <div style={{ display: 'flex', gap: '1.5rem', flexDirection: 'column' }}>
                    {/* Image Area */}
                    {tabs[currentTab].image ? (
                        <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                            <img src={tabs[currentTab].image} alt="Tab content" style={{ width: '100%', borderRadius: 8, objectFit: 'contain', maxHeight: '200px' }} />
                            <button
                                onClick={() => updateTab(currentTab, 'image', null)}
                                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,255,255,0.9)', border: '1px solid #EAD0D0', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: '#8b1a1a', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                <X style={{ width: 10, height: 10 }} /> Remove
                            </button>
                        </div>
                    ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100px', background: '#F5F0EE', border: '1px dashed #C4A0A0', borderRadius: 8, cursor: 'pointer', color: '#8B6060', fontSize: '0.875rem' }}>
                            <ImageIcon style={{ width: 24, height: 24, marginBottom: '0.25rem', opacity: 0.7 }} />
                            Add Tab Image
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>
                    )}

                    {/* Text Area */}
                    <div>
                        <RichTextEditor
                            value={tabs[currentTab].content}
                            onChange={(val) => updateTab(currentTab, 'content', val)}
                            placeholder="Add content for this tab..."
                            style={{ border: 'none', background: 'transparent' }}
                        />
                    </div>
                </div>
            </div>

            {/* Navigation Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center' }}>
                <button
                    onClick={prevTab}
                    disabled={currentTab === 0}
                    style={{ padding: '0.5rem 1rem', borderRadius: 4, border: '1px solid #EAD0D0', background: currentTab === 0 ? '#F5F0EE' : 'white', color: currentTab === 0 ? '#C4A0A0' : '#8B1A1A', cursor: currentTab === 0 ? 'not-allowed' : 'pointer' }}
                >
                    &larr; Prev
                </button>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    Slide {currentTab + 1} of {tabs.length}
                </div>
                <button
                    onClick={nextTab}
                    disabled={currentTab === tabs.length - 1}
                    style={{ padding: '0.5rem 1rem', borderRadius: 4, border: '1px solid #EAD0D0', background: currentTab === tabs.length - 1 ? '#F5F0EE' : 'white', color: currentTab === tabs.length - 1 ? '#C4A0A0' : '#8B1A1A', cursor: currentTab === tabs.length - 1 ? 'not-allowed' : 'pointer' }}
                >
                    Next &rarr;
                </button>
            </div>
        </div>
    );
}
