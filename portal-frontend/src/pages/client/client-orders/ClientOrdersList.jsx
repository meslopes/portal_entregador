import React from 'react';
import { Package, User, MapPin, Bike, Users } from 'lucide-react';
import { utils } from '@/lib/api';
import { ORDER_STATUS } from '@/constants/status';

const pagBtn = (disabled) => ({ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: '0.875rem' });

const ClientOrdersList = ({ loading, filtered, search, filter, openDetails, page, totalPages, setPage }) => {
  if (loading) {
    return (
      <div style={{ minHeight: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Package size={24} style={{ color: '#64748b' }} />
        </div>
        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
          {search || filter ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
        </p>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          {search || filter ? 'Tente outro termo ou filtro' : 'Crie seu primeiro pedido em "Novo Pedido"'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(order => {
          const config = ORDER_STATUS[order.status] || ORDER_STATUS.PENDING;
          return (
            <div
              key={order.id}
              onClick={() => openDetails(order.id)}
              style={{
                background: 'white', borderRadius: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                borderLeft: `4px solid ${config.color}`,
                cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
            >
              <div style={{ padding: '1rem 1.25rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>#{order.order_number}</span>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: config.bg, color: config.color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {config.icon} {config.label}
                      </span>
                      {order.assigned_to_own_driver && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={9} /> Próprio
                        </span>
                      )}
                      {order.own_driver_route && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                          {order.own_driver_route.name}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{utils.formatDateTime(order.created_at)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{utils.formatCurrency(order.total_amount)}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Frete: {utils.formatCurrency(order.delivery_fee || 0)}</p>
                  </div>
                </div>

                {/* Info */}
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: '#64748b', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <User size={14} style={{ color: '#64748b' }} />
                    {order.customer?.name || 'Cliente'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <MapPin size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                    {order.delivery_address?.street || 'Sem endereço'}
                  </div>
                  {(order.driver || order.own_driver) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {order.assigned_to_own_driver ? <Users size={14} style={{ color: '#2563eb' }} /> : <Bike size={14} style={{ color: '#64748b' }} />}
                      {order.own_driver?.name || order.driver?.name || 'Entregador'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginacao */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pagBtn(page === 1)}>Anterior</button>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pagBtn(page === totalPages)}>Próxima</button>
        </div>
      )}
    </>
  );
};

export default ClientOrdersList;
