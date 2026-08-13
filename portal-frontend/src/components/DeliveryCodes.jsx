import React from 'react';
import { Shield, Copy, CheckCircle } from 'lucide-react';

const DeliveryCodes = ({ pickupCode, deliveryCode }) => {
  const [copied, setCopied] = React.useState(null);

  if (!pickupCode && !deliveryCode) return null;

  const handleCopy = (code, type) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{
        fontSize: '0.6875rem', fontWeight: 600, color: '#64748b',
        marginBottom: '0.5rem', textTransform: 'uppercase',
        letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.375rem'
      }}>
        <Shield size={12} /> Códigos de Segurança
      </p>
      <div style={{
        background: '#fffbeb', borderRadius: '0.5rem', padding: '0.875rem',
        border: '1px solid #fde68a'
      }}>
        <p style={{ fontSize: '0.6875rem', color: '#92400e', marginBottom: '0.625rem' }}>
          Informe estes códigos ao entregador para confirmar coleta e entrega
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {pickupCode && (
            <CodeBox
              label="Coleta"
              code={pickupCode}
              copied={copied === 'pickup'}
              onCopy={() => handleCopy(pickupCode, 'pickup')}
            />
          )}
          {deliveryCode && (
            <CodeBox
              label="Entrega"
              code={deliveryCode}
              copied={copied === 'delivery'}
              onCopy={() => handleCopy(deliveryCode, 'delivery')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const CodeBox = ({ label, code, copied, onCopy }) => (
  <div style={{ flex: 1 }}>
    <p style={{ fontSize: '0.625rem', color: '#92400e', marginBottom: '0.25rem', fontWeight: 500 }}>{label}</p>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.375rem',
      background: 'white', borderRadius: '0.375rem', padding: '0.375rem 0.5rem',
      border: '1px solid #fde68a'
    }}>
      <span style={{
        fontSize: '1.125rem', fontWeight: 700, color: '#92400e',
        letterSpacing: '0.15em', fontFamily: 'monospace', flex: 1
      }}>
        {code}
      </span>
      <button
        onClick={onCopy}
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          color: copied ? '#22c55e' : '#92400e', padding: '0.25rem',
          display: 'flex', alignItems: 'center'
        }}
        title="Copiar código"
      >
        {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
      </button>
    </div>
  </div>
);

export default DeliveryCodes;
