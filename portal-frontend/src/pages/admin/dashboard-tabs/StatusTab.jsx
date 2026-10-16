import { ChevronDown } from 'lucide-react';
import { ORDER_STATUS } from '@/constants/status';
import StatusOrderCard from './StatusOrderCard';

export default function StatusTab({
  orders,
  // Seção de status aberta (ex.: 'PENDING') — separada do menu do pedido
  expandedStatus,
  onToggleStatus,
  // Menu ⋮ do pedido (order.id) — NÃO pode fechar a seção de status
  selectedOrderMenu,
  onToggleOrderMenu,
  onOpenAssign,
  onCenterMap,
  getTimeRemaining,
  onChangeStatus,
  onNavigate,
}) {
  const getOrdersByStatus = (status) => orders.filter(o => o.status === status);

  return (
    <div style={{ padding: '0.5rem' }}>
      {Object.entries(ORDER_STATUS)
        .filter(([status]) => !['PREPARING', 'READY'].includes(status))
        .map(([status, config]) => {
          const statusOrders = getOrdersByStatus(status);
          const count = statusOrders.length;
          const isSectionOpen = expandedStatus === status;

          return (
            <div key={status} style={{ marginBottom: '0.25rem' }}>
              <button
                onClick={() => onToggleStatus(status)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '0.75rem', border: 'none',
                  background: isSectionOpen ? '#f8fafc' : 'transparent',
                  borderRadius: '0.375rem', cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>{config.icon}</span>
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                    Pedidos {config.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    padding: '0.125rem 0.5rem', borderRadius: '9999px',
                    background: config.bg, color: config.color,
                    fontSize: '0.75rem', fontWeight: 600
                  }}>
                    {count}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      color: '#64748b',
                      transform: isSectionOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  />
                </div>
              </button>

              {isSectionOpen && (
                <div style={{ padding: '0.25rem 0.5rem' }}>
                  {count === 0 && (
                    <div style={{ padding: '0.5rem 0.75rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                      Nenhum pedido nesta etapa
                    </div>
                  )}
                  {statusOrders.slice(0, 5).map(order => (
                    <StatusOrderCard
                      key={order.id}
                      order={order}
                      isMenuOpen={selectedOrderMenu === order.id}
                      onToggleMenu={onToggleOrderMenu}
                      onOpenAssign={onOpenAssign}
                      onCenterMap={onCenterMap}
                      getTimeRemaining={getTimeRemaining}
                      onChangeStatus={onChangeStatus}
                    />
                  ))}
                  {count > 5 && (
                    <div
                      style={{ textAlign: 'center', padding: '0.25rem', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer' }}
                      onClick={() => onNavigate(`/admin/orders?status=${status}`)}
                    >
                      Ver todos ({count})
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
