import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.hooks';
import { driverService, orderService } from '@/lib/api';
import { startOrderMonitor, stopOrderMonitor } from '@/lib/notify';
import DriverStats from '@/pages/driver-dashboard/DriverStats';
import QuickActions from '@/pages/driver-dashboard/QuickActions';
import DriverMap from '@/pages/driver-dashboard/DriverMap';
import { escapeHtml } from '@/pages/driver-dashboard/DriverMap.utils';

const DashboardPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingRoutes, setPendingRoutes] = useState(0);
  const prevPendingRoutes = useRef(0);
  const audioContextRef = useRef(null);
  const audioEnabledRef = useRef(false);
  const mapInstanceRef = useRef(null);

  // Habilitar áudio após primeira interação do usuário
  useEffect(() => {
    const enableAudio = () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        audioEnabledRef.current = true;
      } catch { /* intentionally empty */ }
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

  // Polling de rotas pendentes a cada 20 segundos
  useEffect(() => {
    const checkRoutes = async () => {
      try {
        const res = await import('@/lib/api').then(m => m.default.get('/api/routes/platform/active'));
        const routes = res.data.routes || [];
        const pending = routes.filter(r => r.status === 'PENDING').length;
        if (pending > prevPendingRoutes.current && prevPendingRoutes.current > 0) {
          playRouteNotification();
        }
        prevPendingRoutes.current = pending;
        setPendingRoutes(pending);
      } catch { /* Silenciar erro de polling */ }
    };
    checkRoutes();
    const interval = setInterval(checkRoutes, 20000);
    return () => clearInterval(interval);
  }, []);

  const playRouteNotification = () => {
    try {
      if (audioEnabledRef.current && audioContextRef.current) {
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
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
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    } catch { /* intentionally empty */ }
  };

  useEffect(() => {
    loadDashboardData();
    if (user?.driver?.is_online) getCurrentLocation().catch(() => {});
  }, [user?.driver?.is_online]);

  useEffect(() => { if (user?.driver) setIsOnline(user.driver.is_online); }, [user]);

  // Inicializar mapa quando localização estiver disponível
  useEffect(() => {
    if (location && !mapInstanceRef.current) {
      const initMap = () => {
        const L = window.L;
        if (!L) return;
        const container = document.getElementById('driver-map');
        if (!container) return;
        const map = L.map(container).setView([location.latitude, location.longitude], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);

        const driverIcon = L.divIcon({
          html: '<div style="background:#2563eb;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/></svg></div>',
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        L.marker([location.latitude, location.longitude], { icon: driverIcon }).addTo(map)
          .bindPopup('Sua localização');

        if (currentOrder?.delivery_address?.latitude && currentOrder?.delivery_address?.longitude) {
          const orderIcon = L.divIcon({
            html: '<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          L.marker([currentOrder.delivery_address.latitude, currentOrder.delivery_address.longitude], { icon: orderIcon }).addTo(map)
            .bindPopup(`Pedido #${escapeHtml(currentOrder.order_number)}`);
          const bounds = L.latLngBounds([
            [location.latitude, location.longitude],
            [currentOrder.delivery_address.latitude, currentOrder.delivery_address.longitude]
          ]);
          map.fitBounds(bounds.pad(0.2));
        }
        mapInstanceRef.current = map;
      };

      if (window.L) {
        initMap();
      } else {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location, currentOrder]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, orderData] = await Promise.all([
        driverService.getStats(),
        orderService.getCurrentOrder()
      ]);
      setStats(statsData || {});
      setCurrentOrder(orderData?.order || null);
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada pelo navegador'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setLocation(loc);
          resolve(loc);
        },
        (err) => {
          console.warn('Erro ao obter localização:', err.message);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });
  };

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      if (newStatus && !location) {
        setError('Solicitando localização...');
        try {
          const loc = await getCurrentLocation();
          const response = await driverService.toggleOnlineStatus(true, loc.latitude, loc.longitude);
          setIsOnline(true);
          updateUser({ ...user, driver: response.driver });
          setError('');
        } catch {
          const fallbackLat = user?.driver?.square?.latitude || -29.9150;
          const fallbackLng = user?.driver?.square?.longitude || -51.1780;
          console.warn('GPS indisponível, usando localização padrão da praça:', fallbackLat, fallbackLng);
          try {
            const response = await driverService.toggleOnlineStatus(true, fallbackLat, fallbackLng);
            setIsOnline(true);
            setLocation({ latitude: fallbackLat, longitude: fallbackLng });
            updateUser({ ...user, driver: response.driver });
            setError('⚠️ GPS não disponível — usando localização padrão da praça. Para GPS real, acesse via HTTPS.');
          } catch (apiErr) {
            setError('Erro ao ficar online: ' + (apiErr.message || 'Tente novamente'));
          }
        }
        return;
      }
      const response = await driverService.toggleOnlineStatus(newStatus, location?.latitude, location?.longitude);
      setIsOnline(newStatus);
      updateUser({ ...user, driver: response.driver });
      setError('');
    } catch {
      setError('Erro ao alterar status');
    }
  };

  const updateLocation = useCallback(async () => {
    if (!location) { getCurrentLocation(); return; }
    try { await driverService.updateLocation(location.latitude, location.longitude); }
    catch (error) { console.error(error); }
  }, [location]);

  useEffect(() => {
    let interval;
    if (isOnline && location) interval = setInterval(updateLocation, 30000);
    return () => { if (interval) clearInterval(interval); };
  }, [isOnline, location, updateLocation]);

  // Monitor de pedidos (sirene + notificacao)
  useEffect(() => {
    startOrderMonitor(null);
    return () => stopOrderMonitor();
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '3rem', height: '3rem',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header com Status Online */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Olá, {user?.first_name} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            {isOnline ? 'Você está online e pronto para entregar' : 'Fique online para receber pedidos'}
          </p>
        </div>
        <button
          onClick={handleToggleOnline}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '9999px',
            border: 'none',
            background: isOnline ? '#22c55e' : '#e2e8f0',
            color: isOnline ? 'white' : '#64748b',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9375rem',
            transition: 'all 0.2s',
            boxShadow: isOnline ? '0 4px 14px rgba(34, 197, 94, 0.4)' : 'none'
          }}
        >
          <div style={{
            width: '2.5rem', height: '1.375rem',
            borderRadius: '9999px',
            background: isOnline ? 'rgba(255,255,255,0.3)' : '#cbd5e1',
            position: 'relative',
            transition: 'all 0.2s'
          }}>
            <div style={{
              width: '1.125rem', height: '1.125rem',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '0.125rem',
              left: isOnline ? '1.25rem' : '0.125rem',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <DriverStats stats={stats} />
      <QuickActions navigate={navigate} pendingRoutes={pendingRoutes} />
      <DriverMap location={location} currentOrder={currentOrder} getCurrentLocation={getCurrentLocation} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DashboardPage;
