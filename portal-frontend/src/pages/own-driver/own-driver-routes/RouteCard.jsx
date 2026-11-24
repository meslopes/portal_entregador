import React from 'react';
import StopItem from './StopItem';

const statusConfig = {
  ACTIVE: { bg: '#dbeafe', color: '#2563eb', label: 'Em andamento' },
  PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Aguardando' },
  COMPLETED: { bg: '#dcfce7', color: '#16a34a', label: 'Concluída' },
};

const RouteCard = ({ route, onAccept, onReject, onDeliverStop }) => {
  const status = statusConfig[route.status] || statusConfig.COMPLETED;

  // Rota completa no Google Maps (F2 — 2026-11-24): suporta mais etapas que o
  // Waze; origem = 1ª parada, destino = última, intermediárias = waypoints
  const abrirRotaGoogleMaps = () => {
    const pontos = (route.stops || [])
      .filter(s => s.latitude != null && s.longitude != null)
      .map(s => `${s.latitude},${s.longitude}`);
    if (pontos.length < 2) return;
    const origin = pontos[0];
    const destination = pontos[pontos.length - 1];
    const waypoints = pontos.slice(1, -1).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div style={{
      background: 'white', borderRadius: '0.75rem', padding: '1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Header da rota */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <p style={{ fontWeight: 600, color: '#1e293b' }}>Rota #{route.id}</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {route.stops?.length || 0} paradas
            {route.total_distance_km && ` • ${route.total_distance_km.toFixed(1)} km`}
            {route.total_duration_min && ` • ~${Math.round(route.total_duration_min)} min`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            padding: '0.25rem 0.5rem', borderRadius: '9999px',
            fontSize: '0.6875rem', fontWeight: 600,
            background: status.bg, color: status.color
          }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Rota completa no Google Maps — todas as paradas de uma vez */}
      {(route.stops || []).filter(s => s.latitude != null).length >= 2 && (
        <button
          onClick={abrirRotaGoogleMaps}
          style={{
            width: '100%', padding: '0.625rem', borderRadius: '0.5rem', border: 'none',
            background: '#2563eb', color: 'white', fontWeight: 600, fontSize: '0.8125rem',
            cursor: 'pointer', marginBottom: '0.75rem', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
        >
          🗺️ Abrir rota completa no Google Maps ({(route.stops || []).length} paradas)
        </button>
      )}

      {/* Botões de aceite/rejeição para rotas pendentes */}
      {route.status === 'PENDING' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => onAccept(route.id)}
            style={{
              flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
              border: 'none', background: '#16a34a', color: 'white',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            ✓ Aceitar Rota
          </button>
          <button
            onClick={() => onReject(route.id)}
            style={{
              flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
              border: '1px solid #ef4444', background: 'white', color: '#ef4444',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            ✕ Rejeitar
          </button>
        </div>
      )}

      {/* Lista de paradas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {route.stops?.map((stop, index) => (
          <StopItem
            key={stop.id}
            stop={stop}
            index={index}
            onDeliver={(s) => onDeliverStop(route.id, s)}
          />
        ))}
      </div>
    </div>
  );
};

export default RouteCard;
