import React, { useState, useEffect } from 'react';
import {
  Package, Search, Clock, CheckCircle, Truck,
  XCircle, AlertCircle, MapPin, User, Phone, DollarSign,
  Users, Send, Loader2
} from 'lucide-react';
import { orderService, utils, API_BASE_URL } from '@/lib/api';
import api from '@/lib/api';
import OrderTimeline from '@/components/OrderTimeline';
import DeliveryCodes from '@/components/DeliveryCodes';

const STATUS_CONFIG = {
  SCHEDULED: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Agendado', icon: Clock },
  PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'Pendente', icon: Clock },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito', icon: CheckCircle },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando', icon: Package },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto', icon: CheckCircle },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'A Caminho', icon: Truck },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue', icon: CheckCircle },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelado', icon: XCircle },
};

const ClientOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => { loadOrders(); }, [page, filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders(page, 15, filter);
      setOrders(data.orders || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Erro ao carregar pedidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (orderId) => {
    try {
      const data = await orderService.getOrderDetails(orderId);
      setSelectedOrder(data);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(s) ||
      o.customer?.name?.toLowerCase().includes(s) ||
      o.delivery_address?.street?.toLowerCase().includes(s)
    );
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Meus Pedidos
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Histórico completo dos seus pedidos de entrega
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filtros e Busca */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por número, cliente ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            <FilterBtn active={filter === ''} onClick={() => { setFilter(''); setPage(1); }}>Todos</FilterBtn>
            <FilterBtn active={filter === 'pending'} onClick={() => { setFilter('pending'); setPage(1); }}>Pendentes</FilterBtn>
            <FilterBtn active={filter === 'active'} onClick={() => { setFilter('active'); setPage(1); }}>Em Andamento</FilterBtn>
            <FilterBtn active={filter === 'DELIVERED'} onClick={() => { setFilter('DELIVERED'); setPage(1); }}>Entregues</FilterBtn>
            <FilterBtn active={filter === 'CANCELLED'} onClick={() => { setFilter('CANCELLED'); setPage(1); }}>Cancelados</FilterBtn>
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ minHeight: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Package size={24} style={{ color: '#94a3b8' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
            {search || filter ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            {search || filter ? 'Tente outro termo ou filtro' : 'Crie seu primeiro pedido em "Novo Pedido"'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(order => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = config.icon;
              return (
                <div
                  key={order.id}
                  onClick={() => openDetails(order.id)}
                  style={{
                    background: 'white', borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    borderLeft: `4px solid ${config.color}`,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
                >
                  <div style={{ padding: '1rem 1.25rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>#{order.order_number}</span>
                          <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: config.bg, color: config.color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <StatusIcon size={10} /> {config.text}
                          </span>
                          {order.assigned_to_own_driver && (
                            <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Users size={9} /> Próprio
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{utils.formatDateTime(order.created_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{utils.formatCurrency(order.total_amount)}</p>
                        <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Frete: {utils.formatCurrency(order.delivery_fee || 0)}</p>
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: '#64748b', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <User size={14} style={{ color: '#94a3b8' }} />
                        {order.customer?.name || 'Cliente'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        {order.delivery_address?.street || 'Sem endereço'}
                      </div>
                      {order.driver && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Truck size={14} style={{ color: '#94a3b8' }} />
                          {order.driver.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Modal de Detalhes */}
      {selectedOrder && (
        <DetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={() => {
            setSelectedOrder(null);
            loadOrders();
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Modal de detalhes com distribuição híbrida
const DetailsModal = ({ order, onClose, onOrderUpdated }) => {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  let specialInfo = {};
  try { if (order.special_instructions) specialInfo = JSON.parse(order.special_instructions); } catch (e) {}

  const [ownDrivers, setOwnDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [callingPlatform, setCallingPlatform] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  // Carrega entregadores próprios do restaurante
  useEffect(() => {
    const loadOwnDrivers = async () => {
      try {
        const userRes = await api.get('/api/user/profile');
        const restaurantId = userRes.data.restaurant_id;
        if (restaurantId) {
          const res = await api.get(`/api/admin/establishment-drivers?restaurant_id=${restaurantId}`);
          const onlineDrivers = (res.data.drivers || []).filter(d => d.is_online && d.is_active);
          setOwnDrivers(onlineDrivers);
        }
      } catch (err) {
        console.error('Erro ao carregar entregadores próprios:', err);
      }
    };
    loadOwnDrivers();
  }, []);

  const handleAssignOwn = async () => {
    if (!selectedDriverId) return;
    try {
      setAssigning(true);
      setActionResult(null);
      const result = await orderService.assignOwnDriver(order.id, parseInt(selectedDriverId));
      setActionResult({ type: 'success', message: result.message });
      setTimeout(() => onOrderUpdated(), 1500);
    } catch (err) {
      setActionResult({ type: 'error', message: err.response?.data?.error || 'Erro ao atribuir entregador' });
    } finally {
      setAssigning(false);
    }
  };

  const handleCallPlatform = async () => {
    try {
      setCallingPlatform(true);
      setActionResult(null);
      const result = await orderService.callPlatformDrivers(order.id);
      setActionResult({
        type: result.driver_name ? 'success' : 'warning',
        message: result.message
      });
      setTimeout(() => onOrderUpdated(), 1500);
    } catch (err) {
      setActionResult({ type: 'error', message: err.response?.data?.error || 'Erro ao chamar plataforma' });
    } finally {
      setCallingPlatform(false);
    }
  };

  const isPending = order.status === 'PENDING' || order.status === 'SCHEDULED';
  const hasOwnDriver = order.assigned_to_own_driver;
  const calledPlatform = order.called_platform;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Pedido #{order.order_number}</h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{utils.formatDateTime(order.created_at)}</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Status */}
          <div style={{ padding: '1rem', borderRadius: '0.5rem', background: config.bg, textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Status</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: config.color }}>{config.text}</p>
          </div>

          {/* Valores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <StatBox label="Subtotal" value={utils.formatCurrency(order.subtotal)} />
            <StatBox label="Frete" value={utils.formatCurrency(order.delivery_fee)} highlight />
            <StatBox label="Total" value={utils.formatCurrency(order.total_amount)} bold />
          </div>

          {/* Cliente */}
          <InfoSection title="Cliente Final">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <User size={14} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{order.customer?.name}</span>
            </div>
            {order.customer?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={14} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>{order.customer.phone}</span>
              </div>
            )}
          </InfoSection>

          {/* Endereco */}
          <InfoSection title="Entregar em">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <MapPin size={14} style={{ color: '#0d9488', marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>{order.delivery_address?.street}{order.delivery_address?.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}</p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.delivery_address?.city}/{order.delivery_address?.state} - {order.delivery_address?.zip_code}</p>
              </div>
            </div>
          </InfoSection>

          {/* Entregador (atribuído) */}
          {order.driver && (
            <InfoSection title="Entregador">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: hasOwnDriver ? '#dbeafe' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {hasOwnDriver ? <Users size={16} style={{ color: '#2563eb' }} /> : <Truck size={16} style={{ color: '#16a34a' }} />}
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{order.driver.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {hasOwnDriver ? 'Entregador Próprio' : 'Plataforma'} {order.driver.phone ? `• ${order.driver.phone}` : ''}
                  </p>
                </div>
              </div>
            </InfoSection>
          )}

          {/* Pagamento */}
          <InfoSection title="Pagamento">
            <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>
              {utils.getStatusText(order.payment_method)}
              {specialInfo.product_value && (
                <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>(Produto: {utils.formatCurrency(specialInfo.product_value)})</span>
              )}
            </p>
            {specialInfo.change_for && (
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Troco para: {specialInfo.change_for}</p>
            )}
          </InfoSection>

          {/* Distribuição Híbrida - só para pedidos PENDING sem entregador */}
          {isPending && !order.driver && (
            <InfoSection title="Distribuição do Pedido">
              {/* Resultado da ação */}
              {actionResult && (
                <div style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: actionResult.type === 'success' ? '#dcfce7' : actionResult.type === 'warning' ? '#fef3c7' : '#fef2f2',
                  border: `1px solid ${actionResult.type === 'success' ? '#86efac' : actionResult.type === 'warning' ? '#fde68a' : '#fecaca'}`,
                  color: actionResult.type === 'success' ? '#166534' : actionResult.type === 'warning' ? '#92400e' : '#dc2626'
                }}>
                  {actionResult.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {actionResult.message}
                </div>
              )}

              {/* Atribuir entregador próprio */}
              <div style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Entregador Próprio</p>
                {ownDrivers.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={selectedDriverId}
                      onChange={e => setSelectedDriverId(e.target.value)}
                      style={{
                        flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                        border: '1.5px solid #e2e8f0', fontSize: '0.8125rem',
                        outline: 'none', background: 'white', color: '#1e293b'
                      }}
                    >
                      <option value="">Selecione um entregador...</option>
                      {ownDrivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} — {d.vehicle_type === 'MOTO' ? '🏍️' : d.vehicle_type === 'BIKE' ? '🚲' : '🚗'} {d.vehicle_plate || ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignOwn}
                      disabled={!selectedDriverId || assigning}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                        background: selectedDriverId && !assigning ? '#2563eb' : '#94a3b8',
                        color: 'white', cursor: selectedDriverId && !assigning ? 'pointer' : 'not-allowed',
                        fontSize: '0.8125rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {assigning ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Users size={14} />}
                      Atribuir
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8125rem', color: '#94a3b8', padding: '0.5rem 0' }}>
                    Nenhum entregador próprio online no momento.
                  </p>
                )}
              </div>

              {/* Separador */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>OU</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              </div>

              {/* Chamar plataforma */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>Plataforma</p>
                <button
                  onClick={handleCallPlatform}
                  disabled={callingPlatform}
                  style={{
                    width: '100%', padding: '0.625rem 1rem', borderRadius: '0.5rem',
                    border: '1.5px solid #0d9488', background: 'white',
                    color: '#0d9488', cursor: callingPlatform ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}
                >
                  {callingPlatform ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={14} />}
                  Chamar Entregador da Plataforma
                </button>
              </div>
            </InfoSection>
          )}

          {/* Info de distribuição para pedidos já atribuídos */}
          {!isPending && (hasOwnDriver || calledPlatform) && (
            <InfoSection title="Distribuição">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {hasOwnDriver ? (
                  <>
                    <Users size={14} style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: '0.8125rem', color: '#1e293b' }}>Atribuído a entregador próprio</span>
                  </>
                ) : calledPlatform ? (
                  <>
                    <Truck size={14} style={{ color: '#16a34a' }} />
                    <span style={{ fontSize: '0.8125rem', color: '#1e293b' }}>Distribuído pela plataforma</span>
                  </>
                ) : null}
              </div>
            </InfoSection>
          )}

          {/* Códigos de Segurança */}
          {(order.pickup_code || order.delivery_code) && (
            <DeliveryCodes pickupCode={order.pickup_code} deliveryCode={order.delivery_code} />
          )}

          {/* Timeline do Pedido */}
          <InfoSection title="Acompanhamento">
            <OrderTimeline order={order} />
          </InfoSection>

          {/* Prova de Entrega */}
          {order.delivery?.proof_of_delivery_url && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prova de Entrega</p>
              <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <img
                  src={`${API_BASE_URL}${order.delivery.proof_of_delivery_url}`}
                  alt="Prova de entrega"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', background: '#f8fafc' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          )}

          {/* Timestamps */}
          {order.pickup_time && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#64748b' }}>
              <p>Retirado: {utils.formatDateTime(order.pickup_time)}</p>
              {order.delivery_time && <p>Entregue: {utils.formatDateTime(order.delivery_time)}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componentes auxiliares
const StatBox = ({ label, value, highlight, bold }) => (
  <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
    <p style={{ fontSize: '0.625rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
    <p style={{ fontSize: bold ? '1rem' : '0.875rem', fontWeight: bold ? 700 : 600, color: highlight ? '#0d9488' : '#1e293b' }}>{value}</p>
  </div>
);

const InfoSection = ({ title, children }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
    <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '0.875rem' }}>{children}</div>
  </div>
);

const FilterBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', border: 'none', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', background: active ? '#0d9488' : '#f1f5f9', color: active ? 'white' : '#64748b' }}>
    {children}
  </button>
);

const pagBtn = (disabled) => ({ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: '0.875rem' });

export default ClientOrdersPage;
