import React from 'react';

export default function MandatorySelect({
    value = false,
    onChange,
    className = '',
    style,
    size = 'default',
}) {
    return (
        <label
            className={`cf-mandatory-select ${size === 'compact' ? 'cf-mandatory-select--compact' : ''} ${className}`.trim()}
            style={style}
        >
            <span className="cf-mandatory-select__label">Completion</span>
            <select
                className={`cf-mandatory-select__control ${value ? 'is-mandatory' : 'is-optional'}`}
                value={value ? 'mandatory' : 'optional'}
                onChange={(e) => onChange?.(e.target.value === 'mandatory')}
            >
                <option value="optional">Optional</option>
                <option value="mandatory">Mandatory</option>
            </select>
        </label>
    );
}
