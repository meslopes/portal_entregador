import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { showToast } from '@/components/Toast';
import { Loader2, AlertCircle } from 'lucide-react';
import PlatformHeader from './platform-tabs/PlatformHeader';
import PlatformStats from './platform-tabs/PlatformStats';
import PlatformAdmins from './platform-tabs/PlatformAdmins';
import AdminFormModal from './platform-tabs/AdminFormModal';

const EMPTY_FORM = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  company_name: ''
};

const PlatformDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, adminsRes] = await Promise.all([
        api.get('/api/platform/dashboard'),
        api.get('/api/platform/admins')
      ]);
      setDashboard(dashRes.data);
      setAdmins(adminsRes.data.admins || []);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      await api.post('/api/platform/admins', formData);
      setShowCreateModal(false);
      setFormData({ ...EMPTY_FORM });
      loadData();
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
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir admin', 'error');
    }
  };

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email || '',
      password: '',
      first_name: admin.first_name || '',
      last_name: admin.last_name || '',
      phone: admin.phone || '',
      company_name: admin.company_name || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const updateData = { ...formData };
      if (!updateData.password) delete updateData.password;
      await api.put(`/api/platform/admins/${editingAdmin.id}`, updateData);
      setShowEditModal(false);
      setEditingAdmin(null);
      setFormData({ ...EMPTY_FORM });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar admin', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/platform/login');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9'
      }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <PlatformHeader user={user} onRefresh={loadData} onLogout={handleLogout} />

      <div style={{ padding: '2rem' }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <PlatformStats dashboard={dashboard} />

        <PlatformAdmins
          admins={admins}
          onCreateClick={() => setShowCreateModal(true)}
          onEditAdmin={handleEditAdmin}
          onDeleteAdmin={handleDeleteAdmin}
        />
      </div>

      {showCreateModal && (
        <AdminFormModal
          isEdit={false}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateAdmin}
          onClose={() => setShowCreateModal(false)}
          loading={createLoading}
        />
      )}

      {showEditModal && editingAdmin && (
        <AdminFormModal
          isEdit={true}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdateAdmin}
          onClose={() => { setShowEditModal(false); setEditingAdmin(null); }}
          loading={createLoading}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PlatformDashboard;
