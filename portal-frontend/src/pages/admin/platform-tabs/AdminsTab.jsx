import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ConfirmDialog.utils';
import { Loader2, Trash2, Plus } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';
import TrashModal from '@/components/TrashModal';
import AdminsTable from './AdminsTable';
import AdminFormModal from './AdminFormModal';
import InvitesSection from './InvitesSection';

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
    if (!(await confirmAsync(`Tem certeza que deseja excluir o admin "${adminName}"?`))) {
      return;
    }

    try {
      await api.delete(`/api/platform/admins/${adminId}?force=true`);
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir admin', 'error');
    }
  };

  // Aprova um admin pendente (libera o acesso) — só super admin pode
  const handleApproveAdmin = async (adminId, adminName) => {
    if (!(await confirmAsync(`Aprovar o admin "${adminName}" e liberar o acesso?`))) {
      return;
    }

    try {
      await api.post(`/api/admin/users/${adminId}/approve`);
      showToast('Admin aprovado com sucesso', 'success');
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao aprovar admin', 'error');
    }
  };

  // Rejeita um admin pendente (soft delete) — só super admin pode
  const handleRejectAdmin = async (adminId, adminName) => {
    if (!(await confirmAsync(`Rejeitar o cadastro do admin "${adminName}"? Esta ação não pode ser desfeita.`))) {
      return;
    }

    try {
      await api.post(`/api/admin/users/${adminId}/reject`);
      showToast('Cadastro rejeitado', 'success');
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao rejeitar admin', 'error');
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

      <AdminsTable
        admins={admins}
        onEditUser={onEditUser}
        onDeleteAdmin={handleDeleteAdmin}
        onApprove={handleApproveAdmin}
        onReject={handleRejectAdmin}
      />

      <InvitesSection />

      <AdminFormModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleCreateAdmin}
        createLoading={createLoading}
        tenants={tenants}
      />

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
