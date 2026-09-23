import React from 'react';
import {
  Route, Users, Package, CheckCircle, Trash2, X, ArrowRightLeft
} from 'lucide-react';
import { ROUTE_STATUS } from '@/constants/status';

const getStatusBadge = (status) => {
  const config = ROUTE_STATUS[status] || ROUTE_STATUS.CREATED;
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
};

const RoutesList = ({ routes, drivers, selectedDriver, onSetSelectedDriver, onAssignDriver, onDeleteRoute, onRemoveOrder, onMoveOrder, onAddOrders, selectedOrders }) => {
  if (routes.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Route size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
        <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.125rem' }}>Nenhuma rota criada</p>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Clique em "Nova Rota" para criar uma rota para seus entregadores</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {routes.map(route => (
        <div key={route.id} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {/* Header da Rota */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Route size={20} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{route.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: route.driver_name ? '#64748b' : '#dc2626' }}>
                    <Users size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {route.driver_name || 'Sem entregador'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <Package size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {route.stops_count} entregas
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {getStatusBadge(route.status)}
              {['CREATED', 'PENDING'].includes(route.status) && (
                <button onClick={() => onDeleteRoute(route.id)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Ações da Rota */}
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {route.status === 'CREATED' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={selectedDriver}
                  onChange={e => onSetSelectedDriver(e.target.value)}
                  style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.75rem', background: 'white' }}
                >
                  <option value="">Selecionar entregador...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => onAssignDriver(route.id)}
                  disabled={!selectedDriver}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                    border: 'none', background: selectedDriver ? '#2563eb' : '#94a3b8',
                    color: 'white', fontSize: '0.75rem', fontWeight: 600,
                    cursor: selectedDriver ? 'pointer' : 'not-allowed'
                  }}
                >
                  Atribuir Entregador
                </button>
              </div>
            )}

            {['CREATED', 'PENDING', 'ACTIVE'].includes(route.status) && (
              <button
                onClick={() => onAddOrders(route.id)}
                disabled={selectedOrders.length === 0}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                  border: '1px solid #0d9488', background: 'white',
                  color: selectedOrders.length > 0 ? '#0d9488' : '#94a3b8',
                  fontSize: '0.75rem', fontWeight: 600,
                  cursor: selectedOrders.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                + Adicionar Pedidos ({selectedOrders.length})
              </button>
            )}
          </div>

          {/* Paradas da Rota */}
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {route.stops?.map((stop) => (
                <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: stop.status === 'COMPLETED' ? '#f0fdf4' : '#f8fafc', borderRadius: '0.375rem' }}>
                  <span style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: stop.status === 'COMPLETED' ? '#22c55e' : '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                    {stop.stop_order}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500 }}>{stop.address}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{stop.customer_name} • Pedido #{stop.order_number}</p>
                  </div>
                  {stop.status === 'COMPLETED' && <CheckCircle size={16} style={{ color: '#22c55e' }} />}
                  {stop.status !== 'COMPLETED' && ['CREATED', 'PENDING', 'ACTIVE'].includes(route.status) && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => onMoveOrder({ ...stop, route_id: route.id })}
                        title="Mover para outra rota"
                        style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }}
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                      <button
                        onClick={() => onRemoveOrder(route.id, stop.order_id)}
                        title="Remover da rota"
                        style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoutesList;
