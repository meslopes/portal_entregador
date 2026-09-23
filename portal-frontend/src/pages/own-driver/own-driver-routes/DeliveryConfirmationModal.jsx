import React from 'react';
import { X, Shield, Camera, CheckCircle, Loader2 } from 'lucide-react';

const DeliveryConfirmationModal = ({
  deliveryModal,
  codeInput,
  onCodeInputChange,
  proofPhoto,
  onRemovePhoto,
  onTakePhoto,
  onConfirm,
  delivering,
  onClose,
}) => {
  if (!deliveryModal) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
            Concluir Entrega — Pedido #{deliveryModal.orderNumber}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Código de entrega (se configurado) */}
          {deliveryModal.deliveryCode && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Shield size={16} style={{ color: '#92400e' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>Código de Entrega</span>
              </div>
              <input
                type="text"
                placeholder="Informe o código do cliente"
                value={codeInput}
                onChange={e => onCodeInputChange(e.target.value)}
                maxLength={6}
                style={{
                  width: '100%', padding: '0.75rem', border: '1.5px solid #fde68a',
                  borderRadius: '0.5rem', fontSize: '1.25rem', textAlign: 'center',
                  fontFamily: 'monospace', letterSpacing: '0.3em', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Foto de prova de entrega */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>
              Foto de Prova (opcional)
            </span>
            {proofPhoto ? (
              <div style={{ position: 'relative' }}>
                <img src={proofPhoto} alt="Prova" style={{ width: '100%', borderRadius: '0.5rem', maxHeight: '200px', objectFit: 'cover' }} />
                <button
                  onClick={onRemovePhoto}
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={14} color="white" />
                </button>
              </div>
            ) : (
              <button
                onClick={onTakePhoto}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                  border: '1.5px dashed #cbd5e1', background: '#f8fafc',
                  color: '#64748b', cursor: 'pointer', fontSize: '0.8125rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <Camera size={16} /> Tirar Foto
              </button>
            )}
          </div>

          {/* Botão confirmar */}
          <button
            onClick={onConfirm}
            disabled={delivering}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
              border: 'none', background: delivering ? '#94a3b8' : '#16a34a',
              color: 'white', cursor: delivering ? 'not-allowed' : 'pointer',
              fontSize: '0.9375rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            {delivering ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={16} />}
            {delivering ? 'Confirmando...' : 'Confirmar Entrega'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryConfirmationModal;
