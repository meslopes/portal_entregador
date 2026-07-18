import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Clock, DollarSign, Store, User, Phone,
  AlertCircle, Navigation, CheckCircle, ArrowRight, ChevronRight
} from 'lucide-react';
import { orderService, utils } from '@/lib/api';

const STATUS_FLOW = [
  { key: 'ACCEPTED', label: 'Aceito', icon: CheckCircle },
  { key: 'PREPARING', label: 'Preparando', icon: Package },
  { key: 'READY', label: 'Pronto', icon: CheckCircle },
  { key: 'PICKED_UP', label: 'Coletado', icon: Navigation },
  { key: 'DELIVERED', label: 'Entregue', icon: MapPin },
];

const STATUS_ACTIONS = {
  ACCEPTED: { label: 'Cheguei ao Restaurante', next: 'PREPARING', color: '#f59e0b' },
  PREPARING: { label: 'Pedido Pronto para Retirada', next: 'READY', color: '#8b5cf6', waitMsg: 'Aguardando restaurante preparar...' },
  READY: { label: 'Coletar Pedido', next: 'PICKED_UP', color: '#2563eb' },
  PICKED_UP: { label: 'Entregar Pedido', next: 'DELIVERED', color: '#22c55e' },
};

const ActiveDeliveryPage = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCurrentOrder();
  }, []);

  const loadCurrentOrder = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getCurrentOrder();
      if (response.order) {
        setOrder(response.order);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Erro ao carregar pedido');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!order || isUpdating) return;

    const action = STATUS_ACTIONS[order.status];
    if (!action) return;

    try {
      setIsUpdating(true);
      setError('');
      await orderService.updateOrderStatus(order.id, action.next);

      setOrder(prev => ({ ...prev, status: action.next }));

      if (action.next === 'DELIVERED') {
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (err) {
      setError('Erro ao atualizar status');
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '3rem', height: '3rem',
          border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  if (!order) return null;

  const currentStepIndex = STATUS_FLOW.findIndex(s => s.key === order.status);
  const action = STATUS_ACTIONS[order.status];
  const isDelivered = order.status === 'DELIVERED';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
            padding: '0.25rem', display: 'flex'
          }}>
            ← Voltar
          </button>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Pedido #{order.order_number}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Acompanhe o andamento da entrega
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Status Steps */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          {/* Linha de fundo */}
          <div style={{
            position: 'absolute', top: '1.25rem', left: '2.5rem', right: '2.5rem',
            height: '3px', background: '#e2e8f0', zIndex: 0
          }} />
          {/* Linha progresso */}
          <div style={{
            position: 'absolute', top: '1.25rem', left: '2.5rem',
            width: `${(currentStepIndex / (STATUS_FLOW.length - 1)) * (100 - 12)}%`,
            height: '3px', background: '#2563eb', zIndex: 1,
            transition: 'width 0.5s ease'
          }} />

          {STATUS_FLOW.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem',
                  borderRadius: '50%',
                  background: isCompleted ? '#22c55e' : isCurrent ? '#2563eb' : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isCompleted || isCurrent ? 'white' : '#94a3b8',
                  transition: 'all 0.3s',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none'
                }}>
                  {isCompleted ? <CheckCircle size={18} /> : <StepIcon size={18} />}
                </div>
                <span style={{
                  fontSize: '0.6875rem',
                  marginTop: '0.5rem',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? '#1e293b' : '#94a3b8',
                  textAlign: 'center'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entrega concluída */}
      {isDelivered && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '4rem', height: '4rem',
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <CheckCircle size={32} style={{ color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
            Entrega Concluída!
          </h2>
          <p style={{ color: '#16a34a', marginBottom: '1rem' }}>
            Parabéns! Sua entrega foi realizada com sucesso.
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>
            +{utils.formatCurrency(order.delivery?.driver_earnings || 0)}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#16a34a', marginTop: '0.25rem' }}>ganho nesta entrega</p>
        </div>
      )}

      {/* Botão de ação */}
      {action && !isDelivered && (
        <button
          onClick={handleAdvanceStatus}
          disabled={isUpdating}
          style={{
            width: '100%',
            padding: '1rem 1.5rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: action.color,
            color: 'white',
            fontSize: '1.0625rem',
            fontWeight: 700,
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            transition: 'all 0.15s',
            opacity: isUpdating ? 0.7 : 1,
            boxShadow: `0 4px 14px ${action.color}40`
          }}
        >
          {isUpdating ? (
            <>
              <div style={{
                width: '1.25rem', height: '1.25rem',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
              Atualizando...
            </>
          ) : (
            <>
              {action.label}
              <ArrowRight size={20} />
            </>
          )}
        </button>
      )}

      {/* Mensagem de espera (PREPARING) */}
      {order.status === 'PREPARING' && (
        <div style={{
          background: '#faf5ff',
          border: '1px solid #e9d5ff',
          borderRadius: '0.5rem',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: '#7c3aed'
        }}>
          <Clock size={16} /> Aguardando restaurante preparar o pedido...
        </div>
      )}

      {/* Info do Pedido */}
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
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
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
            <button style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              color: '#64748b'
            }}>
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
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
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
            <button style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              color: '#64748b'
            }}>
              <Navigation size={16} />
            </button>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Valor Total</p>
              <p style={{ fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Seus Ganhos</p>
              <p style={{ fontWeight: 700, color: '#22c55e' }}>
                {utils.formatCurrency(order.delivery?.driver_earnings || 0)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Pagamento</p>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                {utils.getStatusText(order.payment_method)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Itens</p>
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ActiveDeliveryPage;
