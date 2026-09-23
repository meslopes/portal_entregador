import React from 'react';
import { CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from './utils';

const cardStyle = {
  background: 'white',
  borderRadius: '0.75rem',
  padding: '1.25rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1rem',
  padding: '1rem',
  background: '#f8fafc',
  borderRadius: '0.5rem',
};

const pill = (bg, color) => ({
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.6875rem',
  fontWeight: 600,
  background: bg,
  color,
});

const SubscriptionCards = ({ subscriptions, onGenerateInvoice }) => {
  if (subscriptions.length === 0) {
    return (
      <div
        style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <CreditCard size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhuma assinatura cadastrada</p>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
          Crie uma assinatura para começar a cobrar pelos entregadores próprios.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {subscriptions.map((sub) => (
        <div key={sub.id} style={cardStyle}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <div>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.125rem' }}>
                {sub.restaurant_name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span
                  style={pill(
                    sub.billing_cycle === 'WEEKLY' ? '#dbeafe' : '#ede9fe',
                    sub.billing_cycle === 'WEEKLY' ? '#1d4ed8' : '#6d28d9',
                  )}
                >
                  {sub.billing_cycle === 'WEEKLY' ? '📆 Semanal' : '🗓️ Mensal'}
                </span>
                <span
                  style={pill(
                    sub.is_active ? '#dcfce7' : '#fef2f2',
                    sub.is_active ? '#16a34a' : '#dc2626',
                  )}
                >
                  {sub.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Por entregador/ciclo</p>
              <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.25rem' }}>
                {formatCurrency(sub.price_per_driver)}
              </p>
              {sub.fixed_price > 0 && (
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  + {formatCurrency(sub.fixed_price)} fixo
                </p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div style={gridStyle}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Última Cobrança</p>
              <p style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(sub.last_billed_at)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Próxima Cobrança</p>
              <p style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(sub.next_billing_at)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Faturado</p>
              <p style={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(sub.total_billed)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pendente</p>
              <p style={{ fontWeight: 600, color: sub.pending_amount > 0 ? '#d97706' : '#059669' }}>
                {formatCurrency(sub.pending_amount)}
              </p>
            </div>
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              onClick={() => onGenerateInvoice(sub.id)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#374151',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Gerar Fatura
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SubscriptionCards;
