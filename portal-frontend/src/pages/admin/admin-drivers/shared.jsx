import React from 'react';

export const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

export const InfoBox = ({ label, value, color }) => (
  <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem' }}>
    <p style={{ fontSize: '0.625rem', color: '#64748b', marginBottom: '0.125rem' }}>{label}</p>
    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: color || '#1e293b' }}>{value}</p>
  </div>
);

export const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
};

export const btnPrimary = {
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none',
  background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
};

export const btnSecondary = {
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0', background: 'white',
  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569'
};

export const pagBtn = (disabled) => ({
  padding: '0.5rem 1rem', borderRadius: '0.375rem',
  border: '1px solid #e2e8f0', background: 'white',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1, fontSize: '0.875rem'
});
