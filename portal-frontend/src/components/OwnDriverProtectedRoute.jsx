import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';

const OwnDriverProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('own_driver_token');
  const gpsIntervalRef = useRef(null);
  
  // GPS persistente para entregadores próprios — funciona em TODAS as páginas
  useEffect(() => {
    if (!token) return;

    const sendGPS = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          import('@/lib/api').then((m) => {
            const headers = { Authorization: `Bearer ${token}` };
            m.default.post('/api/own-driver/location', {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }, { headers }).catch(() => {});
          }).catch(() => {});
        },
        () => {}, // Silenciar erros de GPS
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    };

    sendGPS();
    gpsIntervalRef.current = setInterval(sendGPS, 15000);

    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
      }
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/own-driver/login" replace />;
  }

  return children;
};

export default OwnDriverProtectedRoute;
