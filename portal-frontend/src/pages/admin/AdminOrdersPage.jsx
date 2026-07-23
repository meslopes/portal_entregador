import React, { useState, useEffect } from 'react';
import {
  Package, AlertCircle, Store, User, MapPin, Clock,
  ChevronLeft, ChevronRight, Truck, Filter, Edit, Trash2, X, Eye
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const STATUS_FILTERS = [
  { key: '', label: 'Todos', color: '#64748b' },
  { key: 'PENDING', label: 'Pendente', color: '#f59e0b' },
  { key: 'ACCEPTED', label: 'Aceito', color: '#2563eb' },
  { key: 'PREPARING', label: 'Preparando', color: '#8b5cf6' },
  { key: 'READY', label: 'Pronto', color: '#06b6d4' },
  { key: 'PICKED_UP', label: 'Coletado', color: '#3b82f6' },
  { key: 'DELIVERED', label: 'Entregue', color: '#22c55e' },
  { key: 'CANCELLED', label: 'Cancelado', color: '#ef4444' },
];

const STATUS_COLORS = {
  PENDING: { bg: '#fef3c7', text: '#d97706' },
  ACCEPTED: { bg: '#dbeafe', text: '#2563eb' },
  PREPARING: { bg: '#f3e8ff', text: '#8b5cf6' },
  READY: { bg: '#cffafe', text: '#06b6d4' },
  PICKED_UP: { bg: '#dbeafe', text: '#3b82f6' },
  DELIVERED: { bg: '#dcfce7', text: '#22c55e' },
  CANCELLED: { bg: '#fee2e2', text: '#ef4444' },
};

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => { loadOrders(); }, [page, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllOrders(page, 20, statusFilter);
      setOrders(response.orders || []);
      setTotalPages(response.pages || 1);
    } catch (err) {
      setError('Erro ao carregar pedidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Excluir este pedido? Esta ação não pode ser desfeita.')) return;
    try {
      await adminService.adminDeleteOrder(orderId);
      loadOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  const openEditOrder = (order) => {
    setEditingOrder(order);
    setEditData({
      status: order.status,
      delivery_fee: order.delivery_fee,
      total_amount: order.total_amount,
      payment_method: order.payment_method
    });
  };

  const handleEditOrder = async (e) => {
    e.preventDefault();
    try {
      await adminService.adminUpdateOrder(editingOrder.id, editData);
      setEditingOrder(null);
      loadOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar');
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Pedidos</h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie todos os pedidos do sistema</p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Filter size={16} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Filtrar por status</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {STATUS_FILTERS.map(f => {
            const isActive = statusFilter === f.key;
            return (
              <button key={f.key} onClick={() => { setStatusFilter(f.key); setPage(1); }}
                style={{
                  padding: '0.375rem 0.875rem', borderRadius: '9999px',
                  border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  background: isActive ? f.color : '#f1f5f9',
                  color: isActive ? 'white' : '#64748b',
                  transition: 'all 0.15s'
                }}>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {orders.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Package size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Nenhum pedido encontrado</p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Tente ajustar os filtros</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {orders.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: page === 1 ? '#f8fafc' : 'white', color: page === 1 ? '#cbd5e1' : '#475569', fontSize: '0.875rem', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: page === totalPages ? '#f8fafc' : 'white', color: page === totalPages ? '#cbd5e1' : '#475569', fontSize: '0.875rem', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal Editar Pedido */}
      {editingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Editar Pedido #{editingOrder.order_number}</h2>
              <button onClick={() => setEditingOrder(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditOrder} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Status</label>
                <select value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}>
                  {STATUS_FILTERS.filter(f => f.key).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Taxa de Entrega (R$)</label>
                  <input type="number" step="0.01" value={editData.delivery_fee} onChange={e => setEditData(p => ({ ...p, delivery_fee: parseFloat(e.target.value) }))} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Valor Total (R$)</label>
                  <input type="number" step="0.01" value={editData.total_amount} onChange={e => setEditData(p => ({ ...p, total_amount: parseFloat(e.target.value) }))} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingOrder(null)} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const OrderCard = ({ order }) => {
  const statusColor = STATUS_COLORS[order.status] || { bg: '#f1f5f9', text: '#64748b' };

  return (
    <div style={{
      background: 'white', borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.15s', overflow: 'hidden'
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>#{order.order_number}</span>
          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: statusColor.bg, color: statusColor.text }}>
            {utils.getStatusText(order.status)}
          </span>
          <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500, background: '#f1f5f9', color: '#64748b' }}>
            {utils.getStatusText(order.payment_method)}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
          <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Taxa: {utils.formatCurrency(order.delivery_fee)}</p>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
          {/* Restaurante */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Store size={14} style={{ color: '#d97706' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restaurante</p>
              <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.restaurant?.name}</p>
            </div>
          </div>

          {/* Cliente */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={14} style={{ color: '#2563eb' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</p>
              <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>{order.customer?.name}</p>
            </div>
          </div>

          {/* Endereço */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={14} style={{ color: '#16a34a' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrega</p>
              <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.delivery_address?.street}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {order.driver && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', padding: '0.25rem 0.625rem', borderRadius: '9999px' }}>
                <Truck size={11} /> {order.driver.name}
              </span>
            )}
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: '#94a3b8' }}>
            <Clock size={11} /> {utils.formatDateTime(order.created_at)}
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button onClick={(e) => { e.stopPropagation(); openEditOrder(order); }} style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }} title="Editar">
              <Edit size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }} title="Excluir">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
