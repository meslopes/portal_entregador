import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Store, Package, ArrowLeft, ExternalLink, CheckCircle } from 'lucide-react';
import { orderService, utils } from '@/lib/api';

const STATUS_MAP = {
  ACCEPTED: { next: 'PREPARING', actionLabel: 'Coletar', color: '#f59e0b' },
  PREPARING: { next: 'READY', actionLabel: 'Coletar', color: '#8b5cf6' },
  READY: { next: 'PICKED_UP', actionLabel: 'Coletar', color: '#06b6d4' },
  PICKED_UP: { next: 'DELIVERED', actionLabel: 'Entregar', color: '#22c55e' },
};

const STATUS_TEXT = {
  ACCEPTED: 'A coletar',
  PREPARING: 'Preparando',
  READY: 'Pronto para coleta',
  PICKED_UP: 'A entregar',
};

const DriverRouteMap = () => {
  const navigate = useNavigate();
  const [activeOrders, setActiveOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

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
      mapInstanceRef.current = L.map(node, { zoomControl: true, scrollWheelZoom: true })
        .setView([-29.72, -50.00], 12);
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', marginBottom: '1.5rem' }} className="route-grid">
        {/* Mapa */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div ref={mapCallbackRef} style={{ height: '500px', background: '#e5e7eb' }} />
        </div>

        {/* Lista de pedidos */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Pedidos da Rota</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
            {activeOrders.map((order, index) => {
              const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.ACCEPTED;
              const statusText = STATUS_TEXT[order.status] || order.status;
              const isUpdating = updatingOrder === order.id;

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(selectedOrder?.id === order.id ? null : order);
                    if (order.restaurant?.latitude && order.restaurant?.longitude) {
                      mapInstanceRef.current?.setView([order.restaurant.latitude, order.restaurant.longitude], 15);
                    }
                  }}
                  style={{
                    padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.5rem',
                    background: selectedOrder?.id === order.id ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${selectedOrder?.id === order.id ? '#bfdbfe' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                      background: statusInfo.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.625rem', fontWeight: 700, color: 'white'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.75rem' }}>
                        #{order.order_number}
                      </p>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                      <Store size={10} style={{ color: '#f59e0b' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.restaurant?.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={10} style={{ color: '#22c55e' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customer?.name}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(order.restaurant?.latitude, order.restaurant?.longitude);
                      }}
                      style={{
                        flex: 1, padding: '0.375rem', borderRadius: '0.25rem',
                        border: '1px solid #e2e8f0', background: 'white', color: '#f59e0b',
                        fontSize: '0.625rem', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
                      }}
                    >
                      <Navigation size={9} /> Mapa
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(order.delivery_address?.latitude, order.delivery_address?.longitude);
                      }}
                      style={{
                        flex: 1, padding: '0.375rem', borderRadius: '0.25rem',
                        border: '1px solid #e2e8f0', background: 'white', color: '#22c55e',
                        fontSize: '0.625rem', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
                      }}
                    >
                      <Navigation size={9} /> Mapa
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/delivery/${order.id}`);
                      }}
                      style={{
                        padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                        border: '1px solid #e2e8f0', background: 'white', color: '#2563eb',
                        fontSize: '0.625rem', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <ExternalLink size={9} />
                    </button>
                  </div>

                  {/* Botao de acao principal */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdvanceStatus(order);
                    }}
                    disabled={isUpdating}
                    style={{
                      width: '100%', marginTop: '0.5rem', padding: '0.5rem',
                      borderRadius: '0.375rem', border: 'none',
                      background: isUpdating ? '#94a3b8' : statusInfo.color,
                      color: 'white', fontSize: '0.75rem', fontWeight: 600,
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem'
                    }}
                  >
                    {isUpdating ? 'Atualizando...' : (
                      <>
                        <CheckCircle size={12} />
                        {statusInfo.actionLabel}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .route-grid { grid-template-columns: 1fr 300px; }
        @media (max-width: 768px) { .route-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default DriverRouteMap;
