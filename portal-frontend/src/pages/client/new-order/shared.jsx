import React from 'react';

export const Card = ({ title, icon, children }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <span style={{ color: '#0d9488' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>{title}</span>
    </div>
    {children}
  </div>
);

export const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem', marginTop: '0.75rem' }}>{children}</label>
);

export const Row = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
    <span style={{ color: '#64748b' }}>{label}</span>
    <span style={{ color: '#1e293b', fontWeight: bold ? 600 : 400 }}>{value}</span>
  </div>
);

export const PayBtn = ({ active, onClick, label, desc }) => (
  <button type="button" onClick={onClick} style={{ flex: 1, minWidth: '180px', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid', borderColor: active ? '#0d9488' : '#e2e8f0', background: active ? '#f0fdfa' : 'white', cursor: 'pointer', textAlign: 'left' }}>
    <p style={{ fontWeight: 600, color: active ? '#0f766e' : '#1e293b', fontSize: '0.875rem', marginBottom: '0.125rem' }}>{label}</p>
    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{desc}</p>
  </button>
);
