import React from 'react';
import { formatCurrency, formatDate, getStatusBadge } from './utils';

const th = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: '#374151',
};
const thCenter = { ...th, textAlign: 'center' };
const thRight  = { ...th, textAlign: 'right' };
const td       = { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#475569' };
const tdCenter = { ...td, textAlign: 'center' };
const tdRight  = { ...td, textAlign: 'right', fontWeight: 600, color: '#1e293b' };

const InvoicesTable = ({ invoices, onPayInvoice }) => (
  <div
    style={{
      background: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      overflow: 'hidden',
    }}
  >
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <th style={th}>Fatura</th>
          <th style={th}>Estabelecimento</th>
          <th style={th}>Período</th>
          <th style={thCenter}>Entregadores</th>
          <th style={thRight}>Valor</th>
          <th style={thCenter}>Vencimento</th>
          <th style={thCenter}>Status</th>
          <th style={thCenter}>Ação</th>
        </tr>
      </thead>
      <tbody>
        {invoices.length === 0 ? (
          <tr>
            <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Nenhuma fatura encontrada
            </td>
          </tr>
        ) : (
          invoices.map((invoice) => (
            <tr key={invoice.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ ...td, fontWeight: 600, color: '#1e293b' }}>
                {invoice.invoice_number}
              </td>
              <td style={td}>{invoice.restaurant_name}</td>
              <td style={{ ...td, fontSize: '0.8125rem', color: '#64748b' }}>
                {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
              </td>
              <td style={tdCenter}>{invoice.drivers_count}</td>
              <td style={tdRight}>{formatCurrency(invoice.total_amount)}</td>
              <td style={{ ...tdCenter, fontSize: '0.8125rem', color: '#64748b' }}>
                {formatDate(invoice.due_date)}
              </td>
              <td style={tdCenter}>{getStatusBadge(invoice.status)}</td>
              <td style={tdCenter}>
                {invoice.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {invoice.payment_url && (
                      <a
                        href={invoice.payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          background: '#2563eb',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'none',
                        }}
                      >
                        PIX
                      </a>
                    )}
                    <button
                      onClick={() => onPayInvoice(invoice.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        background: '#059669',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Registrar Pagamento
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default InvoicesTable;
