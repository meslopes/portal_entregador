import React from 'react';
import { MapPin, Phone, Store, Navigation } from 'lucide-react';
import { utils } from '@/lib/api';

const OrderDetails = ({ order, onOpenMap }) => {
  return (
    <div style={{
      background: 'white',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: '1.5rem'
    }}>
      {/* Restaurante */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{
            width: '2.5rem', height: '2.5rem',
            borderRadius: '0.5rem',
            background: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Store size={16} style={{ color: '#d97706' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
              Coletar em
            </p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
              {order.restaurant?.name}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {order.restaurant?.address}
            </p>
            {order.restaurant?.phone && (
              <a href={`tel:${order.restaurant.phone}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                fontSize: '0.8125rem', color: '#2563eb', marginTop: '0.375rem', textDecoration: 'none'
              }}>
                <Phone size={12} /> Ligar
              </a>
            )}
          </div>
          <button
            onClick={() => onOpenMap('restaurant')}
            style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              color: '#2563eb'
            }}
          >
            <Navigation size={16} />
          </button>
        </div>
      </div>

      {/* Cliente */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{
            width: '2.5rem', height: '2.5rem',
            borderRadius: '0.5rem',
            background: '#dcfce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <MapPin size={16} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
              Entregar em
            </p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
              {order.customer?.name}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {order.delivery_address?.street}{order.delivery_address?.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}
            </p>
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                fontSize: '0.8125rem', color: '#2563eb', marginTop: '0.375rem', textDecoration: 'none'
              }}>
                <Phone size={12} /> Ligar
              </a>
            )}
          </div>
          <button
            onClick={() => onOpenMap('customer')}
            style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              color: '#22c55e'
            }}
          >
            <Navigation size={16} />
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Valor Total</p>
            <p style={{ fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Seus Ganhos</p>
            <p style={{ fontWeight: 700, color: '#22c55e' }}>
              {utils.formatCurrency(order.delivery?.driver_earnings || 0)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Pagamento</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
              {utils.getStatusText(order.payment_method)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Itens</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
              {order.items?.length || 0} ite{order.items?.length !== 1 ? 'ns' : 'm'}
            </p>
          </div>
        </div>

        {/* Itens */}
        {order.items && order.items.length > 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '0.875rem',
            background: '#f8fafc',
            borderRadius: '0.5rem'
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
              Itens do Pedido
            </p>
            {order.items.map((item, index) => (
              <div key={index} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.8125rem', color: '#64748b',
                padding: '0.25rem 0'
              }}>
                <span>{item.quantity}x {item.name}</span>
                <span>{utils.formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Instruções */}
        {order.special_instructions && (
          <div style={{
            marginTop: '1rem',
            background: '#fffbeb',
            borderLeft: '3px solid #f59e0b',
            padding: '0.75rem 1rem',
            borderRadius: '0 0.375rem 0.375rem 0',
            fontSize: '0.8125rem',
            color: '#92400e'
          }}>
            📝 {order.special_instructions}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
