import React, { useState, useEffect } from 'react';
import {
  Package, MapPin, Clock, DollarSign, ShoppingBag,
  Plus, AlertCircle, ChevronRight, Store, User, Phone,
  TrendingUp, Bike, CheckCircle, XCircle, Eye, Star, Navigation
} from 'lucide-react';
import api, { orderService, utils, API_BASE_URL } from '@/lib/api';
import OrderTimeline from '@/components/OrderTimeline';
import DeliveryCodes from '@/components/DeliveryCodes';
import { showToast } from '@/components/Toast';
import { STATUS_CONFIG } from './constants';
import AssignDriverSection from './AssignDriverSection';

const OrderDetailsModal = ({ order, onClose, onRate }) => {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  // Parse special_instructions
  let specialInfo = {};
  try {
    if (order.special_instructions) {
      specialInfo = JSON.parse(order.special_instructions);
    }
  } catch { /* intentionally empty */ }

  const canRate = order.status === 'DELIVERED' && !order.delivery?.customer_rating;
  const canCancel = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status);
  const canAssign = order.status === 'PENDING' && !order.driver && !order.assigned_to_own_driver;

  // State for own drivers list
  const [ownDrivers, setOwnDrivers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [callingPlatform, setCallingPlatform] = useState(false);

  // Load own drivers when modal opens and order can be assigned
  useEffect(() => {
    if (canAssign) {
      loadOwnDrivers();
    }
  }, []);

  const loadOwnDrivers = async () => {
    try {
      const userRes = await api.get('/api/user/profile');
      const restaurantId = userRes.data.restaurant_id;
      if (restaurantId) {
        const res = await api.get(`/api/admin/establishment-drivers?restaurant_id=${restaurantId}`);
        setOwnDrivers(res.data.drivers || []);
      }
    } catch { /* intentionally empty */ }
  };

  const handleAssignOwn = async (driverId) => {
    try {
      setAssigning(true);
      await api.post(`/api/orders/${order.id}/assign-own`, { establishment_driver_id: driverId });
      onClose();
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atribuir entregador', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleCallPlatform = async () => {
    try {
      setCallingPlatform(true);
      const res = await api.post(`/api/orders/${order.id}/call-platform`);
      showToast(res.data.message || 'Solicitação enviada', 'success');
      onClose();
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao chamar plataforma', 'error');
    } finally {
      setCallingPlatform(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem'
    }}>
      <div role="dialog" aria-modal="true" aria-label={`Pedido #${order.order_number}`} style={{
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
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {utils.formatDateTime(order.created_at)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
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
              <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Total</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Frete</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0d9488' }}>{utils.formatCurrency(order.delivery_fee || 0)}</p>
            </div>
          </div>

          {/* Cliente Final */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</p>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <User size={14} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{order.customer?.name}</span>
              </div>
              {order.customer?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={14} style={{ color: '#64748b' }} />
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
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
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
                  <Bike size={16} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{order.driver.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.driver.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Entregador Próprio (se atribuído) */}
          {order.assigned_to_own_driver && order.establishment_driver_id && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entregador Próprio</p>
              <div style={{ background: '#f0fdf4', borderRadius: '0.5rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #bbf7d0' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bike size={16} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>Entregador próprio atribuído</p>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#dcfce7', color: '#166534' }}>Próprio</span>
                </div>
              </div>
            </div>
          )}

          {/* Ações: Atribuir entregador (apenas pedidos PENDING sem entregador) */}
          {canAssign && (
            <AssignDriverSection
              ownDrivers={ownDrivers}
              assigning={assigning}
              callingPlatform={callingPlatform}
              onAssignOwn={handleAssignOwn}
              onCallPlatform={handleCallPlatform}
            />
          )}

          {/* Pagamento */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pagamento</p>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                {utils.getStatusText(order.payment_method)}
                {specialInfo.product_value && (
                  <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                    (Produto: {utils.formatCurrency(specialInfo.product_value)})
                  </span>
                )}
              </p>
              {specialInfo.change_for && (
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Troco para: {specialInfo.change_for}
                </p>
              )}
            </div>
          </div>

          {/* Códigos de Segurança */}
          {['PENDING', 'SCHEDULED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (order.pickup_code || order.delivery_code) && (
            <DeliveryCodes pickupCode={order.pickup_code} deliveryCode={order.delivery_code} />
          )}

          {/* Timeline do Pedido */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acompanhamento</p>
            <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem' }}>
              <OrderTimeline order={order} />
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

          {/* Prova de Entrega */}
          {order.delivery?.proof_of_delivery_url && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prova de Entrega</p>
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

          {/* Avaliação do Entregador */}
          {order.delivery?.driver_rating && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avaliação do Entregador</p>
              <p style={{ fontSize: '1.25rem', color: '#f59e0b' }}>{'★'.repeat(order.delivery.driver_rating)}{'☆'.repeat(5 - order.delivery.driver_rating)}</p>
              {order.delivery.driver_feedback && <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.25rem' }}>"{order.delivery.driver_feedback}"</p>}
            </div>
          )}

          {/* Botao cancelar */}
          {canCancel && (
            <button
              onClick={async () => {
                if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) return;
                try {
                  await orderService.cancelOrder(order.id);
                  onClose();
                } catch (err) {
                  showToast(err.response?.data?.error || 'Erro ao cancelar', 'error');
                }
              }}
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '0.5rem',
                border: '2px solid #fecaca', background: '#fef2f2',
                color: '#dc2626', fontSize: '0.9375rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem'
              }}
            >
              ✕ Cancelar Pedido
            </button>
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

export default OrderDetailsModal;
