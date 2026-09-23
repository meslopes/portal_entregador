import React, { useState, useEffect } from 'react';
import {
  CheckCircle, Bike, MapPin, User, Phone,
  Users, Send, Loader2, AlertCircle
} from 'lucide-react';
import { orderService, utils, API_BASE_URL } from '@/lib/api';
import api from '@/lib/api';
import OrderTimeline from '@/components/OrderTimeline';
import DeliveryCodes from '@/components/DeliveryCodes';
import { showToast } from '@/components/Toast';
import { ORDER_STATUS } from '@/constants/status';

// ── small helpers ────────────────────────────────────────────────────────────

const StatBox = ({ label, value, highlight, bold }) => (
  <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.125rem' }}>{label}</p>
    <p style={{ fontSize: bold ? '1rem' : '0.875rem', fontWeight: bold ? 700 : 600, color: highlight ? '#0d9488' : '#1e293b' }}>{value}</p>
  </div>
);

const InfoSection = ({ title, children }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
    <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '0.875rem' }}>{children}</div>
  </div>
);

const StatusBtn = ({ status, label, color, orderId, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  
  const handleClick = async () => {
    if (!window.confirm(`Tem certeza que deseja alterar o status para "${label}"?`)) return;
    try {
      setLoading(true);
      await api.put(`/api/orders/${orderId}/status`, { status });
      onUpdated();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao alterar status', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: 'none',
        background: loading ? '#94a3b8' : color,
        color: 'white',
        fontSize: '0.8125rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer'
      }}
    >
      {loading ? '...' : label}
    </button>
  );
};

// ── edit order sub-modal ─────────────────────────────────────────────────────

const EditOrderModal = ({ editForm, setEditForm, onSave, onClose, loading }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
    <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Editar Pedido</h2>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Nome do Cliente</label>
          <input value={editForm.customer_name} onChange={e => setEditForm(p => ({ ...p, customer_name: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Telefone</label>
          <input value={editForm.customer_phone} onChange={e => setEditForm(p => ({ ...p, customer_phone: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Endereço</label>
          <input value={editForm.delivery_address} onChange={e => setEditForm(p => ({ ...p, delivery_address: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Bairro</label>
            <input value={editForm.delivery_neighborhood} onChange={e => setEditForm(p => ({ ...p, delivery_neighborhood: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Cidade</label>
            <input value={editForm.delivery_city} onChange={e => setEditForm(p => ({ ...p, delivery_city: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Observações</label>
          <textarea value={editForm.special_instructions} onChange={e => setEditForm(p => ({ ...p, special_instructions: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical', minHeight: '60px' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', fontSize: '0.875rem', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onSave} disabled={loading} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── main detail component ────────────────────────────────────────────────────

const ClientOrderDetail = ({ order, onClose, onOrderUpdated }) => {
  const config = ORDER_STATUS[order.status] || ORDER_STATUS.PENDING;
  let specialInfo = {};
  try { if (order.special_instructions) specialInfo = JSON.parse(order.special_instructions); } catch (e) {}

  const [ownDrivers, setOwnDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [callingPlatform, setCallingPlatform] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

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

  const handleEdit = async () => {
    try {
      setEditLoading(true);
      await api.put(`/api/orders/${order.id}/edit`, editForm);
      setShowEdit(false);
      onOrderUpdated();
      showToast('Pedido atualizado!', 'success');
    } catch (err) {
      showToast('Erro ao editar: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      customer_name: order.customer?.name || '',
      customer_phone: order.customer?.phone || '',
      delivery_address: order.delivery_address?.street || '',
      delivery_neighborhood: order.delivery_address?.neighborhood || '',
      delivery_city: order.delivery_address?.city || '',
      delivery_state: order.delivery_address?.state || '',
      special_instructions: order.special_instructions || ''
    });
    setShowEdit(true);
  };

  const isPending = order.status === 'PENDING' || order.status === 'SCHEDULED';
  const hasOwnDriver = order.assigned_to_own_driver;
  const calledPlatform = order.called_platform;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div role="dialog" aria-modal="true" aria-label={`Pedido #${order.order_number}`} style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Pedido #{order.order_number}</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{utils.formatDateTime(order.created_at)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {['SCHEDULED', 'PENDING', 'OFFERED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
              <button onClick={openEditModal} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #2563eb', background: 'white', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                ✏️ Editar
              </button>
            )}
            <button onClick={onClose} aria-label="Fechar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Status */}
          <div style={{ padding: '1rem', borderRadius: '0.5rem', background: config.bg, textAlign: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Status</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: config.color }}>{config.label}</p>
          </div>

          {/* Status change buttons */}
          {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alterar Status</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {order.status === 'SCHEDULED' && (
                  <StatusBtn status="PENDING" label="Tocar Agora" color="#f59e0b" orderId={order.id} onUpdated={onOrderUpdated} />
                )}
                {order.status === 'ACCEPTED' && (
                  <StatusBtn status="PREPARING" label="Marcar Preparando" color="#f59e0b" orderId={order.id} onUpdated={onOrderUpdated} />
                )}
                {order.status === 'PREPARING' && (
                  <StatusBtn status="READY" label="Marcar Pronto" color="#8b5cf6" orderId={order.id} onUpdated={onOrderUpdated} />
                )}
                {order.status === 'READY' && (
                  <StatusBtn status="PICKED_UP" label="Marcar Coletado" color="#3b82f6" orderId={order.id} onUpdated={onOrderUpdated} />
                )}
                {order.status === 'PICKED_UP' && (
                  <StatusBtn status="DELIVERED" label="Marcar Entregue" color="#22c55e" orderId={order.id} onUpdated={onOrderUpdated} />
                )}
                {['SCHEDULED', 'PENDING', 'ACCEPTED'].includes(order.status) && (
                  <StatusBtn status="CANCELLED" label="Cancelar" color="#ef4444" orderId={order.id} onUpdated={onOrderUpdated} />
                )}
              </div>
            </div>
          )}

          {/* Valores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <StatBox label="Subtotal" value={utils.formatCurrency(order.subtotal)} />
            <StatBox label="Frete" value={utils.formatCurrency(order.delivery_fee)} highlight />
            <StatBox label="Total" value={utils.formatCurrency(order.total_amount)} bold />
          </div>

          {/* Cliente */}
          <InfoSection title="Cliente Final">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <User size={14} style={{ color: '#64748b' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{order.customer?.name}</span>
            </div>
            {order.customer?.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={14} style={{ color: '#64748b' }} />
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
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.delivery_address?.city}/{order.delivery_address?.state} - {order.delivery_address?.zip_code}</p>
              </div>
            </div>
          </InfoSection>

          {/* Entregador */}
          {(order.driver || order.own_driver) && (
            <InfoSection title="Entregador">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: hasOwnDriver ? '#dbeafe' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {hasOwnDriver ? <Users size={16} style={{ color: '#2563eb' }} /> : <Bike size={16} style={{ color: '#16a34a' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
                      {order.own_driver?.name || order.driver?.name || 'Entregador'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {hasOwnDriver ? 'Entregador Próprio' : 'Plataforma'} 
                      {(order.own_driver?.phone || order.driver?.phone) ? ` • ${order.own_driver?.phone || order.driver?.phone}` : ''}
                      {order.own_driver?.vehicle_type ? ` • ${order.own_driver.vehicle_type}` : ''}
                    </p>
                    {(order.own_driver?.phone || order.driver?.user?.phone) && (
                      <a
                        href={`https://wa.me/55${(order.own_driver?.phone || order.driver?.user?.phone || '').replace(/\D/g, '')}?text=Olá, sobre o pedido #${order.order_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          marginTop: '0.25rem', fontSize: '0.6875rem', color: '#25d366',
                          textDecoration: 'none', fontWeight: 600
                        }}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                </div>
                {['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SCHEDULED'].includes(order.status) && (
                  <button 
                    onClick={() => {
                      const distribSection = document.getElementById('distribuicao-section');
                      if (distribSection) {
                        distribSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{ 
                      padding: '0.375rem 0.75rem', 
                      borderRadius: '0.375rem', 
                      border: '1px solid #2563eb', 
                      background: 'white', 
                      color: '#2563eb', 
                      cursor: 'pointer', 
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Users size={12} /> Trocar
                  </button>
                )}
              </div>
            </InfoSection>
          )}

          {/* Pagamento */}
          <InfoSection title="Pagamento">
            <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>
              {utils.getStatusText(order.payment_method)}
              {specialInfo.product_value && (
                <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>(Produto: {utils.formatCurrency(specialInfo.product_value)})</span>
              )}
            </p>
            {specialInfo.change_for && (
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Troco para: {specialInfo.change_for}</p>
            )}
          </InfoSection>

          {/* Distribuição Híbrida */}
          {['PENDING', 'SCHEDULED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
            <div id="distribuicao-section">
            <InfoSection title={order.driver || order.own_driver ? "Trocar Entregador" : "Distribuição do Pedido"}>
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
                        background: selectedDriverId && !assigning ? '#2563eb' : '#64748b',
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
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', padding: '0.5rem 0' }}>
                    Nenhum entregador próprio online no momento.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>OU</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              </div>

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
            </div>
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
                    <Bike size={14} style={{ color: '#16a34a' }} />
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

          {/* Timeline */}
          <InfoSection title="Acompanhamento">
            <OrderTimeline order={order} />
          </InfoSection>

          {/* Prova de Entrega */}
          {order.delivery?.proof_of_delivery_url && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prova de Entrega</p>
              <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <img
                  src={order.delivery.proof_of_delivery_url.startsWith('http') ? order.delivery.proof_of_delivery_url : `${API_BASE_URL}${order.delivery.proof_of_delivery_url}`}
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

      {/* Edit Modal */}
      {showEdit && (
        <EditOrderModal
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
          loading={editLoading}
        />
      )}
    </div>
  );
};

export default ClientOrderDetail;
