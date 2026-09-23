import React from 'react';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  background: 'white',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  width: '100%',
  maxWidth: '500px',
  maxHeight: '90vh',
  overflow: 'auto',
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.375rem',
};

const CreateSubscriptionModal = ({
  isOpen,
  onClose,
  onSubmit,
  createForm,
  setCreateForm,
  restaurants,
}) => {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
            Nova Assinatura
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Estabelecimento *</label>
            <select
              value={createForm.restaurant_id}
              onChange={(e) => setCreateForm({ ...createForm, restaurant_id: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">Selecione...</option>
              {restaurants
                .filter((r) => r.has_own_drivers)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Ciclo de Cobrança</label>
            <select
              value={createForm.billing_cycle}
              onChange={(e) => setCreateForm({ ...createForm, billing_cycle: e.target.value })}
              style={inputStyle}
            >
              <option value="WEEKLY">📆 Semanal</option>
              <option value="MONTHLY">🗓️ Mensal</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Preço por Entregador (R$)</label>
            <input
              type="number"
              step="0.01"
              value={createForm.price_per_driver}
              onChange={(e) =>
                setCreateForm({ ...createForm, price_per_driver: parseFloat(e.target.value) })
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>
              Preço Fixo por Estabelecimento (R${' '}
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(opcional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={createForm.fixed_price}
              onChange={(e) =>
                setCreateForm({ ...createForm, fixed_price: parseFloat(e.target.value) || 0 })
              }
              style={inputStyle}
            />
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Valor fixo cobrado por ciclo, independente da quantidade de entregadores
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1.5px solid #e2e8f0',
                background: 'white',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#2563eb',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Criar Assinatura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSubscriptionModal;
