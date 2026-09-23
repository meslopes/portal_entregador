import React from 'react';
import { Camera } from 'lucide-react';

const DeliveryProof = ({ proofPhoto, onTakePhoto, onRemovePhoto }) => {
  return (
    <div style={{
      background: 'white', borderRadius: '0.75rem', padding: '1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem'
    }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
        Prova de Entrega (Opcional)
      </p>
      {proofPhoto ? (
        <div style={{ position: 'relative' }}>
          <img src={proofPhoto} alt="Prova" style={{ width: '100%', borderRadius: '0.5rem', maxHeight: '200px', objectFit: 'cover' }} />
          <button
            onClick={onRemovePhoto}
            style={{
              position: 'absolute', top: '0.5rem', right: '0.5rem',
              background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
              color: 'white', width: '2rem', height: '2rem', cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={onTakePhoto}
          style={{
            width: '100%', padding: '1.5rem', borderRadius: '0.5rem',
            border: '2px dashed #e2e8f0', background: '#f8fafc', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
            color: '#64748b'
          }}
        >
          <Camera size={24} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Tirar Foto</span>
        </button>
      )}
    </div>
  );
};

export default DeliveryProof;
