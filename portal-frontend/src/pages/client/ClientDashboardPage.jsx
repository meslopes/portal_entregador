import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.hooks';
import { orderService } from '@/lib/api';
import { subscribeGPS, isRealtimeAvailable } from '@/lib/realtime';
import { showToast } from '@/components/Toast.utils';
import ClientStats from './client-dashboard/ClientStats';
import ClientOrdersList from './client-dashboard/ClientOrdersList';
import ClientMapSection from './client-dashboard/ClientMapSection';
import OrderDetailsModal from './client-dashboard/OrderDetailsModal';
import RatingModal from './client-dashboard/RatingModal';

const ClientDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [trackingDrivers, setTrackingDrivers] = useState([]);
  const [restaurantData, setRestaurantData] = useState(null);
  const [deliveryAddresses, setDeliveryAddresses] = useState([]);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const hasUserInteractedRef = useRef(false); // Se o usuário interagiu com o mapa

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersData, statsData, trackingData] = await Promise.all([
        orderService.getMyOrders(page, 10, filter),
        orderService.getMyStats(),
        orderService.getMyTracking()
      ]);
      setOrders(ordersData.orders || []);
      setTotalPages(ordersData.pages || 1);
      setStats(statsData);
      setTrackingDrivers(trackingData.drivers || []);
      setRestaurantData(trackingData.restaurant || null);
      setDeliveryAddresses(trackingData.delivery_addresses || []);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh tracking a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await orderService.getMyTracking();
        setTrackingDrivers(data.drivers || []);
        setRestaurantData(data.restaurant || null);
        setDeliveryAddresses(data.delivery_addresses || []);
      } catch { /* intentionally empty */ }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime: atualizar posição dos entregadores em tempo real
  useEffect(() => {
    if (!isRealtimeAvailable() || !user?.tenant_id) return;
    const cleanup = subscribeGPS(user.tenant_id, (gpsData) => {
      setTrackingDrivers(prev => prev.map(d => {
        // Atualizar posição do driver que enviou GPS
        if (d.driver_id === gpsData.driver_id ||
            d.driver_id === `own_${gpsData.driver_id}` ||
            `own_${d.driver_id?.replace('own_', '')}` === `own_${gpsData.driver_id}`) {
          return { ...d, latitude: gpsData.lat, longitude: gpsData.lng };
        }
        return d;
      }));
    });
    return cleanup;
  }, [user?.tenant_id]);

  // Inicializa o mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      if (mapRef.current && !mapInstanceRef.current) {
        const L = window.L;
        const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
          .setView([-29.95, -50.45], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        // Detectar interação do usuário para parar auto-centralizar
        map.on('zoomstart', () => { hasUserInteractedRef.current = true; });
        map.on('dragstart', () => { hasUserInteractedRef.current = true; });
        mapInstanceRef.current = map;
      }
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Atualiza marcadores
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const bounds = [];

    // Marcador do estabelecimento (fixo)
    if (restaurantData && restaurantData.latitude && restaurantData.longitude) {
      const restaurantIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:40px;height:40px;border-radius:8px;background:#f59e0b;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;">🏪</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const restaurantMarker = L.marker([restaurantData.latitude, restaurantData.longitude], { icon: restaurantIcon })
        .addTo(map)
        .bindPopup(`<div style="min-width:160px"><strong>${restaurantData.name}</strong><br><small>${restaurantData.address || ''}</small><br><span style="color:#f59e0b;font-weight:600">Seu Estabelecimento</span></div>`);

      markersRef.current.push(restaurantMarker);
      bounds.push([restaurantData.latitude, restaurantData.longitude]);
    }

    // Marcadores dos enderecos de entrega
    deliveryAddresses.forEach(addr => {
      if (!addr.latitude || !addr.longitude) return;
      const statusColors = {
        ACCEPTED: '#f59e0b', PREPARING: '#8b5cf6', READY: '#06b6d4', PICKED_UP: '#2563eb'
      };
      const color = statusColors[addr.order_status] || '#22c55e';

      const deliveryIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const deliveryMarker = L.marker([addr.latitude, addr.longitude], { icon: deliveryIcon })
        .addTo(map)
        .bindPopup(`<div style="min-width:160px"><strong>Pedido #${addr.order_number}</strong><br><small>${addr.customer_name}</small><br><small>${addr.street || ''}, ${addr.neighborhood || ''}</small><br><span style="color:${color};font-weight:600">${addr.order_status}</span></div>`);

      markersRef.current.push(deliveryMarker);
      bounds.push([addr.latitude, addr.longitude]);
    });

    // Marcadores dos entregadores (plataforma + próprios)
    trackingDrivers.forEach(driver => {
      if (!driver.latitude || !driver.longitude) return;

      // Cores: próprio livre = roxo, próprio com pedido = azul, plataforma = cor do status
      const statusColors = {
        ACCEPTED: '#f59e0b', PREPARING: '#8b5cf6', READY: '#06b6d4', PICKED_UP: '#2563eb'
      };
      let color, iconEmoji, label;
      if (driver.is_own) {
        if (driver.order_status === 'AVAILABLE' || !driver.order_id) {
          color = '#8b5cf6'; // Roxo = próprio livre (sem pedido)
          iconEmoji = '🏍️';
          label = 'Livre';
        } else {
          color = '#2563eb'; // Azul = próprio com pedido
          iconEmoji = '🏍️';
          label = statusColors[driver.order_status] ? 'Em entrega' : driver.order_status;
        }
      } else {
        color = statusColors[driver.order_status] || '#22c55e';
        iconEmoji = '🚚';
        label = driver.order_status;
      }

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;">${iconEmoji}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const popupHtml = driver.order_id
        ? `<div style="min-width:160px"><strong>${driver.name}</strong> ${driver.is_own ? '<span style="color:#8b5cf6">(Próprio)</span>' : ''}<br><small>${driver.vehicle_type}</small><br><small>Pedido: #${driver.order_number}</small><br><span style="color:${color};font-weight:600">${label}</span></div>`
        : `<div style="min-width:160px"><strong>${driver.name}</strong> <span style="color:#8b5cf6">(Próprio)</span><br><small>${driver.vehicle_type}</small><br><span style="color:#8b5cf6;font-weight:600">Disponível</span></div>`;

      const marker = L.marker([driver.latitude, driver.longitude], { icon })
        .addTo(map)
        .bindPopup(popupHtml);

      markersRef.current.push(marker);
      bounds.push([driver.latitude, driver.longitude]);
    });

    if (bounds.length > 0 && !hasUserInteractedRef.current) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [trackingDrivers, restaurantData, deliveryAddresses]);

  const openOrderDetails = async (orderId) => {
    try {
      const data = await orderService.getOrderDetails(orderId);
      setSelectedOrder(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Olá, {user?.first_name}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Gerencie seus pedidos de entrega
          </p>
        </div>
        <button
          onClick={() => navigate('/client/new-order')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
            background: '#0d9488', color: 'white', border: 'none',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0f766e'}
          onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}
        >
          <Plus size={18} /> NOVO PEDIDO
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Mapa de Rastreamento */}
      <ClientMapSection
        mapRef={mapRef}
        trackingDrivers={trackingDrivers}
        restaurantData={restaurantData}
        deliveryAddresses={deliveryAddresses}
        mapInstanceRef={mapInstanceRef}
        hasUserInteractedRef={hasUserInteractedRef}
      />

      {/* Cards de Stats */}
      <ClientStats stats={stats} />

      {/* Filtros e Lista de Pedidos */}
      <ClientOrdersList
        orders={orders}
        loading={loading}
        filter={filter}
        setFilter={setFilter}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        openOrderDetails={openOrderDetails}
      />

      {/* Modal de Detalhes */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onRate={(order) => { setSelectedOrder(null); setRatingOrder(order); }} />
      )}

      {/* Modal de Avaliacao */}
      {ratingOrder && (
        <RatingModal
          order={ratingOrder}
          onClose={() => { setRatingOrder(null); setRating(0); setFeedback(''); }}
          onSubmit={async () => {
            if (rating === 0) return;
            setRatingLoading(true);
            try {
              await orderService.rateOrder(ratingOrder.id, rating, feedback);
              setRatingOrder(null);
              setRating(0);
              setFeedback('');
              loadData(); // Recarrega para atualizar status
            } catch (err) {
              showToast(err.response?.data?.error || 'Erro ao avaliar', 'error');
            } finally {
              setRatingLoading(false);
            }
          }}
          rating={rating}
          setRating={setRating}
          feedback={feedback}
          setFeedback={setFeedback}
          loading={ratingLoading}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ClientDashboardPage;
