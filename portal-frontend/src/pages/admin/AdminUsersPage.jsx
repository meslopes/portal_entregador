import React, { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Edit, Trash2, AlertCircle, X,
  Truck, Store, Shield, Mail, Phone, CheckCircle
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modais
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: 'admin123', first_name: '', last_name: '' });
  const [editData, setEditData] = useState({});
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { loadUsers(); }, [page, typeFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllUsers(page, 20, typeFilter, search);
      setUsers(data.users);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError('Erro ao carregar usuários');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateAdmin = () => {
    setFormData({ email: '', password: 'admin123', first_name: '', last_name: '' });
    setFormError('');
    setShowForm(true);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.first_name) {
      setFormError('Email e nome são obrigatórios');
      return;
    }
    try {
      setFormLoading(true);
      const result = await adminService.createAdminUser(formData);
      setShowForm(false);
      loadUsers();
      alert(`Admin criado!\nEmail: ${result.user.email}\nSenha: ${result.user.password}`);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao criar admin');
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (user) => {
    setEditData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      email: user.email || '',
      status: user.status || 'ACTIVE'
    });
    setShowEdit(user);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await adminService.updateUser(showEdit.id, editData);
      setShowEdit(null);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Excluir ${userName}? Esta ação não pode ser desfeita.`)) return;
    try {
      await adminService.deleteUser(userId);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ADMIN': return <Shield size={14} style={{ color: '#8b5cf6' }} />;
      case 'DRIVER': return <Truck size={14} style={{ color: '#2563eb' }} />;
      case 'CLIENT': return <Store size={14} style={{ color: '#0d9488' }} />;
      default: return <Users size={14} style={{ color: '#94a3b8' }} />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'ADMIN': return 'Admin';
      case 'DRIVER': return 'Entregador';
      case 'CLIENT': return 'Estabelecimento';
      default: return type;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return { bg: '#dcfce7', color: '#16a34a' };
      case 'INACTIVE': return { bg: '#fef3c7', color: '#d97706' };
      case 'SUSPENDED': return { bg: '#fee2e2', color: '#dc2626' };
      default: return { bg: '#f1f5f9', color: '#94a3b8' };
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Usuários</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>{total} usuário(s) cadastrado(s)</p>
        </div>
        <button onClick={openCreateAdmin} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#8b5cf6', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> NOVO ADMIN
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input type="text" placeholder="Buscar por nome, e-mail ou telefone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); loadUsers(); }}
            style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[{ key: '', label: 'Todos' }, { key: 'ADMIN', label: 'Admins' }, { key: 'DRIVER', label: 'Entregadores' }, { key: 'CLIENT', label: 'Estabelecimentos' }].map(f => (
            <button key={f.key} onClick={() => { setTypeFilter(f.key); setPage(1); }} style={{ padding: '0.5rem 1rem', borderRadius: '9999px', border: 'none', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', background: typeFilter === f.key ? '#2563eb' : '#f1f5f9', color: typeFilter === f.key ? 'white' : '#64748b' }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {users.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Users size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhum usuário encontrado</p>
        </div>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {users.map(user => {
              const statusStyle = getStatusColor(user.status);
              return (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: '1px solid #f8fafc', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getTypeIcon(user.user_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{user.first_name} {user.last_name}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{user.email}</p>
                  </div>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>{getTypeLabel(user.user_type)}</span>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>{user.status}</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => openEdit(user)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }} title="Editar"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(user.id, user.first_name + ' ' + user.last_name)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }} title="Excluir"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pagBtn(page === 1)}>Anterior</button>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pagBtn(page === totalPages)}>Próxima</button>
            </div>
          )}
        </>
      )}

      {/* Modal Criar Admin */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Novo Admin</h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAdmin} style={{ padding: '1.5rem' }}>
              {formError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.625rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem' }}><AlertCircle size={14} /> {formError}</div>}
              <FormField label="Email *"><input type="email" name="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} style={inputStyle} placeholder="admin@muv.log.br" /></FormField>
              <FormField label="Nome *"><input type="text" name="first_name" value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Sobrenome"><input type="text" name="last_name" value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Senha"><input type="text" name="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} style={inputStyle} /></FormField>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancelar</button>
                <button type="submit" disabled={formLoading} style={{ ...btnPrimary, opacity: formLoading ? 0.7 : 1 }}>{formLoading ? 'Criando...' : 'Criar Admin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Editar Usuário</h2>
              <button onClick={() => setShowEdit(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit} style={{ padding: '1.5rem' }}>
              <FormField label="Nome"><input type="text" value={editData.first_name} onChange={e => setEditData(p => ({ ...p, first_name: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Sobrenome"><input type="text" value={editData.last_name} onChange={e => setEditData(p => ({ ...p, last_name: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Email"><input type="email" value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Telefone"><input type="text" value={editData.phone} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Status">
                <select value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                  <option value="SUSPENDED">Suspenso</option>
                </select>
              </FormField>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEdit(null)} style={btnSecondary}>Cancelar</button>
                <button type="submit" disabled={formLoading} style={{ ...btnPrimary, opacity: formLoading ? 0.7 : 1 }}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = { width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };
const btnPrimary = { padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' };
const btnSecondary = { padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569' };
const pagBtn = (disabled) => ({ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: '0.875rem' });

export default AdminUsersPage;
