import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import { orderService } from '@/lib/api';
import {
  startSiren, stopSiren, startOrderMonitor, stopOrderMonitor,
  setSoundEnabled, getSoundEnabled,
  requestNotificationPermission, sendBrowserNotification
} from '@/lib/notify';
import { OrdersHeader, OrdersTabs } from './orders/OrdersHeader';
import { OrderCard, ActiveOrderCard } from './orders/OrderCard';
import { AvailableEmptyState, ActiveEmptyState, ErrorBanner } from './orders/EmptyState';

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
  const [activeTab, setActiveTab] = useState('available');
  const navigate = useNavigate();
  const prevCountRef = useRef(0);

  const loadAvailableOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getAvailableOrders();
      const newOrders = response.orders || [];
      setOrders(newOrders);
      setError('');
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

  const loadActiveOrders = useCallback(async () => {
    try {
      const response = await orderService.getActiveOrders();
      setActiveOrders(response.orders || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos ativos:', error);
    }
  }, []);

  useEffect(() => {
    startOrderMonitor((newOrders) => {
      setOrders(newOrders);
    });
    return () => stopOrderMonitor();
  }, []);

  useEffect(() => {
    loadAvailableOrders();
    loadActiveOrders();
    const interval = setInterval(() => {
      loadAvailableOrders();
      loadActiveOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadAvailableOrders, loadActiveOrders]);

  const handleAcceptOrder = async (orderId) => {
    try {
      setAcceptingOrder(orderId);
      stopSiren();
      await orderService.acceptOrder(orderId);
      setOrders(orders.filter(order => order.id !== orderId));
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

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
    if (!newState) stopSiren();
  };

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
    if (order.estimated_driver_earnings != null) {
      return order.estimated_driver_earnings;
    }
    const baseEarning = (order.delivery_fee || 0) * 0.7;
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
      <OrdersHeader
        activeTab={activeTab}
        ordersCount={orders.length}
        activeOrdersCount={activeOrders.length}
        isLoading={isLoading}
        soundEnabled={soundEnabled}
        notifEnabled={notifEnabled}
        onToggleSound={toggleSound}
        onToggleNotifications={toggleNotifications}
        onRefresh={() => { loadAvailableOrders(); loadActiveOrders(); }}
      />

      <OrdersTabs
        activeTab={activeTab}
        ordersCount={orders.length}
        activeOrdersCount={activeOrders.length}
        onTabChange={setActiveTab}
      />

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

      {error && <ErrorBanner message={error} />}

      {activeTab === 'available' ? (
        orders.length === 0 ? (
          <AvailableEmptyState onRetry={loadAvailableOrders} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onAccept={handleAcceptOrder} onReject={handleRejectOrder} isAccepting={acceptingOrder === order.id} isRejecting={rejectingOrder === order.id} calculateEarnings={calculateEarnings} />
            ))}
          </div>
        )
      ) : (
        activeOrders.length === 0 ? (
          <ActiveEmptyState />
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

export default OrdersPage;
