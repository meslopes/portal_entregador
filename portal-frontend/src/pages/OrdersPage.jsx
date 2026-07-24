import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Clock, DollarSign, Navigation,
  Store, User, AlertCircle, RefreshCw, ChevronRight,
  Phone, Bike, ShoppingCart, ArrowRight, Volume2, VolumeX, Bell, BellOff, Route
} from 'lucide-react';
import { orderService, utils } from '@/lib/api';
import {
  startSiren, stopSiren, startOrderMonitor, stopOrderMonitor,
  setSoundEnabled, getSoundEnabled,
  requestNotificationPermission, sendBrowserNotification
} from '@/lib/notify';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingOrder, setAcceptingOrder] = useState(null);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled());
  const [notifEnabled, setNotifEnabled] = useState(
    'Notification' in window && Notification.permission === 'granted'
  );
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'active'
  const navigate = useNavigate();
  const prevCountRef = useRef(0);

  // Carrega pedidos disponiveis
  const loadAvailableOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getAvailableOrders();
      const newOrders = response.orders || [];
      setOrders(newOrders);
      setError('');

      // Toca sirene se houver novos pedidos
      if (newOrders.length > 0 && soundEnabled) {
        startSiren();
      } else if (newOrders.length === 0) {
        stopSiren();
      }

      prevCountRef.current = newOrders.length;
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setError(error.response?.data?.error || 'Erro ao carregar pedidos');
    } finally {
      setIsLoading(false);
    }
  }, [soundEnabled]);

  // Carrega pedidos ativos do entregador
  const loadActiveOrders = useCallback(async () => {
    try {
      const response = await orderService.getActiveOrders();
      setActiveOrders(response.orders || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos ativos:', error);
    }
  }, []);

  // Inicia monitor de pedidos (sirene global)
  useEffect(() => {
    startOrderMonitor((newOrders) => {
      setOrders(newOrders);
    });

    return () => stopOrderMonitor();
  }, []);

  // Atualiza a lista de pedidos periodicamente
  useEffect(() => {
    loadAvailableOrders();
    loadActiveOrders();
    const interval = setInterval(() => {
      loadAvailableOrders();
      loadActiveOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadAvailableOrders, loadActiveOrders]);

  // Aceitar pedido
  const handleAcceptOrder = async (orderId) => {
    try {
      setAcceptingOrder(orderId);
      stopSiren();
      await orderService.acceptOrder(orderId);
      setOrders(orders.filter(order => order.id !== orderId));
      // Carrega pedidos ativos e permanece na pagina
      loadActiveOrders();
      setActiveTab('active');
    } catch (error) {
      setError('Erro ao aceitar pedido');
      console.error(error);
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      setRejectingOrder(orderId);
      await orderService.rejectOrder(orderId);
      setOrders(orders.filter(order => order.id !== orderId));
    } catch (error) {
      setError('Erro ao recusar pedido');
      console.error(error);
    } finally {
      setRejectingOrder(null);
    }
  };

  // Toggle som
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
    if (!newState) stopSiren();
  };

  // Ativar notificacoes do navegador
  const toggleNotifications = async () => {
    if (notifEnabled) {
      setNotifEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
    if (granted) {
      sendBrowserNotification(
        '🔔 Notificações ativadas!',
        'Você será avisado quando houver novos pedidos.',
        null
      );
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
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Meus Pedidos
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            {activeTab === 'available' 
              ? `${orders.length} pedido${orders.length !== 1 ? 's' : ''} disponível${orders.length !== 1 ? 'eis' : ''}`
              : `${activeOrders.length} pedido${activeOrders.length !== 1 ? 's' : ''} em andamento`
            }
            {!isLoading && <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>• atualiza a cada 10s</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Sirene ativa */}
          {activeTab === 'available' && orders.length > 0 && (
            <span style={{
              padding: '0.375rem 0.75rem', borderRadius: '9999px',
              background: '#fef2f2', color: '#dc2626',
              fontSize: '0.75rem', fontWeight: 600,
              animation: 'pulse-siren 1s ease-in-out infinite'
            }}>
              🔴 SIRENE ATIVA
            </span>
          )}
          {/* Botao som */}
          <button onClick={toggleSound} style={iconBtn(soundEnabled)} title={soundEnabled ? 'Som ON' : 'Som OFF'}>
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          {/* Botao notificacao */}
          <button onClick={toggleNotifications} style={iconBtn(notifEnabled)} title={notifEnabled ? 'Notificações ON' : 'Notificações OFF'}>
            {notifEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          {/* Atualizar */}
          <button onClick={() => { loadAvailableOrders(); loadActiveOrders(); }} disabled={isLoading} style={refreshBtn}>
            <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', borderRadius: '0.75rem', padding: '0.25rem' }}>
        <button
          onClick={() => setActiveTab('available')}
          style={{
            flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
            background: activeTab === 'available' ? 'white' : 'transparent',
            color: activeTab === 'available' ? '#2563eb' : '#64748b',
            fontSize: '0.875rem', fontWeight: activeTab === 'available' ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: activeTab === 'available' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
        >
          <Package size={16} />
          Disponíveis ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
            background: activeTab === 'active' ? 'white' : 'transparent',
            color: activeTab === 'active' ? '#2563eb' : '#64748b',
            fontSize: '0.875rem', fontWeight: activeTab === 'active' ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: activeTab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
        >
          <Clock size={16} />
          Em Andamento ({activeOrders.length})
        </button>
      </div>

      {/* Botao Ver Rota */}
      {activeOrders.length > 0 && activeTab === 'active' && (
        <button
          onClick={() => navigate('/route')}
          style={{
            width: '100%', padding: '0.875rem 1.5rem', borderRadius: '0.75rem',
            border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: 'white', fontSize: '0.9375rem', fontWeight: 600,
            cursor: 'pointer', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}
        >
          <MapPin size={18} />
          Ver Minha Rota no Mapa ({activeOrders.length * 2} endereços)
          <Navigation size={16} />
        </button>
      )}

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Lista */}
      {activeTab === 'available' ? (
        // Pedidos disponiveis
        orders.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Package size={32} style={{ color: '#94a3b8' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Nenhum pedido disponível</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Não há pedidos disponíveis no momento. Você será notificado quando um novo pedido chegar.
            </p>
            <button onClick={loadAvailableOrders} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}>
              <RefreshCw size={16} /> Verificar Novamente
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onAccept={handleAcceptOrder} onReject={handleRejectOrder} isAccepting={acceptingOrder === order.id} isRejecting={rejectingOrder === order.id} calculateEarnings={calculateEarnings} />
            ))}
          </div>
        )
      ) : (
        // Pedidos ativos
        activeOrders.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={32} style={{ color: '#22c55e' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Nenhum pedido em andamento</h3>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
              Aceite pedidos disponíveis para começar a entregar.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeOrders.map((order) => (
              <ActiveOrderCard key={order.id} order={order} />
            ))}
          </div>
        )
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-siren { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
      `}</style>
    </div>
  );
};

// Card do pedido
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
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.items?.length || 0} ite{order.items?.length !== 1 ? 'ns' : 'm'}</p>
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
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coletar em</p>
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
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entregar em</p>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customer?.name || 'Cliente'}</p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.delivery_address?.street || ''}{order.delivery_address?.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}</p>
            {order.delivery_distance_km && <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.125rem' }}>🏁 {order.delivery_distance_km} km de distância</p>}
          </div>
        </div>
        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.875rem', background: '#f8fafc', borderRadius: '0.5rem', marginBottom: '1rem' }}>
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
        {/* Instrucoes */}
        {order.special_instructions && (() => {
          let instructions = order.special_instructions;
          // Filtra logs de rejeicao
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

  const config = STATUS_CONFIG[order.status] || { color: '#94a3b8', bg: '#f1f5f9', text: order.status };
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
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{order.restaurant?.name}</p>
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
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Coletar em</p>
            <p style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500 }}>{order.restaurant?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Entregar em</p>
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

// Estilos auxiliares
const iconBtn = (active) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  background: active ? '#dcfce7' : 'white',
  color: active ? '#16a34a' : '#94a3b8',
  cursor: 'pointer', transition: 'all 0.15s'
});

const refreshBtn = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
  border: '1px solid #e2e8f0', background: 'white',
  color: '#475569', fontSize: '0.875rem', fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.15s'
};

export default OrdersPage;
