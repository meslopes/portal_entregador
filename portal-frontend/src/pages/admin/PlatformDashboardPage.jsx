import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast';
import {
  OverviewTab, TenantsTab, UsersTab, PendingTab, AdminsTab,
  PlatformHeader, TabNavigation, LoadingPage, DashboardModals
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

  const handleRefresh = () => {
    loadDashboard();
    loadTenants();
    loadPendingUsers();
    loadUsers();
    setRefreshKey(k => k + 1);
  };

  if (loading) return <LoadingPage />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <PlatformHeader onRefresh={handleRefresh} />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
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
      <DashboardModals
        showTenantModal={showTenantModal}
        selectedTenant={selectedTenant}
        editingTenant={editingTenant}
        tenantEditForm={tenantEditForm}
        tenantEditLoading={tenantEditLoading}
        showCreateTenantModal={showCreateTenantModal}
        tenantFormData={tenantFormData}
        createTenantLoading={createTenantLoading}
        showUserEditModal={showUserEditModal}
        editingUser={editingUser}
        userEditForm={userEditForm}
        userEditLoading={userEditLoading}
        tenants={tenants}
        onCloseTenantModal={() => { setShowTenantModal(false); setSelectedTenant(null); }}
        onEditTenant={handleEditTenant}
        onDeleteTenant={handleDeleteTenant}
        onCloseEditTenant={() => setEditingTenant(null)}
        onUpdateTenant={handleUpdateTenant}
        onTenantEditFormChange={setTenantEditForm}
        onCloseCreateTenant={() => setShowCreateTenantModal(false)}
        onCreateTenant={handleCreateTenant}
        onTenantFormChange={setTenantFormData}
        onCloseUserEdit={() => { setShowUserEditModal(false); setEditingUser(null); }}
        onUpdateUser={handleUpdateUser}
        onUserEditFormChange={setUserEditForm}
      />
    </div>
  );
};

export default PlatformDashboardPage;
