import React, { useState, useEffect } from 'react';
import {
  Users, Search, Plus, AlertCircle, Truck, Phone, Mail,
  Star, X, Edit, Eye, MapPin, User, Trash2
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminDriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [squares, setSquares] = useState([]);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [editData, setEditData] = useState({});
  const [formData, setFormData] = useState({
    email: '', password: '123456', first_name: '', last_name: '',
    phone: '', cpf: '', vehicle_type: 'MOTORCYCLE', vehicle_plate: '',
    vehicle_model: '', vehicle_year: '', driver_license: '',
    pix_key: '', bank_account: '', square_id: '', max_concurrent_orders: '3'
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { loadDrivers(); loadSquares(); }, [page, statusFilter]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDrivers(page, 20, search, statusFilter);
      setDrivers(response.drivers || []);
      setTotalPages(response.pages || 1);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Erro ao carregar entregadores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Excluir ${name}? Esta ação não pode ser desfeita.`)) return;
    try {
      await adminService.deleteUser(id);
      loadDrivers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  const openEditForm = (driver) => {
    setEditing(driver);
    setEditData({
      first_name: driver.user?.first_name || '',
      last_name: driver.user?.last_name || '',
      phone: driver.user?.phone || '',
      email: driver.user?.email || '',
      vehicle_type: driver.vehicle_type || 'MOTORCYCLE',
      vehicle_plate: driver.vehicle_plate || '',
      vehicle_model: driver.vehicle_model || '',
      pix_key: driver.pix_key || '',
      max_concurrent_orders: driver.max_concurrent_orders || 3
    });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await adminService.updateUser(editing.user_id, editData);
      setShowEdit(null);
      loadDrivers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar');
    } finally {
      setFormLoading(false);
    }
  };

  const loadSquares = async () => {
    try {
      const data = await adminService.getSquares();
      setSquares(data.squares || []);
    } catch (e) {}
  };

  const openCreateForm = () => {
    setFormData({
      email: '', password: '123456', first_name: '', last_name: '',
      phone: '', cpf: '', vehicle_type: 'MOTORCYCLE', vehicle_plate: '',
      vehicle_model: '', vehicle_year: '', driver_license: '',
      pix_key: '', bank_account: '', square_id: '', max_concurrent_orders: '3'
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
    if (!formData.email || !formData.first_name || !formData.last_name) {
      setFormError('Email, nome e sobrenome são obrigatórios');
      return;
    }

    try {
      setFormLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';
      const response = await fetch(`${API_URL}/api/admin/drivers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (response.ok) {
        setShowForm(false);
        loadDrivers();
        alert(`Entregador criado!\nEmail: ${result.driver.email}\nSenha: ${result.driver.password}`);
      } else {
        setFormError(result.error || 'Erro ao criar entregador');
      }
    } catch (err) {
      setFormError('Erro ao criar entregador');
    } finally {
      setFormLoading(false);
    }
  };

  const openDetails = async (driver) => {
    try {
      const data = await adminService.getDriverDetails(driver.id);
      setShowDetails(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Entregadores</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>{total} entregador(es) cadastrado(s)</p>
        </div>
        <button onClick={openCreateForm} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white',
          fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
        }}>
          <Plus size={18} /> NOVO ENTREGADOR
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
          <input type="text" placeholder="Buscar por nome, e-mail ou telefone..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[{ key: 'all', label: 'Todos' }, { key: 'online', label: 'Online' }, { key: 'offline', label: 'Offline' }].map(f => (
            <button key={f.key} onClick={() => { setStatusFilter(f.key); setPage(1); }} style={{
              padding: '0.5rem 1rem', borderRadius: '9999px', border: 'none',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
              background: statusFilter === f.key ? '#2563eb' : '#f1f5f9',
              color: statusFilter === f.key ? 'white' : '#64748b'
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading && drivers.length === 0 ? (
        <div style={{ minHeight: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : drivers.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Truck size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhum entregador encontrado</p>
        </div>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }} className="table-header">
              <span>Entregador</span><span style={{ textAlign: 'center' }}>Veículo</span><span style={{ textAlign: 'center' }}>Status</span><span style={{ textAlign: 'center' }}>Avaliação</span><span style={{ textAlign: 'center' }}>Entregas</span><span style={{ textAlign: 'center' }}>Ações</span>
            </div>
            {drivers.map(driver => (
              <div key={driver.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '1rem 1.25rem', borderBottom: '1px solid #f8fafc', alignItems: 'center', cursor: 'pointer' }} className="table-row" onClick={() => openDetails(driver)}>
                <div>
                  <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{driver.user?.first_name} {driver.user?.last_name}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{driver.user?.email}</p>
                </div>
                <span style={{ textAlign: 'center', fontSize: '0.8125rem' }}>{utils.getStatusText(driver.vehicle_type)}</span>
                <span style={{ textAlign: 'center' }}>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: driver.is_online ? '#dcfce7' : '#f1f5f9', color: driver.is_online ? '#16a34a' : '#94a3b8' }}>
                    {driver.is_online ? 'Online' : 'Offline'}
                  </span>
                </span>
                <span style={{ textAlign: 'center' }}>
                  {driver.rating ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Star size={14} fill="#f59e0b" stroke="#f59e0b" /> <span style={{ fontSize: '0.8125rem' }}>{driver.rating}</span></span> : '-'}
                </span>
                <span style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{driver.total_deliveries}</span>
                <div style={{ textAlign: 'center', display: 'flex', gap: '0.25rem', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openDetails(driver)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }} title="Ver detalhes">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => openEditForm(driver)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }} title="Editar">
                    <Edit size={14} />
                  </button>
                  <button onClick={async (e) => { e.stopPropagation(); try { await adminService.updateDriverStatus(driver.id, driver.is_online ? 'INACTIVE' : 'ACTIVE'); loadDrivers(); } catch (err) { alert(err.response?.data?.error || 'Erro'); } }} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: driver.is_online ? '#16a34a' : '#94a3b8' }} title={driver.is_online ? 'Colocar offline' : 'Colocar online'}>
                    {driver.is_online ? <Truck size={14} /> : <Truck size={14} />}
                  </button>
                  <button onClick={async (e) => { e.stopPropagation(); if (!window.confirm('Suspender este entregador?')) return; try { await adminService.updateDriverStatus(driver.id, 'SUSPENDED'); loadDrivers(); } catch (err) { alert(err.response?.data?.error || 'Erro'); } }} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#f59e0b' }} title="Suspender">
                    <Clock size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(driver.id, driver.user?.first_name + ' ' + driver.user?.last_name); }} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }} title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Paginacao */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pagBtn(page === 1)}>Anterior</button>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pagBtn(page === totalPages)}>Próxima</button>
            </div>
          )}
        </>
      )}

      {/* Modal Criar Entregador */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Novo Entregador</h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem' }}>
              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={14} /> {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <FormField label="Nome *">
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleFormChange} style={inputStyle} placeholder="João" />
                </FormField>
                <FormField label="Sobrenome *">
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleFormChange} style={inputStyle} placeholder="Silva" />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <FormField label="E-mail *">
                  <input type="email" name="email" value={formData.email} onChange={handleFormChange} style={inputStyle} placeholder="entregador@email.com" />
                </FormField>
                <FormField label="Senha">
                  <input type="text" name="password" value={formData.password} onChange={handleFormChange} style={inputStyle} />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <FormField label="Telefone">
                  <input type="text" name="phone" value={formData.phone} onChange={handleFormChange} style={inputStyle} placeholder="(53) 99999-0000" />
                </FormField>
                <FormField label="CPF">
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleFormChange} style={inputStyle} placeholder="000.000.000-00" />
                </FormField>
              </div>

              <FormField label="Praça">
                <select name="square_id" value={formData.square_id} onChange={handleFormChange} style={inputStyle}>
                  <option value="">Selecione uma praça</option>
                  {squares.map(sq => (
                    <option key={sq.id} value={sq.id}>{sq.name} - {sq.city}/{sq.state}</option>
                  ))}
                </select>
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <FormField label="Tipo de Veículo">
                  <select name="vehicle_type" value={formData.vehicle_type} onChange={handleFormChange} style={inputStyle}>
                    <option value="MOTORCYCLE">Moto</option>
                    <option value="CAR">Carro</option>
                    <option value="BICYCLE">Bicicleta</option>
                    <option value="FOOT">A pé</option>
                  </select>
                </FormField>
                <FormField label="Placa">
                  <input type="text" name="vehicle_plate" value={formData.vehicle_plate} onChange={handleFormChange} style={inputStyle} placeholder="ABC1D23" />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <FormField label="Modelo">
                  <input type="text" name="vehicle_model" value={formData.vehicle_model} onChange={handleFormChange} style={inputStyle} placeholder="Honda CG 160" />
                </FormField>
                <FormField label="Ano">
                  <input type="number" name="vehicle_year" value={formData.vehicle_year} onChange={handleFormChange} style={inputStyle} placeholder="2024" />
                </FormField>
              </div>

              <FormField label="CNH">
                <input type="text" name="driver_license" value={formData.driver_license} onChange={handleFormChange} style={inputStyle} placeholder="Número da CNH" />
              </FormField>

              <FormField label="Máximo de Pedidos Simultâneos">
                <input type="number" name="max_concurrent_orders" min="1" max="10" value={formData.max_concurrent_orders} onChange={handleFormChange} style={inputStyle} />
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>Quantidade máxima de pedidos que o entregador pode ter ao mesmo tempo (configurável pelo admin)</p>
              </FormField>

              <FormField label="Chave PIX">
                <input type="text" name="pix_key" value={formData.pix_key} onChange={handleFormChange} style={inputStyle} placeholder="CPF, email ou chave aleatória" />
              </FormField>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancelar</button>
                <button type="submit" disabled={formLoading} style={{ ...btnPrimary, opacity: formLoading ? 0.7 : 1 }}>
                  {formLoading ? 'Criando...' : 'Criar Entregador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetails && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Detalhes do Entregador</h2>
              <button onClick={() => setShowDetails(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={24} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{showDetails.user?.first_name} {showDetails.user?.last_name}</h3>
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{showDetails.user?.email}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <InfoBox label="Veículo" value={utils.getStatusText(showDetails.vehicle_type)} />
                <InfoBox label="Placa" value={showDetails.vehicle_plate || '-'} />
                <InfoBox label="Avaliação" value={showDetails.statistics?.average_rating ? `${showDetails.statistics.average_rating} ⭐` : '-'} />
                <InfoBox label="Entregas" value={showDetails.total_deliveries || 0} />
                <InfoBox label="Ganhos Totais" value={utils.formatCurrency(showDetails.statistics?.total_earnings || 0)} />
                <InfoBox label="Status" value={showDetails.is_online ? 'Online' : 'Offline'} color={showDetails.is_online ? '#16a34a' : '#94a3b8'} />
              </div>
              {showDetails.pix_key && (
                <div style={{ padding: '0.75rem', background: '#f0fdfa', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>PIX</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{showDetails.pix_key}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Entregador */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Editar Entregador</h2>
              <button onClick={() => setShowEdit(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <FormField label="Nome"><input type="text" value={editData.first_name} onChange={e => setEditData(p => ({ ...p, first_name: e.target.value }))} style={inputStyle} /></FormField>
                <FormField label="Sobrenome"><input type="text" value={editData.last_name} onChange={e => setEditData(p => ({ ...p, last_name: e.target.value }))} style={inputStyle} /></FormField>
              </div>
              <FormField label="Telefone"><input type="text" value={editData.phone} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Email"><input type="email" value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Tipo de Veículo">
                <select value={editData.vehicle_type} onChange={e => setEditData(p => ({ ...p, vehicle_type: e.target.value }))} style={inputStyle}>
                  <option value="MOTORCYCLE">Moto</option>
                  <option value="CAR">Carro</option>
                  <option value="BICYCLE">Bicicleta</option>
                  <option value="FOOT">A pé</option>
                </select>
              </FormField>
              <FormField label="Placa"><input type="text" value={editData.vehicle_plate} onChange={e => setEditData(p => ({ ...p, vehicle_plate: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Chave PIX"><input type="text" value={editData.pix_key} onChange={e => setEditData(p => ({ ...p, pix_key: e.target.value }))} style={inputStyle} /></FormField>
              <FormField label="Máx. Pedidos Simultâneos"><input type="number" min="1" max="10" value={editData.max_concurrent_orders} onChange={e => setEditData(p => ({ ...p, max_concurrent_orders: e.target.value }))} style={inputStyle} /></FormField>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEdit(false)} style={btnSecondary}>Cancelar</button>
                <button type="submit" disabled={formLoading} style={{ ...btnPrimary, opacity: formLoading ? 0.7 : 1 }}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .table-header { display: grid; }
        .table-row:hover { background: #f8fafc; }
        @media (max-width: 768px) { .table-header { display: none; } .table-row { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{label}</label>
    {children}
  </div>
);

const InfoBox = ({ label, value, color }) => (
  <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem' }}>
    <p style={{ fontSize: '0.625rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: color || '#1e293b' }}>{value}</p>
  </div>
);

const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0',
  borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
};

const btnPrimary = {
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none',
  background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
};

const btnSecondary = {
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0', background: 'white',
  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569'
};

const pagBtn = (disabled) => ({
  padding: '0.5rem 1rem', borderRadius: '0.375rem',
  border: '1px solid #e2e8f0', background: 'white',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1, fontSize: '0.875rem'
});

export default AdminDriversPage;
