import React from 'react';
import { X } from 'lucide-react';

const MoveOrderModal = ({
  movingStop,
  routes,
  targetRouteId,
  onTargetChange,
  onMove,
  onClose,
}) => {
  if (!movingStop) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Mover Pedido</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
            Mover pedido <strong>#{movingStop.order_number}</strong> para outra rota:
          </p>
          <select
            value={targetRouteId}
            onChange={e => onTargetChange(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', marginBottom: '1rem' }}
          >
            <option value="">Selecionar rota de destino...</option>
            {routes.filter(r => r.id !== movingStop.route_id && r.status !== 'COMPLETED').map(r => (
              <option key={r.id} value={r.id}>Rota #{r.id} - {r.driver_name || 'Sem entregador'} ({r.stops_count} paradas)</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button
              onClick={onMove}
              disabled={!targetRouteId}
              style={{
                padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none',
                background: targetRouteId ? '#2563eb' : '#94a3b8',
                color: 'white', fontSize: '0.875rem', fontWeight: 600,
                cursor: targetRouteId ? 'pointer' : 'not-allowed'
              }}
            >
              Mover Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoveOrderModal;
