import React from 'react';

const AvailableOrders = ({ orders, selectedOrders, onToggleOrder }) => {
  if (orders.length === 0) return null;

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
        <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
          Pedidos Disponíveis ({orders.length})
          {selectedOrders.length > 0 && <span style={{ color: '#2563eb', marginLeft: '0.5rem' }}>- {selectedOrders.length} selecionado(s)</span>}
        </p>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Selecione os pedidos e clique em "Adicionar Pedidos" na rota desejada</p>
      </div>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {orders.map(order => (
          <div
            key={order.id}
            onClick={() => onToggleOrder(order.id)}
            style={{
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid #f1f5f9',
              cursor: 'pointer',
              background: selectedOrders.includes(order.id) ? '#eff6ff' : 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'background 0.15s'
            }}
          >
            <input
              type="checkbox"
              checked={selectedOrders.includes(order.id)}
              onChange={() => {}}
              style={{ cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</span>
                <span style={{ padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.75rem', background: order.status === 'SCHEDULED' ? '#ede9fe' : '#dbeafe', color: order.status === 'SCHEDULED' ? '#6d28d9' : '#1d4ed8' }}>
                  {order.status === 'SCHEDULED' ? 'Agendado' : order.status === 'PENDING' ? 'Pendente' : 'Aceito'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>{order.customer?.name} • {order.delivery_address?.street}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvailableOrders;
