import React from 'react';

const statusConfigs = {
  PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Aguardando Aceite' },
  ACTIVE: { bg: '#dbeafe', color: '#1d4ed8', label: 'Em Rota' },
  COMPLETED: { bg: '#dcfce7', color: '#166534', label: 'Concluída' },
  REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'Rejeitada' }
};

export const getStatusBadge = (status) => {
  const config = statusConfigs[status] || statusConfigs.PENDING;
  return (
    React.createElement('span', { style: { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: config.bg, color: config.color } }, config.label)
  );
};
