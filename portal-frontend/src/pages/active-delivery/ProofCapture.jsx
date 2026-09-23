import React from 'react';
import { Camera, Image, CheckCircle, X } from 'lucide-react';

const ProofCapture = ({
  showCamera, previewUrl, proofPhoto, isDelivered,
  videoRef, canvasRef, fileInputRef,
  onCloseCamera, onTakePhoto, onFileSelect, onConfirmPhoto, onRemoveProof, onSkipPhoto, onRetakePhoto
}) => {
  return (
    <>
      {/* Foto de prova preview */}
      {proofPhoto && !isDelivered && (
        <div style={{
          background: 'white', borderRadius: '0.75rem',
          padding: '1rem', marginBottom: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0 }}>
            <img src={proofPhoto} alt="Prova" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Prova de entrega</p>
            <p style={{ fontSize: '0.75rem', color: '#16a34a' }}>Foto capturada ✓</p>
          </div>
          <button onClick={onRemoveProof} aria-label="Remover foto" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Modal de Camera */}
      {showCamera && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'white', fontSize: '1.125rem', fontWeight: 600 }}>Prova de Entrega</h3>
              <button onClick={onCloseCamera} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'white' }}>
                <X size={24} />
              </button>
            </div>

            {/* Preview da foto */}
            {previewUrl ? (
              <div style={{ marginBottom: '1rem' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', borderRadius: '0.75rem', maxHeight: '60vh', objectFit: 'contain' }} />
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '0.75rem', background: '#000' }} />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Botoes */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              {!previewUrl ? (
                <>
                  <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: 'none', background: '#374151', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Image size={20} /> Galeria
                  </button>
                  <button onClick={onTakePhoto} style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Camera size={20} /> Tirar Foto
                  </button>
                </>
              ) : (
                <>
                  <button onClick={onRetakePhoto} style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: 'none', background: '#374151', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}>
                    Nova Foto
                  </button>
                  <button onClick={onConfirmPhoto} style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: 'none', background: '#22c55e', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} /> Confirmar
                  </button>
                </>
              )}
            </div>

            {/* Sem foto */}
            <button onClick={onSkipPhoto} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: '#9ca3af', fontSize: '0.8125rem', cursor: 'pointer', marginTop: '0.75rem' }}>
              Pular foto e entregar
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileSelect} />
        </div>
      )}
    </>
  );
};

export default ProofCapture;
