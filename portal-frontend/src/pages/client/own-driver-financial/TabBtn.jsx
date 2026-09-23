import React from 'react';

const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      border: 'none',
      background: active ? '#2563eb' : 'transparent',
      color: active ? 'white' : '#64748b',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: active ? 600 : 500,
      transition: 'all 0.15s'
    }}
  >
    {children}
  </button>
);

export default TabBtn;
