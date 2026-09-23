import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { inputStyle } from './shared.constants';

export const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{
      display: 'block', fontSize: '0.8125rem', fontWeight: 500,
      color: '#374151', marginBottom: '0.375rem',
    }}>{label}</label>
    {children}
  </div>
);

export const PasswordField = ({ value, onChange, visible, onToggle, placeholder }) => (
  <div style={{ position: 'relative' }}>
    <input
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ ...inputStyle, paddingRight: '2.5rem' }}
    />
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'absolute', right: '0.75rem', top: '50%',
        transform: 'translateY(-50%)', background: 'none',
        border: 'none', cursor: 'pointer', color: '#64748b',
      }}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
);
