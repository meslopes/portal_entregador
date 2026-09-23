import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';

const PendingRoutesBanner = ({ pendingRoutes, onClick }) => {
  // Inject keyframe animations on mount
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.querySelector('#own-driver-animations')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'own-driver-animations';
      styleSheet.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes ring {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  if (!pendingRoutes || pendingRoutes <= 0) return null;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: 'white', padding: '0.875rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        cursor: 'pointer', animation: 'pulse 1.5s ease-in-out infinite'
      }}
    >
      <Bell size={20} style={{ animation: 'ring 0.5s ease-in-out' }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {pendingRoutes} rota{pendingRoutes > 1 ? 's' : ''} aguardando aceite!
        </p>
        <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>Toque para ver e aceitar</p>
      </div>
      <span style={{ fontSize: '1.25rem' }}>→</span>
    </div>
  );
};

export default PendingRoutesBanner;
