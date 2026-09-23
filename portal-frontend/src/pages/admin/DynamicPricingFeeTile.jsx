import React from 'react';

const FeeTile = ({ active, activeColor, bgActive, borderActive, icon, label, value, extra, onToggle }) => {
  const Icon = icon;
  return (
  <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: active ? bgActive : '#f8fafc', border: `1px solid ${active ? borderActive : '#e2e8f0'}` }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <Icon size={14} color={active ? activeColor : '#64748b'} />
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{label}</span>
      </div>
      <button onClick={onToggle} style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', border: 'none', background: active ? activeColor : '#e2e8f0', color: active ? 'white' : '#64748b', fontSize: '0.6875rem', cursor: 'pointer', fontWeight: 600 }}>
        {active ? 'ATIVA' : 'INATIVA'}
      </button>
    </div>
    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>{value}</span>
    {extra}
  </div>
  );
};

export default FeeTile;
