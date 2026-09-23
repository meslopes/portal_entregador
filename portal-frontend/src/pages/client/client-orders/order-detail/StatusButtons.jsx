import React, { useState } from 'react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';

// ── individual status button ─────────────────────────────────────────────────

const StatusBtn = ({ status, label, color, orderId, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  
  const handleClick = async () => {
    if (!window.confirm(`Tem certeza que deseja alterar o status para "${label}"?`)) return;
    try {
      setLoading(true);
      await api.put(`/api/orders/${orderId}/status`, { status });
      onUpdated();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao alterar status', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: 'none',
        background: loading ? '#94a3b8' : color,
        color: 'white',
        fontSize: '0.8125rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer'
      }}
    >
      {loading ? '...' : label}
    </button>
  );
};

// ── status buttons section ───────────────────────────────────────────────────

const StatusButtons = ({ order, onUpdated }) => {
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alterar Status</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {order.status === 'SCHEDULED' && (
          <StatusBtn status="PENDING" label="Tocar Agora" color="#f59e0b" orderId={order.id} onUpdated={onUpdated} />
        )}
        {order.status === 'ACCEPTED' && (
          <StatusBtn status="PREPARING" label="Marcar Preparando" color="#f59e0b" orderId={order.id} onUpdated={onUpdated} />
        )}
        {order.status === 'PREPARING' && (
          <StatusBtn status="READY" label="Marcar Pronto" color="#8b5cf6" orderId={order.id} onUpdated={onUpdated} />
        )}
        {order.status === 'READY' && (
          <StatusBtn status="PICKED_UP" label="Marcar Coletado" color="#3b82f6" orderId={order.id} onUpdated={onUpdated} />
        )}
        {order.status === 'PICKED_UP' && (
          <StatusBtn status="DELIVERED" label="Marcar Entregue" color="#22c55e" orderId={order.id} onUpdated={onUpdated} />
        )}
        {['SCHEDULED', 'PENDING', 'ACCEPTED'].includes(order.status) && (
          <StatusBtn status="CANCELLED" label="Cancelar" color="#ef4444" orderId={order.id} onUpdated={onUpdated} />
        )}
      </div>
    </div>
  );
};

export default StatusButtons;
