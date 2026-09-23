import React from 'react';

export const section = (title, children) => (
  <div style={{ marginBottom: '2rem' }}>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>{title}</h2>
    {children}
  </div>
);

export const badge = (text, color, bg) => (
  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: bg, color, marginRight: '0.25rem' }}>{text}</span>
);

export const actionBtn = (label, color, bg, onClick, title = '') => (
  <button onClick={onClick} title={title || label} style={{
    padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: 'none',
    background: bg, color, fontSize: '0.6875rem', fontWeight: 600,
    cursor: 'pointer', marginLeft: '0.375rem', transition: 'opacity 0.15s'
  }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
     onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
    {label}
  </button>
);

export const card = (children, borderColor = '#e2e8f0') => (
  <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderLeft: `3px solid ${borderColor}` }}>
    {children}
  </div>
);
