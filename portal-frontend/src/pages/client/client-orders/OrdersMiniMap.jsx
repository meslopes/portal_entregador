import React, { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Mapa resumido dos pedidos (R4, 2026-11-24) — apoia a reorganização manual
 * de rota. Pins numerados (últimos dígitos do pedido, SEM endereço no mapa),
 * cor por entregador (cinza = sem entregador), tooltip mínimo
 * "#5148 · nome do entregador". Clique no pin abre o detalhe do pedido.
 */
const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#8b5cf6', '#0d9488', '#dc2626', '#0891b2', '#c026d3'];

const corDoEntregador = (nome) => {
  if (!nome) return '#94a3b8';
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const nomeEntregador = (o) => o.own_driver?.name || o.driver?.name || null;

const OrdersMiniMap = ({ orders, onOpenDetails }) => {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const [aberto, setAberto] = useState(true);

  // inicializa o mapa uma vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { loadLeaflet } = await import('@/lib/leafletLoader');
        await loadLeaflet();
        const L = window.L;
        if (cancelled || !L || !mapDivRef.current || mapRef.current) return;
        const map = L.map(mapDivRef.current, { scrollWheelZoom: false }).setView([-29.75, -50.0], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(map);
        markersRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        desenhar(L);
      } catch { /* mapa é apoio — nunca derruba a página */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const desenhar = (L) => {
    const map = mapRef.current;
    const grupo = markersRef.current;
    if (!map || !grupo || !L) return;
    grupo.clearLayers();
    const pontos = [];
    (orders || []).forEach(o => {
      const addr = o.delivery_address;
      if (!addr?.latitude || !addr?.longitude) return;
      const lat = parseFloat(addr.latitude);
      const lng = parseFloat(addr.longitude);
      const nome = nomeEntregador(o);
      const cor = corDoEntregador(nome);
      const num = o.seq_number != null ? String(o.seq_number) : (o.order_number || '').slice(-4);
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:26px;height:26px;border-radius:50%;background:${cor};color:#fff;`
            + `display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;`
            + `border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${num}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
      });
      marker.bindTooltip(`#${num} · ${nome || 'sem entregador'}`, { direction: 'top', offset: [0, -14] });
      marker.on('click', () => onOpenDetails?.(o.id));
      grupo.addLayer(marker);
      pontos.push([lat, lng]);
    });
    if (pontos.length > 0) {
      map.fitBounds(pontos, { padding: [40, 40], maxZoom: 14 });
    }
  };

  // redesenha quando a lista muda
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    desenhar(window.L);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const entregadores = [...new Set((orders || []).map(nomeEntregador).filter(Boolean))];

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.25rem', overflow: 'hidden' }}>
      <button
        onClick={() => setAberto(a => !a)}
        style={{
          width: '100%', padding: '0.875rem 1.25rem', border: 'none', background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapIcon size={18} style={{ color: '#0d9488' }} />
          Mapa dos pedidos
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
            ({(orders || []).length} pedido(s) · cores por entregador)
          </span>
        </span>
        {aberto ? <ChevronUp size={18} style={{ color: '#64748b' }} /> : <ChevronDown size={18} style={{ color: '#64748b' }} />}
      </button>

      {aberto && (
        <>
          <div ref={mapDivRef} style={{ height: '300px', background: '#e5e7eb' }} />
          {entregadores.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.625rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
              {entregadores.map(nome => (
                <span key={nome} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: '#475569' }}>
                  <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', background: corDoEntregador(nome), display: 'inline-block' }} />
                  {nome}
                </span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: '#94a3b8' }}>
                <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                sem entregador
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrdersMiniMap;
