import React from 'react';

export const SettingsCard = ({ title, icon, children }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ color: '#2563eb' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: '#1e293b' }}>{title}</span>
    </div>
    <div style={{ padding: '1.5rem' }}>{children}</div>
  </div>
);

export const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

export const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
};
