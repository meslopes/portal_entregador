import React from 'react';
import { PAYMENT_TYPES, inputStyle, labelStyle } from './constants';

const PaymentConfigForm = ({ configForm, onConfigFormChange, onSave }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
      Configuração de Pagamento
    </h2>

    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
        Defina como seus entregadores próprios serão pagos por cada entrega.
      </p>
    </div>

    {/* Tipos de Pagamento */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {Object.entries(PAYMENT_TYPES).map(([key, type]) => (
        <div
          key={key}
          onClick={() => onConfigFormChange({ ...configForm, payment_type: key })}
          style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            border: `2px solid ${configForm.payment_type === key ? '#2563eb' : '#e2e8f0'}`,
            background: configForm.payment_type === key ? '#eff6ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{type.icon}</div>
          <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{type.label}</p>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{type.description}</p>
        </div>
      ))}
    </div>

    {/* Valores */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      {(configForm.payment_type === 'PER_DELIVERY' || configForm.payment_type === 'DAILY' || configForm.payment_type === 'FIXED' || configForm.payment_type === 'FIXED_PLUS_DELIVERY' || configForm.payment_type === 'FIXED_UP_TO_PLUS_DELIVERY') && (
        <div>
          <label style={labelStyle}>Valor Fixo (R$)</label>
          <input
            type="number"
            step="0.01"
            value={configForm.fixed_value}
            onChange={e => onConfigFormChange({ ...configForm, fixed_value: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </div>
      )}
      {configForm.payment_type === 'PER_KM' && (
        <div>
          <label style={labelStyle}>Valor por Km (R$)</label>
          <input
            type="number"
            step="0.01"
            value={configForm.km_value}
            onChange={e => onConfigFormChange({ ...configForm, km_value: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </div>
      )}
      {configForm.payment_type === 'PERCENTAGE' && (
        <div>
          <label style={labelStyle}>Percentual (%)</label>
          <input
            type="number"
            step="1"
            value={configForm.percentage}
            onChange={e => onConfigFormChange({ ...configForm, percentage: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </div>
      )}
      {(configForm.payment_type === 'FIXED_PLUS_DELIVERY' || configForm.payment_type === 'FIXED_UP_TO_PLUS_DELIVERY') && (
        <div>
          <label style={labelStyle}>Valor por Entrega Extra (R$)</label>
          <input
            type="number"
            step="0.01"
            value={configForm.delivery_value}
            onChange={e => onConfigFormChange({ ...configForm, delivery_value: parseFloat(e.target.value) })}
            style={inputStyle}
          />
        </div>
      )}
      {configForm.payment_type === 'FIXED_UP_TO_PLUS_DELIVERY' && (
        <div>
          <label style={labelStyle}>Máx. Entregas Incluídas</label>
          <input
            type="number"
            step="1"
            value={configForm.max_deliveries}
            onChange={e => onConfigFormChange({ ...configForm, max_deliveries: parseInt(e.target.value) })}
            style={inputStyle}
          />
        </div>
      )}
    </div>

    {/* Botão Salvar */}
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <button
        onClick={onSave}
        style={{ padding: '0.75rem 2rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
      >
        Salvar Configuração
      </button>
    </div>
  </div>
);

export default PaymentConfigForm;
