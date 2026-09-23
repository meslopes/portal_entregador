import React from 'react';
import {
  Bike, MapPin, User, Phone, Users
} from 'lucide-react';
import { utils, API_BASE_URL } from '@/lib/api';
import OrderTimeline from '@/components/OrderTimeline';
import DeliveryCodes from '@/components/DeliveryCodes';
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

// ── order info section ───────────────────────────────────────────────────────

const OrderInfoSection = ({ order }) => {
  const config = ORDER_STATUS[order.status] || ORDER_STATUS.PENDING;
  const hasOwnDriver = order.assigned_to_own_driver;

  let specialInfo = {};
  try { if (order.special_instructions) specialInfo = JSON.parse(order.special_instructions); } catch (e) {}

  return (
    <>
      {/* Status */}
      <div style={{ padding: '1rem', borderRadius: '0.5rem', background: config.bg, textAlign: 'center', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Status</p>
        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: config.color }}>{config.label}</p>
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
    </>
  );
};

export { InfoSection };
export default OrderInfoSection;
