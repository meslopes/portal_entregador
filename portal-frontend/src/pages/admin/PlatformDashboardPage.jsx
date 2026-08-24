import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Package, DollarSign, TrendingUp,
  ChevronRight, Loader2, RefreshCw, Eye, Edit, ToggleLeft, ToggleRight,
  Store, Truck, BarChart3, Globe, Shield, Calendar, Plus, Trash2, X
} from 'lucide-react';
import api from '@/lib/api';

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

const PlatformDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [createTenantLoading, setCreateTenantLoading] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({ name: '', slug: '', plan: 'basic', phone: '', email: '', cnpj: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [squares, setSquares] = useState([]);

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
      alert('Erro ao aprovar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Rejeitar e excluir este cadastro?')) return;
    try {
      await api.post(`/api/admin/users/${userId}/reject`);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      loadDashboard();
    } catch (err) {
      alert('Erro ao rejeitar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleTenant = async (tenantId) => {
    try {
      await api.post(`/api/platform/tenants/${tenantId}/toggle`);
      loadTenants();
      loadDashboard();
    } catch (err) {
      alert('Erro ao alterar status do tenant');
    }
  };

  const handleViewTenant = async (tenantId) => {
    try {
      const response = await api.get(`/api/platform/tenants/${tenantId}`);
      setSelectedTenant(response.data.tenant);
      setShowTenantModal(true);
    } catch (err) {
      alert('Erro ao carregar detalhes do tenant');
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
      alert(err.response?.data?.error || 'Erro ao criar tenant');
    } finally {
      setCreateTenantLoading(false);
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
          {activeTab === 'overview' && (
            <button
              onClick={() => { loadDashboard(); loadTenants(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem',
                border: '1px solid #e2e8f0', background: 'white',
                cursor: 'pointer', fontSize: '0.875rem', color: '#64748b'
              }}
            >
              <RefreshCw size={16} /> Atualizar
            </button>
          )}
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
        <>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Tenants Ativos</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.total_tenants}</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Usuários</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.total_users}</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={20} style={{ color: '#d97706' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregadores</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.total_drivers}</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} style={{ color: '#db2777' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Pedidos</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.total_orders}</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Receita Total</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                    R$ {(dashboard.stats.total_revenue || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos (7 dias)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{dashboard.stats.week_orders}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Tenants */}
          <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
              Top Tenants por Pedidos
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dashboard.top_tenants.map((tenant, index) => (
                <div key={tenant.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', borderRadius: '0.5rem', background: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: index === 0 ? '#fbbf24' : index === 1 ? '#64748b' : '#cd7f32',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 600, color: 'white'
                    }}>
                      {index + 1}
                    </span>
                    <div>
                      <p style={{ fontWeight: 500, color: '#1e293b' }}>{tenant.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{tenant.slug} • {tenant.plan}</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>{tenant.order_count} pedidos</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tenants Tab */}
      {activeTab === 'tenants' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
              Todos os Tenants
            </h2>
            <button
              onClick={() => setShowCreateTenantModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                border: 'none', background: '#2563eb', color: 'white',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Plus size={18} /> Novo Tenant
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>NOME</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>SLUG</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>PLANO</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>USUÁRIOS</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ENTREGADORES</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>PEDIDOS</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>RECEITA</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>STATUS</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(tenant => (
                  <tr key={tenant.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
                      {tenant.name}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                      {tenant.slug}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem', borderRadius: '9999px',
                        background: tenant.plan === 'premium' ? '#dbeafe' : tenant.plan === 'platinum' ? '#e8e8f0' : '#f1f5f9',
                        color: tenant.plan === 'premium' ? '#2563eb' : tenant.plan === 'platinum' ? '#6366f1' : '#64748b',
                        fontSize: '0.75rem', fontWeight: 500
                      }}>
                        {tenant.plan}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#1e293b' }}>
                      {tenant.users_count}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#1e293b' }}>
                      {tenant.drivers_count}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#1e293b' }}>
                      {tenant.orders_count}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500, color: '#16a34a' }}>
                      R$ {(tenant.revenue || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleTenant(tenant.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.25rem 0.5rem', borderRadius: '9999px',
                          border: 'none', cursor: 'pointer',
                          background: tenant.is_active ? '#dcfce7' : '#fee2e2',
                          color: tenant.is_active ? '#166534' : '#991b1b',
                          fontSize: '0.75rem', fontWeight: 500
                        }}
                      >
                        {tenant.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {tenant.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleViewTenant(tenant.id)}
                        style={{
                          padding: '0.375rem', borderRadius: '0.375rem',
                          border: 'none', background: 'transparent',
                          cursor: 'pointer', color: '#6366f1'
                        }}
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
              Usuários por Tenant
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={selectedTenantFilter}
                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0', fontSize: '0.75rem',
                  outline: 'none', background: 'white'
                }}
              >
                <option value="">Todos os Tenants</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={loadUsers}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0', background: 'white',
                  cursor: 'pointer', fontSize: '0.75rem', color: '#64748b'
                }}
              >
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
          </div>

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem' }}>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>NOME</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>EMAIL</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>TIPO</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>TENANT</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>STATUS</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>CRIADO EM</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
                        {user.first_name} {user.last_name}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {user.email}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem', borderRadius: '9999px',
                          background: user.user_type === 'ADMIN' ? '#dbeafe' : user.user_type === 'DRIVER' ? '#dcfce7' : '#fef3c7',
                          color: user.user_type === 'ADMIN' ? '#2563eb' : user.user_type === 'DRIVER' ? '#16a34a' : '#d97706',
                          fontSize: '0.75rem', fontWeight: 500
                        }}>
                          {user.user_type === 'ADMIN' ? 'Admin' : user.user_type === 'DRIVER' ? 'Entregador' : 'Cliente'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                        {user.tenant_name || 'Plataforma'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem', borderRadius: '9999px',
                          background: user.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: user.status === 'ACTIVE' ? '#166534' : '#991b1b',
                          fontSize: '0.75rem', fontWeight: 500
                        }}>
                          {user.status === 'ACTIVE' ? 'Ativo' : user.status === 'INACTIVE' ? 'Inativo' : 'Suspenso'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <AdminsTab />
      )}

      {/* Pending Users Tab */}
      {activeTab === 'pending' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
              Cadastros Pendentes
            </h2>
            <button
              onClick={loadPendingUsers}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem',
                border: '1px solid #e2e8f0', background: 'white',
                cursor: 'pointer', fontSize: '0.875rem', color: '#64748b'
              }}
            >
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>

          {pendingLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem' }}>Nenhum cadastro pendente</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {pendingUsers.map(user => (
                <div key={user.id} style={{
                  background: 'white', borderRadius: '0.75rem', padding: '1rem',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                        {user.first_name} {user.last_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.phone || 'Sem telefone'}</div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.5rem', borderRadius: '9999px',
                      background: user.user_type === 'DRIVER' ? '#dbeafe' : '#fef3c7',
                      color: user.user_type === 'DRIVER' ? '#2563eb' : '#d97706',
                      fontSize: '0.6875rem', fontWeight: 600
                    }}>
                      {user.user_type === 'DRIVER' ? 'Entregador' : 'Estabelecimento'}
                    </span>
                  </div>

                  {/* Tenant selector */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <select
                      id={`platform-tenant-${user.id}`}
                      style={{
                        width: '100%', padding: '0.375rem', borderRadius: '0.375rem',
                        border: '1px solid #e2e8f0', fontSize: '0.75rem',
                        outline: 'none', background: 'white'
                      }}
                    >
                      <option value="">Selecionar organizacao...</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Square selector */}
                  {squares.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <select
                        id={`platform-square-${user.id}`}
                        style={{
                          width: '100%', padding: '0.375rem', borderRadius: '0.375rem',
                          border: '1px solid #e2e8f0', fontSize: '0.75rem',
                          outline: 'none', background: 'white'
                        }}
                      >
                        <option value="">Selecionar praca...</option>
                        {squares.map(sq => (
                          <option key={sq.id} value={sq.id}>{sq.name} - {sq.city}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        const tenantSelect = document.getElementById(`platform-tenant-${user.id}`);
                        const squareSelect = document.getElementById(`platform-square-${user.id}`);
                        const tenantId = tenantSelect ? parseInt(tenantSelect.value) || null : null;
                        const squareId = squareSelect ? parseInt(squareSelect.value) || null : null;
                        handleApprove(user.id, squareId, tenantId);
                      }}
                      style={{
                        flex: 1, padding: '0.5rem', borderRadius: '0.375rem',
                        border: 'none', background: '#16a34a', color: 'white',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      style={{
                        flex: 1, padding: '0.5rem', borderRadius: '0.375rem',
                        border: '1px solid #e2e8f0', background: 'white', color: '#dc2626',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tenant Details Modal */}
      {showTenantModal && selectedTenant && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }}
            onClick={() => { setShowTenantModal(false); setSelectedTenant(null); }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '600px',
            maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 100000
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                {selectedTenant.name}
              </h2>
              <button
                onClick={() => { setShowTenantModal(false); setSelectedTenant(null); }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Tenant Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Slug</p>
                  <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>{selectedTenant.slug}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Plano</p>
                  <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>{selectedTenant.plan}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Status</p>
                  <p style={{ fontSize: '0.875rem', color: selectedTenant.is_active ? '#16a34a' : '#dc2626' }}>
                    {selectedTenant.is_active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Criado em</p>
                  <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                    {new Date(selectedTenant.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{selectedTenant.users?.length || 0}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Usuários</p>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{selectedTenant.drivers_count}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregadores</p>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{selectedTenant.restaurants_count}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Estabelecimentos</p>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#db2777' }}>{selectedTenant.orders_count}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedidos</p>
                </div>
              </div>

              {/* Recent Orders */}
              {selectedTenant.recent_orders?.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
                    Pedidos Recentes
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedTenant.recent_orders.map(order => (
                      <div key={order.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem'
                      }}>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</p>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.status}</p>
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#16a34a' }}>
                          R$ {order.delivery_fee}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Tenant Modal */}
      {showCreateTenantModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }}
            onClick={() => setShowCreateTenantModal(false)}
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
                onClick={() => setShowCreateTenantModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTenant} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Nome da Organização *
                </label>
                <input
                  type="text"
                  value={tenantFormData.name}
                  onChange={(e) => setTenantFormData(prev => ({ ...prev, name: e.target.value }))}
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
                  onChange={(e) => setTenantFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
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
                  onChange={(e) => setTenantFormData(prev => ({ ...prev, plan: e.target.value }))}
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
                    onChange={(e) => setTenantFormData(prev => ({ ...prev, phone: e.target.value }))}
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
                    onChange={(e) => setTenantFormData(prev => ({ ...prev, cnpj: e.target.value }))}
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
                  onChange={(e) => setTenantFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTenantModal(false)}
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
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const AdminsTab = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      alert(err.response?.data?.error || 'Erro ao criar admin');
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
      alert(err.response?.data?.error || 'Erro ao excluir admin');
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
    </div>
  );
};

export default PlatformDashboardPage;
