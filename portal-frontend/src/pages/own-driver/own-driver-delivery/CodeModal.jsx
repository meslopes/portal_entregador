import React from 'react';

const CodeModal = ({ nextStatus, codeInput, onCodeChange, onConfirm, onClose, updating }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
        width: '100%', maxWidth: '360px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem', textAlign: 'center' }}>
          {nextStatus === 'PICKED_UP' ? 'Código de Coleta' : 'Código de Entrega'}
        </h3>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
          Peça o código ao {nextStatus === 'PICKED_UP' ? 'estabelecimento' : 'cliente'}
        </p>

        <input
          type="text"
          value={codeInput}
          onChange={e => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          inputMode="numeric"
          style={{
            width: '100%', padding: '1rem', borderRadius: '0.5rem',
            border: '2px solid #e2e8f0', fontSize: '2rem', textAlign: 'center',
            letterSpacing: '0.5rem', fontFamily: 'monospace', outline: 'none',
            boxSizing: 'border-box', marginBottom: '1rem'
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white', color: '#475569',
              fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={codeInput.length !== 6 || updating}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
              border: 'none', background: codeInput.length === 6 ? '#0d9488' : '#64748b',
              color: 'white', fontSize: '0.875rem', fontWeight: 600,
              cursor: codeInput.length === 6 ? 'pointer' : 'not-allowed'
            }}
          >
            {updating ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeModal;
