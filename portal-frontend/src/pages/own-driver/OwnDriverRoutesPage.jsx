import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Route, ArrowLeft, MapPin, Package, CheckCircle, Clock,
  Navigation, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';

const OwnDriverRoutesPage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadRoutes(); }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get('/api/routes/own-driver/active', { headers });
      setRoutes(res.data.routes || []);
    } catch (err) {
      console.error('Erro ao carregar rotas:', err);
      setError('Erro ao carregar rotas');
    } finally {
      setLoading(false);
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
        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <button onClick={() => navigate('/own-driver')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <Route size={20} />
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Minhas Rotas</h1>
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
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '9999px',
                    fontSize: '0.6875rem', fontWeight: 600,
                    background: route.status === 'ACTIVE' ? '#dbeafe' : '#dcfce7',
                    color: route.status === 'ACTIVE' ? '#2563eb' : '#16a34a'
                  }}>
                    {route.status === 'ACTIVE' ? 'Em andamento' : 'Concluída'}
                  </span>
                </div>

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
                            Pedido #{stop.order_id}
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
    </div>
  );
};

export default OwnDriverRoutesPage;
