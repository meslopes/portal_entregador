import React from 'react';

export const Modal = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
    <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
      {children}
    </div>
  </div>
);

export const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

export const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
};

export const btnPrimary = {
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
  border: 'none', background: '#2563eb', color: 'white',
  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
};

export const btnSecondary = {
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0', background: 'white',
  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569'
};

export const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'Pendente' },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito' },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando' },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto' },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'Coletado' },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelado' },
};
