import React, { useState, useEffect } from 'react';
import {
  Package, Search, Filter, Clock, CheckCircle, Truck,
  XCircle, AlertCircle, MapPin, User, Phone, DollarSign,
  Eye, ChevronRight
} from 'lucide-react';
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
      setOrders(data.orders);
      setTotalPages(data.pages);
      setTotal(data.total);
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
            <FilterBtn active={filter === 'PENDING'} onClick={() => { setFilter('PENDING'); setPage(1); }}>Pendentes</FilterBtn>
            <FilterBtn active={filter === 'ACCEPTED' || filter === 'PREPARING' || filter === 'READY' || filter === 'PICKED_UP'} onClick={() => { setFilter('ACCEPTED'); setPage(1); }}>Em Andamento</FilterBtn>
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
      {selectedOrder && <DetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Modal de detalhes
const DetailsModal = ({ order, onClose }) => {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  let specialInfo = {};
  try { if (order.special_instructions) specialInfo = JSON.parse(order.special_instructions); } catch (e) {}

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

          {/* Entregador */}
          {order.driver && (
            <InfoSection title="Entregador">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={16} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{order.driver.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.driver.phone}</p>
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
