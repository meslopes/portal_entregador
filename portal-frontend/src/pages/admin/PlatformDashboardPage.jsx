import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Loader2, RefreshCw,
  BarChart3, Shield
} from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast';
import {
  OverviewTab, TenantsTab, UsersTab, PendingTab, AdminsTab,
  TenantDetailModal, CreateTenantModal, EditTenantModal, UserEditModal
} from './platform-tabs';

const PlatformDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [createTenantLoading, setCreateTenantLoading] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '', slug: '', plan: 'basic', phone: '', email: '', cnpj: '' });
  const [editingTenant, setEditingTenant] = useState(null);
  const [tenantEditForm, setTenantEditForm] = useState({ name: '', slug: '', plan: 'basic', phone: '', email: '', cnpj: '', primary_color: '#2563eb', secondary_color: '#1e40af' });
  const [tenantEditLoading, setTenantEditLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [squares, setSquares] = useState([]);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userEditForm, setUserEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '', status: 'ACTIVE', tenant_id: '', password: '' });
  const [userEditLoading, setUserEditLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadDashboard();
    loadTenants();
    loadPendingUsers();
    loadSquares();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
    if (activeTab === 'pending') {
      loadPendingUsers();
    }
    if (activeTab === 'overview') {
      loadDashboard();
    }
    if (activeTab === 'tenants') {
      loadTenants();
    }
  }, [activeTab, selectedTenantFilter]);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/api/platform/dashboard');
      setDashboard(response.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await api.get('/api/platform/tenants');
      setTenants(response.data.tenants || []);
    } catch (err) {
      console.error('Erro ao carregar tenants:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      let url = '/api/platform/users';
      if (selectedTenantFilter) {
        url += `?tenant_id=${selectedTenantFilter}`;
      }
      const response = await api.get(url);
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadPendingUsers = async () => {
    try {
      setPendingLoading(true);
      const response = await api.get('/api/admin/pending-users');
      setPendingUsers(response.data.users || []);
    } catch (err) {
      console.error('Erro ao carregar pendentes:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  const loadSquares = async () => {
    try {
      const response = await api.get('/api/admin/squares');
      setSquares(response.data.squares || []);
    } catch (err) {
      console.error('Erro ao carregar praças:', err);
    }
  };

  const handleApprove = async (userId, squareId = null, tenantId = null) => {
    try {
      const data = {};
      if (squareId) data.square_id = squareId;
      if (tenantId) data.tenant_id = tenantId;
      await api.post(`/api/admin/users/${userId}/approve`, data);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      loadDashboard();
      loadUsers();
    } catch (err) {
      showToast('Erro ao aprovar: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Rejeitar e excluir este cadastro?')) return;
    try {
      await api.post(`/api/admin/users/${userId}/reject`);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      loadDashboard();
    } catch (err) {
      showToast('Erro ao rejeitar: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleToggleTenant = async (tenantId) => {
    try {
      await api.post(`/api/platform/tenants/${tenantId}/toggle`);
      loadTenants();
      loadDashboard();
    } catch (err) {
      showToast('Erro ao alterar status do tenant', 'error');
    }
  };

  const handleViewTenant = async (tenantId) => {
    try {
      const response = await api.get(`/api/platform/tenants/${tenantId}`);
      setSelectedTenant(response.data.tenant);
      setShowTenantModal(true);
    } catch (err) {
      showToast('Erro ao carregar detalhes do tenant', 'error');
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setCreateTenantLoading(true);
    try {
      await api.post('/api/platform/tenants', tenantFormData);
      setShowCreateTenantModal(false);
      setTenantFormData({ name: '', slug: '', plan: 'basic', phone: '', email: '', cnpj: '' });
      loadTenants();
      loadDashboard();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao criar tenant', 'error');
    } finally {
      setCreateTenantLoading(false);
    }
  };

  const handleEditTenant = (tenant) => {
    setEditingTenant(tenant);
    setTenantEditForm({
      name: tenant.name || '',
      slug: tenant.slug || '',
      plan: tenant.plan || 'basic',
      phone: tenant.phone || '',
      email: tenant.email || '',
      cnpj: tenant.cnpj || '',
      primary_color: tenant.primary_color || '#2563eb',
      secondary_color: tenant.secondary_color || '#1e40af'
    });
    setShowTenantModal(false);
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;
    setTenantEditLoading(true);
    try {
      await api.put(`/api/platform/tenants/${editingTenant.id}`, tenantEditForm);
      showToast('Tenant atualizado com sucesso!', 'success');
      setEditingTenant(null);
      loadTenants();
      loadDashboard();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar tenant', 'error');
    } finally {
      setTenantEditLoading(false);
    }
  };

  const handleDeleteTenant = async (tenant) => {
    const dadosVinculados = [];
    if (tenant.drivers_count > 0) dadosVinculados.push(`${tenant.drivers_count} entregador(es)`);
    if (tenant.restaurants_count > 0) dadosVinculados.push(`${tenant.restaurants_count} estabelecimento(s)`);
    if (tenant.orders_count > 0) dadosVinculados.push(`${tenant.orders_count} pedido(s)`);
    if (tenant.users?.length > 0) dadosVinculados.push(`${tenant.users.length} usuário(s)`);

    let mensagem = `Tem certeza que deseja excluir o tenant "${tenant.name}"?`;
    if (dadosVinculados.length > 0) {
      mensagem += `\n\nATENÇÃO: Este tenant possui ${dadosVinculados.join(', ')} vinculados.`;
      mensagem += `\nTodos os dados serão excluídos permanentemente.`;
    }

    if (!window.confirm(mensagem)) return;

    try {
      const force = dadosVinculados.length > 0 ? '?force=true' : '';
      await api.delete(`/api/platform/tenants/${tenant.id}${force}`);
      showToast('Tenant excluído com sucesso!', 'success');
      setShowTenantModal(false);
      setSelectedTenant(null);
      loadTenants();
      loadDashboard();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir tenant', 'error');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      status: user.status || 'ACTIVE',
      tenant_id: user.tenant_id || '',
      password: ''
    });
    setShowUserEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setUserEditLoading(true);
    try {
      const payload = { ...userEditForm };
      if (!payload.password) delete payload.password;
      if (payload.tenant_id) payload.tenant_id = parseInt(payload.tenant_id);
      else payload.tenant_id = null;
      await api.put(`/api/platform/users/${editingUser.id}`, payload);
      setShowUserEditModal(false);
      setEditingUser(null);
      loadUsers();
      showToast('Usuário atualizado com sucesso!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar usuário', 'error');
    } finally {
      setUserEditLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) return;
    try {
      await api.delete(`/api/platform/users/${userId}`);
      loadUsers();
      loadDashboard();
      showToast('Usuário excluído com sucesso!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir usuário', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Painel da Plataforma
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Gerencie todos os tenants e monitore o sistema
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href="/admin/database-map"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white',
              cursor: 'pointer', fontSize: '0.875rem', color: '#64748b',
              textDecoration: 'none'
            }}
          >
            🗺️ Mapa do Banco
          </a>
          <button
            onClick={() => { loadDashboard(); loadTenants(); loadPendingUsers(); loadUsers(); setRefreshKey(k => k + 1); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white',
              cursor: 'pointer', fontSize: '0.875rem', color: '#64748b'
            }}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {[
          { key: 'overview', label: 'Visão Geral', icon: BarChart3 },
          { key: 'tenants', label: 'Tenants', icon: Building2 },
          { key: 'users', label: 'Usuários', icon: Users },
          { key: 'admins', label: 'Admins', icon: Shield },
          { key: 'pending', label: 'Pendentes', icon: Users }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              border: 'none', background: activeTab === tab.key ? '#eff6ff' : 'transparent',
              color: activeTab === tab.key ? '#2563eb' : '#64748b',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: activeTab === tab.key ? 600 : 400
            }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboard && (
        <OverviewTab dashboard={dashboard} />
      )}

      {/* Tenants Tab */}
      {activeTab === 'tenants' && (
        <TenantsTab tenants={tenants} onCreateTenant={() => setShowCreateTenantModal(true)} onToggleTenant={handleToggleTenant} onViewTenant={handleViewTenant} />
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <UsersTab users={users} usersLoading={usersLoading} tenants={tenants} selectedTenantFilter={selectedTenantFilter} onFilterChange={setSelectedTenantFilter} onRefresh={loadUsers} onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} />
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <AdminsTab key={refreshKey} onEditUser={handleEditUser} />
      )}

      {/* Pending Users Tab */}
      {activeTab === 'pending' && (
        <PendingTab pendingUsers={pendingUsers} pendingLoading={pendingLoading} onRefresh={loadPendingUsers} onApprove={handleApprove} onReject={handleReject} />
      )}

      {/* Tenant Details Modal */}
      {showTenantModal && selectedTenant && (
        <TenantDetailModal
          selectedTenant={selectedTenant}
          onClose={() => { setShowTenantModal(false); setSelectedTenant(null); }}
          onEdit={handleEditTenant}
          onDelete={handleDeleteTenant}
        />
      )}

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <EditTenantModal
          editingTenant={editingTenant}
          tenantEditForm={tenantEditForm}
          tenantEditLoading={tenantEditLoading}
          onClose={() => setEditingTenant(null)}
          onSubmit={handleUpdateTenant}
          onFormChange={setTenantEditForm}
        />
      )}

      {/* Create Tenant Modal */}
      {showCreateTenantModal && (
        <CreateTenantModal
          tenantFormData={tenantFormData}
          createTenantLoading={createTenantLoading}
          onClose={() => setShowCreateTenantModal(false)}
          onSubmit={handleCreateTenant}
          onFormChange={setTenantFormData}
        />
      )}

      {/* User Edit Modal */}
      {showUserEditModal && editingUser && (
        <UserEditModal
          userEditForm={userEditForm}
          userEditLoading={userEditLoading}
          tenants={tenants}
          onClose={() => { setShowUserEditModal(false); setEditingUser(null); }}
          onSubmit={handleUpdateUser}
          onFormChange={setUserEditForm}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PlatformDashboardPage;
