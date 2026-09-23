import React from 'react';
import { Palette } from 'lucide-react';
import SectionCard from './SectionCard';
import WhiteLabelPreview from './WhiteLabelPreview';

const inputStyle = {
  width: '100%', padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit'
};

const labelStyle = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
  color: '#374151', marginBottom: '0.375rem'
};

const ColorInput = ({ label, value, placeholder, onChange }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <input
        type="color"
        value={value}
        onChange={onChange}
        style={{ width: '48px', height: '40px', border: 'none', cursor: 'pointer' }}
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        style={{ ...inputStyle, flex: 1 }}
        placeholder={placeholder}
      />
    </div>
  </div>
);

const ColorPicker = ({ primaryColor, secondaryColor, onPrimaryChange, onSecondaryChange }) => (
  <SectionCard icon={Palette} title="Cores da Marca">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <ColorInput
        label="Cor Primária"
        value={primaryColor}
        placeholder="#6366f1"
        onChange={onPrimaryChange}
      />
      <ColorInput
        label="Cor Secundária"
        value={secondaryColor}
        placeholder="#ffffff"
        onChange={onSecondaryChange}
      />
    </div>
    <WhiteLabelPreview primaryColor={primaryColor} secondaryColor={secondaryColor} />
  </SectionCard>
);

export default ColorPicker;
