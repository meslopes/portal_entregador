import React from 'react';
import { Route, ArrowLeft, Bell } from 'lucide-react';

const PageHeader = ({ pendingCount, onBack }) => (
  <header style={{
    background: pendingCount > 0
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
    transition: 'background 0.3s'
  }}>
    <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
      <ArrowLeft size={24} />
    </button>
    <Route size={20} />
    <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Minhas Rotas</h1>
    {pendingCount > 0 && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginLeft: 'auto', padding: '0.375rem 0.75rem',
        borderRadius: '9999px', background: 'rgba(255,255,255,0.25)',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}>
        <Bell size={16} style={{ animation: 'ring 0.5s ease-in-out' }} />
        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
          {pendingCount} rota{pendingCount > 1 ? 's' : ''} aguardando
        </span>
      </div>
    )}
  </header>
);

export default PageHeader;
