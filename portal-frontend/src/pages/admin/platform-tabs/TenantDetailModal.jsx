import React from 'react';

const TenantDetailModal = ({ selectedTenant, onClose, onEdit, onDelete }) => {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '600px',
        maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 100000
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
            {selectedTenant.name}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onEdit(selectedTenant)}
              style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #2563eb', background: 'white', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(selectedTenant)}
              style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #ef4444', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Excluir
            </button>
            <button
              onClick={onClose}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem' }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Tenant Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Slug</p>
              <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>{selectedTenant.slug}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Plano</p>
              <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>{selectedTenant.plan}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Status</p>
              <p style={{ fontSize: '0.875rem', color: selectedTenant.is_active ? '#16a34a' : '#dc2626' }}>
                {selectedTenant.is_active ? 'Ativo' : 'Inativo'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Criado em</p>
              <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                {new Date(selectedTenant.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{selectedTenant.users?.length || 0}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Usuários</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{selectedTenant.drivers_count}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregadores</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{selectedTenant.restaurants_count}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Estabelecimentos</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#db2777' }}>{selectedTenant.orders_count}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos</p>
            </div>
          </div>

          {/* Recent Orders */}
          {selectedTenant.recent_orders?.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
                Pedidos Recentes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedTenant.recent_orders.map(order => (
                  <div key={order.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem'
                  }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.status}</p>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#16a34a' }}>
                      R$ {order.delivery_fee}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TenantDetailModal;
