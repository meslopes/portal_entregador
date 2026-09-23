import React from 'react';

const cardBase = {
  borderRadius: '0.75rem', padding: '1.25rem'
};

const labelStyle = {
  fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem'
};

const valueStyle = (color = '#1e293b') => ({
  fontSize: '1.5rem', fontWeight: 700, color
});

const PaymentStats = ({ summary, variant, formatCurrency }) => {
  if (!summary) return null;

  if (variant === 'reports') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ ...cardBase, background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', color: 'white' }}>
          <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Total Ganhos</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(summary.total_earning)}</p>
        </div>
        <div style={{ ...cardBase, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={labelStyle}>Total Pago</p>
          <p style={valueStyle('#059669')}>{formatCurrency(summary.total_paid)}</p>
        </div>
        <div style={{ ...cardBase, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={labelStyle}>Total Pendente</p>
          <p style={valueStyle('#d97706')}>{formatCurrency(summary.total_pending)}</p>
        </div>
        <div style={{ ...cardBase, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={labelStyle}>Entregadores</p>
          <p style={valueStyle()}>{summary.total_drivers}</p>
        </div>
      </div>
    );
  }

  if (variant === 'withdrawals') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ ...cardBase, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white' }}>
          <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Total Pendente</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(summary.total_pending)}</p>
        </div>
        <div style={{ ...cardBase, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={labelStyle}>Total Pago</p>
          <p style={valueStyle('#059669')}>{formatCurrency(summary.total_paid)}</p>
        </div>
        <div style={{ ...cardBase, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={labelStyle}>Entregadores c/ Pendência</p>
          <p style={valueStyle()}>{summary.drivers_with_pending}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentStats;
