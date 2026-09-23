import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Clock, Store, ShoppingCart, ChevronRight } from 'lucide-react';
import { utils } from '@/lib/api';

const OrderCard = ({ order, onAccept, onReject, isAccepting, isRejecting, calculateEarnings }) => {
  const earnings = calculateEarnings(order);
  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s', borderLeft: '4px solid #2563eb' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={18} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Pedido #{order.order_number}</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.items?.length || 0} ite{order.items?.length !== 1 ? 'ns' : 'm'}</p>
          </div>
        </div>
        <div style={{ padding: '0.375rem 0.875rem', borderRadius: '9999px', background: '#dcfce7', color: '#16a34a', fontSize: '0.875rem', fontWeight: 600 }}>
          +{utils.formatCurrency(earnings)}
        </div>
      </div>
      {/* Conteudo */}
      <div style={{ padding: '1.25rem' }}>
        {/* Coleta */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Store size={14} style={{ color: '#d97706' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coletar em</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.restaurant?.name || 'Restaurante'}</p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.restaurant?.address || 'Endereço não informado'}</p>
            {order.distance_to_restaurant_km && <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.125rem' }}>📍 {order.distance_to_restaurant_km} km de você</p>}
          </div>
        </div>
        {/* Entrega */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={14} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entregar em</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customer?.name || 'Cliente'}</p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.delivery_address?.street || ''}{order.delivery_address?.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}</p>
            {order.delivery_distance_km && <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.125rem' }}>🏁 {order.delivery_distance_km} km de distância</p>}
          </div>
        </div>
        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.875rem', background: '#f8fafc', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Total</p>
            <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>{utils.formatCurrency(order.total_amount)}</p>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Pagamento</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem' }}>{utils.getStatusText(order.payment_method)}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Tempo</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <Clock size={12} /> {order.estimated_delivery_time_minutes || '—'} min
            </p>
          </div>
        </div>
        {/* Instrucoes */}
        {order.special_instructions && (() => {
          let instructions = order.special_instructions;
          if (instructions.includes('REJECTED_BY_')) {
            instructions = '';
          }
          try {
            const parsed = JSON.parse(order.special_instructions);
            const parts = [];
            if (parsed.product_value) parts.push(`Cobrar R$ ${parsed.product_value}`);
            if (parsed.product_payment_method) {
              const methods = { CASH: 'Dinheiro', CARD: 'Cartão', PIX: 'PIX' };
              parts.push(`Pagamento: ${methods[parsed.product_payment_method] || parsed.product_payment_method}`);
            }
            if (parsed.change_for) parts.push(`Troco para R$ ${parsed.change_for}`);
            if (parts.length > 0) instructions = parts.join(' | ');
          } catch (e) {}
          if (!instructions) return null;
          return (
            <div style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '0.75rem 1rem', borderRadius: '0 0.375rem 0.375rem 0', marginBottom: '1rem', fontSize: '0.8125rem', color: '#92400e' }}>
              📝 {instructions}
            </div>
          );
        })()}
        {/* Aviso de volume */}
        <div style={{ background: '#eff6ff', borderLeft: '3px solid #2563eb', padding: '0.625rem 1rem', borderRadius: '0 0.375rem 0.375rem 0', marginBottom: '1rem', fontSize: '0.8125rem', color: '#1e40af' }}>
          🔊 Verifique se o volume do seu celular está alto para não perder este pedido!
        </div>
        {/* Botoes Aceitar/Recusar */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => onAccept(order.id)} disabled={isAccepting || isRejecting} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: isAccepting ? '#93c5fd' : '#22c55e', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: isAccepting ? 'not-allowed' : 'pointer' }}>
            {isAccepting ? (<><div style={{ width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Aceitando...</>) : '✓ Aceitar Pedido'}
          </button>
          <button onClick={() => onReject(order.id)} disabled={isAccepting || isRejecting} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: isRejecting ? '#fca5a5' : '#ef4444', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: isRejecting ? 'not-allowed' : 'pointer' }}>
            {isRejecting ? 'Recusando...' : '✕ Recusar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Card de pedido ativo
const ActiveOrderCard = ({ order }) => {
  const STATUS_CONFIG = {
    ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito' },
    PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando' },
    READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto para Coleta' },
    PICKED_UP: { color: '#f59e0b', bg: '#fef3c7', text: 'A Caminho' },
  };

  const config = STATUS_CONFIG[order.status] || { color: '#64748b', bg: '#f1f5f9', text: order.status };
  const navigate = useNavigate();

  return (
    <div style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${config.color}` }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={14} style={{ color: config.color }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>#{order.order_number}</p>
              <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{order.restaurant?.name}</p>
            </div>
          </div>
          <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: config.bg, color: config.color }}>
            {config.text}
          </span>
        </div>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Coletar em</p>
            <p style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500 }}>{order.restaurant?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem' }}>Entregar em</p>
            <p style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500 }}>{order.customer?.name}</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            {utils.formatCurrency(order.total_amount)}
          </p>
          <button
            onClick={() => navigate(`/delivery/${order.id}`)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              border: 'none', background: config.color, color: 'white',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.375rem'
            }}
          >
            Acompanhar <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export { OrderCard, ActiveOrderCard };
