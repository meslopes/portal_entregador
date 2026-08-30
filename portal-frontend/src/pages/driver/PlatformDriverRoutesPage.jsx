import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Route, Package, MapPin, Clock, CheckCircle, Truck,
  AlertCircle, RefreshCw, Bell, ArrowLeft, Navigation, X
} from 'lucide-react';
import api from '@/lib/api';

const PlatformDriverRoutesPage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => { loadRoutes(); }, []);

  const loadRoutes = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const token = localStorage.getItem('driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get('/api/platform-routes/driver/active', { headers });
      setRoutes(res.data.routes || []);
    } catch (err) {
      console.error('Erro ao carregar rotas:', err);
      if (!isRefresh) setError('Erro ao carregar rotas');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const acceptRoute = async (routeId) => {
    try {
      const token = localStorage.getItem('driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/platform-routes/${routeId}/accept`, {}, { headers });
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao aceitar rota');
    }
  };

  const rejectRoute = async (routeId) => {
    if (!window.confirm('Tem certeza que deseja rejeitar esta rota?')) return;
    try {
      const token = localStorage.getItem('driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/platform-routes/${routeId}/reject`, {}, { headers });
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao rejeitar rota');
    }
  };

  const completeStop = async (routeId, stopId) => {
    try {
      const token = localStorage.getItem('driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/platform-routes/${routeId}/complete-stop`, { stop_id: stopId }, { headers });
      loadRoutes(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao concluir parada');
    }
  };

  const getStopIcon = (stop) => {
    if (stop.status === 'COMPLETED') return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
    if (stop.stop_type === 'PICKUP') return <Package size={16} style={{ color: '#f59e0b' }} />;
    return <MapPin size={16} style={{ color: '#2563eb' }} />;
  };

  const getStopLabel = (stop) => {
    if (stop.stop_type === 'PICKUP') return 'Coleta';
    return 'Entrega';
  };

  const pendingRoutes = routes.filter(r => r.status === 'PENDING');
  const activeRoutes = routes.filter(r => r.status === 'ACTIVE');

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
      <header style={{
        background: pendingRoutes.length > 0
          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
          : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
        transition: 'background 0.3s'
      }}>
        <button onClick={() => navigate('/platform-driver')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <Route size={20} />
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Minhas Rotas</h1>
        {pendingRoutes.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginLeft: 'auto', padding: '0.375rem 0.75rem',
            borderRadius: '9999px', background: 'rgba(255,255,255,0.25)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            <Bell size={16} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              {pendingRoutes.length} rota{pendingRoutes.length > 1 ? 's' : ''} aguardando
            </span>
          </div>
        )}
      </header>

      <div style={{ padding: '1rem' }}>
        {/* Erro */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={16} /></button>
          </div>
        )}

        {/* Rotas Pendentes */}
        {pendingRoutes.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={16} style={{ color: '#f59e0b' }} /> Aguardando Aceite
            </h2>
            {pendingRoutes.map(route => (
              <div key={route.id} style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Rota #{route.id}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{route.stops_count} paradas</p>
                    </div>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
                      Aguardando
                    </span>
                  </div>

                  {/* Preview das paradas */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    {route.stops?.slice(0, 3).map((stop, idx) => (
                      <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.8125rem', color: '#64748b' }}>
                        {getStopIcon(stop)}
                        <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.25rem', borderRadius: '4px', background: stop.stop_type === 'PICKUP' ? '#fef3c7' : '#dbeafe', color: stop.stop_type === 'PICKUP' ? '#92400e' : '#1d4ed8' }}>
                          {getStopLabel(stop)}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stop.address}</span>
                      </div>
                    ))}
                    {route.stops?.length > 3 && (
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0.25rem 0' }}>+{route.stops.length - 3} mais paradas</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => acceptRoute(route.id)}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Aceitar Rota
                    </button>
                    <button
                      onClick={() => rejectRoute(route.id)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rotas Ativas */}
        {activeRoutes.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={16} style={{ color: '#2563eb' }} /> Em Andamento
            </h2>
            {activeRoutes.map(route => (
              <div key={route.id} style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #2563eb' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Rota #{route.id}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {route.stops?.filter(s => s.status === 'COMPLETED').length || 0} de {route.stops_count} concluídas
                      </p>
                    </div>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                      Em Rota
                    </span>
                  </div>
                </div>

                {/* Paradas */}
                <div style={{ padding: '0.75rem 1rem' }}>
                  {route.stops?.map((stop, idx) => (
                    <div key={stop.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem', marginBottom: idx < route.stops.length - 1 ? '0.5rem' : 0,
                      background: stop.status === 'COMPLETED' ? '#f0fdf4' : '#f8fafc',
                      borderRadius: '0.5rem',
                      opacity: stop.status === 'COMPLETED' ? 0.7 : 1
                    }}>
                      <span style={{
                        width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                        background: stop.status === 'COMPLETED' ? '#22c55e' : stop.stop_type === 'PICKUP' ? '#f59e0b' : '#2563eb',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.625rem', fontWeight: 600, flexShrink: 0
                      }}>
                        {stop.stop_order}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                          <span style={{ fontSize: '0.5625rem', padding: '0.0625rem 0.25rem', borderRadius: '4px', background: stop.stop_type === 'PICKUP' ? '#fef3c7' : '#dbeafe', color: stop.stop_type === 'PICKUP' ? '#92400e' : '#1d4ed8' }}>
                            {getStopLabel(stop)}
                          </span>
                          <p style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {stop.address}
                          </p>
                        </div>
                        <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {stop.customer_name} • Pedido #{stop.order_number}
                        </p>
                      </div>
                      {stop.status === 'COMPLETED' ? (
                        <CheckCircle size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
                      ) : stop.stop_type === 'DELIVERY' ? (
                        <button
                          onClick={() => completeStop(route.id, stop.id)}
                          style={{
                            padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                            border: 'none', background: '#16a34a', color: 'white',
                            fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          Entregue
                        </button>
                      ) : (
                        <button
                          onClick={() => completeStop(route.id, stop.id)}
                          style={{
                            padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                            border: 'none', background: '#f59e0b', color: 'white',
                            fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          Coletado
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sem rotas */}
        {routes.length === 0 && (
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Route size={48} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.125rem' }}>Nenhuma rota</p>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Você não tem rotas no momento</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
};

export default PlatformDriverRoutesPage;
