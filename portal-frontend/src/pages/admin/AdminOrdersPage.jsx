import React, { useState, useEffect } from 'react';
import {
  Package, AlertCircle, Store, User, MapPin, Clock,
  ChevronLeft, ChevronRight, Bike, Edit, Trash2, Eye
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useSquare } from '@/contexts/SquareContext';
import DateRangeFilter from '@/components/DateRangeFilter';
import { showToast } from '@/components/Toast';
import { ORDER_STATUS } from '@/constants/status';
import { showConfirm } from '@/components/ConfirmDialog';
import StatusFilterBar from './admin-orders/StatusFilterBar';
import EditOrderModal from './admin-orders/EditOrderModal';

const STATUS_FILTERS = [
  { key: '', label: 'Todos', color: '#64748b' },
  { key: 'SCHEDULED', label: 'Agendado', color: '#6366f1' },
  { key: 'PENDING', label: 'Pendente', color: '#f59e0b' },
  { key: 'ACCEPTED', label: 'Aceito', color: '#2563eb' },
  { key: 'PICKED_UP', label: 'Coletado', color: '#3b82f6' },
  { key: 'DELIVERED', label: 'Entregue', color: '#22c55e' },
  { key: 'CANCELLED', label: 'Cancelado', color: '#ef4444' },
];

const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const { squareId } = useSquare();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editData, setEditData] = useState({});
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => { loadOrders(); }, [page, statusFilter, dateRange, squareId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllOrders(page, 20, statusFilter, dateRange?.startDate, dateRange?.endDate, squareId);
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
    showConfirm('Excluir este pedido? Esta ação não pode ser desfeita.', async () => {
      try {
        await adminService.adminDeleteOrder(orderId);
        loadOrders();
      } catch (err) {
        showToast(err.response?.data?.error || 'Erro ao excluir', 'error');
      }
    });
  };

  const openEditOrder = (order) => {
    setEditingOrder(order);
    setEditData({
      status: order.status,
      delivery_fee: order.delivery_fee,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      customer_name: order.customer?.name || '',
      customer_phone: order.customer?.phone || '',
      delivery_address: order.delivery_address?.street || '',
      delivery_neighborhood: order.delivery_address?.neighborhood || '',
      delivery_city: order.delivery_address?.city || '',
      delivery_state: order.delivery_address?.state || '',
      delivery_zip_code: order.delivery_address?.zip_code || '',
      delivery_complement: order.delivery_address?.complement || '',
      special_instructions: order.special_instructions || '',
      distribution_method: order.distribution_method || 'nearest'
    });
  };

  const handleEditOrder = async (e) => {
    e.preventDefault();
    try {
      await adminService.adminUpdateOrder(editingOrder.id, editData);
      setEditingOrder(null);
      loadOrders();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar', 'error');
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

      {/* Filtro de Datas */}
      <DateRangeFilter onChange={(range) => { setDateRange(range); setPage(1); }} />

      {/* Filtros */}
      <StatusFilterBar statusFilter={statusFilter} onFilterChange={(key) => { setStatusFilter(key); setPage(1); }} statusFilters={STATUS_FILTERS} />

      {/* Lista */}
      {orders.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Package size={48} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Nenhum pedido encontrado</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Tente ajustar os filtros</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {orders.map(order => <OrderCard key={order.id} order={order} onEdit={openEditOrder} onDelete={handleDeleteOrder} onViewDetail={(id) => navigate(`/admin/orders/${id}`)} />)}
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
        <EditOrderModal
          editingOrder={editingOrder}
          editData={editData}
          setEditData={setEditData}
          onClose={() => setEditingOrder(null)}
          onSubmit={handleEditOrder}
          statusFilters={STATUS_FILTERS}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const OrderCard = ({ order, onEdit, onDelete, onViewDetail }) => {
  const statusColor = ORDER_STATUS[order.status] || { bg: '#f1f5f9', color: '#64748b' };

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
          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: statusColor.bg, color: statusColor.color }}>
            {utils.getStatusText(order.status)}
          </span>
          <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500, background: '#f1f5f9', color: '#64748b' }}>
            {utils.getStatusText(order.payment_method)}
          </span>
          {order.own_driver_route && (
            <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
              {order.own_driver_route.name}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
          <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>Taxa: {utils.formatCurrency(order.delivery_fee)}</p>
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
              <p style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restaurante</p>
              <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.restaurant?.name}</p>
            </div>
          </div>

          {/* Cliente */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={14} style={{ color: '#2563eb' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</p>
              <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>{order.customer?.name}</p>
            </div>
          </div>

          {/* Endereço */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={14} style={{ color: '#16a34a' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrega</p>
              <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.delivery_address?.street}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {order.driver && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', padding: '0.25rem 0.625rem', borderRadius: '9999px' }}>
                <Bike size={11} /> {order.driver.name}
              </span>
            )}
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: '#64748b' }}>
            <Clock size={11} /> {utils.formatDateTime(order.created_at)}
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button onClick={(e) => { e.stopPropagation(); onViewDetail(order.id); }} style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366f1' }} title="Ver Detalhes">
              <Eye size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(order); }} style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }} title="Editar">
              <Edit size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(order.id); }} style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }} title="Excluir">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
