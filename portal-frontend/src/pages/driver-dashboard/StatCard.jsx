import React from 'react';

const StatCard = ({ icon, iconBg, iconColor, label, value, suffix = '' }) => (
  <div style={{
    background: 'white',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    cursor: 'default'
  }}
  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        padding: '0.625rem',
        borderRadius: '0.5rem',
        background: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{suffix}</span></p>
      </div>
    </div>
  </div>
);

export default StatCard;
