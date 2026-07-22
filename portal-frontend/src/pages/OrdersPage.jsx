import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Clock, DollarSign, Navigation,
  Store, User, AlertCircle, RefreshCw, ChevronRight,
  Phone, Bike, ShoppingCart, ArrowRight, Volume2, VolumeX
} from 'lucide-react';
import { orderService, utils } from '@/lib/api';

// ============================================
// SISTEMA DE SIRENE (Web Audio API)
// ============================================

let sirenInterval = null;
let sirenOscillators = [];

const stopSiren = () => {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  sirenOscillators.forEach(osc => {
    try { osc.stop(); } catch (e) {}
  });
  sirenOscillators = [];
};

const startSiren = () => {
  stopSiren(); // Para qualquer sirene anterior

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const playCycle = () => {
      try {
        if (ctx.state === 'suspended') ctx.resume();

        // Tom agudo (800Hz)
        const oscHigh = ctx.createOscillator();
        const gainHigh = ctx.createGain();
        oscHigh.connect(gainHigh);
        gainHigh.connect(ctx.destination);
        oscHigh.frequency.value = 800;
        oscHigh.type = 'square';
        gainHigh.gain.value = 0.4;
        oscHigh.start(ctx.currentTime);
        gainHigh.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.15);
        gainHigh.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        oscHigh.stop(ctx.currentTime + 0.25);
        sirenOscillators.push(oscHigh);

        // Tom baixo (600Hz) - 0.25s depois
        const oscLow = ctx.createOscillator();
        const gainLow = ctx.createGain();
        oscLow.connect(gainLow);
        gainLow.connect(ctx.destination);
        oscLow.frequency.value = 600;
        oscLow.type = 'square';
        gainLow.gain.value = 0.4;
        oscLow.start(ctx.currentTime + 0.25);
        gainLow.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.4);
        gainLow.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscLow.stop(ctx.currentTime + 0.5);
        sirenOscillators.push(oscLow);
      } catch (e) {}
    };

    // Toca imediatamente
    playCycle();

    // Repete a cada 0.5 segundos
    sirenInterval = setInterval(playCycle, 500);
  } catch (e) {
    console.error('Erro ao iniciar sirene:', e);
  }
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingOrder, setAcceptingOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const navigate = useNavigate();
  const prevCountRef = useRef(0);

  // Para a sirene quando soundEnabled muda
  useEffect(() => {
    if (!soundEnabled) stopSiren();
  }, [soundEnabled]);

  // Para a sirene ao desmontar o componente
  useEffect(() => {
    return () => stopSiren();
  }, []);

  // Função para buscar pedidos
  const loadAvailableOrders = useCallback(async (playSound = false) => {
    try {
      setIsLoading(true);
      const response = await orderService.getAvailableOrders();
      const newOrders = response.orders || [];
      setOrders(newOrders);
      setError('');

      // Inicia sirene se houver novos pedidos e som habilitado
      if (soundEnabled && newOrders.length > 0 && playSound) {
        startSiren();
      }

      // Para sirene se nao ha pedidos
      if (newOrders.length === 0) {
        stopSiren();
      }

      prevCountRef.current = newOrders.length;
      setLastOrderCount(newOrders.length);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      const msg = error.response?.data?.error || error.message || 'Erro ao carregar pedidos';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => {
    // Carrega na inicialização
    loadAvailableOrders(false);

    // Polling a cada 10 segundos com som
    const interval = setInterval(() => {
      loadAvailableOrders(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadAvailableOrders]);

  const handleAcceptOrder = async (orderId) => {
    try {
      setAcceptingOrder(orderId);
      stopSiren(); // Para a sirene ao aceitar
      await orderService.acceptOrder(orderId);
      setOrders(orders.filter(order => order.id !== orderId));
      // Usa window.location para evitar conflito DOM com React Router
      window.location.href = '/dashboard';
    } catch (error) {
      setError('Erro ao aceitar pedido');
      console.error(error);
    } finally {
      setAcceptingOrder(null);
    }
  };

  const calculateEarnings = (order) => {
    const baseEarning = order.delivery_fee * 0.7;
    const distanceBonus = (order.delivery_distance_km || 0) * 0.5;
    return baseEarning + distanceBonus;
  };

  if (isLoading && orders.length === 0) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '3rem', height: '3rem',
          border: '3px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Pedidos Disponíveis
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} disponível{orders.length !== 1 ? 'eis' : ''} na sua região
            {!isLoading && <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>• atualiza a cada 10s</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Indicador de sirene ativa */}
          {orders.length > 0 && (
            <span style={{
              padding: '0.375rem 0.75rem', borderRadius: '9999px',
              background: '#fef2f2', color: '#dc2626',
              fontSize: '0.75rem', fontWeight: 600,
              animation: 'pulse-siren 1s ease-in-out infinite'
            }}>
              🔴 SIRENE ATIVA
            </span>
          )}
          {/* Botão de som */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (soundEnabled) stopSiren();
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '2.5rem', height: '2.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              background: soundEnabled ? '#dcfce7' : 'white',
              color: soundEnabled ? '#16a34a' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title={soundEnabled ? 'Som ativado - clique para desligar' : 'Som desativado - clique para ligar'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {/* Botão atualizar */}
          <button
            onClick={() => loadAvailableOrders(true)}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Lista de pedidos */}
      {orders.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '4rem 2rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '5rem', height: '5rem',
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <Package size={32} style={{ color: '#94a3b8' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
            Nenhum pedido disponível
          </h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Não há pedidos disponíveis na sua região no momento. Verifique novamente em alguns minutos.
          </p>
          <button
            onClick={loadAvailableOrders}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#2563eb',
              color: 'white',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={16} /> Verificar Novamente
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={handleAcceptOrder}
              isAccepting={acceptingOrder === order.id}
              calculateEarnings={calculateEarnings}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-siren {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

const OrderCard = ({ order, onAccept, isAccepting, calculateEarnings }) => {
  const earnings = calculateEarnings(order);

  return (
    <div style={{
      background: 'white',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.15s'
    }}>
      {/* Header do pedido */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #f1f5f9',
        background: '#fafbfc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.5rem', height: '2.5rem',
            borderRadius: '0.5rem',
            background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShoppingCart size={18} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
              Pedido #{order.order_number}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {order.items?.length || 0} ite{order.items?.length !== 1 ? 'ns' : 'm'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.375rem 0.875rem',
            borderRadius: '9999px',
            background: '#dcfce7',
            color: '#16a34a',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            +{utils.formatCurrency(earnings)}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '1.25rem' }}>
        {/* Coleta */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '2rem', height: '2rem',
            borderRadius: '0.375rem',
            background: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Store size={14} style={{ color: '#d97706' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coletar em</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {order.restaurant?.name || 'Restaurante'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {order.restaurant?.address || 'Endereço não informado'}
            </p>
            {order.distance_to_restaurant_km && (
              <p style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.125rem' }}>
                📍 {order.distance_to_restaurant_km} km de você
              </p>
            )}
          </div>
        </div>

        {/* Entrega */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '2rem', height: '2rem',
            borderRadius: '0.375rem',
            background: '#dcfce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <MapPin size={14} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entregar em</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {order.customer?.name || 'Cliente'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {order.delivery_address?.street || ''}{order.delivery_address?.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}
            </p>
            {order.delivery_distance_km && (
              <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.125rem' }}>
                🏁 {order.delivery_distance_km} km de distância
              </p>
            )}
          </div>
        </div>

        {/* Info do pedido */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          padding: '0.875rem',
          background: '#f8fafc',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Total</p>
            <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>{utils.formatCurrency(order.total_amount)}</p>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Pagamento</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem' }}>{utils.getStatusText(order.payment_method)}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tempo</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <Clock size={12} /> {order.estimated_delivery_time_minutes || '—'} min
            </p>
          </div>
        </div>

        {/* Instruções especiais */}
        {order.special_instructions && (() => {
          let instructions = order.special_instructions;
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
          return (
            <div style={{
              background: '#fffbeb',
              borderLeft: '3px solid #f59e0b',
              padding: '0.75rem 1rem',
              borderRadius: '0 0.375rem 0.375rem 0',
              marginBottom: '1rem',
              fontSize: '0.8125rem',
              color: '#92400e'
            }}>
              📝 {instructions}
            </div>
          );
        })()}

        {/* Botões */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onAccept(order.id)}
            disabled={isAccepting}
            style={{
              flex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.875rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: isAccepting ? '#93c5fd' : '#2563eb',
              color: 'white',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: isAccepting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {isAccepting ? (
              <>
                <div style={{
                  width: '1rem', height: '1rem',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
                Aceitando...
              </>
            ) : (
              <>Aceitar Pedido</>
            )}
          </button>
          <button
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.875rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Navigation size={16} /> Mapa
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
