import React from 'react';
import { Package, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const AvailableEmptyState = ({ onRetry }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
      <Package size={32} style={{ color: '#64748b' }} />
    </div>
    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Nenhum pedido disponível</h3>
    <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
      Não há pedidos disponíveis no momento. Você será notificado quando um novo pedido chegar.
    </p>
    <button onClick={onRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}>
      <RefreshCw size={16} /> Verificar Novamente
    </button>
  </div>
);

const ActiveEmptyState = () => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
      <CheckCircle size={32} style={{ color: '#22c55e' }} />
    </div>
    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Nenhum pedido em andamento</h3>
    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
      Aceite pedidos disponíveis para começar a entregar.
    </p>
  </div>
);

const ErrorBanner = ({ message }) => (
  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
    <AlertCircle size={16} /> {message}
  </div>
);

export { AvailableEmptyState, ActiveEmptyState, ErrorBanner };
