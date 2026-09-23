import React from 'react';
import { Search, Bike, Eye, Edit, Trash2, Clock } from 'lucide-react';
import { utils } from '@/lib/api';
import { showToast } from '@/components/Toast';
import { adminService } from '@/lib/api';
import { pagBtn } from './shared';

const DriversTable = ({
  drivers, loading, search, statusFilter, page, totalPages,
  onSearchChange, onStatusChange, onPageChange,
  onOpenDetails, onOpenEdit, onDelete, onReload,
}) => {
  const handleToggleOnline = async (driver) => {
    try {
      await adminService.updateDriverStatus(driver.id, driver.is_online ? 'OFFLINE' : 'ONLINE');
      onReload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro', 'error');
    }
  };

  const handleSuspend = async (driver) => {
    if (!window.confirm('Suspender este entregador?')) return;
    try {
      await adminService.updateDriverStatus(driver.id, 'SUSPENDED');
      onReload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro', 'error');
    }
  };

  return (
    <>
      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input type="text" placeholder="Buscar por nome, e-mail ou telefone..." value={search}
            onChange={e => { onSearchChange(e.target.value); }}
            style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[{ key: 'all', label: 'Todos' }, { key: 'online', label: 'Online' }, { key: 'offline', label: 'Offline' }].map(f => (
            <button key={f.key} onClick={() => onStatusChange(f.key)} style={{
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
          <Bike size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhum entregador encontrado</p>
        </div>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }} className="table-header">
              <span>Entregador</span><span style={{ textAlign: 'center' }}>Veículo</span><span style={{ textAlign: 'center' }}>Status</span><span style={{ textAlign: 'center' }}>Praça</span><span style={{ textAlign: 'center' }}>Entregas</span><span style={{ textAlign: 'center' }}>Ações</span>
            </div>
            {drivers.map(driver => (
              <div key={driver.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '1rem 1.25rem', borderBottom: '1px solid #f8fafc', alignItems: 'center', cursor: 'pointer' }} className="table-row" onClick={() => onOpenDetails(driver)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails(driver); } }}>
                <div>
                  <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{driver.user?.first_name} {driver.user?.last_name}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{driver.user?.email}</p>
                </div>
                <span style={{ textAlign: 'center', fontSize: '0.8125rem' }}>{utils.getStatusText(driver.vehicle_type)}</span>
                <span style={{ textAlign: 'center' }}>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: driver.is_online ? '#dcfce7' : '#f1f5f9', color: driver.is_online ? '#16a34a' : '#64748b' }}>
                    {driver.is_online ? 'Online' : 'Offline'}
                  </span>
                </span>
                <span style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                  {driver.square_name || '-'}
                </span>
                <span style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{driver.total_deliveries}</span>
                <div style={{ textAlign: 'center', display: 'flex', gap: '0.25rem', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => onOpenDetails(driver)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }} title="Ver detalhes">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => onOpenEdit(driver)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }} title="Editar">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleToggleOnline(driver)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: driver.is_online ? '#16a34a' : '#64748b' }} title={driver.is_online ? 'Colocar offline' : 'Colocar online'}>
                    <Bike size={14} />
                  </button>
                  <button onClick={() => handleSuspend(driver)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#f59e0b' }} title="Suspender">
                    <Clock size={14} />
                  </button>
                  <button onClick={() => onDelete(driver.id, driver.user?.first_name + ' ' + driver.user?.last_name)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }} title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Paginacao */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => onPageChange(p => Math.max(1, p - 1))} disabled={page === 1} style={pagBtn(page === 1)}>Anterior</button>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{page} / {totalPages}</span>
              <button onClick={() => onPageChange(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pagBtn(page === totalPages)}>Próxima</button>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default DriversTable;
