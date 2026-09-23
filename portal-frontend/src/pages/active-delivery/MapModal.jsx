import React, { useEffect, useRef } from 'react';
import { Navigation, Phone, X } from 'lucide-react';
import L from 'leaflet';
import { escapeHtml } from './constants';

const MapModal = ({ showMap, mapTarget, order, mapRef, onClose, onNavigate, onCall }) => {
  const mapInstanceRef = useRef(null);

  // Inicializa o mapa quando abre
  useEffect(() => {
    if (showMap && mapRef.current && !mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView([-29.95, -50.45], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);
      mapInstanceRef.current = map;

      // Aguarda um frame para o mapa renderizar
      setTimeout(() => map.invalidateSize(), 100);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap, mapRef]);

  // Atualiza marcadores do mapa
  useEffect(() => {
    if (!mapInstanceRef.current || !order) return;

    const map = mapInstanceRef.current;
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Marcador do restaurante
    if (order.restaurant?.latitude && order.restaurant?.longitude) {
      const restaurantIcon = L.divIcon({
        html: '<div style="background:#f59e0b;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([order.restaurant.latitude, order.restaurant.longitude], { icon: restaurantIcon })
        .addTo(map)
        .bindPopup(`<b>${escapeHtml(order.restaurant.name)}</b><br>${escapeHtml(order.restaurant.address)}`);
    }

    // Marcador do cliente
    if (order.delivery_address?.latitude && order.delivery_address?.longitude) {
      const customerIcon = L.divIcon({
        html: '<div style="background:#22c55e;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([order.delivery_address.latitude, order.delivery_address.longitude], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`<b>${escapeHtml(order.customer?.name)}</b><br>${escapeHtml(order.delivery_address.street)}`);
    }

    // Ajusta zoom para mostrar ambos
    const bounds = [];
    if (order.restaurant?.latitude) bounds.push([order.restaurant.latitude, order.restaurant.longitude]);
    if (order.delivery_address?.latitude) bounds.push([order.delivery_address.latitude, order.delivery_address.longitude]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [showMap, order]);

  if (!showMap) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
      display: 'flex', flexDirection: 'column', zIndex: 100
    }}>
      <div style={{
        padding: '1rem', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        background: 'white'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
          {mapTarget === 'restaurant' ? 'Restaurante' : 'Cliente'}
        </h3>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={24} />
        </button>
      </div>
      <div ref={mapRef} style={{ flex: 1, minHeight: '400px' }} />
      <div style={{ padding: '1rem', background: 'white', display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={onNavigate}
          style={{
            flex: 1, padding: '0.875rem', borderRadius: '0.5rem',
            border: 'none', background: '#2563eb', color: 'white',
            fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
        >
          <Navigation size={18} /> Navegar
        </button>
        <button
          onClick={onCall}
          style={{
            flex: 1, padding: '0.875rem', borderRadius: '0.5rem',
            border: '1.5px solid #e2e8f0', background: 'white', color: '#374151',
            fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
        >
          <Phone size={18} /> Ligar
        </button>
      </div>
    </div>
  );
};

export default MapModal;
