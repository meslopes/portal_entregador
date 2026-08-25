import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
  Users, Building2, Truck, Package, DollarSign,
  TrendingUp, Plus, Search, Edit, Trash2, Eye,
  Shield, LogOut, Loader2, AlertCircle, X, RefreshCw
} from 'lucide-react';

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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    company_name: ''
  });

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
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        company_name: ''
      });
      loadData();
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
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir admin');
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
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        company_name: ''
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar admin');
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
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Shield size={24} style={{ color: '#2563eb' }} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
              muv.log Platform
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Painel de Controle da Plataforma
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {user?.email}
          </span>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#64748b'
            }}
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#64748b'
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

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

        {/* Cards de Métricas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <MetricCard
            icon={<Users size={24} />}
            label="Admins"
            value={dashboard?.admins || 0}
            color="#2563eb"
            bg="#eff6ff"
          />
          <MetricCard
            icon={<Building2 size={24} />}
            label="Estabelecimentos"
            value={dashboard?.establishments || 0}
            color="#059669"
            bg="#ecfdf5"
          />
          <MetricCard
            icon={<Truck size={24} />}
            label="Entregadores"
            value={dashboard?.drivers || 0}
            color="#d97706"
            bg="#fffbeb"
          />
          <MetricCard
            icon={<Package size={24} />}
            label="Pedidos (mês)"
            value={dashboard?.orders_month || 0}
            color="#7c3aed"
            bg="#f5f3ff"
          />
          <MetricCard
            icon={<DollarSign size={24} />}
            label="Receita (mês)"
            value={`R$ ${(dashboard?.revenue_month || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            color="#059669"
            bg="#ecfdf5"
          />
          <MetricCard
            icon={<TrendingUp size={24} />}
            label="MRR Estimado"
            value={`R$ ${(dashboard?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            color="#2563eb"
            bg="#eff6ff"
          />
        </div>

        {/* Seção de Admins */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
              Admins Cadastrados
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#2563eb',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={18} />
              Novo Admin
            </button>
          </div>

          {admins.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9375rem' }}>Nenhum admin cadastrado</p>
              <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                Clique em "Novo Admin" para começar
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem'
              }}>
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
                        {admin.company_name || '-'}
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
                            onClick={() => handleEditAdmin(admin)}
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
          )}
        </div>
      </div>

      {/* Modal de Criação de Admin */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                Criar Novo Admin
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Nome da Empresa</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Restaurante XYZ"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sobrenome</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Senha *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  style={inputStyle}
                  required
                  minLength={6}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  style={inputStyle}
                  placeholder="(51) 99999-9999"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: createLoading ? '#93c5fd' : '#2563eb',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: createLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {createLoading ? 'Criando...' : 'Criar Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Admin */}
      {showEditModal && editingAdmin && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                Editar Admin
              </h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingAdmin(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Nome da Empresa</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Restaurante XYZ"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sobrenome</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Nova Senha <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(deixe vazio para manter)</span></label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  style={inputStyle}
                  minLength={6}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  style={inputStyle}
                  placeholder="(51) 99999-9999"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingAdmin(null); }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: createLoading ? '#93c5fd' : '#2563eb',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: createLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {createLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const MetricCard = ({ icon, label, value, color, bg }) => (
  <div style={{
    background: 'white',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.375rem'
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box'
};

export default PlatformDashboard;
