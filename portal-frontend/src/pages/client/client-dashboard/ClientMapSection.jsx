import React from 'react';
import { Navigation } from 'lucide-react';

const ClientMapSection = ({ mapRef, trackingDrivers, restaurantData, deliveryAddresses, mapInstanceRef, hasUserInteractedRef }) => {
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      hasUserInteractedRef.current = false;
      const bounds = [];
      if (restaurantData?.latitude && restaurantData?.longitude) bounds.push([restaurantData.latitude, restaurantData.longitude]);
      trackingDrivers.forEach(d => { if (d.latitude && d.longitude) bounds.push([d.latitude, d.longitude]); });
      deliveryAddresses.forEach(a => { if (a.latitude && a.longitude) bounds.push([a.latitude, a.longitude]); });
      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Navigation size={18} style={{ color: '#0d9488' }} />
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Entregas em Andamento</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{trackingDrivers.length} entregador(es) ativo(s)</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div ref={mapRef} style={{ height: '300px', background: '#e5e7eb' }} />
        {/* Botão Centralizar */}
        <button
          onClick={handleRecenter}
          style={{
            position: 'absolute', top: '0.5rem', right: '0.5rem',
            padding: '0.375rem 0.75rem', border: '1px solid #e2e8f0',
            borderRadius: '0.375rem', background: 'white', cursor: 'pointer',
            fontSize: '0.75rem', color: '#64748b',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 1000
          }}
        >
          <Navigation size={12} /> Centralizar
        </button>
      </div>
      {trackingDrivers.length === 0 && (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
          Nenhuma entrega em andamento no momento
        </div>
      )}
    </div>
  );
};

export default ClientMapSection;
