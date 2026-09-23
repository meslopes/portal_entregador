import React from 'react';
import { MapPin, Package, CheckCircle } from 'lucide-react';

export const getStopIcon = (stop) => {
  if (stop.status === 'COMPLETED') return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
  if (stop.stop_type === 'PICKUP') return <Package size={16} style={{ color: '#2563eb' }} />;
  return <MapPin size={16} style={{ color: '#f59e0b' }} />;
};

export const getStopLabel = (stop) => {
  if (stop.stop_type === 'PICKUP') return 'Coleta';
  return 'Entrega';
};

const StopItem = ({ stop, index, onDeliver }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.75rem', borderRadius: '0.5rem',
    background: stop.status === 'COMPLETED' ? '#f0fdf4' : '#f8fafc',
    border: stop.status === 'COMPLETED' ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
  }}>
    {getStopIcon(stop)}

    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e293b' }}>
          {getStopLabel(stop)} #{index + 1}
        </span>
        <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
          Pedido #{stop.order_number || stop.order_id}
        </span>
      </div>
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
        {stop.address || 'Endereço não informado'}
      </p>
    </div>

    {stop.status !== 'COMPLETED' && (
      <button
        onClick={() => onDeliver(stop)}
        style={{
          padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
          border: 'none', background: '#0d9488', color: 'white',
          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
        }}
      >
        Concluir
      </button>
    )}
  </div>
);

export default StopItem;
