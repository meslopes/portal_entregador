import React from 'react';
import { Map } from 'lucide-react';

const buttonBase = {
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontWeight: 600,
};

const StatusActions = ({ order, statusConfig, statusDetail, onEdit, onShowMap, onChangeStatus }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${statusConfig.color || '#64748b'}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '2rem' }}>{statusConfig.icon}</span>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: statusConfig.color }}>{statusConfig.text}</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{statusDetail}</p>
      </div>
    </div>

    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {['SCHEDULED', 'PENDING', 'OFFERED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
        <button onClick={onEdit} style={{ ...buttonBase, border: '1px solid #2563eb', background: 'white', color: '#2563eb' }}>
          ✏️ Editar
        </button>
      )}
      <button onClick={onShowMap} style={{ ...buttonBase, border: '1px solid #059669', background: 'white', color: '#059669' }}>
        <Map size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} /> Ver no Mapa
      </button>
      {order.status === 'SCHEDULED' && (
        <button onClick={() => onChangeStatus('PENDING')} style={{ ...buttonBase, border: 'none', background: '#ef4444', color: 'white' }}>
          🔔 Tocar Agora
        </button>
      )}
      {order.status === 'PENDING' && (
        <button onClick={() => onChangeStatus('CANCELLED')} style={{ ...buttonBase, border: '1px solid #ef4444', background: 'white', color: '#ef4444', fontWeight: undefined }}>
          Cancelar Pedido
        </button>
      )}
      {order.status === 'ACCEPTED' && (
        <button onClick={() => onChangeStatus('PREPARING')} style={{ ...buttonBase, border: 'none', background: '#f59e0b', color: 'white' }}>
          👨‍🍳 Marcar Preparando
        </button>
      )}
      {order.status === 'PREPARING' && (
        <button onClick={() => onChangeStatus('READY')} style={{ ...buttonBase, border: 'none', background: '#8b5cf6', color: 'white' }}>
          📦 Marcar Pronto
        </button>
      )}
      {order.status === 'READY' && (
        <button onClick={() => onChangeStatus('PICKED_UP')} style={{ ...buttonBase, border: 'none', background: '#2563eb', color: 'white' }}>
          🏍️ Marcar Coletado
        </button>
      )}
      {order.status === 'PICKED_UP' && (
        <button onClick={() => onChangeStatus('DELIVERED')} style={{ ...buttonBase, border: 'none', background: '#22c55e', color: 'white' }}>
          ✅ Marcar Entregue
        </button>
      )}
    </div>
  </div>
);

export default StatusActions;
