import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { adminService } from '@/lib/api';
import { showToast } from '@/components/Toast';

const TrashModal = ({ isOpen, onClose, onRestore, userType = null }) => {
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [retentionDays, setRetentionDays] = useState(90);
  const [filterDays, setFilterDays] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDeletedUsers();
      loadRetentionConfig();
    }
  }, [isOpen, filterDays]);

  const loadDeletedUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDeletedUsers(filterDays || null, userType);
      setDeletedUsers(data.users || []);
      setSelectedUsers([]);
    } catch (err) {
      showToast('Erro ao carregar lixeira', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRetentionConfig = async () => {
    try {
      const data = await adminService.getRetentionConfig();
      setRetentionDays(data.retention_days || 90);
    } catch {}
  };

  const handleRestore = async (userId) => {
    try {
      setProcessing(true);
      await adminService.restoreUser(userId);
      showToast('Usuário restaurado com sucesso!', 'success');
      loadDeletedUsers();
      if (onRestore) onRestore();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao restaurar', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handlePermanentDelete = async (userId) => {
    if (!window.confirm('Tem certeza? Esta ação é IRREVERSÍVEL.')) return;
    try {
      setProcessing(true);
      await adminService.deleteUserPermanent(userId);
      showToast('Usuário excluído permanentemente', 'success');
      loadDeletedUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedUsers.length === 0) return;
    try {
      setProcessing(true);
      for (const userId of selectedUsers) {
        await adminService.restoreUser(userId);
      }
      showToast(`${selectedUsers.length} usuário(s) restaurado(s)!`, 'success');
      setSelectedUsers([]);
      loadDeletedUsers();
      if (onRestore) onRestore();
    } catch (err) {
      showToast('Erro ao restaurar usuários', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir PERMANENTEMENTE ${selectedUsers.length} usuário(s)? Esta ação é IRREVERSÍVEL.`)) return;
    try {
      setProcessing(true);
      await adminService.cleanupDeletedUsers(selectedUsers);
      showToast(`${selectedUsers.length} usuário(s) excluído(s) permanentemente`, 'success');
      setSelectedUsers([]);
      loadDeletedUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllOld = () => {
    const oldUsers = deletedUsers.filter(u => u.days_deleted >= retentionDays);
    const allSelected = oldUsers.every(u => selectedUsers.includes(u.id));
    if (allSelected) {
      setSelectedUsers(prev => prev.filter(id => !oldUsers.find(u => u.id === id)));
    } else {
      setSelectedUsers(prev => [...new Set([...prev, ...oldUsers.map(u => u.id)])]);
    }
  };

  const getTypeLabel = (type) => {
    const labels = { ADMIN: 'Admin', DRIVER: 'Entregador', CLIENT: 'Estabelecimento' };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = { ADMIN: '#2563eb', DRIVER: '#0891b2', CLIENT: '#16a34a' };
    return colors[type] || '#64748b';
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '700px',
        maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 100000
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={20} style={{ color: '#d97706' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Lixeira</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{deletedUsers.length} usuário(s) excluído(s)</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem' }}>×</button>
        </div>

        {/* Filtros */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterDays} onChange={e => setFilterDays(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: 'white' }}>
            <option value="">Todos</option>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
          <div style={{ flex: 1 }} />
          {selectedUsers.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleBulkRestore} disabled={processing}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, opacity: processing ? 0.7 : 1 }}>
                <RotateCcw size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                Restaurar ({selectedUsers.length})
              </button>
              <button onClick={handleBulkDelete} disabled={processing}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ef4444', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, opacity: processing ? 0.7 : 1 }}>
                <Trash2 size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                Excluir ({selectedUsers.length})
              </button>
            </div>
          )}
        </div>

        {/* Aviso de retenção */}
        {deletedUsers.some(u => u.days_deleted >= retentionDays) && (
          <div style={{ margin: '1rem 1.5rem', padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
            <p style={{ fontSize: '0.8125rem', color: '#92400e', flex: 1 }}>
              Existem registros com mais de {retentionDays} dias. Considere limpar para liberar espaço.
            </p>
            <button onClick={toggleSelectAllOld}
              style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d97706', background: 'white', color: '#d97706', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Selecionar antigos
            </button>
          </div>
        )}

        {/* Lista */}
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />
            </div>
          ) : deletedUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <Trash2 size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>Lixeira vazia</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {deletedUsers.map(user => {
                const isOld = user.days_deleted >= retentionDays;
                const isSelected = selectedUsers.includes(user.id);
                return (
                  <div key={user.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', background: isOld ? '#fffbeb' : '#f8fafc',
                    borderRadius: '0.5rem', border: `1px solid ${isOld ? '#fde68a' : '#e2e8f0'}`,
                    opacity: processing ? 0.7 : 1
                  }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(user.id)}
                      style={{ cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                          {user.first_name} {user.last_name}
                        </span>
                        <span style={{
                          padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600,
                          background: `${getTypeColor(user.user_type)}15`, color: getTypeColor(user.user_type)
                        }}>
                          {getTypeLabel(user.user_type)}
                        </span>
                        {isOld && (
                          <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600,
                            background: '#fef3c7', color: '#92400e'
                          }}>
                            {user.days_deleted}d
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                        {user.email} • Excluído há {user.days_deleted} dias por {user.deleted_by_name}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => handleRestore(user.id)} disabled={processing}
                        title="Restaurar"
                        style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: '#dcfce7', color: '#16a34a', cursor: 'pointer', opacity: processing ? 0.5 : 1 }}>
                        <RotateCcw size={16} />
                      </button>
                      <button onClick={() => handlePermanentDelete(user.id)} disabled={processing}
                        title="Excluir permanentemente"
                        style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', opacity: processing ? 0.5 : 1 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
};

export default TrashModal;
