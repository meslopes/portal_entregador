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
