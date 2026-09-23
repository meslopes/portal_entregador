import React from 'react';
import { User, Store, MapPin, Bike, DollarSign } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};
const cardTitle = { fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' };
const label = { color: '#64748b', fontSize: '0.75rem' };
const value = { fontWeight: 500, color: '#1e293b' };

const OrderInfoCards = ({ order, si, utils }) => (
  <>
    {/* Cliente & Estabelecimento */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
      <div style={cardStyle}>
        <h3 style={cardTitle}><User size={16} /> Cliente</h3>
        <p style={{ fontWeight: 500, color: '#1e293b' }}>{order.customer?.name || 'N/A'}</p>
        <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>{order.customer?.phone || 'N/A'}</p>
      </div>
      <div style={cardStyle}>
        <h3 style={cardTitle}><Store size={16} /> Estabelecimento</h3>
        <p style={{ fontWeight: 500, color: '#1e293b' }}>{order.restaurant?.name || 'N/A'}</p>
        <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>{order.restaurant?.address || 'N/A'}</p>
      </div>
    </div>

    {/* Endereço de entrega */}
    <div style={{ ...cardStyle, marginBottom: '1rem' }}>
      <h3 style={cardTitle}><MapPin size={16} /> Endereço de Entrega</h3>
      <p style={{ fontWeight: 500, color: '#1e293b' }}>
        {order.delivery_address?.street}, {order.delivery_address?.neighborhood}
      </p>
      <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
        {order.delivery_address?.city}/{order.delivery_address?.state}
      </p>
    </div>

    {/* Prova de Entrega */}
    {order.delivery?.proof_of_delivery_url && (
      <div style={{ ...cardStyle, marginBottom: '1rem' }}>
        <h3 style={cardTitle}>📸 Prova de Entrega</h3>
        <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <img
            src={order.delivery.proof_of_delivery_url.startsWith('http') ? order.delivery.proof_of_delivery_url : `${API_BASE_URL}${order.delivery.proof_of_delivery_url}`}
            alt="Prova de entrega"
            style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', background: '#f8fafc' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>
    )}

    {/* Avaliações */}
    {(order.delivery?.customer_rating || order.delivery?.driver_rating) && (
      <div style={{ ...cardStyle, marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>
          ⭐ Avaliações
        </h3>
        {order.delivery?.customer_rating && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Estabelecimento → Entregador</p>
            <p style={{ fontSize: '1.25rem', color: '#f59e0b' }}>{'★'.repeat(order.delivery.customer_rating)}{'☆'.repeat(5 - order.delivery.customer_rating)}</p>
            {order.delivery.customer_feedback && <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.25rem' }}>"{order.delivery.customer_feedback}"</p>}
          </div>
        )}
        {order.delivery?.driver_rating && (
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Entregador → Estabelecimento</p>
            <p style={{ fontSize: '1.25rem', color: '#f59e0b' }}>{'★'.repeat(order.delivery.driver_rating)}{'☆'.repeat(5 - order.delivery.driver_rating)}</p>
            {order.delivery.driver_feedback && <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.25rem' }}>"{order.delivery.driver_feedback}"</p>}
          </div>
        )}
      </div>
    )}

    {/* Valores */}
    <div style={{ ...cardStyle, marginBottom: '1rem' }}>
      <h3 style={cardTitle}><DollarSign size={16} /> Valores</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <p style={label}>Frete</p>
          <p style={{ fontWeight: 600, color: '#1e293b' }}>R$ {parseFloat(order.delivery_fee || 0).toFixed(2).replace('.', ',')}</p>
        </div>
        <div>
          <p style={label}>Total</p>
          <p style={{ fontWeight: 600, color: '#1e293b' }}>R$ {parseFloat(order.total_amount || 0).toFixed(2).replace('.', ',')}</p>
        </div>
        {si.product_value && (
          <div>
            <p style={label}>Valor dos Itens (cobrar do cliente)</p>
            <p style={{ fontWeight: 600, color: '#f59e0b' }}>R$ {parseFloat(si.product_value || 0).toFixed(2).replace('.', ',')}</p>
          </div>
        )}
        <div>
          <p style={label}>Pagamento</p>
          <p style={{ fontWeight: 500, color: '#1e293b' }}>{utils.getStatusText(order.payment_method)}</p>
        </div>
      </div>
    </div>

    {/* Entregador */}
    {order.driver && (
      <div style={{ ...cardStyle, marginBottom: '1rem' }}>
        <h3 style={cardTitle}><Bike size={16} /> Entregador</h3>
        <p style={{ fontWeight: 500, color: '#1e293b' }}>
          {order.driver.user?.first_name} {order.driver.user?.last_name}
        </p>
        <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>{order.driver.vehicle_type}</p>
        {order.driver.user?.phone && (
          <a
            href={`https://wa.me/55${order.driver.user.phone.replace(/\D/g, '')}?text=Olá ${order.driver.user?.first_name}, sobre o pedido #${order.order_number}...`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              marginTop: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
              background: '#25d366', color: 'white', fontSize: '0.75rem', fontWeight: 600,
              textDecoration: 'none', cursor: 'pointer'
            }}
          >
            💬 WhatsApp
          </a>
        )}
      </div>
    )}

    {/* Informações extras */}
    {si.distance_km && (
      <div style={{ ...cardStyle, marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem' }}>Informações da Entrega</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <p style={label}>Distância</p>
            <p style={{ ...value }}>{si.distance_km} km</p>
          </div>
          {si.price_per_km && (
            <div>
              <p style={label}>Preço por km</p>
              <p style={{ ...value }}>R$ {parseFloat(si.price_per_km || 0).toFixed(2).replace('.', ',')}</p>
            </div>
          )}
        </div>
      </div>
    )}
  </>
);

export default OrderInfoCards;
