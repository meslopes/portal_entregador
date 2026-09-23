import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const cardStyle = {
  background: 'white', borderRadius: '0.75rem',
  padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

export const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem',
  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
  fontSize: '0.9375rem', outline: 'none',
};

export const saveBtnStyle = (isSaving) => ({
  width: '100%', padding: '0.75rem',
  borderRadius: '0.5rem', border: 'none',
  background: '#2563eb', color: 'white',
  fontSize: '0.9375rem', fontWeight: 600,
  cursor: isSaving ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: '0.5rem', opacity: isSaving ? 0.7 : 1,
});

export const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{
      display: 'block', fontSize: '0.8125rem', fontWeight: 500,
      color: '#374151', marginBottom: '0.375rem',
    }}>{label}</label>
    {children}
  </div>
);

export const PasswordField = ({ label, value, onChange, visible, onToggle, placeholder }) => (
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
