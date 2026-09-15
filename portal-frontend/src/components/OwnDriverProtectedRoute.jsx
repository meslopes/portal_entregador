import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';

const OwnDriverProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('own_driver_token');
  const gpsIntervalRef = useRef(null);
  const gpsBroadcastRef = useRef(null);
  
  // GPS persistente para entregadores próprios — funciona em TODAS as páginas
  // Supabase Broadcast (tempo real) + HTTP POST (persistência)
  useEffect(() => {
    if (!token) return;

    let realtimeModule = null;
    let apiModule = null;
    let driverId = null;
    let tenantId = null;

    const initModules = async () => {
      try {
        realtimeModule = await import('@/lib/realtime');
        apiModule = await import('@/lib/api');
        // Buscar dados do entregador
        const m = await import('@/lib/api');
        const res = await m.default.get('/api/own-driver/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        driverId = res.data?.id;
        tenantId = res.data?.tenant_id;
      } catch (e) { /* Ignorar erro */ }
    };

    const sendGPSBroadcast = () => {
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

    const sendGPSHttp = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (apiModule?.default) {
            apiModule.default.post('/api/own-driver/location', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    };

    initModules().then(() => {
      sendGPSBroadcast();
      sendGPSHttp();
      gpsBroadcastRef.current = setInterval(sendGPSBroadcast, 2000);
      gpsIntervalRef.current = setInterval(sendGPSHttp, 15000);
    });

    return () => {
      if (gpsBroadcastRef.current) clearInterval(gpsBroadcastRef.current);
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/own-driver/login" replace />;
  }

  return children;
};

export default OwnDriverProtectedRoute;
