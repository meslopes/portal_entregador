import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, DollarSign, Star, TrendingUp,
  MapPin, Truck, CheckCircle, AlertCircle, Power,
  Navigation, RefreshCw, Route, Bell
} from 'lucide-react';
import api from '@/lib/api';
import { utils } from '@/lib/api';

const STATUS_CONFIG = {
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Na Rota', icon: CheckCircle },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando', icon: Package },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto', icon: CheckCircle },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'A Caminho', icon: Truck },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue', icon: CheckCircle },
  PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'Aguardando Rota', icon: Clock },
};

const OwnDriverDashboardPage = () => {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [pendingRoutes, setPendingRoutes] = useState(0);
  const prevPendingRoutes = useRef(0);
  const audioRef = useRef(null);

  // Carregar som de notificação
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI+Hf3R0gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiDe3Z6gouPjoiA==');
    audioRef.current.volume = 0.8;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('own_driver_token');
    if (!token) {
      navigate('/own-driver/login');
      return;
    }
    loadData();

    // Auto-refresh a cada 20 segundos (sem flash de loading)
    const interval = setInterval(() => loadData(true), 20000);
    return () => clearInterval(interval);
  }, []);

  // Tocar som quando novas rotas pendentes aparecem
  useEffect(() => {
    if (pendingRoutes > prevPendingRoutes.current && prevPendingRoutes.current > 0) {
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      } catch (e) {}
    }
    prevPendingRoutes.current = pendingRoutes;
  }, [pendingRoutes]);

  // Enviar localização a cada 15 segundos quando online
  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          try {
            const token = localStorage.getItem('own_driver_token');
            await api.post('/api/own-driver/location', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }, { headers: { Authorization: `Bearer ${token}` } });
          } catch (e) { /* silent */ }
        },
        () => { /* geolocation error - silent */ },
        { timeout: 10000, maximumAge: 15000 }
      );
    };

    // Enviar imediatamente
    sendLocation();

    // Depois a cada 15 segundos
    const interval = setInterval(sendLocation, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOnline]);

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, routesRes] = await Promise.all([
        api.get('/api/own-driver/stats', { headers }),
        api.get('/api/routes/own-driver/active', { headers })
      ]);

      setStats(statsRes.data.stats);
      setDriver(statsRes.data.driver);
      setIsOnline(statsRes.data.driver?.is_online || false);
      
      // Extrair pedidos das rotas ativas e contar pendentes
      const routes = routesRes.data.routes || [];
      const pending = routes.filter(r => r.status === 'PENDING').length;
      setPendingRoutes(pending);
      
      const ordersFromRoutes = [];
      routes.forEach(route => {
        if (route.stops) {
          route.stops.forEach(stop => {
            if (stop.order_id && !ordersFromRoutes.find(o => o.id === stop.order_id)) {
              ordersFromRoutes.push({
                id: stop.order_id,
                order_number: stop.order_number || `Pedido #${stop.order_id}`,
                status: route.status === 'ACTIVE' ? 'ACCEPTED' : 'PENDING',
                delivery_address: { street: stop.address },
                customer: { name: stop.customer_name, phone: stop.customer_phone },
                delivery_fee: 0,
                route_id: route.id,
                route_name: route.name
              });
            }
          });
        }
      });
      setActiveOrders(ordersFromRoutes);

      const storedRestaurant = localStorage.getItem('own_driver_restaurant');
      if (storedRestaurant) {
        try { setRestaurant(JSON.parse(storedRestaurant)); } catch (e) { /* corrupted data */ }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('own_driver_token');
        navigate('/own-driver/login');
      } else {
        setError('Erro ao carregar dados');
      }
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const toggleOnline = async () => {
    try {
      setToggling(true);
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Tentar obter localização
      let locationData = {};
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        locationData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      } catch (e) {
        // Sem localização, toggle sem GPS
      }

      const res = await api.put('/api/own-driver/status', locationData, { headers });
      setIsOnline(res.data.is_online);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar status');
    } finally {
      setToggling(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('own_driver_token');
    localStorage.removeItem('own_driver_data');
    localStorage.removeItem('own_driver_restaurant');
    navigate('/own-driver/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        color: 'white', padding: '1.5rem', paddingBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Olá, {driver?.name?.split(' ')[0]}</h1>
            <p style={{ fontSize: '0.8125rem', opacity: 0.8 }}>{restaurant?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.5rem',
              color: 'white', padding: '0.5rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer'
            }}
          >
            Sair
          </button>
        </div>

        {/* Toggle Online */}
        <button
          onClick={toggleOnline}
          disabled={toggling}
          style={{
            width: '100%', padding: '0.875rem', borderRadius: '0.75rem',
            border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
            background: isOnline ? '#16a34a' : 'rgba(255,255,255,0.2)',
            color: 'white', fontSize: '1rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'all 0.3s'
          }}
        >
          <Power size={20} />
          {toggling ? 'Alterando...' : isOnline ? 'Você está ONLINE' : 'Você está OFFLINE'}
        </button>
      </header>

      {/* Notificação de rotas pendentes */}
      {pendingRoutes > 0 && (
        <div 
          onClick={() => navigate('/own-driver/routes')}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white', padding: '0.875rem 1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            cursor: 'pointer', animation: 'pulse 1.5s ease-in-out infinite'
          }}
        >
          <Bell size={20} style={{ animation: 'ring 0.5s ease-in-out' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {pendingRoutes} rota{pendingRoutes > 1 ? 's' : ''} aguardando aceite!
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>Toque para ver e aceitar</p>
          </div>
          <span style={{ fontSize: '1.25rem' }}>→</span>
        </div>
      )}

      <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', marginTop: '-1rem' }}>
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

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <StatCard icon={<Package size={20} />} label="Entregas" value={stats?.total_deliveries || 0} color="#0d9488" />
          <StatCard icon={<DollarSign size={20} />} label="Ganhos" value={utils.formatCurrency(stats?.total_earning || 0)} color="#16a34a" />
          <StatCard icon={<Star size={20} />} label="Avaliação" value={(stats?.rating || 5).toFixed(1)} color="#f59e0b" />
          <StatCard icon={<Clock size={20} />} label="Tempo Médio" value={`${stats?.avg_delivery_time || 0} min`} color="#8b5cf6" />
        </div>

        {/* Pedidos Ativos */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
              Pedidos Ativos ({activeOrders.length})
            </h2>
            <button
              onClick={() => loadData(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#0d9488', display: 'flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.8125rem'
              }}
            >
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: '0.75rem', padding: '2rem',
              textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <Route size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
              <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                Nenhuma rota ativa
              </p>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {isOnline ? 'Aguardando rotas do estabelecimento...' : 'Fique online para receber rotas'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeOrders.map(order => (
                <ActiveOrderCard
                  key={order.id}
                  order={order}
                  onClick={() => navigate(`/own-driver/delivery/${order.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ações Rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <ActionButton
            icon={<Package size={20} />}
            label="Histórico"
            onClick={() => navigate('/own-driver/orders')}
            color="#2563eb"
          />
          <ActionButton
            icon={<DollarSign size={20} />}
            label="Ganhos"
            onClick={() => navigate('/own-driver/earnings')}
            color="#16a34a"
          />
          <ActionButton
            icon={<Route size={20} />}
            label="Rotas"
            onClick={() => navigate('/own-driver/routes')}
            color="#8b5cf6"
          />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: 'white', borderRadius: '0.75rem', padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
    </div>
    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

const ActiveOrderCard = ({ order, onClick }) => {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.ACCEPTED;
  const StatusIcon = config.icon;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: '0.75rem', padding: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer',
        borderLeft: `4px solid ${config.color}`, transition: 'all 0.15s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.375rem' }}>
        <MapPin size={14} style={{ color: '#64748b' }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {order.delivery_address?.street || 'Endereço não informado'}
        </span>
      </div>

      {order.customer && (
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {order.customer.name} • {order.customer.phone}
        </div>
      )}

      {/* Indicação de rota */}
      {order.route_name && (
        <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', background: '#dbeafe', borderRadius: '0.375rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>📍 Rota: <strong>{order.route_name}</strong></span>
        </div>
      )}

      {/* Código de entrega */}
      {order.delivery_code && (
        <div style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', background: '#f0fdf4', borderRadius: '0.375rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#166534' }}>Código: <strong>{order.delivery_code}</strong></span>
        </div>
      )}

      {/* Prova de entrega */}
      {order.proof_of_delivery_url && (
        <div style={{ marginTop: '0.5rem' }}>
          <img
            src={`${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}${order.proof_of_delivery_url}`}
            alt="Prova de entrega"
            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}
          />
        </div>
      )}
    </div>
  );
};

const ActionButton = ({ icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
      transition: 'all 0.15s'
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <span style={{ color }}>{icon}</span>
    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{label}</span>
  </button>
);

// CSS Animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
  @keyframes ring {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(15deg); }
    50% { transform: rotate(-15deg); }
    75% { transform: rotate(10deg); }
    100% { transform: rotate(0deg); }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#own-driver-animations')) {
  styleSheet.id = 'own-driver-animations';
  document.head.appendChild(styleSheet);
}

export default OwnDriverDashboardPage;
