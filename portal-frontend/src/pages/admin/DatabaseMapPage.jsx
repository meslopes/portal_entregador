import React, { useState, useEffect, useRef, useMemo } from 'react';
import api, { adminService } from '@/lib/api';
import { showToast } from '@/components/Toast.utils';
import HeaderToolbar from './database-map/HeaderToolbar';
import EditUserModal from './database-map/EditUserModal';
import { handleGeneratePDF as generatePdf } from './database-map/generatePdfReport';
import {
  TenantsSection,
  SquaresSection,
  UsersSection,
  RestaurantsSection,
  PlatformDriversSection,
  OwnDriversSection,
  OrderSummarySection,
  RecentOrdersSection,
} from './database-map/MapFilters';

const DatabaseMapPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const msgTimeoutRef = useRef(null);
  const [actionMsg, setActionMsg] = useState('');
  const [selectedSquareId, setSelectedSquareId] = useState('all');
  const [showSquareDropdown, setShowSquareDropdown] = useState(false);

  // Filtrar dados por praça selecionada
  const filteredData = useMemo(() => {
    if (!data || selectedSquareId === 'all') return data;
    const sid = parseInt(selectedSquareId);
    return {
      ...data,
      users: (data.users || []).filter(u => u.square_id === sid),
      restaurants: (data.restaurants || []).filter(r => r.square_id === sid),
      platform_drivers: (data.platform_drivers || []).filter(d => d.square_id === sid),
      own_drivers: (data.own_drivers || []).filter(d => d.square_id === sid),
    };
  }, [data, selectedSquareId]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/database-map');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar mapa');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg, isError = false) => {
    if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current);
    setActionMsg({ text: msg, isError });
    msgTimeoutRef.current = setTimeout(() => setActionMsg(''), 4000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => { if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current); };
  }, []);

  // Download backup do banco de dados como JSON
  const handleDownloadBackup = () => {
    if (!data) {
      showToast('Nenhum dado carregado para backup', 'error');
      return;
    }
    const backup = {
      exported_at: new Date().toISOString(),
      source: 'muvlog-database-map',
      version: '1.0',
      ...data
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `muvlog-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Backup baixado com sucesso!', 'success');
  };

  const handleDeleteUser = async (user) => {
    const isSuperAdmin = user.user_type === 'ADMIN' && user.is_super_admin;
    if (isSuperAdmin) { showToast('Não é possível excluir o super admin.', 'info'); return; }
    if (!window.confirm(`Excluir ${user.first_name} ${user.last_name} (${user.email})?\n\nSe tiver pedidos ou dados vinculados, serão desvinculados automaticamente.`)) return;
    try {
      await api.delete(`/api/admin/users/${user.id}?force=true`);
      showMsg(`${user.first_name} ${user.last_name} excluído`);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao excluir', true);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      // User fields
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      cpf: user.cpf || '',
      status: user.status || 'ACTIVE',
      user_type: user.user_type || '',
      tenant_id: user.tenant_id || '',
      // Driver fields
      vehicle_type: user.vehicle_type || 'MOTORCYCLE',
      vehicle_plate: user.vehicle_plate || '',
      vehicle_model: user.vehicle_model || '',
      vehicle_year: user.vehicle_year || '',
      driver_license: user.driver_license || '',
      pix_key: user.pix_key || '',
      bank_account: user.bank_account || '',
      max_concurrent_orders: user.max_concurrent_orders || 3,
      square_id: user.square_id || '',
      // Client fields
      customer_name: user.linked_name || '',
      restaurant_id: user.restaurant_id || '',
      // Password
      new_password: ''
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);

      // Prepare user data (campos comuns + tenant_id para TODOS)
      const userData = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        cpf: editForm.cpf,
        status: editForm.status,
        user_type: editForm.user_type,
        tenant_id: editForm.tenant_id ? parseInt(editForm.tenant_id) : null
      };

      // Add driver-specific fields
      if (editingUser.user_type === 'DRIVER' || editForm.user_type === 'DRIVER') {
        userData.vehicle_type = editForm.vehicle_type;
        userData.vehicle_plate = editForm.vehicle_plate;
        userData.vehicle_model = editForm.vehicle_model;
        userData.vehicle_year = editForm.vehicle_year ? parseInt(editForm.vehicle_year) : null;
        userData.driver_license = editForm.driver_license;
        userData.pix_key = editForm.pix_key;
        userData.bank_account = editForm.bank_account;
        userData.max_concurrent_orders = editForm.max_concurrent_orders ? parseInt(editForm.max_concurrent_orders) : 3;
        userData.square_id = editForm.square_id ? parseInt(editForm.square_id) : null;
      }

      // Add client-specific fields
      if (editingUser.user_type === 'CLIENT' || editForm.user_type === 'CLIENT') {
        userData.customer_name = editForm.customer_name;
        userData.restaurant_id = editForm.restaurant_id || editingUser.restaurant_id;
        userData.square_id = editForm.square_id ? parseInt(editForm.square_id) : null;
      }

      await adminService.updateUser(editingUser.id, userData);

      // Reset password if provided
      if (editForm.new_password && editForm.new_password.length >= 4) {
        try {
          await api.post(`/api/admin/users/${editingUser.id}/reset-password`, {
            new_password: editForm.new_password
          });
        } catch (pwErr) {
          showMsg('Dados salvos, mas erro ao redefinir senha: ' + (pwErr.response?.data?.error || 'erro'), true);
          setSaving(false);
          return;
        }
      }

      showMsg(`${editForm.first_name} ${editForm.last_name} atualizado com sucesso`);
      setEditForm(prev => ({ ...prev, new_password: '' }));
      setEditingUser(null);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao atualizar', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOwnDriver = async (driver) => {
    if (!window.confirm(`Excluir entregador próprio "${driver.name}"?`)) return;
    try {
      await api.delete(`/api/admin/establishment-drivers/${driver.id}`);
      showMsg(`Entregador ${driver.name} excluído`);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao excluir', true);
    }
  };

  const handleDeleteRestaurant = async (restaurant) => {
    if (!window.confirm(`Excluir restaurante "${restaurant.name}"?\n\nPedidos e entregadores vinculados serão desvinculados automaticamente.`)) return;
    try {
      await api.delete(`/api/admin/restaurants/${restaurant.id}?force=true`);
      showMsg(`Restaurante ${restaurant.name} excluído`);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao excluir', true);
    }
  };

  const handleToggleTenant = async (t) => {
    try {
      await api.put(`/api/admin/tenants/${t.id}/toggle-active`, { is_active: !t.is_active });
      showMsg(`Tenant ${t.name} ${t.is_active ? 'desativado' : 'ativado'}`);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao alterar status', true);
    }
  };

  // === GERAR PDF (abre janela de impressão) ===
  const handleGeneratePDF = () => {
    if (!data) return;
    const ok = generatePdf(data);
    if (!ok) {
      showToast('O navegador bloqueou o popup. Permita popups para este site e tente novamente.', 'info');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando mapa do banco...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!data) return null;

  const squares = data.squares || [];
  const d = filteredData || data;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <HeaderToolbar
        squares={squares}
        selectedSquareId={selectedSquareId}
        setSelectedSquareId={setSelectedSquareId}
        showSquareDropdown={showSquareDropdown}
        setShowSquareDropdown={setShowSquareDropdown}
        onCleanupTestData={async () => {
          if (!window.confirm('ATENÇÃO: Isso vai excluir TODOS os dados de teste (pedidos iFood, clientes iFood, restaurantes de teste, entregadores de teste, faturas). Restaurantes reais (FORA DE HORA, BASTA DRINKS) serão mantidos.\n\nContinuar?')) return;
          try {
            const res = await api.post('/api/admin/cleanup-test-data', { action: 'all' });
            showMsg('Limpeza concluída: ' + JSON.stringify(res.data.deleted));
            loadData();
          } catch (err) {
            showMsg(err.response?.data?.error || 'Erro na limpeza', true);
          }
        }}
        onCopyJSON={() => { navigator.clipboard.writeText(JSON.stringify(data, null, 2)); showMsg('JSON copiado! Cole no chat para gerar o PDF.'); }}
        onGeneratePDF={handleGeneratePDF}
        onRefresh={loadData}
        onDownloadBackup={handleDownloadBackup}
        onRestoreBackup={async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (!window.confirm(`Restaurar backup de "${file.name}"?\n\nIsso vai criar/atualizar tenants, praças, usuários e estabelecimentos. Dados existentes serão atualizados.`)) return;
          try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            const res = await api.post('/api/admin/database-restore', backupData);
            showToast(`Restauração concluída: ${res.data.created} criados, ${res.data.updated} atualizados`, 'success');
            loadData();
          } catch (err) {
            showToast(err.response?.data?.error || 'Erro ao restaurar backup', 'error');
          }
          e.target.value = '';
        }}
      />

      {actionMsg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: actionMsg.isError ? '#fef2f2' : '#dcfce7', border: `1px solid ${actionMsg.isError ? '#fecaca' : '#86efac'}`, color: actionMsg.isError ? '#dc2626' : '#166534', fontSize: '0.875rem' }}>
          {actionMsg.text}
        </div>
      )}

      <TenantsSection tenants={data.tenants} onToggleActive={handleToggleTenant} />
      <SquaresSection squares={data.squares} />
      <UsersSection users={d.users} onEdit={openEdit} onDelete={handleDeleteUser} />
      <RestaurantsSection restaurants={d.restaurants} onDelete={handleDeleteRestaurant} />
      <PlatformDriversSection drivers={d.platform_drivers} />
      <OwnDriversSection drivers={d.own_drivers} onDelete={handleDeleteOwnDriver} />
      <OrderSummarySection orderSummary={data.order_summary} />
      <RecentOrdersSection orders={data.recent_orders} />

      <EditUserModal
        editingUser={editingUser}
        editForm={editForm}
        setEditForm={setEditForm}
        saving={saving}
        tenants={data.tenants}
        squares={squares}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveUser}
      />

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#1e40af' }}>
        <strong>Dica:</strong> Esta página consulta o endpoint <code>/api/admin/database-map</code>.
        Atualize após cada deploy para ver o estado atual do banco.
      </div>
    </div>
  );
};

export default DatabaseMapPage;
