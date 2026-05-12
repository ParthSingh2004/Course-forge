import React, { useState } from 'react';
import { Layers, Trash2 } from 'lucide-react';
import RichTextEditor from '../ui/RichTextEditor';

export default function ProcessBlock({ block, onUpdate }) {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = block.steps || [{ title: '', content: '' }];

    const nextStep = (e) => {
        e.stopPropagation();
        if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
    };

    const prevStep = (e) => {
        e.stopPropagation();
        if (currentStep > 0) setCurrentStep(s => s - 1);
    };

    const addStep = (e) => {
        e.stopPropagation();
        const newSteps = [...steps, { title: '', content: '' }];
        onUpdate(block.id, { steps: newSteps });
        setCurrentStep(newSteps.length - 1);
    };

    const updateStep = (index, field, value) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        onUpdate(block.id, { steps: newSteps });
    };

    const deleteStep = (e, index) => {
        e.stopPropagation();
        if (steps.length <= 1) return;
        const newSteps = steps.filter((_, i) => i !== index);
        onUpdate(block.id, { steps: newSteps });
        if (currentStep >= newSteps.length) setCurrentStep(newSteps.length - 1);
    };

    return (
        <div className="cf-process-block" style={{ background: 'white', borderRadius: 12, border: '1px solid #EAD0D0', padding: '1.5rem', boxShadow: '0 4px 12px rgba(139,26,26,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8B1A1A', fontWeight: 600, fontSize: '0.875rem' }}>
                    <Layers style={{ width: 16, height: 16 }} />
                    Process Step {currentStep + 1} of {steps.length}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={prevStep} disabled={currentStep === 0} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #EAD0D0', background: currentStep === 0 ? '#F5F0EE' : 'white', color: currentStep === 0 ? '#C4A0A0' : '#8B1A1A', cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}>
                        Prev
                    </button>
                    <button onClick={nextStep} disabled={currentStep === steps.length - 1} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #EAD0D0', background: currentStep === steps.length - 1 ? '#F5F0EE' : 'white', color: currentStep === steps.length - 1 ? '#C4A0A0' : '#8B1A1A', cursor: currentStep === steps.length - 1 ? 'not-allowed' : 'pointer' }}>
                        Next
                    </button>
                    <button onClick={addStep} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, border: 'none', background: '#8B1A1A', color: 'white', cursor: 'pointer', marginLeft: '0.5rem' }}>
                        + Add Step
                    </button>
                </div>
            </div>

            <div style={{ background: '#FDF8F8', borderRadius: 8, padding: '1rem', border: '1px solid #F0E0E0', position: 'relative' }}>
                {steps.length > 1 && (
                    <button onClick={(e) => deleteStep(e, currentStep)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#C4A0A0', cursor: 'pointer' }} title="Delete step">
                        <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                )}
                <input
                    value={steps[currentStep].title}
                    onChange={(e) => updateStep(currentStep, 'title', e.target.value)}
                    placeholder="Step Title"
                    style={{ width: 'calc(100% - 2rem)', border: 'none', background: 'transparent', outline: 'none', fontSize: '1.125rem', fontWeight: 600, color: '#1A0A0A', marginBottom: '0.5rem', fontFamily: 'Roboto' }}
                />
                <RichTextEditor
                    value={steps[currentStep].content}
                    onChange={(val) => updateStep(currentStep, 'content', val)}
                    placeholder="Describe this step in the process..."
                    style={{ border: 'none', background: 'transparent', marginTop: '0.5rem' }}
                />
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '1rem', justifyContent: 'center' }}>
                {steps.map((_, i) => (
                    <div key={i} onClick={() => setCurrentStep(i)} style={{ width: i === currentStep ? '20px' : '8px', height: '8px', borderRadius: '4px', background: i === currentStep ? '#8B1A1A' : '#EAD0D0', cursor: 'pointer', transition: 'all 0.2s' }} />
                ))}
            </div>
        </div>
    );
}