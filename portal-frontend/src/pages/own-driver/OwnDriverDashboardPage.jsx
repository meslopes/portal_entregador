import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import OwnDriverStats from './own-driver-dashboard/OwnDriverStats';
import OwnDriverOrders from './own-driver-dashboard/OwnDriverOrders';
import OwnDriverActions from './own-driver-dashboard/OwnDriverActions';
import PendingRoutesBanner from './own-driver-dashboard/PendingRoutesBanner';

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
  const audioContextRef = useRef(null);
  const audioEnabledRef = useRef(false);

  // Habilitar áudio após primeira interação do usuário
  useEffect(() => {
    const enableAudio = () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        audioEnabledRef.current = true;
      } catch (e) {}
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
    
    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
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
        // Usar Web Audio API para gerar beep
        if (audioEnabledRef.current && audioContextRef.current) {
          const ctx = audioContextRef.current;
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          
          // Segundo beep mais agudo
          setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1000;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.5, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.3);
          }, 350);
        }
        
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
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
      const routes = (routesRes.data.routes || []).filter(route => {
        if (route.status === 'COMPLETED') return false;
        if (route.stops && route.stops.length > 0) {
          return !route.stops.every(s => s.status === 'COMPLETED');
        }
        return true;
      });
      const pending = routes.filter(r => r.status === 'PENDING').length;
      setPendingRoutes(pending);
      
      const ordersFromRoutes = [];
      routes.forEach(route => {
        if (route.stops) {
          route.stops.forEach(stop => {
            // Ignorar paradas já concluídas
            if (stop.status === 'COMPLETED') return;
            if (stop.order_id && !ordersFromRoutes.find(o => o.id === stop.order_id)) {
              ordersFromRoutes.push({
                id: stop.order_id,
                order_number: stop.order_number || `Pedido #${stop.order_id}`,
                status: stop.order_status || (route.status === 'ACTIVE' ? 'ACCEPTED' : 'PENDING'),
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
      <PendingRoutesBanner
        pendingRoutes={pendingRoutes}
        onClick={() => navigate('/own-driver/routes')}
      />

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
        <OwnDriverStats stats={stats} />

        {/* Pedidos Ativos */}
        <OwnDriverOrders
          activeOrders={activeOrders}
          isOnline={isOnline}
          onRefresh={() => loadData(true)}
          onOrderClick={(id) => navigate(`/own-driver/delivery/${id}`)}
        />

        {/* Ações Rápidas */}
        <OwnDriverActions onNavigate={navigate} />
      </div>
    </div>
  );
};

export default OwnDriverDashboardPage;
