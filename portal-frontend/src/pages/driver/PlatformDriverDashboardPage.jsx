import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, DollarSign, Star, MapPin, Truck,
  CheckCircle, RefreshCw, Route, Bell, Navigation
} from 'lucide-react';
import api from '@/lib/api';
import { utils } from '@/lib/api';

const STATUS_CONFIG = {
  OFFERED: { color: '#f59e0b', bg: '#fef3c7', text: 'Oferecido', icon: Bell },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito', icon: CheckCircle },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando', icon: Package },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto', icon: CheckCircle },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'A Caminho', icon: Truck },
};

const PlatformDriverDashboardPage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [routesRes, statsRes] = await Promise.all([
        api.get('/api/platform-routes/driver/active', { headers }),
        api.get('/api/driver/stats', { headers })
      ]);

      setRoutes(routesRes.data.routes || []);
      setStats(statsRes.data.stats);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Erro ao carregar dados');
      }
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const acceptRoute = async (routeId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/platform-routes/${routeId}/accept`, {}, { headers });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao aceitar rota');
    }
  };

  const rejectRoute = async (routeId) => {
    if (!window.confirm('Rejeitar esta rota?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/platform-routes/${routeId}/reject`, {}, { headers });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao rejeitar rota');
    }
  };

  const completeStop = async (routeId, stopId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/platform-routes/${routeId}/complete-stop`, { stop_id: stopId }, { headers });
      loadData(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao concluir parada');
    }
  };

  // Extrair pedidos ativos das rotas
  const activeOrders = [];
  routes.forEach(route => {
    if (route.stops) {
      route.stops.forEach(stop => {
        if (stop.status !== 'COMPLETED' && stop.order_id) {
          activeOrders.push({
            id: stop.order_id,
            order_number: stop.order_number || `Pedido #${stop.order_id}`,
            status: stop.order_status || (route.status === 'ACTIVE' ? 'ACCEPTED' : 'OFFERED'),
            stop_type: stop.stop_type,
            stop_id: stop.id,
            route_id: route.id,
            route_status: route.status,
            address: stop.address,
            customer_name: stop.customer_name
          });
        }
      });
    }
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Dashboard</h1>
            <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Entregador da Plataforma</p>
          </div>
          <button onClick={() => loadData(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      <div style={{ padding: '1rem' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Package size={20} style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregas</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{stats?.total_deliveries || 0}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <DollarSign size={20} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ganhos</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(stats?.total_earning || 0)}</p>
          </div>
        </div>

        {/* Rotas Pendentes (aceitar/rejeitar) */}
        {routes.filter(r => r.status === 'PENDING').length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
              <Bell size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: '#f59e0b' }} />
              Rotas Aguardando Aceite
            </h2>
            {routes.filter(r => r.status === 'PENDING').map(route => (
              <div key={route.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e293b' }}>Rota #{route.id}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{route.stops_count} paradas</p>
                  </div>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
                    Aguardando
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => acceptRoute(route.id)}
                    style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => rejectRoute(route.id)}
                    style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pedidos Ativos */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
              Pedidos Ativos ({activeOrders.length})
            </h2>
          </div>

          {activeOrders.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Route size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhuma rota ativa</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Aguardando rotas...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeOrders.map(order => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.ACCEPTED;
                const StatusIcon = config.icon;
                return (
                  <div key={`${order.route_id}-${order.id}-${order.stop_type}`} style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${config.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: '9999px', background: order.stop_type === 'PICKUP' ? '#fef3c7' : '#dbeafe', color: order.stop_type === 'PICKUP' ? '#92400e' : '#1d4ed8' }}>
                          {order.stop_type === 'PICKUP' ? 'Coleta' : 'Entrega'}
                        </span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>#{order.order_number}</span>
                      </div>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: config.bg, color: config.color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <StatusIcon size={10} /> {config.text}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      <MapPin size={14} />
                      <span>{order.address || 'Endereço não informado'}</span>
                    </div>
                    {order.customer_name && (
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{order.customer_name}</p>
                    )}
                    {order.route_status === 'ACTIVE' && order.stop_type === 'DELIVERY' && (
                      <button
                        onClick={() => completeStop(order.route_id, order.stop_id)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <CheckCircle size={16} /> Marcar como Entregue
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PlatformDriverDashboardPage;
