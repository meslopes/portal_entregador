import React from 'react';
import { AlertCircle, X } from 'lucide-react';

let confirmFn = null;

export const showConfirm = (message, onConfirm, title = 'Confirmação') => {
  if (confirmFn) {
    confirmFn(message, onConfirm, title);
  }
};

const ConfirmDialog = ({ message, onConfirm, onCancel, title }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} style={{ color: '#f59e0b' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{title}</h2>
          </div>
          <button onClick={onCancel} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.5' }}>{message}</p>
        </div>
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9',
          display: 'flex', gap: '0.75rem', justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
              border: '1.5px solid #e2e8f0', background: 'white',
              fontSize: '0.875rem', cursor: 'pointer', color: '#64748b'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
              border: 'none', background: '#dc2626',
              color: 'white', fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmDialogContainer = () => {
  const [dialog, setDialog] = React.useState(null);

  React.useEffect(() => {
    confirmFn = (message, onConfirm, title) => {
      setDialog({ message, onConfirm, title });
    };
    return () => { confirmFn = null; };
  }, []);

  if (!dialog) return null;

  return (
    <ConfirmDialog
      message={dialog.message}
      title={dialog.title}
      onConfirm={() => {
        dialog.onConfirm();
        setDialog(null);
      }}
      onCancel={() => setDialog(null)}
    />
  );
};

export default ConfirmDialogContainer;
