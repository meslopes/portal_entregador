import React from 'react';

const SectionCard = (props) => {
  const { icon: Icon, title, children } = props;
  return (
  <div style={{
    background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <Icon size={20} style={{ color: '#6366f1' }} />
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
        {title}
      </h2>
    </div>
    {children}
  </div>
  );
};

export default SectionCard;
