import React from 'react';
import { Shield, RefreshCw, LogOut } from 'lucide-react';

const PlatformHeader = ({ user, onRefresh, onLogout }) => (
  <header style={{
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Shield size={24} style={{ color: '#2563eb' }} />
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
          muv.log Platform
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Painel de Controle da Plataforma
        </p>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
        {user?.email}
      </span>
      <button
        onClick={onRefresh}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          background: 'white',
          cursor: 'pointer',
          fontSize: '0.875rem',
          color: '#64748b'
        }}
      >
        <RefreshCw size={16} />
        Atualizar
      </button>
      <button
        onClick={onLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          background: 'white',
          cursor: 'pointer',
          fontSize: '0.875rem',
          color: '#64748b'
        }}
      >
        <LogOut size={16} />
        Sair
      </button>
    </div>
  </header>
);

export default PlatformHeader;
