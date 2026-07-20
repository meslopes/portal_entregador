import React, { useState, useEffect } from 'react';
import {
  Store, Search, Plus, Phone, Mail, Package, DollarSign,
  Edit, Trash2, X, AlertCircle, MapPin, Clock, TrendingUp,
  ChevronRight, User, CheckCircle, Truck
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'Pendente' },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito' },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando' },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto' },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'Coletado' },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelado' },
};

const AdminEstablishmentsPage = () => {
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [formData, setFormData] = useState({
    name: '', cnpj: '', phone: '', email: '', address: '',
    latitude: '', longitude: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { loadEstablishments(); }, [page, search]);

  const loadEstablishments = async () => {
    try {
      setLoading(true);
      const data = await adminService.getEstablishments(page, 20, search);
      setEstablishments(data.establishments);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError('Erro ao carregar estabelecimentos');
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
    setEditing(null);
    setFormData({ name: '', cnpj: '', phone: '', email: '', address: '', latitude: '', longitude: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (est) => {
    setEditing(est);
    setFormData({
      name: est.name || '',
      cnpj: est.cnpj || '',
      phone: est.phone || '',
      email: est.email || '',
      address: est.address || '',
      latitude: est.latitude || '',
      longitude: est.longitude || ''
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
    if (!formData.name || !formData.address) {
      setFormError('Nome e endereço são obrigatórios');
      return;
    }

    try {
      setFormLoading(true);
      const payload = {
        name: formData.name,
        cnpj: formData.cnpj || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address,
        latitude: formData.latitude ? parseFloat(formData.latitude) : 0,
        longitude: formData.longitude ? parseFloat(formData.longitude) : 0,
      };

      if (editing) {
        await adminService.updateEstablishment(editing.id, payload);
      } else {
        await adminService.createEstablishment(payload);
      }
      setShowForm(false);
      loadEstablishments();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar estabelecimento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este estabelecimento?')) return;
    try {
      await adminService.deleteEstablishment(id);
      loadEstablishments();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  const openDetails = async (id) => {
    try {
      const data = await adminService.getEstablishmentDetails(id);
      setShowDetails(data);
    } catch (err) {
      alert('Erro ao carregar detalhes');
    }
  };

  const toggleActive = async (est) => {
    try {
      await adminService.updateEstablishment(est.id, { is_active: !est.is_active });
      loadEstablishments();
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Estabelecimentos
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Gerencie todos os estabelecimentos do sistema
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
          <Plus size={18} /> NOVO ESTABELECIMENTO
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
        <StatCard icon={<Store size={22} />} iconBg="#f0fdfa" iconColor="#0d9488" label="Total" value={total} />
        <StatCard icon={<CheckCircle size={22} />} iconBg="#dcfce7" iconColor="#16a34a" label="Ativos" value={establishments.filter(e => e.is_active).length} />
        <StatCard icon={<TrendingUp size={22} />} iconBg="#dbeafe" iconColor="#2563eb" label="Pedidos Hoje" value={establishments.reduce((sum, e) => sum + (e.today_orders || 0), 0)} />
        <StatCard icon={<DollarSign size={22} />} iconBg="#fef3c7" iconColor="#d97706" label="Receita Total" value={utils.formatCurrency(establishments.reduce((sum, e) => sum + (e.total_revenue || 0), 0))} />
      </div>

      {/* Busca */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por nome, endereço, CNPJ ou telefone..."
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

      {/* Lista */}
      {loading ? (
        <div style={{ minHeight: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : establishments.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Store size={24} style={{ color: '#94a3b8' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
            {search ? 'Nenhum estabelecimento encontrado' : 'Nenhum estabelecimento cadastrado'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            {search ? 'Tente outro termo de busca' : 'Clique em "NOVO ESTABELECIMENTO" para cadastrar'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Header da tabela */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 100px',
              padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc', fontSize: '0.75rem', fontWeight: 600,
              color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'
            }} className="table-header">
              <span>Estabelecimento</span>
              <span>Contato</span>
              <span style={{ textAlign: 'center' }}>Status</span>
              <span style={{ textAlign: 'center' }}>Hoje</span>
              <span style={{ textAlign: 'center' }}>Semana</span>
              <span style={{ textAlign: 'right' }}>Receita Total</span>
              <span style={{ textAlign: 'center' }}>Ações</span>
            </div>

            {/* Linhas */}
            {establishments.map((est) => (
              <div
                key={est.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 100px',
                  padding: '1rem 1.25rem', borderBottom: '1px solid #f8fafc',
                  alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s'
                }}
                className="table-row"
                onClick={() => openDetails(est.id)}
              >
                {/* Estabelecimento */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                    background: '#f0fdfa', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0
                  }}>
                    <Store size={16} style={{ color: '#0d9488' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{est.name}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={10} /> {est.address?.length > 30 ? est.address.substring(0, 30) + '...' : est.address}
                    </p>
                  </div>
                </div>

                {/* Contato */}
                <div>
                  {est.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                      <Phone size={12} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{est.phone}</span>
                    </div>
                  )}
                  {est.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Mail size={12} style={{ color: '#94a3b8' }} />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{est.email}</span>
                    </div>
                  )}
                  {!est.phone && !est.email && (
                    <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>-</span>
                  )}
                </div>

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleActive(est); }}
                    style={{
                      padding: '0.125rem 0.625rem', borderRadius: '9999px',
                      fontSize: '0.6875rem', fontWeight: 600, border: 'none',
                      cursor: 'pointer',
                      background: est.is_active ? '#dcfce7' : '#f1f5f9',
                      color: est.is_active ? '#16a34a' : '#94a3b8'
                    }}
                  >
                    {est.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {/* Pedidos Hoje */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                    {est.today_orders || 0}
                  </span>
                </div>

                {/* Pedidos Semana */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.875rem' }}>
                    {est.week_orders || 0}
                  </span>
                </div>

                {/* Receita */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                    {utils.formatCurrency(est.total_revenue || 0)}
                  </span>
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openEditForm(est)}
                    style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(est.id)}
                    style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.15s' }}
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
        <Modal onClose={() => setShowForm(false)}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
              {editing ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
            </h2>
            <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem' }}>
            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={14} /> {formError}
              </div>
            )}

            <FormField label="Nome *">
              <input type="text" name="name" value={formData.name} onChange={handleFormChange} style={inputStyle} placeholder="Ex: Farmácia da Esquina" />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <FormField label="CNPJ">
                <input type="text" name="cnpj" value={formData.cnpj} onChange={handleFormChange} style={inputStyle} placeholder="00.000.000/0001-00" />
              </FormField>
              <FormField label="Telefone">
                <input type="text" name="phone" value={formData.phone} onChange={handleFormChange} style={inputStyle} placeholder="(53) 99999-9999" />
              </FormField>
            </div>

            <FormField label="E-mail">
              <input type="email" name="email" value={formData.email} onChange={handleFormChange} style={inputStyle} placeholder="contato@estabelecimento.com" />
            </FormField>

            <FormField label="Endereço *">
              <input type="text" name="address" value={formData.address} onChange={handleFormChange} style={inputStyle} placeholder="Rua, número, bairro, cidade" />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <FormField label="Latitude">
                <input type="text" name="latitude" value={formData.latitude} onChange={handleFormChange} style={inputStyle} placeholder="-29.9500" />
              </FormField>
              <FormField label="Longitude">
                <input type="text" name="longitude" value={formData.longitude} onChange={handleFormChange} style={inputStyle} placeholder="-50.4500" />
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancelar</button>
              <button type="submit" disabled={formLoading} style={{ ...btnPrimary, opacity: formLoading ? 0.7 : 1 }}>
                {formLoading ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Estabelecimento'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Detalhes */}
      {showDetails && (
        <Modal onClose={() => setShowDetails(null)}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Detalhes do Estabelecimento</h2>
            <button onClick={() => setShowDetails(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Store size={24} style={{ color: '#0d9488' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{showDetails.name}</h3>
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={12} /> {showDetails.address}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total Pedidos</p>
                <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#2563eb' }}>{showDetails.total_orders}</p>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Receita Total</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#22c55e' }}>{utils.formatCurrency(showDetails.total_revenue)}</p>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Status</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: showDetails.is_active ? '#16a34a' : '#94a3b8' }}>
                  {showDetails.is_active ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            </div>

            {/* Contato */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contato</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {showDetails.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone size={14} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>{showDetails.phone}</span>
                  </div>
                )}
                {showDetails.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>{showDetails.email}</span>
                  </div>
                )}
                {showDetails.cnpj && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Store size={14} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>CNPJ: {showDetails.cnpj}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pedidos por status */}
            {showDetails.orders_by_status && Object.keys(showDetails.orders_by_status).length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pedidos por Status</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {Object.entries(showDetails.orders_by_status).map(([status, count]) => {
                    const config = STATUS_CONFIG[status] || { color: '#94a3b8', bg: '#f1f5f9', text: status };
                    return (
                      <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', background: config.bg, color: config.color, fontSize: '0.75rem', fontWeight: 600 }}>
                        <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', background: config.color }} />
                        {config.text}: {count}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Últimos pedidos */}
            {showDetails.recent_orders?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Últimos Pedidos</p>
                {showDetails.recent_orders.slice(0, 8).map((order) => {
                  const config = STATUS_CONFIG[order.status] || { color: '#94a3b8', bg: '#f1f5f9', text: order.status };
                  return (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</p>
                        <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{utils.formatDate(order.created_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '0.125rem 0.375rem', borderRadius: '9999px', background: config.bg, color: config.color }}>
                          {config.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowDetails(null); openEditForm(showDetails); }}
              style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Edit size={14} /> Editar
            </button>
          </div>
        </Modal>
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

// Componentes auxiliares
const Modal = ({ children, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
    <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
      {children}
    </div>
  </div>
);

const StatCard = ({ icon, iconBg, iconColor, label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
};

const btnPrimary = {
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
  border: 'none', background: '#2563eb', color: 'white',
  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
};

const btnSecondary = {
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0', background: 'white',
  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569'
};

export default AdminEstablishmentsPage;
