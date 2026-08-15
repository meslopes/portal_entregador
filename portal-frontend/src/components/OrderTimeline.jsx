import React from 'react';
import { Clock, CheckCircle, Package, Truck, MapPin } from 'lucide-react';

const TIMELINE_STEPS = [
  { key: 'created', label: 'Criado', icon: Clock, status: 'SCHEDULED' },
  { key: 'accepted', label: 'Aceito', icon: CheckCircle, status: 'ACCEPTED' },
  { key: 'preparing', label: 'Preparando', icon: Package, status: 'PREPARING' },
  { key: 'ready', label: 'Pronto', icon: CheckCircle, status: 'READY' },
  { key: 'picked_up', label: 'A Caminho', icon: Truck, status: 'PICKED_UP' },
  { key: 'delivered', label: 'Entregue', icon: MapPin, status: 'DELIVERED' },
];

const STATUS_COLORS = {
  SCHEDULED: '#8b5cf6',
  PENDING: '#f59e0b',
  ACCEPTED: '#2563eb',
  PREPARING: '#8b5cf6',
  READY: '#06b6d4',
  PICKED_UP: '#3b82f6',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
};

const formatTime = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const OrderTimeline = ({ order }) => {
  if (!order) return null;

  const isCancelled = order.status === 'CANCELLED';

  const getTimestamp = (key) => {
    switch (key) {
      case 'created': return order.created_at;
      case 'accepted': return order.accepted_at;
      case 'preparing': return order.preparing_at;
      case 'ready': return order.ready_at;
      case 'picked_up': return order.picked_up_at;
      case 'delivered': return order.delivery_time;
      default: return null;
    }
  };

  const getStepStatus = (step, index) => {
    if (isCancelled) {
      const lastCompletedIndex = TIMELINE_STEPS.findIndex(s => !getTimestamp(s.key));
      if (index < lastCompletedIndex) return 'completed';
      return 'cancelled';
    }

    const timestamp = getTimestamp(step.key);
    if (timestamp) return 'completed';

    const currentIndex = TIMELINE_STEPS.findIndex(s => {
      const statusOrder = ['SCHEDULED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED'];
      const orderStatusIndex = statusOrder.indexOf(order.status);
      const stepStatusIndex = statusOrder.indexOf(s.status);
      return stepStatusIndex === orderStatusIndex + 1;
    });

    if (index === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {isCancelled && (
        <div style={{
          padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', fontSize: '0.75rem', fontWeight: 500,
          marginBottom: '0.75rem', textAlign: 'center'
        }}>
          Pedido Cancelado
        </div>
      )}

      <div style={{ position: 'relative', paddingLeft: '1.75rem' }}>
        {TIMELINE_STEPS.map((step, index) => {
          const stepStatus = getStepStatus(step, index);
          const timestamp = getTimestamp(step.key);
          const Icon = step.icon;
          const isLast = index === TIMELINE_STEPS.length - 1;

          const dotColor = stepStatus === 'completed' ? '#22c55e'
            : stepStatus === 'current' ? '#3b82f6'
            : stepStatus === 'cancelled' ? '#ef4444'
            : '#e2e8f0';

          const lineColor = stepStatus === 'completed' ? '#22c55e' : '#e2e8f0';

          return (
            <div key={step.key} style={{
              position: 'relative',
              paddingBottom: isLast ? 0 : '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              {/* Linha conectora */}
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  left: '-1.1875rem',
                  top: '1.25rem',
                  width: '2px',
                  height: 'calc(100% - 0.5rem)',
                  background: lineColor,
                  borderRadius: '1px'
                }} />
              )}

              {/* Dot */}
              <div style={{
                position: 'absolute',
                left: '-1.4375rem',
                top: '0.125rem',
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '50%',
                background: dotColor,
                border: stepStatus === 'current' ? '2px solid #93c5fd' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1
              }}>
                {stepStatus === 'completed' && (
                  <CheckCircle size={10} style={{ color: 'white' }} />
                )}
              </div>

              {/* Conteúdo */}
              <div style={{ flex: 1, minHeight: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: stepStatus === 'current' ? 600 : 400,
                    color: stepStatus === 'completed' ? '#166534'
                      : stepStatus === 'current' ? '#1e40af'
                      : '#64748b'
                  }}>
                    {step.label}
                  </span>
                  {timestamp && (
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                      {formatTime(timestamp)}
                    </span>
                  )}
                </div>
                {timestamp && (
                  <span style={{ fontSize: '0.625rem', color: '#64748b' }}>
                    {formatDate(timestamp)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
