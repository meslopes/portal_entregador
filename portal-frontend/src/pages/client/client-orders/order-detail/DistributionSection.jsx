import React from 'react';
import {
  CheckCircle, Bike, Users, Send, Loader2, AlertCircle
} from 'lucide-react';
import { InfoSection } from './OrderInfoSection';

// ── distribution section ─────────────────────────────────────────────────────

const DistributionSection = ({
  order,
  ownDrivers,
  selectedDriverId,
  setSelectedDriverId,
  assigning,
  callingPlatform,
  actionResult,
  handleAssignOwn,
  handleCallPlatform,
  hasOwnDriver,
  calledPlatform,
  isPending,
}) => {
  const isActiveStatus = ['PENDING', 'SCHEDULED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status);

  return (
    <>
      {/* Distribuição Híbrida */}
      {isActiveStatus && (
        <div id="distribuicao-section">
        <InfoSection title={order.driver || order.own_driver ? "Trocar Entregador" : "Distribuição do Pedido"}>
          {actionResult && (
            <div style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem',
              marginBottom: '0.75rem',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: actionResult.type === 'success' ? '#dcfce7' : actionResult.type === 'warning' ? '#fef3c7' : '#fef2f2',
              border: `1px solid ${actionResult.type === 'success' ? '#86efac' : actionResult.type === 'warning' ? '#fde68a' : '#fecaca'}`,
              color: actionResult.type === 'success' ? '#166534' : actionResult.type === 'warning' ? '#92400e' : '#dc2626'
            }}>
              {actionResult.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {actionResult.message}
            </div>
          )}

          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Entregador Próprio</p>
            {ownDrivers.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={selectedDriverId}
                  onChange={e => setSelectedDriverId(e.target.value)}
                  style={{
                    flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                    border: '1.5px solid #e2e8f0', fontSize: '0.8125rem',
                    outline: 'none', background: 'white', color: '#1e293b'
                  }}
                >
                  <option value="">Selecione um entregador...</option>
                  {ownDrivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.vehicle_type === 'MOTO' ? '🏍️' : d.vehicle_type === 'BIKE' ? '🚲' : '🚗'} {d.vehicle_plate || ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignOwn}
                  disabled={!selectedDriverId || assigning}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                    background: selectedDriverId && !assigning ? '#2563eb' : '#64748b',
                    color: 'white', cursor: selectedDriverId && !assigning ? 'pointer' : 'not-allowed',
                    fontSize: '0.8125rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {assigning ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Users size={14} />}
                  Atribuir
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '0.8125rem', color: '#64748b', padding: '0.5rem 0' }}>
                Nenhum entregador próprio online no momento.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>OU</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Plataforma</p>
            <button
              onClick={handleCallPlatform}
              disabled={callingPlatform}
              style={{
                width: '100%', padding: '0.625rem 1rem', borderRadius: '0.5rem',
                border: '1.5px solid #0d9488', background: 'white',
                color: '#0d9488', cursor: callingPlatform ? 'not-allowed' : 'pointer',
                fontSize: '0.8125rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {callingPlatform ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={14} />}
              Chamar Entregador da Plataforma
            </button>
          </div>
        </InfoSection>
        </div>
      )}

      {/* Info de distribuição para pedidos já atribuídos */}
      {!isPending && (hasOwnDriver || calledPlatform) && (
        <InfoSection title="Distribuição">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {hasOwnDriver ? (
              <>
                <Users size={14} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.8125rem', color: '#1e293b' }}>Atribuído a entregador próprio</span>
              </>
            ) : calledPlatform ? (
              <>
                <Bike size={14} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '0.8125rem', color: '#1e293b' }}>Distribuído pela plataforma</span>
              </>
            ) : null}
          </div>
        </InfoSection>
      )}
    </>
  );
};

export default DistributionSection;
