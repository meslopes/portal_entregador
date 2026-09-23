import React from 'react';
import { MapPin, Phone, Navigation, Shield } from 'lucide-react';

const phoneLinkStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
  marginTop: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
  background: '#f0fdfa', color: '#0d9488', fontSize: '0.8125rem',
  fontWeight: 500, textDecoration: 'none'
};

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem'
};

const sectionLabel = {
  fontSize: '0.6875rem', fontWeight: 600, color: '#64748b',
  marginBottom: '0.5rem', textTransform: 'uppercase'
};

const DeliveryOrderInfo = ({ order, isDelivered, onOpenNavigation }) => {
  const showPickupCode = order.pickup_code && order.status === 'ACCEPTED';
  const showDeliveryCode = order.delivery_code && order.status === 'PICKED_UP';
  const showCodes = (order.pickup_code || order.delivery_code) && !isDelivered;

  return (
    <>
      {/* Códigos de Segurança */}
      {showCodes && (
        <div style={{
          background: '#fffbeb', borderRadius: '0.75rem', padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem',
          border: '1px solid #fde68a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Shield size={16} style={{ color: '#92400e' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>Códigos de Segurança</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {showPickupCode && (
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.625rem', color: '#92400e', marginBottom: '0.125rem' }}>Coleta</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400e', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
                  {order.pickup_code}
                </p>
              </div>
            )}
            {showDeliveryCode && (
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.625rem', color: '#92400e', marginBottom: '0.125rem' }}>Entrega</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400e', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
                  {order.delivery_code}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restaurante (Coleta) */}
      {order.restaurant && (
        <div style={cardStyle}>
          <p style={sectionLabel}>Coleta</p>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
            {order.restaurant.name}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <MapPin size={14} /> {order.restaurant.address}
          </p>
          {order.restaurant.phone && (
            <a href={`tel:${order.restaurant.phone}`} style={phoneLinkStyle}>
              <Phone size={14} /> Ligar
            </a>
          )}
        </div>
      )}

      {/* Endereço de Entrega */}
      {order.delivery_address && (
        <div style={cardStyle}>
          <p style={sectionLabel}>Entrega</p>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
            {order.customer?.name}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '0.375rem' }}>
            <MapPin size={14} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            {order.delivery_address.street}, {order.delivery_address.neighborhood}
          </p>
          {order.customer?.phone && (
            <a href={`tel:${order.customer.phone}`} style={phoneLinkStyle}>
              <Phone size={14} /> Ligar
            </a>
          )}

          <button
            onClick={onOpenNavigation}
            style={{
              width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem',
              border: '1.5px solid #0d9488', background: 'white', color: '#0d9488',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <Navigation size={16} /> Abrir no Google Maps
          </button>
        </div>
      )}
    </>
  );
};

export default DeliveryOrderInfo;
