import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Route, ArrowLeft, MapPin, Package, CheckCircle, Clock,
  Navigation, AlertCircle, Bell
} from 'lucide-react';
import api from '@/lib/api';

// URL do som de notificação (beep curto)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI+Hf3R0goqOjomDe3V5g4uQj4qDend7hIyRkIuGe3d6g4uQj4qDe3d6g4yRj4qEe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiA==';

const OwnDriverRoutesPage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const prevPendingCount = useRef(0);
  const audioRef = useRef(null);

  // Carregar som de notificação
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.8;
  }, []);

  // Auto-refresh a cada 15 segundos
  useEffect(() => {
    loadRoutes();
    const interval = setInterval(() => loadRoutes(true), 15000);
    return () => clearInterval(interval);
  }, []);

  // Tocar som quando novas rotas pendentes aparecem
  useEffect(() => {
    const newPending = routes.filter(r => r.status === 'PENDING').length;
    if (newPending > prevPendingCount.current && prevPendingCount.current > 0) {
      playNotification();
    }
    prevPendingCount.current = newPending;
    setPendingCount(newPending);
  }, [routes]);

  const playNotification = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      // Vibração no celular (se suportado)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      // Silenciar erro de áudio
    }
  };

  const loadRoutes = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get('/api/routes/own-driver/active', { headers });
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
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/routes/${routeId}/accept`, {}, { headers });
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao aceitar rota');
    }
  };

  const rejectRoute = async (routeId) => {
    if (!window.confirm('Tem certeza que deseja rejeitar esta rota? O estabelecimento será notificado.')) return;
    try {
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/routes/${routeId}/reject`, {}, { headers });
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao rejeitar rota');
    }
  };

  const completeStop = async (routeId, stopId) => {
    try {
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/routes/${routeId}/complete-stop`, { stop_id: stopId }, { headers });
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao concluir parada');
    }
  };

  const getStopIcon = (stop) => {
    if (stop.status === 'COMPLETED') return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
    if (stop.stop_type === 'PICKUP') return <Package size={16} style={{ color: '#2563eb' }} />;
    return <MapPin size={16} style={{ color: '#f59e0b' }} />;
  };

  const getStopLabel = (stop) => {
    if (stop.stop_type === 'PICKUP') return 'Coleta';
    return 'Entrega';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: pendingCount > 0 
          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
          : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
        transition: 'background 0.3s'
      }}>
        <button onClick={() => navigate('/own-driver')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <Route size={20} />
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Minhas Rotas</h1>
        {pendingCount > 0 && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginLeft: 'auto', padding: '0.375rem 0.75rem', 
            borderRadius: '9999px', background: 'rgba(255,255,255,0.25)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            <Bell size={16} style={{ animation: 'ring 0.5s ease-in-out' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              {pendingCount} rota{pendingCount > 1 ? 's' : ''} aguardando
            </span>
          </div>
        )}
      </header>

      <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        {/* Erro */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : routes.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '2rem',
            textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <Route size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhuma rota ativa</p>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
              Quando você tiver múltiplos pedidos, eles serão agrupados em uma rota.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {routes.map(route => (
              <div key={route.id} style={{
                background: 'white', borderRadius: '0.75rem', padding: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                {/* Header da rota */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e293b' }}>Rota #{route.id}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {route.stops?.length || 0} paradas
                      {route.total_distance_km && ` • ${route.total_distance_km.toFixed(1)} km`}
                      {route.total_duration_min && ` • ~${Math.round(route.total_duration_min)} min`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem', borderRadius: '9999px',
                      fontSize: '0.6875rem', fontWeight: 600,
                      background: route.status === 'ACTIVE' ? '#dbeafe' : route.status === 'PENDING' ? '#fef3c7' : '#dcfce7',
                      color: route.status === 'ACTIVE' ? '#2563eb' : route.status === 'PENDING' ? '#92400e' : '#16a34a'
                    }}>
                      {route.status === 'ACTIVE' ? 'Em andamento' : route.status === 'PENDING' ? 'Aguardando' : 'Concluída'}
                    </span>
                  </div>
                </div>

                {/* Botões de aceite/rejeição para rotas pendentes */}
                {route.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button
                      onClick={() => acceptRoute(route.id)}
                      style={{
                        flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
                        border: 'none', background: '#16a34a', color: 'white',
                        fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                      }}
                    >
                      ✓ Aceitar Rota
                    </button>
                    <button
                      onClick={() => rejectRoute(route.id)}
                      style={{
                        flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
                        border: '1px solid #ef4444', background: 'white', color: '#ef4444',
                        fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                      }}
                    >
                      ✕ Rejeitar
                    </button>
                  </div>
                )}

                {/* Lista de paradas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {route.stops?.map((stop, index) => (
                    <div key={stop.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem', borderRadius: '0.5rem',
                      background: stop.status === 'COMPLETED' ? '#f0fdf4' : '#f8fafc',
                      border: stop.status === 'COMPLETED' ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                    }}>
                      {/* Ícone */}
                      {getStopIcon(stop)}
                      
                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e293b' }}>
                            {getStopLabel(stop)} #{index + 1}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                            Pedido #{stop.order_number || stop.order_id}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          {stop.address || 'Endereço não informado'}
                        </p>
                      </div>

                      {/* Botão concluir */}
                      {stop.status !== 'COMPLETED' && (
                        <button
                          onClick={() => completeStop(route.id, stop.id)}
                          style={{
                            padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                            border: 'none', background: '#0d9488', color: 'white',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Concluir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes ring {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default OwnDriverRoutesPage;
