import React, { useState, useEffect, useCallback } from 'react';
import { Plus, AlertCircle, Copy } from 'lucide-react';
import api, { adminService } from '@/lib/api';
import { useSquare } from '@/contexts/SquareContext.hooks';
import { showToast } from '@/components/Toast.utils';
import PendingDriversBanner from './admin-drivers/PendingDriversBanner';
import DriversTable from './admin-drivers/DriversTable';
import DriverCreateModal from './admin-drivers/DriverCreateModal';
import DriverDetailsModal from './admin-drivers/DriverDetailsModal';
import DriverEditModal from './admin-drivers/DriverEditModal';

const DEFAULT_FORM = {
  email: '', password: '123456', first_name: '', last_name: '',
  phone: '', cpf: '', vehicle_type: 'MOTORCYCLE', vehicle_plate: '',
  vehicle_model: '', vehicle_year: '', driver_license: '',
  pix_key: '', bank_account: '', tenant_id: '', square_id: '', max_concurrent_orders: '3'
};

const AdminDriversPage = () => {
  const { squareId } = useSquare();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [squares, setSquares] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [establishments, setEstablishments] = useState([]);

  // Verificar se é super admin
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user?.user_type === 'ADMIN' && user?.is_super_admin;

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const loadDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getDrivers(page, 20, search, statusFilter, squareId);
      setDrivers(response.drivers || []);
      setTotalPages(response.pages || 1);
      setTotal(response.total || 0);
    } catch (err) {
      setError('Erro ao carregar entregadores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, squareId]);

  const loadEstablishments = useCallback(async () => { try { const data = await adminService.getEstablishments(1, 100, '', squareId); setEstablishments(data.establishments || []); } catch { /* intentionally empty */ } }, [squareId]);

  useEffect(() => { loadDrivers(); loadSquares(); loadEstablishments(); loadPendingDrivers(); if (isSuperAdmin) loadTenants(); }, [page, statusFilter, squareId, isSuperAdmin, loadDrivers, loadEstablishments]);

  const loadPendingDrivers = async () => {
    try {
      const response = await api.get('/api/admin/pending-users');
      const users = (response.data.users || []).filter(u => u.user_type === 'DRIVER');
      setPendingDrivers(users);
    } catch {
      // Silently fail
    }
  };

  const handleApproveDriver = async (userId) => {
    try {
      await api.post(`/api/admin/users/${userId}/approve`);
      showToast('Entregador aprovado!', 'success');
      loadPendingDrivers();
      loadDrivers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao aprovar', 'error');
    }
  };

  const handleRejectDriver = async (userId) => {
    if (!window.confirm('Rejeitar e excluir este cadastro?')) return;
    try {
      await api.post(`/api/admin/users/${userId}/reject`);
      showToast('Cadastro rejeitado', 'info');
      loadPendingDrivers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao rejeitar', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Excluir ${name}? Esta ação não pode ser desfeita.`)) return;
    try {
      await adminService.deleteUser(id);
      loadDrivers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir', 'error');
    }
  };

  const openEditForm = (driver) => {
    setEditing(driver);
    setEditData({
      first_name: driver.user?.first_name || '',
      last_name: driver.user?.last_name || '',
      phone: driver.user?.phone || '',
      email: driver.user?.email || '',
      cpf: driver.user?.cpf || '',
      vehicle_type: driver.vehicle_type || 'MOTORCYCLE',
      vehicle_plate: driver.vehicle_plate || '',
      vehicle_model: driver.vehicle_model || '',
      vehicle_year: driver.vehicle_year || '',
      driver_license: driver.driver_license || '',
      pix_key: driver.pix_key || '',
      bank_account: driver.bank_account || '',
      max_concurrent_orders: driver.max_concurrent_orders || 3,
      tenant_id: driver.tenant_id || '',
      square_id: driver.square_id || ''
    });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await api.put(`/api/admin/drivers/${editing.id}`, editData);
      // Mensagem específica para transferência de praça
      if (editData.square_id && editing?.square_id && String(editData.square_id) !== String(editing.square_id)) {
        const targetSquare = squares.find(s => s.id === parseInt(editData.square_id));
        showToast(`Entregador transferido para ${targetSquare?.name || 'nova praça'} com sucesso!`, 'success');
      } else {
        showToast('Entregador atualizado com sucesso!', 'success');
      }
      setEditing(null);
      loadDrivers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao atualizar entregador');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditFieldChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const loadSquares = async () => { try { const data = await adminService.getSquares(); setSquares(data.squares || []); } catch { /* intentionally empty */ } };
  const loadTenants = async () => { try { const res = await api.get('/api/platform/tenants'); setTenants(res.data.tenants || []); } catch { /* intentionally empty */ } };

  const handleConvertToOwn = async () => {
    const select = document.getElementById('convert-restaurant');
    const restaurantId = select?.value;
    if (!restaurantId) {
      showToast('Selecione um estabelecimento', 'error');
      return;
    }
    const estName = establishments.find(e => e.id === parseInt(restaurantId))?.name || 'estabelecimento';
    if (!window.confirm(`Converter "${editing.user?.first_name}" para entregador próprio de "${estName}"?\n\nO entregador será desativado da plataforma e criado como entregador próprio.`)) return;

    try {
      setFormLoading(true);
      await api.post(`/api/admin/drivers/${editing.id}/convert-to-own`, { restaurant_id: parseInt(restaurantId) });
      showToast(`Entregador convertido para ${estName}!`, 'success');
      setShowEdit(false);
      loadDrivers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao converter entregador', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const openCreateForm = () => { setFormData({ ...DEFAULT_FORM }); setFormError(''); setShowForm(true); };

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/register`;
    const notify = () => showToast('Link copiado!\n\nEnvie para o entregador se cadastrar:\n' + link, 'info');
    navigator.clipboard.writeText(link).then(notify).catch(() => {
      const ta = document.createElement('textarea'); ta.value = link;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      notify();
    });
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
      const result = await api.post('/api/admin/drivers', formData);
      setShowForm(false);
      loadDrivers();
      showToast('Entregador criado com sucesso! Email: ' + result.driver.email, 'info');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao criar entregador');
    } finally {
      setFormLoading(false);
    }
  };

  const openDetails = async (driver) => {
    try { const data = await adminService.getDriverDetails(driver.id); setShowDetails(data); } catch (err) { console.error(err); }
  };

  const handleSearchChange = (value) => { setSearch(value); setPage(1); };
  const handleStatusChange = (value) => { setStatusFilter(value); setPage(1); };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Entregadores</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>{total} entregador(es) cadastrado(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={copyRegistrationLink} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', color: '#374151',
            fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer'
          }}>
            <Copy size={16} /> LINK DE CADASTRO
          </button>
          <button onClick={openCreateForm} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
          }}>
            <Plus size={18} /> NOVO ENTREGADOR
          </button>
        </div>
      </div>

      <PendingDriversBanner
        pendingDrivers={pendingDrivers}
        onApprove={handleApproveDriver}
        onReject={handleRejectDriver}
      />

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <DriversTable
        drivers={drivers}
        loading={loading}
        search={search}
        statusFilter={statusFilter}
        page={page}
        totalPages={totalPages}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onPageChange={setPage}
        onOpenDetails={openDetails}
        onOpenEdit={openEditForm}
        onDelete={handleDelete}
        onReload={loadDrivers}
      />

      {showForm && (
        <DriverCreateModal
          formData={formData}
          formError={formError}
          formLoading={formLoading}
          isSuperAdmin={isSuperAdmin}
          tenants={tenants}
          squares={squares}
          onClose={() => setShowForm(false)}
          onChange={handleFormChange}
          onSubmit={handleSubmitForm}
        />
      )}

      <DriverDetailsModal
        driver={showDetails}
        onClose={() => setShowDetails(null)}
      />

      {showEdit && (
        <DriverEditModal
          editing={editing}
          editData={editData}
          formError={formError}
          formLoading={formLoading}
          isSuperAdmin={isSuperAdmin}
          tenants={tenants}
          squares={squares}
          establishments={establishments}
          onClose={() => setShowEdit(false)}
          onChange={handleEditFieldChange}
          onSubmit={handleEdit}
          onConvertToOwn={handleConvertToOwn}
        />
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

export default AdminDriversPage;
