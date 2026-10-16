import React from 'react';
import { RefreshCw } from 'lucide-react';

const PlatformHeader = ({ onRefresh, refreshing = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
        Painel da Plataforma
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
        Gerencie todos os tenants e monitore o sistema
      </p>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <a
        href="/admin/database-map"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', borderRadius: '0.5rem',
          border: '1px solid #e2e8f0', background: 'white',
          cursor: 'pointer', fontSize: '0.875rem', color: '#64748b',
          textDecoration: 'none'
        }}
      >
        🗺️ Mapa do Banco
      </a>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', borderRadius: '0.5rem',
          border: '1px solid #e2e8f0', background: 'white',
          cursor: refreshing ? 'wait' : 'pointer', fontSize: '0.875rem',
          color: refreshing ? '#94a3b8' : '#64748b',
          opacity: refreshing ? 0.7 : 1
        }}
      >
        <RefreshCw
          size={16}
          style={refreshing ? { animation: 'spin 0.8s linear infinite' } : undefined}
        />
        {refreshing ? 'Atualizando…' : 'Atualizar'}
      </button>
    </div>
  </div>
);

export default PlatformHeader;
