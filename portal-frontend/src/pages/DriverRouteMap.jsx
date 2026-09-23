import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { orderService, utils } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { STATUS_MAP } from './driver-route-map/constants';
import RouteMapView from './driver-route-map/RouteMapView';
import RouteStopsList from './driver-route-map/RouteStopsList';

const DriverRouteMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const cityCenterRef = useRef(null); // Coordenadas da cidade do entregador
  const geocodeCityCache = useRef({}); // Cache de geocodificação
  const driverMarkerRef = useRef(null); // Marcador "Você está aqui"
  const gpsWatchRef = useRef(null); // ID do watchPosition

  // Geocodifica cidade usando Nominatim (OpenStreetMap, gratuito)
  const geocodeCity = async (city, state) => {
    try {
      const query = `${city}, ${state || 'RS'}, Brasil`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`,
        { headers: { 'User-Agent': 'muvlog-portal/1.0' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (err) {
      console.warn('Erro ao geocodificar cidade:', err);
      return null;
    }
  };

  // Geocodificar cidade do entregador quando dados do usuário mudam
  useEffect(() => {
    const city = user?.driver?.square_city;
    if (!city) {
      cityCenterRef.current = null;
      return;
    }

    const state = user?.driver?.square_state || 'RS';
    const cacheKey = `${city.toLowerCase()}-${state.toLowerCase()}`;

    if (!geocodeCityCache.current[cacheKey]) {
      geocodeCityCache.current[cacheKey] = geocodeCity(city, state);
    }

    geocodeCityCache.current[cacheKey].then(coords => {
      cityCenterRef.current = coords;
      // Se o mapa já existe e não há pedidos, centraliza na cidade
      if (mapInstanceRef.current && coords && activeOrders.length === 0) {
        mapInstanceRef.current.setView([coords.lat, coords.lng], 13);
      }
    });
  }, [user?.driver?.square_city]);

  useEffect(() => {
    loadActiveOrders();
  }, []);

  // Callback ref para inicializar o mapa
  const mapCallbackRef = useCallback((node) => {
    if (!node) return;
    mapRef.current = node;

    if (mapInstanceRef.current) return;

    const initMap = () => {
      if (!node || mapInstanceRef.current) return;
      const L = window.L;
      if (!L) return;
      // Centro: cidade do entregador (via geocoding) ou fallback
      const initialCenter = cityCenterRef.current
        ? [cityCenterRef.current.lat, cityCenterRef.current.lng]
        : [-29.72, -50.00];
      const initialZoom = cityCenterRef.current ? 13 : 12;
      mapInstanceRef.current = L.map(node, { zoomControl: true, scrollWheelZoom: true })
        .setView(initialCenter, initialZoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstanceRef.current);
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
  }, []);

  // Atualiza marcadores quando pedidos mudam
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || activeOrders.length === 0) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Remove marcadores antigos
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    const allPoints = [];

    activeOrders.forEach((order, index) => {
      const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.ACCEPTED;

      // Marcador do restaurante
      if (order.restaurant?.latitude && order.restaurant?.longitude) {
        const restIcon = L.divIcon({
          html: `<div style="background:${statusInfo.color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:11px;font-weight:bold;color:white">${index + 1}</div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const restMarker = L.marker([order.restaurant.latitude, order.restaurant.longitude], { icon: restIcon })
          .addTo(map)
          .bindPopup(`<b>${index + 1}. Coletar</b><br>${order.restaurant.name}<br>${order.restaurant.address || ''}`);
        markersRef.current.push(restMarker);
        allPoints.push([order.restaurant.latitude, order.restaurant.longitude]);
      }

      // Marcador da entrega
      if (order.delivery_address?.latitude && order.delivery_address?.longitude) {
        const delivIcon = L.divIcon({
          html: `<div style="background:#22c55e;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:11px;font-weight:bold;color:white">${index + 1}</div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const delivMarker = L.marker([order.delivery_address.latitude, order.delivery_address.longitude], { icon: delivIcon })
          .addTo(map)
          .bindPopup(`<b>${index + 1}. Entregar</b><br>${order.customer?.name}<br>${order.delivery_address.street || ''}`);
        markersRef.current.push(delivMarker);
        allPoints.push([order.delivery_address.latitude, order.delivery_address.longitude]);
      }
    });

    // Ajusta zoom para mostrar todos os pontos
    if (allPoints.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [activeOrders]);

  // Rastreamento GPS do entregador em tempo real
  useEffect(() => {
    if (!navigator.geolocation) return;

    const updateDriverMarker = (lat, lng) => {
      const L = window.L;
      const map = mapInstanceRef.current;
      if (!L || !map) return;

      // Atualizar ou criar marcador "Você está aqui"
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const driverIcon = L.divIcon({
          html: `<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.6);position:relative"><div style="position:absolute;top:-6px;left:-6px;width:32px;height:32px;border-radius:50%;background:rgba(59,130,246,0.15);animation:pulse-blue 2s infinite"></div></div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        driverMarkerRef.current = L.marker([lat, lng], { icon: driverIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup('<b>Você está aqui</b>');
      }

      // Enviar GPS para o backend (a cada atualização)
      try {
        const token = localStorage.getItem('own_driver_token') || localStorage.getItem('token');
        if (token) {
          import('@/lib/api').then(({ driverService }) => {
            driverService.updateLocation(lat, lng).catch(() => {});
          });
        }
      } catch (e) {}
    };

    // Iniciar rastreamento contínuo
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => updateDriverMarker(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn('GPS erro:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  const loadActiveOrders = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getActiveOrders();
      setActiveOrders(response.orders || []);
    } catch (err) {
      setError('Erro ao carregar pedidos ativos');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvanceStatus = async (order) => {
    const statusInfo = STATUS_MAP[order.status];
    if (!statusInfo) return;

    try {
      setUpdatingOrder(order.id);
      await orderService.updateOrderStatus(order.id, statusInfo.next);
      // Atualiza o pedido localmente
      setActiveOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: statusInfo.next } : o
      ).filter(o => o.status !== 'DELIVERED'));
    } catch (err) {
      setError('Erro ao atualizar status');
      console.error(err);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const openInGoogleMaps = (lat, lng) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(selectedOrder?.id === order.id ? null : order);
    if (order.restaurant?.latitude && order.restaurant?.longitude) {
      mapInstanceRef.current?.setView([order.restaurant.latitude, order.restaurant.longitude], 15);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/orders')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem'
        }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
            Minha Rota
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {activeOrders.length} pedidos ativos
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }} className="route-grid">
        <RouteMapView mapCallbackRef={mapCallbackRef} />

        <RouteStopsList
          activeOrders={activeOrders}
          selectedOrder={selectedOrder}
          updatingOrder={updatingOrder}
          onSelectOrder={handleSelectOrder}
          onNavigateGoogleMaps={openInGoogleMaps}
          onNavigateToDelivery={(orderId) => navigate(`/delivery/${orderId}`)}
          onAdvanceStatus={handleAdvanceStatus}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-blue { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.3); opacity: 0.2; } }
        .route-grid { grid-template-columns: 1fr 300px; }
        @media (max-width: 768px) { .route-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default DriverRouteMap;
