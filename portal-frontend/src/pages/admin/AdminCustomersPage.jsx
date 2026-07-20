import React, { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Phone, Mail, Package, DollarSign,
  ChevronRight, Edit, Trash2, X, AlertCircle, MapPin, User
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '',
    street: '', neighborhood: '', city: '', state: '', zip_code: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { loadCustomers(); }, [page, search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getCustomers(page, 20, search);
      setCustomers(data.customers);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError('Erro ao carregar clientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openCreateForm = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', street: '', neighborhood: '', city: '', state: '', zip_code: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      street: '', neighborhood: '', city: '', state: '', zip_code: ''
    });
    setFormError('');
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      setFormError('Nome e telefone são obrigatórios');
      return;
    }

    try {
      setFormLoading(true);
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
      };
      if (formData.street) {
        payload.address = {
          street: formData.street,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
        };
      }

      if (editingCustomer) {
        await adminService.updateCustomer(editingCustomer.id, payload);
      } else {
        await adminService.createCustomer(payload);
      }
      setShowForm(false);
      loadCustomers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar cliente');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await adminService.deleteCustomer(customerId);
      loadCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir cliente');
    }
  };

  const openDetails = async (customerId) => {
    try {
      const data = await adminService.getCustomerDetails(customerId);
      setShowDetails(data);
    } catch (err) {
      alert('Erro ao carregar detalhes');
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Clientes
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Gerencie todos os clientes do sistema
          </p>
        </div>
        <button
          onClick={openCreateForm}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
            background: '#2563eb', color: 'white', border: 'none',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
          onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
        >
          <Plus size={18} /> NOVO CLIENTE
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.125rem' }}>Total de Clientes</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={search}
              onChange={handleSearch}
              style={{
                width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
                fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ minHeight: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : customers.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Users size={24} style={{ color: '#94a3b8' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            {search ? 'Tente outro termo de busca' : 'Clique em "NOVO CLIENTE" para cadastrar'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Header da tabela */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 100px',
              padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc', fontSize: '0.75rem', fontWeight: 600,
              color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'
            }} className="table-header">
              <span>Cliente</span>
              <span>Telefone</span>
              <span>E-mail</span>
              <span style={{ textAlign: 'center' }}>Pedidos</span>
              <span style={{ textAlign: 'right' }}>Total Gasto</span>
              <span style={{ textAlign: 'center' }}>Ações</span>
            </div>

            {/* Linhas */}
            {customers.map((customer) => (
              <div
                key={customer.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 100px',
                  padding: '1rem 1.25rem', borderBottom: '1px solid #f8fafc',
                  alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s'
                }}
                className="table-row"
                onClick={() => openDetails(customer.id)}
              >
                {/* Cliente */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                    background: '#eff6ff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0
                  }}>
                    <User size={16} style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{customer.name}</p>
                    {customer.addresses_count > 0 && (
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{customer.addresses_count} endereço(s)</p>
                    )}
                  </div>
                </div>

                {/* Telefone */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>{customer.phone}</span>
                </div>

                {/* Email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={14} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>{customer.email || '-'}</span>
                </div>

                {/* Pedidos */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    padding: '0.125rem 0.625rem', borderRadius: '9999px',
                    fontSize: '0.75rem', fontWeight: 600,
                    background: customer.total_orders > 0 ? '#dbeafe' : '#f1f5f9',
                    color: customer.total_orders > 0 ? '#2563eb' : '#94a3b8'
                  }}>
                    {customer.total_orders}
                  </span>
                </div>

                {/* Total Gasto */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                    {utils.formatCurrency(customer.total_spent)}
                  </span>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openEditForm(customer)}
                    style={{
                      padding: '0.375rem', borderRadius: '0.375rem',
                      border: 'none', background: 'transparent',
                      cursor: 'pointer', color: '#64748b', transition: 'color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    style={{
                      padding: '0.375rem', borderRadius: '0.375rem',
                      border: 'none', background: 'transparent',
                      cursor: 'pointer', color: '#94a3b8', transition: 'color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0', background: 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1, fontSize: '0.875rem'
                }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0', background: 'white',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1, fontSize: '0.875rem'
                }}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Formulário */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '1rem'
        }}>
          <div style={{
            background: 'white', borderRadius: '0.75rem', width: '100%',
            maxWidth: '500px', maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            {/* Header do modal */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem' }}>
              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={14} /> {formError}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Nome *</label>
                <input
                  type="text" name="name" value={formData.name} onChange={handleFormChange}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="Nome completo"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Telefone *</label>
                  <input
                    type="text" name="phone" value={formData.phone} onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>E-mail</label>
                  <input
                    type="email" name="email" value={formData.email} onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MapPin size={14} /> Endereço (opcional)
                </p>
                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="text" name="street" value={formData.street} onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Rua, número"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text" name="neighborhood" value={formData.neighborhood} onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Bairro"
                  />
                  <input
                    type="text" name="city" value={formData.city} onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Cidade"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="text" name="state" value={formData.state} onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="UF"
                    maxLength={2}
                  />
                  <input
                    type="text" name="zip_code" value={formData.zip_code} onChange={handleFormChange}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="CEP"
                  />
                </div>
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button" onClick={() => setShowForm(false)}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                    border: '1.5px solid #e2e8f0', background: 'white',
                    fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={formLoading}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                    border: 'none', background: '#2563eb', color: 'white',
                    fontSize: '0.875rem', fontWeight: 600, cursor: formLoading ? 'not-allowed' : 'pointer',
                    opacity: formLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {formLoading ? 'Salvando...' : editingCustomer ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetails && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '1rem'
        }}>
          <div style={{
            background: 'white', borderRadius: '0.75rem', width: '100%',
            maxWidth: '550px', maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Detalhes do Cliente</h2>
              <button onClick={() => setShowDetails(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Info principal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '3.5rem', height: '3.5rem', borderRadius: '50%',
                  background: '#eff6ff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={24} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{showDetails.name}</h3>
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Cliente desde {utils.formatDate(showDetails.created_at)}</p>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total Pedidos</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{showDetails.total_orders}</p>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total Gasto</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{utils.formatCurrency(showDetails.total_spent)}</p>
                </div>
              </div>

              {/* Contato */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contato</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>{showDetails.phone}</span>
                  </div>
                  {showDetails.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={14} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: '0.875rem', color: '#475569' }}>{showDetails.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereços */}
              {showDetails.addresses?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endereços</p>
                  {showDetails.addresses.map((addr, i) => (
                    <div key={i} style={{ padding: '0.625rem', background: '#f8fafc', borderRadius: '0.375rem', marginBottom: '0.375rem', fontSize: '0.8125rem', color: '#475569' }}>
                      {addr.street}{addr.neighborhood ? `, ${addr.neighborhood}` : ''}{addr.city ? ` - ${addr.city}/${addr.state}` : ''} {addr.zip_code ? `- ${addr.zip_code}` : ''}
                    </div>
                  ))}
                </div>
              )}

              {/* Últimos pedidos */}
              {showDetails.recent_orders?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Últimos Pedidos</p>
                  {showDetails.recent_orders.slice(0, 5).map((order) => (
                    <div key={order.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.5rem 0', borderBottom: '1px solid #f8fafc'
                    }}>
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</p>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{utils.formatDate(order.created_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
                        <p style={{
                          fontSize: '0.6875rem', fontWeight: 600,
                          color: order.status === 'DELIVERED' ? '#22c55e' : order.status === 'CANCELLED' ? '#dc2626' : '#f59e0b'
                        }}>
                          {utils.getStatusText(order.status)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowDetails(null); openEditForm(showDetails); }}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.5rem',
                  border: '1.5px solid #e2e8f0', background: 'white',
                  fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#475569'
                }}
              >
                <Edit size={14} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .table-header { display: grid; }
        .table-row:hover { background: #f8fafc; }
        @media (max-width: 768px) {
          .table-header { display: none; }
          .table-row { grid-template-columns: 1fr !important; gap: 0.5rem; }
        }
      `}</style>
    </div>
  );
};

export default AdminCustomersPage;
