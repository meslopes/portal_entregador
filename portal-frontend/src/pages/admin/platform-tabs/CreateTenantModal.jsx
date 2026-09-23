import React from 'react';

const CreateTenantModal = ({ tenantFormData, createTenantLoading, onClose, onSubmit, onFormChange }) => {
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
            Criar Novo Tenant
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
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Nome da Organização *
            </label>
            <input
              type="text"
              value={tenantFormData.name}
              onChange={(e) => onFormChange(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Entregas Porto Alegre"
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Slug (identificador único)
            </label>
            <input
              type="text"
              value={tenantFormData.slug}
              onChange={(e) => onFormChange(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              placeholder="entregas-porto-alegre"
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Deixe em branco para gerar automaticamente</p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Plano
            </label>
            <select
              value={tenantFormData.plan}
              onChange={(e) => onFormChange(prev => ({ ...prev, plan: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', background: 'white' }}
            >
              <option value="basic">Básico</option>
              <option value="premium">Premium</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Telefone
              </label>
              <input
                type="text"
                value={tenantFormData.phone}
                onChange={(e) => onFormChange(prev => ({ ...prev, phone: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                placeholder="(51) 99999-9999"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                CNPJ
              </label>
              <input
                type="text"
                value={tenantFormData.cnpj}
                onChange={(e) => onFormChange(prev => ({ ...prev, cnpj: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Email
            </label>
            <input
              type="email"
              value={tenantFormData.email}
              onChange={(e) => onFormChange(prev => ({ ...prev, email: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              placeholder="contato@empresa.com"
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
              disabled={createTenantLoading}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                border: 'none', background: createTenantLoading ? '#93c5fd' : '#2563eb',
                color: 'white', fontSize: '0.875rem', fontWeight: 600,
                cursor: createTenantLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {createTenantLoading ? 'Criando...' : 'Criar Tenant'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateTenantModal;
