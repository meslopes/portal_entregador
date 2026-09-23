import React from 'react';

const PinMapModal = ({ pinLocation, mapContainerRef, onClose, onConfirm }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
    <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '700px', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Ajustar Local da Entrega</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>Arraste o pino para o local exato da entrega</p>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem' }}>✕</button>
      </div>
      <div ref={mapContainerRef} style={{ flex: 1, minHeight: '300px' }} />
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          {pinLocation ? `${pinLocation.lat.toFixed(6)}, ${pinLocation.lng.toFixed(6)}` : 'Arraste o pino'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#0d9488', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Confirmar Local
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default PinMapModal;
