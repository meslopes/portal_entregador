import React from 'react';

const RouteMapView = ({ mapCallbackRef }) => {
  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div ref={mapCallbackRef} style={{ height: '500px', background: '#e5e7eb' }} />
    </div>
  );
};

export default RouteMapView;
