import React from 'react';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';

// Spinner de carregamento
export const LoadingSpinner = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{
      width: '3rem', height: '3rem',
      border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite'
    }} />
  </div>
);

// Alerta de erro
export const ErrorAlert = ({ error }) => {
  if (!error) return null;
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca',
      color: '#dc2626', padding: '0.75rem 1rem',
      borderRadius: '0.5rem', marginBottom: '1.5rem',
      display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
    }}>
      <AlertCircle size={16} /> {error}
    </div>
  );
};

// Botão principal de ação (Coletar/Entregar)
export const ActionButton = ({ action, isUpdating, onClick }) => {
  if (!action) return null;
  return (
    <button
      onClick={onClick}
      disabled={isUpdating}
      style={{
        width: '100%',
        padding: '1rem 1.5rem',
        borderRadius: '0.75rem',
        border: 'none',
        background: action.color,
        color: 'white',
        fontSize: '1.0625rem',
        fontWeight: 700,
        cursor: isUpdating ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        transition: 'all 0.15s',
        opacity: isUpdating ? 0.7 : 1,
        boxShadow: `0 4px 14px ${action.color}40`
      }}
    >
      {isUpdating ? (
        <>
          <div style={{
            width: '1.25rem', height: '1.25rem',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }} />
          Atualizando...
        </>
      ) : (
        <>
          {action.label}
          <ArrowRight size={20} />
        </>
      )}
    </button>
  );
};

// Mensagem de espera (status ACCEPTED)
export const WaitingMessage = ({ status }) => {
  if (status !== 'ACCEPTED') return null;
  return (
    <div style={{
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: '0.5rem',
      padding: '0.875rem 1rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem',
      color: '#92400e'
    }}>
      <Clock size={16} /> Aguardando restaurante iniciar preparo do pedido...
    </div>
  );
};
