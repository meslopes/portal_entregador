import React from 'react';
import { Package } from 'lucide-react';

const CodeModal = ({
  showCodeModal, codeInput, setCodeInput, pendingStatus, isUpdating,
  order, proofPhoto,
  onClose, onConfirm
}) => {
  if (!showCodeModal) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '1rem', padding: '2rem',
        maxWidth: '400px', width: '100%', textAlign: 'center'
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: pendingStatus === 'PICKED_UP' ? '#dbeafe' : '#dcfce7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem'
        }}>
          <Package size={32} style={{ color: pendingStatus === 'PICKED_UP' ? '#2563eb' : '#16a34a' }} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
          {pendingStatus === 'PICKED_UP' ? 'Código de Coleta' : 'Código de Entrega'}
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Peça o código ao {pendingStatus === 'PICKED_UP' ? 'estabelecimento' : 'cliente'}
        </p>

        {/* Input do codigo */}
        <input
          type="text"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          style={{
            width: '100%', padding: '1rem', borderRadius: '0.75rem',
            border: '2px solid #e2e8f0', fontSize: '1.5rem',
            textAlign: 'center', letterSpacing: '0.5rem',
            fontWeight: 700, outline: 'none',
            fontFamily: 'monospace'
          }}
          autoFocus
        />

        {/* Botoes */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white',
              color: '#64748b', cursor: 'pointer', fontSize: '0.875rem'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (codeInput.length === 6) {
                onConfirm(codeInput);
              }
            }}
            disabled={codeInput.length !== 6 || isUpdating}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
              border: 'none', background: codeInput.length === 6 ? '#2563eb' : '#94a3b8',
              color: 'white', cursor: codeInput.length === 6 ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem', fontWeight: 600
            }}
          >
            {isUpdating ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeModal;
