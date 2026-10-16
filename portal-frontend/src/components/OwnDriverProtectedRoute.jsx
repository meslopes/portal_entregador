import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Rota protegida do entregador próprio.
 * Valida o token no backend antes de renderizar (não basta existir no localStorage).
 * GPS: broadcast 15s (baixa precisão) + persist 30s (alta precisão) — economiza bateria.
 */
const OwnDriverProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('own_driver_token');
  const gpsHttpRef = useRef(null);
  const gpsBroadcastRef = useRef(null);
  // 'checking' | 'valid' | 'invalid' — evita renderizar antes de validar o token
  const [authState, setAuthState] = useState('checking');

  useEffect(() => {
    if (!token) {
      setAuthState('invalid');
      return;
    }

    let driverId = null;
    let tenantId = null;
    let realtimeModule = null;
    let cancelled = false;

    const init = async () => {
      try {
        realtimeModule = await import('@/lib/realtime');
        const m = await import('@/lib/api');
        const res = await m.default.get('/api/own-driver/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled) return;
        driverId = res.data?.id;
        tenantId = res.data?.tenant_id;
        setAuthState('valid');

        broadcast();
        persist();
        // 5s no broadcast para o estabelecimento ver em tempo real
        gpsBroadcastRef.current = setInterval(broadcast, 5000);
        gpsHttpRef.current = setInterval(persist, 30000);
      } catch (err) {
        if (cancelled) return;
        // Token inválido/expirado — limpar e forçar novo login
        if (err?.response?.status === 401) {
          localStorage.removeItem('own_driver_token');
          localStorage.removeItem('own_driver_data');
          localStorage.removeItem('own_driver_restaurant');
          setAuthState('invalid');
        } else {
          // Rede instável: permitir render (app offline-first), GPS fica sem efeito
          setAuthState('valid');
        }
      }
    };

    const broadcast = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (realtimeModule?.isRealtimeAvailable() && driverId) {
            realtimeModule.sendGPS(driverId, pos.coords.latitude, pos.coords.longitude, tenantId, 'own');
          }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
      );
    };

    const persist = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          import('@/lib/api').then((m) => {
            m.default.post('/api/own-driver/location', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    };

    init();

    return () => {
      cancelled = true;
      if (gpsBroadcastRef.current) clearInterval(gpsBroadcastRef.current);
      if (gpsHttpRef.current) clearInterval(gpsHttpRef.current);
    };
  }, [token]);

  if (!token || authState === 'invalid') {
    return <Navigate to="/own-driver/login" replace />;
  }

  if (authState === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return children;
};

export default OwnDriverProtectedRoute;
