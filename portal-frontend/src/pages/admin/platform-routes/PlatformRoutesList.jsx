import React from 'react';
import {
  Route, Users, Package, CheckCircle, X, ArrowRightLeft, Bike
} from 'lucide-react';
import { getStatusBadge } from './PlatformRoutesList.utils';

const PlatformRoutesList = ({ routes, onMoveStop, onRemoveOrder }) => {
  if (routes.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Route size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
        <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.125rem' }}>Nenhuma rota criada</p>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Clique em "Nova Rota" para criar uma rota para entregadores da plataforma</p>
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
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bike size={20} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>Rota #{route.id}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <Users size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {route.driver_name || 'Sem entregador'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <Package size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {route.stops_count} paradas
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {getStatusBadge(route.status)}
            </div>
          </div>

          {/* Paradas da Rota */}
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {route.stops?.map((stop) => (
                <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: stop.status === 'COMPLETED' ? '#f0fdf4' : '#f8fafc', borderRadius: '0.375rem' }}>
                  <span style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: stop.status === 'COMPLETED' ? '#22c55e' : stop.stop_type === 'PICKUP' ? '#f59e0b' : '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                    {stop.stop_order}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', borderRadius: '9999px', background: stop.stop_type === 'PICKUP' ? '#fef3c7' : '#dbeafe', color: stop.stop_type === 'PICKUP' ? '#92400e' : '#1d4ed8' }}>
                        {stop.stop_type === 'PICKUP' ? 'Coleta' : 'Entrega'}
                      </span>
                      <p style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500 }}>{stop.address}</p>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {stop.stop_type === 'PICKUP'
                        ? `${stop.restaurant_name || 'Restaurante'} • Pedido #${stop.order_number}`
                        : `${stop.customer_name || 'Cliente'} • Pedido #${stop.order_number}`
                      }
                    </p>
                  </div>
                  {stop.status === 'COMPLETED' && <CheckCircle size={16} style={{ color: '#22c55e' }} />}
                  {stop.status !== 'COMPLETED' && route.status !== 'COMPLETED' && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => onMoveStop({ ...stop, route_id: route.id })}
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

export default PlatformRoutesList;
