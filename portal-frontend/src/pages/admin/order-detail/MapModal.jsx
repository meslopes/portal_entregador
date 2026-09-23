import React from 'react';

const MapModal = ({ order, mapRef, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
    <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '800px', height: '80vh', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Pedido #{order?.order_number} - Mapa</h2>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem' }}>✕</button>
      </div>
      <div ref={mapRef} style={{ flex: 1, minHeight: '400px' }} />
    </div>
  </div>
);

export default MapModal;
