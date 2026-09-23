import React from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

const HeaderToolbar = ({
  squares,
  selectedSquareId,
  setSelectedSquareId,
  showSquareDropdown,
  setShowSquareDropdown,
  onCleanupTestData,
  onCopyJSON,
  onGeneratePDF,
  onRefresh,
  onDownloadBackup,
  onRestoreBackup,
}) => {
  const selectedSquareName = selectedSquareId === 'all'
    ? 'Todas as Praças'
    : squares.find(s => s.id === parseInt(selectedSquareId))?.name || 'Selecionar praça';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Mapa do Banco de Dados</h1>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Seletor de praça */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSquareDropdown(!showSquareDropdown)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white',
              cursor: 'pointer', fontSize: '0.8125rem', color: '#374151',
              minWidth: '160px'
            }}
          >
            <MapPin size={14} style={{ color: '#2563eb' }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{selectedSquareName}</span>
            <ChevronDown size={14} style={{ color: '#64748b', transform: showSquareDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>
          {showSquareDropdown && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowSquareDropdown(false)} />
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: '0.25rem',
                background: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0', zIndex: 9999, minWidth: '200px', maxHeight: '300px', overflow: 'auto'
              }}>
                <button
                  onClick={() => { setSelectedSquareId('all'); setShowSquareDropdown(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.625rem 0.75rem', border: 'none', cursor: 'pointer',
                    fontSize: '0.8125rem', fontWeight: selectedSquareId === 'all' ? 600 : 400,
                    background: selectedSquareId === 'all' ? '#eff6ff' : 'transparent',
                    color: selectedSquareId === 'all' ? '#2563eb' : '#374151'
                  }}
                >
                  <MapPin size={14} style={{ color: selectedSquareId === 'all' ? '#2563eb' : '#64748b' }} />
                  Todas as Praças
                </button>
                {squares.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSquareId(String(s.id)); setShowSquareDropdown(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.625rem 0.75rem', border: 'none', cursor: 'pointer',
                      fontSize: '0.8125rem', fontWeight: selectedSquareId === String(s.id) ? 600 : 400,
                      background: selectedSquareId === String(s.id) ? '#eff6ff' : 'transparent',
                      color: selectedSquareId === String(s.id) ? '#2563eb' : '#374151'
                    }}
                  >
                    <MapPin size={14} style={{ color: selectedSquareId === String(s.id) ? '#2563eb' : '#64748b' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p>{s.name}</p>
                      {s.city && <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{s.city}/{s.state}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={onCleanupTestData} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 600 }}>🧹 Limpar Testes</button>
        <button onClick={onCopyJSON} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#7c3aed', color: 'white', cursor: 'pointer', fontWeight: 600 }}>📋 Copiar JSON</button>
        <button onClick={onGeneratePDF} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#0d9488', color: 'white', cursor: 'pointer', fontWeight: 600 }}>📄 Gerar PDF</button>
        <button onClick={onRefresh} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Atualizar</button>
        <button onClick={onDownloadBackup} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontWeight: 600 }}>💾 Baixar Backup</button>
        <label style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#ea580c', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'inline-block' }}>
          📂 Restaurar Backup
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={onRestoreBackup} />
        </label>
      </div>
    </div>
  );
};

export default HeaderToolbar;
