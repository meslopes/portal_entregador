import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

let toastId = 0;
let addToastFn = null;

export const showToast = (message, type = 'info', duration = 4000) => {
  if (addToastFn) {
    addToastFn(message, type, duration);
  }
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type, duration) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} />;
      case 'error': return <AlertCircle size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getColors = (type) => {
    switch (type) {
      case 'success': return { bg: '#dcfce7', border: '#86efac', color: '#166534' };
      case 'error': return { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' };
      default: return { bg: '#dbeafe', border: '#93c5fd', color: '#1d4ed8' };
    }
  };

  return (
    <div style={{
      position: 'fixed', top: '1rem', right: '1rem', zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
      maxWidth: '400px'
    }}>
      {toasts.map(toast => {
        const colors = getColors(toast.type);
        return (
          <div
            key={toast.id}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.color,
              padding: '0.875rem 1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'slideIn 0.3s ease-out',
              cursor: 'pointer'
            }}
            onClick={() => removeToast(toast.id)}
          >
            {getIcon(toast.type)}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <X size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
