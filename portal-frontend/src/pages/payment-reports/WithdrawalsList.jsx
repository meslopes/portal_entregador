import React from 'react';
import { Wallet } from 'lucide-react';

const WithdrawalsList = ({ withdrawals, onProcessWithdrawal, formatCurrency }) => {
  if (withdrawals.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Wallet size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhum saque pendente</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {withdrawals.map(driver => (
        <div key={driver.driver_id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{driver.driver_name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                  {driver.restaurant_name}
                </span>
                {driver.pix_key && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    PIX: {driver.pix_key.substring(0, 10)}...
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pendente</p>
                <p style={{ fontWeight: 700, color: driver.pending_amount > 0 ? '#d97706' : '#059669', fontSize: '1.25rem' }}>
                  {formatCurrency(driver.pending_amount)}
                </p>
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{driver.pending_count} entrega(s)</p>
              </div>
              {driver.pending_amount > 0 && (
                <button
                  onClick={() => onProcessWithdrawal(driver.driver_id)}
                  disabled={!driver.pix_key}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none',
                    background: driver.pix_key ? '#059669' : '#94a3b8',
                    color: 'white', fontWeight: 600, fontSize: '0.875rem',
                    cursor: driver.pix_key ? 'pointer' : 'not-allowed'
                  }}
                  title={!driver.pix_key ? 'Entregador não possui PIX cadastrado' : ''}
                >
                  Pagar via PIX
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WithdrawalsList;
