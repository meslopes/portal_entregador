import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';

const OwnDriverProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('own_driver_token');
  const gpsHttpRef = useRef(null);
  const gpsBroadcastRef = useRef(null);
  
  // GPS persistente para entregadores próprios — funciona em TODAS as páginas
  // Supabase Broadcast a cada 2s (tempo real) + HTTP POST a cada 30s (persistência)
  useEffect(() => {
    if (!token) return;

    let driverId = null;
    let tenantId = null;
    let realtimeModule = null;

    // Carregar módulos e dados do entregador uma vez
    const init = async () => {
      try {
        realtimeModule = await import('@/lib/realtime');
        const m = await import('@/lib/api');
        const res = await m.default.get('/api/own-driver/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        driverId = res.data?.id;
        tenantId = res.data?.tenant_id;
      } catch (e) { /* Ignorar erro */ }
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
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
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

    init().then(() => {
      broadcast(); persist();
      gpsBroadcastRef.current = setInterval(broadcast, 2000);
      gpsHttpRef.current = setInterval(persist, 30000);
    });

    return () => {
      if (gpsBroadcastRef.current) clearInterval(gpsBroadcastRef.current);
      if (gpsHttpRef.current) clearInterval(gpsHttpRef.current);
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/own-driver/login" replace />;
  }

  return children;
};

export default OwnDriverProtectedRoute;
