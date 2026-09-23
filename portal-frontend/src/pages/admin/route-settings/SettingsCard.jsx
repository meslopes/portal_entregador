import React from 'react';

const SettingsCard = (props) => {
  const { icon: Icon, iconColor, title, subtitle, children } = props;
  return (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <Icon size={20} style={{ color: iconColor }} />
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{title}</h2>
        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{subtitle}</p>
      </div>
    </div>
    <div style={{ padding: '1.25rem' }}>
      {children}
    </div>
  </div>
  );
};

export default SettingsCard;
