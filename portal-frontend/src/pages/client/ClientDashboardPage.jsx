import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Clock, DollarSign, ShoppingBag,
  Plus, AlertCircle, ChevronRight, Store, User, Phone,
  TrendingUp, Truck, CheckCircle, XCircle, Eye, Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { orderService, utils } from '@/lib/api';

const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'Pendente', icon: Clock },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito', icon: CheckCircle },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando', icon: Package },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto', icon: CheckCircle },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'A Caminho', icon: Truck },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue', icon: CheckCircle },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelado', icon: XCircle },
};

const ClientDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, statsData] = await Promise.all([
        orderService.getMyOrders(page, 10, filter),
        orderService.getMyStats()
      ]);
      setOrders(ordersData.orders);
      setTotalPages(ordersData.pages);
      setStats(statsData);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetails = async (orderId) => {
    try {
      const data = await orderService.getOrderDetails(orderId);
      setSelectedOrder(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Olá, {user?.first_name}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Gerencie seus pedidos de entrega
          </p>
        </div>
        <button
          onClick={() => navigate('/client/new-order')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
            background: '#0d9488', color: 'white', border: 'none',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0f766e'}
          onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}
        >
          <Plus size={18} /> NOVO PEDIDO
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Cards de Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<Package size={22} />} iconBg="#f0fdfa" iconColor="#0d9488" label="Pedidos Hoje" value={stats?.today_orders || 0} />
        <StatCard icon={<Clock size={22} />} iconBg="#fef3c7" iconColor="#f59e0b" label="Em Andamento" value={stats?.active_orders || 0} />
        <StatCard icon={<TrendingUp size={22} />} iconBg="#dbeafe" iconColor="#2563eb" label="Esta Semana" value={stats?.week_orders || 0} />
        <StatCard icon={<DollarSign size={22} />} iconBg="#dcfce7" iconColor="#16a34a" label="Total Receita" value={utils.formatCurrency(stats?.total_revenue || 0)} />
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <FilterButton active={filter === ''} onClick={() => { setFilter(''); setPage(1); }}>Todos</FilterButton>
        <FilterButton active={filter === 'PENDING'} onClick={() => { setFilter('PENDING'); setPage(1); }}>Pendentes</FilterButton>
        <FilterButton active={filter === 'ACCEPTED' || filter === 'PREPARING' || filter === 'READY' || filter === 'PICKED_UP'} onClick={() => { setFilter('ACCEPTED'); setPage(1); }}>Em Andamento</FilterButton>
        <FilterButton active={filter === 'DELIVERED'} onClick={() => { setFilter('DELIVERED'); setPage(1); }}>Entregues</FilterButton>
        <FilterButton active={filter === 'CANCELLED'} onClick={() => { setFilter('CANCELLED'); setPage(1); }}>Cancelados</FilterButton>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div style={{ minHeight: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Package size={24} style={{ color: '#94a3b8' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
            {filter ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            {filter ? 'Tente outro filtro' : 'Clique em "NOVO PEDIDO" para começar'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map(order => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = config.icon;
              return (
                <div
                  key={order.id}
                  onClick={() => openOrderDetails(order.id)}
                  style={{
                    background: 'white', borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.15s', borderLeft: `4px solid ${config.color}`
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
                >
                  <div style={{ padding: '1rem 1.25rem' }}>
                    {/* Header do pedido */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>
                            #{order.order_number}
                          </span>
                          <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: '9999px',
                            fontSize: '0.6875rem', fontWeight: 600,
                            background: config.bg, color: config.color,
                            display: 'flex', alignItems: 'center', gap: '0.25rem'
                          }}>
                            <StatusIcon size={10} /> {config.text}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {utils.formatDateTime(order.created_at)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                          {utils.formatCurrency(order.total_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Info do cliente */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <User size={14} style={{ color: '#94a3b8' }} />
                        <span style={{ color: '#475569' }}>{order.customer?.name || 'Cliente'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <MapPin size={14} style={{ color: '#94a3b8' }} />
                        <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.delivery_address?.street || 'Endereço não informado'}
                        </span>
                      </div>
                    </div>

                    {/* Entregador (se atribuído) */}
                    {order.driver && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <Truck size={14} style={{ color: '#0d9488' }} />
                        <span style={{ color: '#475569' }}>
                          Entregador: <strong>{order.driver.name}</strong>
                        </span>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ color: '#94a3b8' }}>{order.driver.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={paginationBtn(page === 1)}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={paginationBtn(page === totalPages)}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Detalhes */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onRate={(order) => { setSelectedOrder(null); setRatingOrder(order); }} />
      )}

      {/* Modal de Avaliacao */}
      {ratingOrder && (
        <RatingModal
          order={ratingOrder}
          onClose={() => { setRatingOrder(null); setRating(0); setFeedback(''); }}
          onSubmit={async () => {
            if (rating === 0) return;
            setRatingLoading(true);
            try {
              await orderService.rateOrder(ratingOrder.id, rating, feedback);
              setRatingOrder(null);
              setRating(0);
              setFeedback('');
              loadData(); // Recarrega para atualizar status
            } catch (err) {
              alert(err.response?.data?.error || 'Erro ao avaliar');
            } finally {
              setRatingLoading(false);
            }
          }}
          rating={rating}
          setRating={setRating}
          feedback={feedback}
          setFeedback={setFeedback}
          loading={ratingLoading}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// Modal de detalhes do pedido
const OrderDetailsModal = ({ order, onClose, onRate }) => {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  // Parse special_instructions
  let specialInfo = {};
  try {
    if (order.special_instructions) {
      specialInfo = JSON.parse(order.special_instructions);
    }
  } catch (e) {}

  const canRate = order.status === 'DELIVERED' && !order.delivery?.customer_rating;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '0.75rem', width: '100%',
        maxWidth: '500px', maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
              Pedido #{order.order_number}
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {utils.formatDateTime(order.created_at)}
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Status */}
          <div style={{
            padding: '1rem', borderRadius: '0.5rem',
            background: config.bg, textAlign: 'center', marginBottom: '1.5rem'
          }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Status</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: config.color }}>{config.text}</p>
          </div>

          {/* Valor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Frete</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0d9488' }}>{utils.formatCurrency(order.delivery_fee || 0)}</p>
            </div>
          </div>

          {/* Cliente Final */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</p>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <User size={14} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{order.customer?.name}</span>
              </div>
              {order.customer?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>{order.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Endereço de entrega */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entregar em</p>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <MapPin size={14} style={{ color: '#0d9488', marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                  {order.delivery_address?.street}
                  {order.delivery_address?.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {order.delivery_address?.city}/{order.delivery_address?.state} - {order.delivery_address?.zip_code}
                </p>
              </div>
            </div>
          </div>

          {/* Entregador */}
          {order.driver && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entregador</p>
              <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={16} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{order.driver.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.driver.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pagamento */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pagamento</p>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                {utils.getStatusText(order.payment_method)}
                {specialInfo.product_value && (
                  <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
                    (Produto: {utils.formatCurrency(specialInfo.product_value)})
                  </span>
                )}
              </p>
              {specialInfo.change_for && (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Troco para: {specialInfo.change_for}
                </p>
              )}
            </div>
          </div>

          {/* Avaliacao existente */}
          {order.delivery?.customer_rating && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sua Avaliação</p>
              <div style={{ background: '#f0fdf4', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.375rem' }}>
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={20} fill={s <= order.delivery.customer_rating ? '#f59e0b' : 'none'} stroke={s <= order.delivery.customer_rating ? '#f59e0b' : '#d1d5db'} />
                  ))}
                </div>
                {order.delivery.customer_feedback && (
                  <p style={{ fontSize: '0.8125rem', color: '#475569' }}>{order.delivery.customer_feedback}</p>
                )}
              </div>
            </div>
          )}

          {/* Botao avaliar */}
          {canRate && (
            <button
              onClick={() => onRate(order)}
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '0.5rem',
                border: '2px solid #f59e0b', background: '#fffbeb',
                color: '#92400e', fontSize: '0.9375rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem'
              }}
            >
              <Star size={18} /> Avaliar Entrega
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Componentes auxiliares
const StatCard = ({ icon, iconBg, iconColor, label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

const FilterButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.375rem 0.875rem', borderRadius: '9999px',
      border: 'none', fontSize: '0.8125rem', fontWeight: 500,
      cursor: 'pointer', transition: 'all 0.15s',
      background: active ? '#0d9488' : '#f1f5f9',
      color: active ? 'white' : '#64748b'
    }}
  >
    {children}
  </button>
);

const paginationBtn = (disabled) => ({
  padding: '0.5rem 1rem', borderRadius: '0.375rem',
  border: '1px solid #e2e8f0', background: 'white',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1, fontSize: '0.875rem'
});

// Modal de Avaliacao
const RatingModal = ({ order, onClose, onSubmit, rating, setRating, feedback, setFeedback, loading }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Avaliar Entrega</h2>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Pedido #{order.order_number}</p>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Entregador */}
          {order.driver && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={20} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b' }}>{order.driver.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.driver.phone}</p>
              </div>
            </div>
          )}

          {/* Estrelas */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>Como foi a entrega?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1,2,3,4,5].map(s => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.25rem', transition: 'transform 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Star size={36} fill={s <= rating ? '#f59e0b' : 'none'} stroke={s <= rating ? '#f59e0b' : '#d1d5db'} />
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              {rating === 0 && 'Toque nas estrelas para avaliar'}
              {rating === 1 && 'Ruim'}
              {rating === 2 && 'Regular'}
              {rating === 3 && 'Bom'}
              {rating === 4 && 'Muito Bom'}
              {rating === 5 && 'Excelente'}
            </p>
          </div>

          {/* Comentario */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Comentário (opcional)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Deixe um comentário sobre a entrega..."
              rows={3}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* Botoes */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#475569' }}>
              Cancelar
            </button>
            <button
              onClick={onSubmit}
              disabled={rating === 0 || loading}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                border: 'none', background: rating === 0 ? '#e2e8f0' : '#f59e0b',
                color: rating === 0 ? '#94a3b8' : 'white',
                fontSize: '0.875rem', fontWeight: 600, cursor: rating === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {loading ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardPage;
