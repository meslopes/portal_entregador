import React from 'react';
import { Package, MapPin, User, Bike } from 'lucide-react';
import { utils } from '@/lib/api';
import { STATUS_CONFIG } from './constants';

const FilterButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.375rem 0.875rem', borderRadius: '9999px',
      border: 'none', fontSize: '0.8125rem', fontWeight: 500,
      cursor: 'pointer', transition: 'all 0.15s',
      background: active ? '#0d9488' : '#f1f5f9',
      color: active ? 'white' : '#64748b'
    }}
  >
    {children}
  </button>
);

const paginationBtn = (disabled) => ({
  padding: '0.5rem 1rem', borderRadius: '0.375rem',
  border: '1px solid #e2e8f0', background: 'white',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1, fontSize: '0.875rem'
});

const ClientOrdersList = ({ orders, loading, filter, setFilter, page, setPage, totalPages, openOrderDetails }) => {
  return (
    <>
      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <FilterButton active={filter === ''} onClick={() => { setFilter(''); setPage(1); }}>Todos</FilterButton>
        <FilterButton active={filter === 'PENDING'} onClick={() => { setFilter('PENDING'); setPage(1); }}>Pendentes</FilterButton>
        <FilterButton active={filter === 'active'} onClick={() => { setFilter('active'); setPage(1); }}>Em Andamento</FilterButton>
        <FilterButton active={filter === 'DELIVERED'} onClick={() => { setFilter('DELIVERED'); setPage(1); }}>Entregues</FilterButton>
        <FilterButton active={filter === 'CANCELLED'} onClick={() => { setFilter('CANCELLED'); setPage(1); }}>Cancelados</FilterButton>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div style={{ minHeight: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Package size={24} style={{ color: '#64748b' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
            {filter ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {filter ? 'Tente outro filtro' : 'Clique em "NOVO PEDIDO" para começar'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map(order => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = config.icon;
              return (
                <div
                  key={order.id}
                  onClick={() => openOrderDetails(order.id)}
                  style={{
                    background: 'white', borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.15s', borderLeft: `4px solid ${config.color}`
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
                >
                  <div style={{ padding: '1rem 1.25rem' }}>
                    {/* Header do pedido */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>
                            #{order.order_number}
                          </span>
                          <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: '9999px',
                            fontSize: '0.6875rem', fontWeight: 600,
                            background: config.bg, color: config.color,
                            display: 'flex', alignItems: 'center', gap: '0.25rem'
                          }}>
                            <StatusIcon size={10} /> {config.text}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {utils.formatDateTime(order.created_at)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                          {utils.formatCurrency(order.total_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Info do cliente */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <User size={14} style={{ color: '#64748b' }} />
                        <span style={{ color: '#475569' }}>{order.customer?.name || 'Cliente'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <MapPin size={14} style={{ color: '#64748b' }} />
                        <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.delivery_address?.street || 'Endereço não informado'}
                        </span>
                      </div>
                    </div>

                    {/* Entregador (se atribuído) */}
                    {order.driver && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <Bike size={14} style={{ color: '#0d9488' }} />
                        <span style={{ color: '#475569' }}>
                          Entregador: <strong>{order.driver.name}</strong>
                        </span>
                        <span style={{ color: '#64748b' }}>•</span>
                        <span style={{ color: '#64748b' }}>{order.driver.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={paginationBtn(page === 1)}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={paginationBtn(page === totalPages)}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ClientOrdersList;
