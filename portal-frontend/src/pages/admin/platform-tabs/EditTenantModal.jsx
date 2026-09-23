import React from 'react';

const EditTenantModal = ({ editingTenant, tenantEditForm, tenantEditLoading, onClose, onSubmit, onFormChange }) => {
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
            Editar Tenant: {editingTenant.name}
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
              value={tenantEditForm.name}
              onChange={(e) => onFormChange(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Slug (identificador único)
            </label>
            <input
              type="text"
              value={tenantEditForm.slug}
              onChange={(e) => onFormChange(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Plano
            </label>
            <select
              value={tenantEditForm.plan}
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
                value={tenantEditForm.phone}
                onChange={(e) => onFormChange(prev => ({ ...prev, phone: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                CNPJ
              </label>
              <input
                type="text"
                value={tenantEditForm.cnpj}
                onChange={(e) => onFormChange(prev => ({ ...prev, cnpj: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Email
            </label>
            <input
              type="email"
              value={tenantEditForm.email}
              onChange={(e) => onFormChange(prev => ({ ...prev, email: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Cor Primária
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={tenantEditForm.primary_color}
                  onChange={(e) => onFormChange(prev => ({ ...prev, primary_color: e.target.value }))}
                  style={{ width: '40px', height: '36px', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={tenantEditForm.primary_color}
                  onChange={(e) => onFormChange(prev => ({ ...prev, primary_color: e.target.value }))}
                  style={{ flex: 1, padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Cor Secundária
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={tenantEditForm.secondary_color}
                  onChange={(e) => onFormChange(prev => ({ ...prev, secondary_color: e.target.value }))}
                  style={{ width: '40px', height: '36px', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={tenantEditForm.secondary_color}
                  onChange={(e) => onFormChange(prev => ({ ...prev, secondary_color: e.target.value }))}
                  style={{ flex: 1, padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={tenantEditLoading}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: tenantEditLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, opacity: tenantEditLoading ? 0.7 : 1 }}
            >
              {tenantEditLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EditTenantModal;
