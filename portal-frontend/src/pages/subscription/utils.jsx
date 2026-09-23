import React from 'react';

export const formatCurrency = (value) =>
  `R$ ${(value || 0).toFixed(2).replace('.', ',')}`;

export const formatDate = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '-';

export const getStatusBadge = (status) => {
  const configs = {
    PENDING:   { bg: '#fef3c7', color: '#92400e', label: 'Pendente' },
    PAID:      { bg: '#dcfce7', color: '#16a34a', label: 'Pago' },
    OVERDUE:   { bg: '#fef2f2', color: '#dc2626', label: 'Vencido' },
    CANCELLED: { bg: '#f1f5f9', color: '#64748b', label: 'Cancelado' },
  };
  const config = configs[status] || configs.PENDING;
  return (
    <span
      style={{
        padding: '0.125rem 0.5rem',
        borderRadius: '9999px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        background: config.bg,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
};
