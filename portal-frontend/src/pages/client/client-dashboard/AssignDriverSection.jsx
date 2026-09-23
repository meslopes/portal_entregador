import React from 'react';
import { Bike } from 'lucide-react';

const AssignDriverSection = ({ ownDrivers, assigning, callingPlatform, onAssignOwn, onCallPlatform }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Atribuir Entregador</p>

    {/* Entregadores próprios */}
    {ownDrivers.filter(d => d.is_online).length > 0 && (
      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.5rem' }}>Entregadores Próprios Online:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ownDrivers.filter(d => d.is_online).map(driver => (
            <button
              key={driver.id}
              onClick={() => onAssignOwn(driver.id)}
              disabled={assigning}
              style={{
                padding: '0.75rem 1rem', borderRadius: '0.5rem',
                border: '1.5px solid #bbf7d0', background: '#f0fdf4',
                cursor: assigning ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: '0.875rem', opacity: assigning ? 0.7 : 1
              }}
            >
              <span style={{ fontWeight: 500, color: '#166534' }}>
                {driver.vehicle_type === 'MOTO' ? '🏍️' : driver.vehicle_type === 'BIKE' ? '🚲' : '🚗'} {driver.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Atribuir</span>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Chamar plataforma */}
    <button
      onClick={onCallPlatform}
      disabled={callingPlatform}
      style={{
        width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
        border: '1.5px solid #bfdbfe', background: '#eff6ff',
        cursor: callingPlatform ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem', fontWeight: 600, color: '#1e40af',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        opacity: callingPlatform ? 0.7 : 1
      }}
    >
      <Bike size={16} />
      {callingPlatform ? 'Chamando...' : 'Chamar Entregador da Plataforma'}
    </button>
  </div>
);

export default AssignDriverSection;
