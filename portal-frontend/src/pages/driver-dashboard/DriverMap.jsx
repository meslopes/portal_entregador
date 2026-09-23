import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

const DriverMap = ({ location, currentOrder, getCurrentLocation }) => {
  if (!location) return null;

  return (
    <>
      {/* Mapa */}
      <div style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>Minha Localização</span>
          </div>
          {currentOrder?.delivery_address?.latitude && (
            <button
              onClick={() => {
                const lat = currentOrder.delivery_address.latitude;
                const lng = currentOrder.delivery_address.longitude;
                const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                if (isMobile) {
                  const useWaze = window.confirm('Abrir no Waze?\n\nCancelar = Google Maps');
                  if (useWaze) {
                    window.open(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
                  } else {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                  }
                } else {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.375rem 0.75rem', borderRadius: '0.5rem',
                border: 'none', background: '#2563eb', color: 'white',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
              }}
            >
              <Navigation size={14} /> Navegar
            </button>
          )}
        </div>
        <div id="driver-map" style={{ height: '250px', width: '100%' }} />
      </div>

      {/* Localização */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <MapPin size={16} style={{ color: '#22c55e' }} />
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            {(location.latitude || 0).toFixed(5)}, {(location.longitude || 0).toFixed(5)}
          </span>
        </div>
        <button
          onClick={getCurrentLocation}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#64748b',
            fontSize: '0.8125rem',
            cursor: 'pointer'
          }}
        >
          <Navigation size={14} /> Atualizar
        </button>
      </div>
    </>
  );
};

export default DriverMap;
