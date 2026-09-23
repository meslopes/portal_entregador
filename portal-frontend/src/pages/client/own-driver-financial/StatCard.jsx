import React from 'react';

const StatCard = ({ label, value, icon, color }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
      <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color }}>{icon}</span>
      </div>
    </div>
    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

export default StatCard;
