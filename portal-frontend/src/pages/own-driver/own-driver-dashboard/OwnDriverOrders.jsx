import React from 'react';
import { MapPin, Route, RefreshCw } from 'lucide-react';
import { ORDER_STATUS } from '@/constants/status';

const ActiveOrderCard = ({ order, onClick }) => {
  const config = ORDER_STATUS[order.status] || ORDER_STATUS.ACCEPTED;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: '0.75rem', padding: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer',
        borderLeft: `4px solid ${config.color}`, transition: 'all 0.15s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>
          #{order.order_number}
        </span>
        <span style={{
          padding: '0.125rem 0.5rem', borderRadius: '9999px',
          fontSize: '0.6875rem', fontWeight: 600,
          background: config.bg, color: config.color,
          display: 'flex', alignItems: 'center', gap: '0.25rem'
        }}>
          {config.icon} {config.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.375rem' }}>
        <MapPin size={14} style={{ color: '#64748b' }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {order.delivery_address?.street || 'Endereço não informado'}
        </span>
      </div>

      {order.customer && (
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {order.customer.name} • {order.customer.phone}
        </div>
      )}

      {/* Indicação de rota */}
      {order.route_name && (
        <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', background: '#dbeafe', borderRadius: '0.375rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>📍 Rota: <strong>{order.route_name}</strong></span>
        </div>
      )}

      {/* Código de entrega */}
      {order.delivery_code && (
        <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', background: '#f0fdf4', borderRadius: '0.375rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#166534' }}>Código: <strong>{order.delivery_code}</strong></span>
        </div>
      )}

      {/* Prova de entrega */}
      {order.proof_of_delivery_url && (
        <div style={{ marginTop: '0.5rem' }}>
          <img
            src={order.proof_of_delivery_url.startsWith('http') ? order.proof_of_delivery_url : `${import.meta.env.VITE_API_URL || 'https://muvlog-api-890250693883.us-central1.run.app'}${order.proof_of_delivery_url}`}
            alt="Prova de entrega"
            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}
          />
        </div>
      )}
    </div>
  );
};

const OwnDriverOrders = ({ activeOrders, isOnline, onRefresh, onOrderClick }) => (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
        Pedidos Ativos ({activeOrders.length})
      </h2>
      <button
        onClick={onRefresh}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#0d9488', display: 'flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.8125rem'
        }}
      >
        <RefreshCw size={14} /> Atualizar
      </button>
    </div>

    {activeOrders.length === 0 ? (
      <div style={{
        background: 'white', borderRadius: '0.75rem', padding: '2rem',
        textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <Route size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
          Nenhuma rota ativa
        </p>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          {isOnline ? 'Aguardando rotas do estabelecimento...' : 'Fique online para receber rotas'}
        </p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activeOrders.map(order => (
          <ActiveOrderCard
            key={order.id}
            order={order}
            onClick={() => onOrderClick(order.id)}
          />
        ))}
      </div>
    )}
  </div>
);

export default OwnDriverOrders;
