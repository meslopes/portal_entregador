import React from 'react';

const UserEditModal = ({ userEditForm, userEditLoading, tenants, onClose, onSubmit, onFormChange }) => {
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
            Editar Usuário
          </h2>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Nome</label>
              <input
                type="text"
                value={userEditForm.first_name}
                onChange={(e) => onFormChange(prev => ({ ...prev, first_name: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Sobrenome</label>
              <input
                type="text"
                value={userEditForm.last_name}
                onChange={(e) => onFormChange(prev => ({ ...prev, last_name: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Email</label>
            <input
              type="email"
              value={userEditForm.email}
              onChange={(e) => onFormChange(prev => ({ ...prev, email: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Telefone</label>
            <input
              type="text"
              value={userEditForm.phone}
              onChange={(e) => onFormChange(prev => ({ ...prev, phone: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              placeholder="(51) 99999-9999"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Status</label>
              <select
                value={userEditForm.status}
                onChange={(e) => onFormChange(prev => ({ ...prev, status: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', background: 'white' }}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="SUSPENDED">Suspenso</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Tenant</label>
              <select
                value={userEditForm.tenant_id}
                onChange={(e) => onFormChange(prev => ({ ...prev, tenant_id: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', background: 'white' }}
              >
                <option value="">Plataforma (sem tenant)</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Nova Senha <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(deixe vazio para manter)</span>
            </label>
            <input
              type="password"
              value={userEditForm.password}
              onChange={(e) => onFormChange(prev => ({ ...prev, password: e.target.value }))}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Deixe vazio para manter a senha atual"
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
              disabled={userEditLoading}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                border: 'none', background: userEditLoading ? '#93c5fd' : '#2563eb',
                color: 'white', fontSize: '0.875rem', fontWeight: 600,
                cursor: userEditLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {userEditLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default UserEditModal;
