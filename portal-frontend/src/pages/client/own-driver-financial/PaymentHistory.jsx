import React from 'react';
import { CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { PAYMENT_TYPES, selectStyle, thStyle, tdStyle, formatCurrency } from './constants';

const PaymentHistory = ({
  earnings, summary, drivers, driverFilter, paidFilter, period,
  onPeriodChange, onDriverFilterChange, onPaidFilterChange,
  onPayEarning, onPayAll
}) => (
  <div>
    {/* Filtros */}
    <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
      <select value={period} onChange={e => onPeriodChange(e.target.value)} style={selectStyle}>
        <option value="week">Última Semana</option>
        <option value="month">Último Mês</option>
        <option value="all">Todos</option>
      </select>
      <select value={driverFilter} onChange={e => onDriverFilterChange(e.target.value)} style={selectStyle}>
        <option value="">Todos Entregadores</option>
        {drivers.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <select value={paidFilter} onChange={e => onPaidFilterChange(e.target.value)} style={selectStyle}>
        <option value="">Todos Status</option>
        <option value="false">Pendentes</option>
        <option value="true">Pagos</option>
      </select>
    </div>

    {/* Tabela de Ganhos */}
    <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={thStyle}>Pedido</th>
            <th style={thStyle}>Data</th>
            <th style={thStyle}>Entregador</th>
            <th style={thStyle}>Frete</th>
            <th style={thStyle}>Ganho</th>
            <th style={thStyle}>Tipo</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {earnings.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                Nenhum ganho registrado
              </td>
            </tr>
          ) : (
            earnings.map(earning => (
              <tr key={earning.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>#{earning.order_number}</td>
                <td style={tdStyle}>
                  {earning.created_at ? new Date(earning.created_at).toLocaleDateString('pt-BR') : '-'}
                  <br />
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                    {earning.created_at ? new Date(earning.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </td>
                <td style={tdStyle}>{earning.driver_name}</td>
                <td style={tdStyle}>{formatCurrency(earning.delivery_fee)}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#059669' }}>
                  {formatCurrency(earning.driver_earning)}
                </td>
                <td style={tdStyle}>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', background: '#dbeafe', color: '#1d4ed8' }}>
                    {PAYMENT_TYPES[earning.payment_type]?.label || earning.payment_type}
                  </span>
                </td>
                <td style={tdStyle}>
                  {earning.is_paid ? (
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}>
                      <CheckCircle size={14} /> Pago
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}>
                      <AlertCircle size={14} /> Pendente
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  {!earning.is_paid && (
                    <button
                      onClick={() => onPayEarning(earning.id)}
                      style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}
                    >
                      Pagar
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* Botão Pagar Todos */}
    {driverFilter && summary?.total_pending > 0 && (
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onPayAll(driverFilter)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
        >
          <CreditCard size={16} /> Pagar Todos ({formatCurrency(summary.total_pending)})
        </button>
      </div>
    )}
  </div>
);

export default PaymentHistory;
