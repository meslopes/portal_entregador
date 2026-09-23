import React from 'react';
import { X } from 'lucide-react';

const PlatformRouteForm = ({
  show,
  onClose,
  drivers,
  orders,
  selectedOrders,
  selectedDriver,
  createLoading,
  onDriverChange,
  onToggleOrder,
  onSubmit,
}) => {
  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Nova Rota da Plataforma</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {/* Selecionar Entregador */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Entregador *
            </label>
            <select
              value={selectedDriver}
              onChange={e => onDriverChange(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}
            >
              <option value="">Selecionar entregador...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.user?.first_name} {d.user?.last_name} - {d.vehicle_type}</option>
              ))}
            </select>
          </div>

          {/* Selecionar Pedidos */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Pedidos * ({selectedOrders.length} selecionados)
            </label>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem' }}>
              {orders.length === 0 ? (
                <p style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>Nenhum pedido disponível</p>
              ) : (
                orders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => onToggleOrder(order.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: selectedOrders.includes(order.id) ? '#eff6ff' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => {}}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.customer?.name} • {order.delivery_address?.street}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button
              onClick={onSubmit}
              disabled={createLoading || selectedOrders.length === 0 || !selectedDriver}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: createLoading || selectedOrders.length === 0 || !selectedDriver ? '#94a3b8' : '#2563eb',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: createLoading || selectedOrders.length === 0 || !selectedDriver ? 'not-allowed' : 'pointer'
              }}
            >
              {createLoading ? 'Criando...' : 'Criar Rota'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformRouteForm;
