import React from 'react';
import { Package, MapPin, CheckCircle } from 'lucide-react';

const getStopIcon = (stop) => {
  if (stop.status === 'COMPLETED') return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
  if (stop.stop_type === 'PICKUP') return <Package size={16} style={{ color: '#f59e0b' }} />;
  return <MapPin size={16} style={{ color: '#2563eb' }} />;
};

const getStopLabel = (stop) => {
  if (stop.stop_type === 'PICKUP') return 'Coleta';
  return 'Entrega';
};

const PendingRouteCard = ({ route, onAccept, onReject }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Rota #{route.id}</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{route.stops_count} paradas</p>
        </div>
        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
          Aguardando
        </span>
      </div>

      {/* Preview das paradas */}
      <div style={{ marginBottom: '0.75rem' }}>
        {route.stops?.slice(0, 3).map((stop) => (
          <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.8125rem', color: '#64748b' }}>
            {getStopIcon(stop)}
            <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.25rem', borderRadius: '4px', background: stop.stop_type === 'PICKUP' ? '#fef3c7' : '#dbeafe', color: stop.stop_type === 'PICKUP' ? '#92400e' : '#1d4ed8' }}>
              {getStopLabel(stop)}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stop.address}</span>
          </div>
        ))}
        {route.stops?.length > 3 && (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0.25rem 0' }}>+{route.stops.length - 3} mais paradas</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => onAccept(route.id)}
          style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Aceitar Rota
        </button>
        <button
          onClick={() => onReject(route.id)}
          style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Rejeitar
        </button>
      </div>
    </div>
  </div>
);

export default PendingRouteCard;
