import React from 'react';
import { CheckCircle } from 'lucide-react';

const ALL_STATUSES = ['ACCEPTED', 'PICKED_UP', 'DELIVERED'];
const STATUS_LABELS = { ACCEPTED: 'Aceito', PICKED_UP: 'Coletado', DELIVERED: 'Entregue' };

const DeliverySteps = ({ status }) => {
  const statusIndex = ALL_STATUSES.indexOf(status);

  return (
    <div style={{
      background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        {ALL_STATUSES.map((s, i) => {
          const isActive = status === s;
          const isPast = statusIndex > i;
          return (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1 }}>
              <div style={{
                width: '2rem', height: '2rem', borderRadius: '50%',
                background: isPast ? '#22c55e' : isActive ? '#3b82f6' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isPast || isActive ? 'white' : '#64748b', fontSize: '0.75rem', fontWeight: 600
              }}>
                {isPast ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: '0.625rem', color: isPast || isActive ? '#1e293b' : '#64748b', marginTop: '0.25rem', fontWeight: isActive ? 600 : 400 }}>
                {STATUS_LABELS[s]}
              </span>
            </div>
          );
        })}
        <div style={{ position: 'absolute', top: '1rem', left: '15%', right: '15%', height: '2px', background: '#e2e8f0', zIndex: 0 }}>
          <div style={{
            height: '100%', background: '#22c55e',
            width: status === 'ACCEPTED' ? '0%' : status === 'PICKED_UP' ? '50%' : '100%'
          }} />
        </div>
      </div>
    </div>
  );
};

export default DeliverySteps;
