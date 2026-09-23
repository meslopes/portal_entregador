import { X } from 'lucide-react';

export default function SettingsModal({ timeInterval, onSelectInterval, onClose }) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999 }}
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-label="Configurações da Sidebar" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 100000
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Configurações da Sidebar</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Intervalo de Tempo (minutos)
            </label>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Mostra pedidos criados nos últimos X minutos
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[15, 30, 60, 120, 240].map(min => (
                <button
                  key={min}
                  onClick={() => onSelectInterval(min)}
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                    border: timeInterval === min ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: timeInterval === min ? '#eff6ff' : 'white',
                    color: timeInterval === min ? '#2563eb' : '#64748b',
                    fontSize: '0.8125rem', fontWeight: timeInterval === min ? 600 : 400,
                    cursor: 'pointer'
                  }}
                >
                  {min}min
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              Atual: {timeInterval} minutos ({timeInterval >= 60 ? `${Math.floor(timeInterval/60)}h` : `${timeInterval}min`})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
              border: 'none', background: '#2563eb', color: 'white',
              fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </>
  );
}
