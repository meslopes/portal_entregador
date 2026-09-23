import { useRef, useCallback, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ORDER_STATUS } from '@/constants/status';

// Proteção contra XSS em popups do Leaflet
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

export default function MapSection({
  tracking,
  lastUpdated,
  selectedSquare,
  squares,
  onSelectSquare,
  cityCenter,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const hasUserInteractedRef = useRef(false);

  // ── Map init via callback ref ──────────────────────────────────────────────
  const mapCallbackRef = useCallback((node) => {
    if (!node) {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch { /* intentionally empty */ }
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
      return;
    }
    mapRef.current = node;

    const initMap = () => {
      if (!node || !window.L) return;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch { /* intentionally empty */ }
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
      hasUserInteractedRef.current = false;
      try {
        const L = window.L;
        const initialCenter = cityCenter
          ? [cityCenter.lat, cityCenter.lng]
          : [-29.72, -50.00];
        const initialZoom = cityCenter ? 13 : 12;
        const map = L.map(node, { zoomControl: true, scrollWheelZoom: true }).setView(initialCenter, initialZoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        mapInstanceRef.current = map;
        map.on('zoomstart', () => { hasUserInteractedRef.current = true; });
        map.on('dragstart', () => { hasUserInteractedRef.current = true; });
      } catch (e) {
        console.error('Erro ao inicializar mapa:', e);
      }
    };

    if (window.L) {
      setTimeout(initMap, 150);
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setTimeout(initMap, 150);
      document.head.appendChild(script);
    }
  }, []);

  // ── Recenter on city change ────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current && cityCenter) {
      mapInstanceRef.current.setView([cityCenter.lat, cityCenter.lng], 13);
    }
  }, [cityCenter]);

  // ── Realtime GPS marker updates ────────────────────────────────────────────
  useEffect(() => {
    let cleanup = null;
    // Access tenant from tracking data (passed from parent's user context)
    import('@/lib/realtime').then((rt) => {
      if (!rt.isRealtimeAvailable()) return;
      cleanup = rt.subscribeGPS(null, (gpsData) => {
        const L = window.L;
        const map = mapInstanceRef.current;
        if (!L || !map) return;
        const existing = markersRef.current.find(m => m._gpsDriverId === gpsData.driver_id);
        if (existing) {
          existing.setLatLng([gpsData.lat, gpsData.lng]);
        }
      });
    }).catch(() => {});
    return () => { if (cleanup) cleanup(); };
  }, []);

  // ── Marker update effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !tracking) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];
    const allPoints = [];

    // Drivers
    if (tracking.drivers) {
      tracking.drivers.forEach(driver => {
        if (driver.latitude && driver.longitude) {
          const color = driver.current_order ? '#2563eb' : '#22c55e';
          const icon = L.divIcon({
            html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
            </div>`,
            className: '', iconSize: [32, 32], iconAnchor: [16, 16]
          });
          const marker = L.marker([driver.latitude, driver.longitude], { icon })
            .addTo(map)
            .bindPopup(`<b>${escapeHtml(driver.name)}</b><br>${escapeHtml(driver.vehicle_type)}<br>${driver.current_order ? 'Em entrega' : 'Livre'}`);
          marker._gpsDriverId = driver.driver_id;
          markersRef.current.push(marker);
          allPoints.push([driver.latitude, driver.longitude]);
        }
      });
    }

    // Establishments
    if (tracking.establishments) {
      tracking.establishments.forEach(est => {
        if (est.latitude && est.longitude) {
          const icon = L.divIcon({
            html: `<div style="background:#f59e0b;width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>
            </div>`,
            className: '', iconSize: [28, 28], iconAnchor: [14, 14]
          });
          let ordersHtml = '';
          if (est.orders && est.orders.length > 0) {
            ordersHtml = '<div style="margin-top:8px;max-height:200px;overflow-y:auto;">';
            est.orders.forEach(o => {
              const statusCfg = ORDER_STATUS[o.status];
              const color = statusCfg?.color || '#64748b';
              const label = statusCfg?.label || o.status;
              ordersHtml += `<div style="padding:4px 6px;margin:2px 0;background:#f8fafc;border-radius:4px;font-size:11px;border-left:3px solid ${color}">`;
              ordersHtml += `<div style="display:flex;justify-content:space-between;"><b>#${escapeHtml(o.order_number)}</b><span style="color:${color}">${escapeHtml(label)}</span></div>`;
              ordersHtml += `<div style="color:#64748b;">${escapeHtml(o.customer_name) || 'Cliente'}</div>`;
              if (o.driver_name) ordersHtml += `<div style="color:#64748b;">🏍 ${escapeHtml(o.driver_name)}</div>`;
              ordersHtml += `<div style="color:#64748b;">R$ ${(o.total_amount || 0).toFixed(2)}</div>`;
              ordersHtml += '</div>';
            });
            ordersHtml += '</div>';
          }
          const popupContent = `<div style="min-width:200px;"><b style="font-size:13px;">${escapeHtml(est.name)}</b><div style="font-size:11px;color:#64748b;margin-top:2px;">${escapeHtml(est.address)}</div><div style="font-size:11px;color:#475569;margin-top:4px;font-weight:600;">Pedidos ativos: ${est.active_orders}</div>${ordersHtml}</div>`;
          const marker = L.marker([est.latitude, est.longitude], { icon }).addTo(map).bindPopup(popupContent);
          markersRef.current.push(marker);
          allPoints.push([est.latitude, est.longitude]);
        }
      });
    }

    // Delivery addresses
    if (tracking.deliveries) {
      tracking.deliveries.forEach(del => {
        if (del.latitude && del.longitude) {
          const color = del.status === 'PICKED_UP' ? '#22c55e' : '#64748b';
          const icon = L.divIcon({
            html: `<div style="background:${color};width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            </div>`,
            className: '', iconSize: [24, 24], iconAnchor: [12, 12]
          });
          const marker = L.marker([del.latitude, del.longitude], { icon })
            .addTo(map)
            .bindPopup(`<b>#${escapeHtml(del.order_number)}</b><br>${escapeHtml(del.customer_name)}<br>${escapeHtml(del.street)}`);
          markersRef.current.push(marker);
          allPoints.push([del.latitude, del.longitude]);
        }
      });
    }

    // Fit bounds
    if (allPoints.length > 0) {
      try {
        if (!hasUserInteractedRef.current) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.1));
        }
      } catch (e) {
        console.warn('Erro ao ajustar bounds do mapa:', e);
        if (!hasUserInteractedRef.current) {
          if (cityCenter) {
            map.setView([cityCenter.lat, cityCenter.lng], 13);
          } else {
            map.setView([-29.72, -50.00], 12);
          }
        }
      }
    } else if (!hasUserInteractedRef.current) {
      if (cityCenter) {
        map.setView([cityCenter.lat, cityCenter.lng], 13);
      } else {
        map.setView([-29.72, -50.00], 12);
      }
    }
  }, [tracking, cityCenter]);

  // ── Recenter handler ───────────────────────────────────────────────────────
  const handleRecenter = () => {
    if (!tracking || !mapInstanceRef.current) return;
    hasUserInteractedRef.current = false;
    const L = window.L;
    if (!L) return;
    const allPoints = [];
    if (tracking.drivers) tracking.drivers.forEach(d => { if (d.latitude && d.longitude) allPoints.push([d.latitude, d.longitude]); });
    if (tracking.establishments) tracking.establishments.forEach(e => { if (e.latitude && e.longitude) allPoints.push([e.latitude, e.longitude]); });
    if (tracking.deliveries) tracking.deliveries.forEach(d => { if (d.latitude && d.longitude) allPoints.push([d.latitude, d.longitude]); });
    if (allPoints.length > 0) {
      const group = L.featureGroup([]);
      allPoints.forEach(p => group.addLayer(L.marker(p)));
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    } else if (cityCenter) {
      mapInstanceRef.current.setView([cityCenter.lat, cityCenter.lng], 13);
    }
  };

  // ── Expose centerMap for parent (order card "Ver no mapa") ─────────────────
  // We use a global function so the parent can call it without ref gymnastics
  useEffect(() => {
    window.__adminMapCenter = (lat, lng) => {
      mapInstanceRef.current?.setView([lat, lng], 15);
    };
    return () => { delete window.__adminMapCenter; };
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header do Mapa */}
      <div style={{
        padding: '0.75rem 1rem', background: 'white', borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} style={{ color: '#2563eb' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Mapa em Tempo Real</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
            {tracking?.drivers?.length || 0} entregadores | {tracking?.establishments?.length || 0} estabelecimentos
          </span>
          {lastUpdated && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={selectedSquare?.id || ''}
            onChange={(e) => {
              const sq = squares.find(s => s.id === parseInt(e.target.value));
              onSelectSquare(sq || null);
            }}
            style={{ padding: '0.375rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none' }}
          >
            <option value="">Todas as Praças</option>
            {squares.map(sq => (
              <option key={sq.id} value={sq.id}>{sq.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <div key={`map-${selectedSquare?.id || 'all'}`} ref={mapCallbackRef} style={{ width: '100%', height: '100%' }} />

        {/* Botão Centralizar */}
        <button
          onClick={handleRecenter}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0',
            borderRadius: '0.375rem', background: 'white', cursor: 'pointer',
            fontSize: '0.8125rem', color: '#64748b',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 1000
          }}
        >
          <Navigation size={14} /> Centralizar Mapa
        </button>

        {/* Legenda */}
        <div style={{
          position: 'absolute', bottom: '1rem', left: '1rem',
          background: 'white', borderRadius: '0.5rem', padding: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 1000
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Legenda</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb' }} />
              <span>Entregador em entrega</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
              <span>Entregador livre</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} />
              <span>Estabelecimento</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#22c55e' }} />
              <span>Local de entrega</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1rem', background: 'white', borderTop: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
          <span>© 2026 muv.log — Controle de Entregadores</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
          <Link to="/support" style={{ color: '#64748b', textDecoration: 'none' }}>Suporte</Link>
          <Link to="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Termos</Link>
          <Link to="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacidade</Link>
        </div>
      </div>
    </div>
  );
}
