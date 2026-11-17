import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Barra de abas do menu "Pagamentos" do portal do estabelecimento (Fase C).
 * Unifica as telas de pagamento dos entregadores próprios em um único menu:
 * Configuração/Ganhos (OwnDriverFinancialPage) e Relatórios e Saques (PaymentReportsPage).
 */
const ABAS = [
  { id: 'config', rotulo: 'Configuração e Ganhos', href: '/client/drivers/financial' },
  { id: 'reports', rotulo: 'Relatórios e Saques', href: '/client/payment-reports' },
];

const PaymentsTabs = ({ active }) => (
  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
    {ABAS.map((a) => (
      <Link
        key={a.id}
        to={a.href}
        style={{
          padding: '0.5rem 1.125rem', borderRadius: '0.5rem', fontSize: '0.8125rem',
          fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s',
          background: active === a.id ? '#2563eb' : '#f1f5f9',
          color: active === a.id ? 'white' : '#475569',
        }}
      >
        {a.rotulo}
      </Link>
    ))}
  </div>
);

export default PaymentsTabs;
