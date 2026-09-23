import { Users, MapPin } from 'lucide-react';
import { utils } from '@/lib/api';
import { ORDER_STATUS } from '@/constants/status';

export default function StatusOrderCard({
  order,
  isMenuOpen,
  onToggleMenu,
  onOpenAssign,
  onCenterMap,
  getTimeRemaining,
  onChangeStatus,
}) {
  return (
    <div
      style={{
        padding: '0.5rem', borderRadius: '0.25rem',
        background: 'white', marginBottom: '0.25rem',
        fontSize: '0.75rem', border: '1px solid #f1f5f9',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{utils.formatCurrency(order.total_amount)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMenu(order.id); }}
            style={{
              padding: '0.125rem 0.25rem', border: 'none', background: 'transparent',
              cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', lineHeight: 1
            }}
          >
            ⋮
          </button>
        </div>
      </div>
      <div style={{ color: '#64748b', marginTop: '0.125rem', fontSize: '0.75rem' }}>
        {order.customer?.name || 'Cliente'}
      </div>

      {/* Countdown para pedidos agendados */}
      {order.status === 'SCHEDULED' && order.scheduled_at && (
        <div style={{
          marginTop: '0.25rem', padding: '0.25rem 0.375rem',
          background: '#e0e7ff', borderRadius: '0.25rem',
          fontSize: '0.75rem', color: '#4338ca', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '0.25rem'
        }}>
          ⏰ Lança em {getTimeRemaining(order.scheduled_at)}
        </div>
      )}

      {/* Menu do pedido */}
      {isMenuOpen && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 50,
          background: 'white', borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #e2e8f0', width: '220px',
          padding: '0.5rem'
        }}>
          {/* Detalhes */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Detalhes</p>
            <p style={{ fontSize: '0.75rem', color: '#1e293b' }}>Rest: {order.restaurant?.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#1e293b' }}>Cliente: {order.customer?.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#1e293b' }}>Frete: {utils.formatCurrency(order.delivery_fee)}</p>
            <p style={{ fontSize: '0.75rem', color: '#1e293b' }}>Total: {utils.formatCurrency(order.total_amount)}</p>
          </div>

          {/* Atribuir Entregador */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenAssign(order); }}
            style={{
              width: '100%', padding: '0.5rem 0.5rem',
              border: 'none', background: '#eff6ff',
              borderRadius: '0.375rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.75rem', color: '#2563eb', fontWeight: 600,
              marginBottom: '0.25rem'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
            onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
          >
            <Users size={14} /> Atribuir Entregador
          </button>

          {/* Alterar Status */}
          <p style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>Alterar Status</p>
          {['SCHEDULED', 'PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].map(s => {
            if (s === order.status) return null;
            const cfg = ORDER_STATUS[s];
            return (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onChangeStatus(order.id, s); }}
                style={{
                  width: '100%', padding: '0.375rem 0.5rem',
                  border: 'none', background: 'transparent',
                  borderRadius: '0.25rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  fontSize: '0.75rem', color: '#1e293b', textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '0.75rem' }}>{cfg.icon}</span>
                {cfg.label}
              </button>
            );
          })}

          {/* Ver no mapa */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const delLat = order.delivery_address?.latitude;
              const delLng = order.delivery_address?.longitude;
              if (delLat && delLng) onCenterMap(delLat, delLng);
            }}
            style={{
              width: '100%', padding: '0.375rem 0.5rem',
              border: 'none', background: 'transparent',
              borderRadius: '0.25rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontSize: '0.75rem', color: '#2563eb',
              borderTop: '1px solid #f1f5f9', marginTop: '0.25rem', paddingTop: '0.5rem'
            }}
          >
            <MapPin size={12} /> Ver Entrega no Mapa
          </button>
        </div>
      )}
    </div>
  );
}
