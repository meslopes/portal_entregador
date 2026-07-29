import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, Package, DollarSign, TrendingUp,
  ChevronRight, Loader2, RefreshCw, Eye, Edit, ToggleLeft, ToggleRight,
  Store, Truck, BarChart3, Globe, Shield, Calendar
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
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadTenants();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

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
      const response = await api.get('/api/platform/users');
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setUsersLoading(false);
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
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        {[
          { key: 'overview', label: 'Visão Geral', icon: BarChart3 },
          { key: 'tenants', label: 'Tenants', icon: Building2 },
          { key: 'users', label: 'Usuários', icon: Users }
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
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tenants Ativos</p>
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
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Usuários</p>
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
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Entregadores</p>
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
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Pedidos</p>
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
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Receita Total</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                    R$ {dashboard.stats.total_revenue.toFixed(2)}
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
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pedidos (7 dias)</p>
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
                      background: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cd7f32',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 600, color: 'white'
                    }}>
                      {index + 1}
                    </span>
                    <div>
                      <p style={{ fontWeight: 500, color: '#1e293b' }}>{tenant.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tenant.slug} • {tenant.plan}</p>
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
                      R$ {tenant.revenue.toFixed(2)}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
              Todos os Usuários
            </h2>
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

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
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
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
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
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.5rem' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Tenant Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Slug</p>
                  <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>{selectedTenant.slug}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Plano</p>
                  <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>{selectedTenant.plan}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Status</p>
                  <p style={{ fontSize: '0.875rem', color: selectedTenant.is_active ? '#16a34a' : '#dc2626' }}>
                    {selectedTenant.is_active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Criado em</p>
                  <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                    {new Date(selectedTenant.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{selectedTenant.users?.length || 0}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Usuários</p>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{selectedTenant.drivers_count}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Entregadores</p>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{selectedTenant.restaurants_count}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Estabelecimentos</p>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#db2777' }}>{selectedTenant.orders_count}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pedidos</p>
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
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.status}</p>
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PlatformDashboardPage;
