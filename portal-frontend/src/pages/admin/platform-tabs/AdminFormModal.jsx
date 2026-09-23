import React from 'react';

const AdminFormModal = ({ show, onClose, formData, onFormChange, onSubmit, createLoading, tenants }) => {
  if (!show) return null;

  const handleChange = (field) => (e) => {
    onFormChange(prev => ({ ...prev, [field]: e.target.value }));
  };

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
    border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem'
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '500px',
        maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 100000
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
            Criar Novo Admin
          </h2>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Vincular a Tenant Existente
            </label>
            <select
              value={formData.tenant_id}
              onChange={handleChange('tenant_id')}
              style={{ ...inputStyle, background: 'white' }}
            >
              <option value="">Criar novo tenant (preencha abaixo)</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Selecione um tenant existente ou deixe em branco para criar um novo</p>
          </div>

          {!formData.tenant_id && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
                Nome da Empresa (para novo tenant)
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={handleChange('company_name')}
                style={inputStyle}
                placeholder="Restaurante XYZ"
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>
                Nome *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={handleChange('first_name')}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>
                Sobrenome
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={handleChange('last_name')}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              Senha *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              style={inputStyle}
              required
              minLength={6}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>
              Telefone
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={handleChange('phone')}
              style={inputStyle}
              placeholder="(51) 99999-9999"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                border: '1px solid #e2e8f0', background: 'white',
                fontSize: '0.875rem', cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createLoading}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                border: 'none', background: createLoading ? '#93c5fd' : '#2563eb',
                color: 'white', fontSize: '0.875rem', fontWeight: 600,
                cursor: createLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {createLoading ? 'Criando...' : 'Criar Admin'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AdminFormModal;
