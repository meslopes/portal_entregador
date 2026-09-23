import React, { useState, useEffect } from 'react';
import { Plus, Copy, AlertCircle } from 'lucide-react';
import { adminService } from '@/lib/api';
import api from '@/lib/api';
import { useSquare } from '@/contexts/SquareContext';
import { showToast } from '@/components/Toast';
import EstablishmentStats from './establishments/EstablishmentStats';
import PendingApprovals from './establishments/PendingApprovals';
import EstablishmentsList from './establishments/EstablishmentsList';
import EstablishmentForm from './establishments/EstablishmentForm';
import EstablishmentDetails from './establishments/EstablishmentDetails';

const AdminEstablishmentsPage = () => {
  const { squareId } = useSquare();
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [squares, setSquares] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [pendingEstablishments, setPendingEstablishments] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user?.user_type === 'ADMIN' && user?.is_super_admin;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDetails, setShowDetails] = useState(null);

  useEffect(() => {
    loadEstablishments();
    loadSquares();
    loadPendingEstablishments();
    if (isSuperAdmin) loadTenants();
  }, [page, search, squareId]);

  const loadSquares = async () => {
    try { const data = await adminService.getSquares(); setSquares(data.squares || []); } catch { /* intentionally empty */ }
  };

  const loadTenants = async () => {
    try { const res = await api.get('/api/admin/tenants'); setTenants(res.data.tenants || []); } catch { setTenants([]); }
  };

  const loadPendingEstablishments = async () => {
    try {
      const res = await api.get('/api/admin/pending-users');
      setPendingEstablishments((res.data.users || []).filter(u => u.user_type === 'CLIENT'));
    } catch { /* intentionally empty */ }
  };

  const loadEstablishments = async () => {
    try {
      setLoading(true);
      const data = await adminService.getEstablishments(page, 20, search, squareId);
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

  const handleApprove = async (userId) => {
    try {
      await api.post(`/api/admin/users/${userId}/approve`);
      showToast('Estabelecimento aprovado!', 'success');
      loadPendingEstablishments();
      loadEstablishments();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao aprovar', 'error'); }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Rejeitar e excluir este cadastro?')) return;
    try {
      await api.post(`/api/admin/users/${userId}/reject`);
      showToast('Cadastro rejeitado', 'info');
      loadPendingEstablishments();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao rejeitar', 'error'); }
  };

  const handleToggleOwnDrivers = async (establishment) => {
    const newValue = !establishment.has_own_drivers;
    const confirmMsg = newValue
      ? `Ativar entregadores próprios para "${establishment.name}"?\n\nO estabelecimento terá acesso ao menu "Meus Entregadores" e poderá cadastrar seus próprios entregadores.`
      : `Desativar entregadores próprios para "${establishment.name}"?\n\nO estabelecimento usará apenas entregadores da plataforma MUV.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.put(`/api/admin/establishments/${establishment.id}/subscription`, { has_own_drivers: newValue });
      setShowDetails(null);
      await loadEstablishments();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao alterar configuração', 'error'); }
  };

  const openCreateForm = () => { setEditing(null); setShowForm(true); };
  const openEditForm = (est) => { setEditing(est); setShowForm(true); };

  const handleFormSave = () => { setShowForm(false); loadEstablishments(); };

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/client/register`;
    navigator.clipboard.writeText(link).then(() => {
      showToast('Link copiado!\n\nEnvie para o estabelecimento se cadastrar:\n' + link, 'info');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Link copiado!\n\nEnvie para o estabelecimento se cadastrar:\n' + link, 'info');
    });
  };

  const handleDelete = async (id, hasOrders) => {
    if (hasOrders) {
      if (!window.confirm('Este estabelecimento tem pedidos vinculados. Deseja excluir mesmo assim? Todos os pedidos serão apagados.')) return;
    } else {
      if (!window.confirm('Tem certeza que deseja excluir este estabelecimento?')) return;
    }
    try { await adminService.deleteEstablishment(id, hasOrders); loadEstablishments(); }
    catch (err) { showToast(err.response?.data?.error || 'Erro ao excluir', 'error'); }
  };

  const openDetails = async (id) => {
    try { const data = await adminService.getEstablishmentDetails(id); setShowDetails(data); }
    catch { showToast('Erro ao carregar detalhes', 'error'); }
  };

  const toggleActive = async (est) => {
    try { await adminService.updateEstablishment(est.id, { is_active: !est.is_active }); loadEstablishments(); }
    catch { showToast('Erro ao alterar status', 'error'); }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Estabelecimentos</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie todos os estabelecimentos do sistema</p>
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
            borderRadius: '0.5rem', background: '#2563eb', color: 'white', border: 'none',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
          >
            <Plus size={18} /> NOVO ESTABELECIMENTO
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <EstablishmentStats establishments={establishments} total={total} />
      <PendingApprovals pendingEstablishments={pendingEstablishments} onApprove={handleApprove} onReject={handleReject} />
      <EstablishmentsList
        establishments={establishments} loading={loading} search={search}
        page={page} totalPages={totalPages}
        onSearch={e => { setSearch(e.target.value); setPage(1); }}
        onPageChange={setPage} onOpenDetails={openDetails}
        onEdit={openEditForm} onDelete={handleDelete} onToggleActive={toggleActive}
      />

      {showForm && (
        <EstablishmentForm
          editing={editing} isSuperAdmin={isSuperAdmin}
          squares={squares} tenants={tenants}
          onClose={() => setShowForm(false)} onSave={handleFormSave}
        />
      )}

      {showDetails && (
        <EstablishmentDetails
          details={showDetails}
          onClose={() => setShowDetails(null)}
          onEdit={details => { setShowDetails(null); openEditForm(details); }}
          onToggleOwnDrivers={handleToggleOwnDrivers}
        />
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

export default AdminEstablishmentsPage;
