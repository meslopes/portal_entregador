import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, AlertCircle, Loader2, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';
import { confirmDestructive } from '@/lib/utils';

/**
 * Lixeira de TENANTS (2026-11-27) — mesmo fluxo da lixeira de usuários:
 * exclusão = soft delete; prazo de retenção (padrão 90 dias); restaurar ou
 * excluir permanentemente (aí sim apaga os dados).
 */
const TenantTrashModal = ({ isOpen, onClose, onRestore }) => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [retentionDays, setRetentionDays] = useState(90);
  const [processing, setProcessing] = useState(false);

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/platform/tenants/deleted');
      setTenants(res.data.tenants || []);
      setSelected([]);
      if (res.data.config?.retention_days) setRetentionDays(res.data.config.retention_days);
    } catch {
      showToast('Erro ao carregar lixeira', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadTrash();
  }, [isOpen, loadTrash]);

  const handleRestore = async (tenantId) => {
    try {
      setProcessing(true);
      await api.post(`/api/platform/tenants/${tenantId}/restore`);
      showToast('Tenant restaurado com sucesso!', 'success');
      loadTrash();
      if (onRestore) onRestore();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao restaurar', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handlePermanentDelete = async (tenantId) => {
    if (!confirmDestructive('APAGAR', 'Excluir PERMANENTEMENTE este tenant e TODOS os seus dados? Esta ação é IRREVERSÍVEL.')) return;
    try {
      setProcessing(true);
      await api.delete(`/api/platform/tenants/${tenantId}/permanent`);
      showToast('Tenant excluído permanentemente', 'success');
      loadTrash();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selected.length === 0) return;
    try {
      setProcessing(true);
      for (const tid of selected) {
        await api.post(`/api/platform/tenants/${tid}/restore`);
      }
      showToast(`${selected.length} tenant(s) restaurado(s)!`, 'success');
      setSelected([]);
      loadTrash();
      if (onRestore) onRestore();
    } catch {
      showToast('Erro ao restaurar tenants', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirmDestructive('APAGAR TUDO', `Excluir PERMANENTEMENTE ${selected.length} tenant(s) e TODOS os dados? Esta ação é IRREVERSÍVEL.`)) return;
    try {
      setProcessing(true);
      await api.post('/api/platform/tenants/cleanup-deleted', { tenant_ids: selected });
      showToast(`${selected.length} tenant(s) excluído(s) permanentemente`, 'success');
      setSelected([]);
      loadTrash();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao excluir', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (tid) => {
    setSelected(prev => (prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]));
  };

  const toggleSelectAllOld = () => {
    const old = tenants.filter(t => t.days_deleted >= retentionDays);
    const allSelected = old.every(t => selected.includes(t.id));
    if (allSelected) {
      setSelected(prev => prev.filter(id => !old.find(t => t.id === id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...old.map(t => t.id)])]);
    }
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Lixeira de Tenants</h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{tenants.length} tenant(s) excluído(s) — retenção de {retentionDays} dias</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.5rem' }}>×</button>
        </div>

        {/* Ações em lote */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }} />
          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleBulkRestore} disabled={processing}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, opacity: processing ? 0.7 : 1 }}>
                <RotateCcw size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                Restaurar ({selected.length})
              </button>
              <button onClick={handleBulkDelete} disabled={processing}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ef4444', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, opacity: processing ? 0.7 : 1 }}>
                <Trash2 size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                Excluir ({selected.length})
              </button>
            </div>
          )}
        </div>

        {/* Aviso de retenção */}
        {tenants.some(t => t.days_deleted >= retentionDays) && (
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
          ) : tenants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <Trash2 size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>Lixeira vazia</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tenants.map(tenant => {
                const isOld = tenant.days_deleted >= retentionDays;
                const isSelected = selected.includes(tenant.id);
                return (
                  <div key={tenant.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', background: isOld ? '#fffbeb' : '#f8fafc',
                    borderRadius: '0.5rem', border: `1px solid ${isOld ? '#fde68a' : '#e2e8f0'}`,
                    opacity: processing ? 0.7 : 1
                  }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(tenant.id)}
                      style={{ cursor: 'pointer' }} />
                    <Building2 size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{tenant.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({tenant.slug})</span>
                        {isOld && (
                          <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600,
                            background: '#fef3c7', color: '#92400e'
                          }}>
                            {tenant.days_deleted}d
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                        Excluído há {tenant.days_deleted} dias por {tenant.deleted_by_name}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => handleRestore(tenant.id)} disabled={processing}
                        title="Restaurar"
                        style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: '#dcfce7', color: '#16a34a', cursor: 'pointer', opacity: processing ? 0.5 : 1 }}>
                        <RotateCcw size={16} />
                      </button>
                      <button onClick={() => handlePermanentDelete(tenant.id)} disabled={processing}
                        title="Excluir permanentemente (com todos os dados)"
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

export default TenantTrashModal;
