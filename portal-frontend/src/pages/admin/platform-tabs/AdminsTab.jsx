import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Plus, Edit, Users } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast';
import TrashModal from '@/components/TrashModal';

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

const AdminsTab = ({ onEditUser }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    company_name: '',
    tenant_id: ''
  });

  useEffect(() => {
    loadAdmins();
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await api.get('/api/platform/tenants');
      setTenants(response.data.tenants || []);
    } catch (err) {
      console.error('Erro ao carregar tenants:', err);
    }
  };

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/platform/admins');
      setAdmins(response.data.admins || []);
    } catch (err) {
      console.error('Erro ao carregar admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const payload = { ...formData };
      if (payload.tenant_id) {
        payload.tenant_id = parseInt(payload.tenant_id);
      } else {
        delete payload.tenant_id;
      }
      await api.post('/api/platform/admins', payload);
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        company_name: '',
        tenant_id: ''
      });
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao criar admin', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!window.confirm(`Tem certeza que deseja excluir o admin "${adminName}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/platform/admins/${adminId}?force=true`);
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir admin', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
          Admins da Plataforma
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowTrash(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white', color: '#64748b',
              fontSize: '0.875rem', cursor: 'pointer'
            }}
          >
            <Trash2 size={18} /> Lixeira
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
              border: 'none', background: '#2563eb', color: 'white',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Plus size={18} /> Novo Admin
          </button>
        </div>
      </div>

      {admins.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '0.9375rem' }}>Nenhum admin cadastrado</p>
          <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            Clique em "Novo Admin" para começar
          </p>
        </div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Admin</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Empresa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Estab.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Entr.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Pedidos</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>
                        <p style={{ fontWeight: 500, color: '#1e293b' }}>
                          {admin.first_name} {admin.last_name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{admin.email}</p>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {admin.tenant_name || admin.company_name || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      {admin.establishments}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      {admin.drivers}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      {admin.orders_month}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: admin.status === 'ACTIVE' ? '#dcfce7' : '#fef2f2',
                        color: admin.status === 'ACTIVE' ? '#16a34a' : '#dc2626'
                      }}>
                        {admin.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => onEditUser(admin)}
                          style={{
                            padding: '0.375rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#2563eb'
                          }}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id, admin.first_name)}
                          style={{
                            padding: '0.375rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#dc2626'
                          }}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }}
            onClick={() => setShowCreateModal(false)}
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
                onClick={() => setShowCreateModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Vincular a Tenant Existente
                </label>
                <select
                  value={formData.tenant_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenant_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', background: 'white' }}
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
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Nome da Empresa (para novo tenant)
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Restaurante XYZ"
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                    Sobrenome
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Senha *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  required
                  minLength={6}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="(51) 99999-9999"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
      )}
      
      <TrashModal
        isOpen={showTrash}
        onClose={() => setShowTrash(false)}
        onRestore={loadAdmins}
        userType="ADMIN"
      />
    </div>
  );
};

export default AdminsTab;
