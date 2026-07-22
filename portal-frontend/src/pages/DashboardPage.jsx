import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck, MapPin, DollarSign, Clock, Star, Package,
  TrendingUp, AlertCircle, Navigation, Zap, ArrowRight, Bell, BellOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { driverService, orderService, utils } from '@/lib/api';
import {
  startOrderMonitor, stopOrderMonitor,
  setSoundEnabled, getSoundEnabled,
  requestNotificationPermission
} from '@/lib/notify';

const DashboardPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (user?.driver) {
      setIsOnline(user.driver.is_online);
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, orderData] = await Promise.all([
        driverService.getStats(),
        orderService.getCurrentOrder()
      ]);
      setStats(statsData);
      setCurrentOrder(orderData.order || null);
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.error('Erro ao obter localização:', err)
      );
    }
  };

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      if (newStatus && !location) {
        setError('Localização necessária para ficar online');
        return;
      }
      const response = await driverService.toggleOnlineStatus(newStatus, location?.latitude, location?.longitude);
      setIsOnline(newStatus);
      updateUser({ ...user, driver: response.driver });
      setError('');
    } catch (error) {
      setError('Erro ao alterar status');
    }
  };

  const updateLocation = async () => {
    if (!location) { getCurrentLocation(); return; }
    try { await driverService.updateLocation(location.latitude, location.longitude); }
    catch (error) { console.error(error); }
  };

  useEffect(() => {
    let interval;
    if (isOnline && location) interval = setInterval(updateLocation, 30000);
    return () => { if (interval) clearInterval(interval); };
  }, [isOnline, location]);

  // Monitor de pedidos (sirene + notificacao)
  useEffect(() => {
    startOrderMonitor(null);
    return () => stopOrderMonitor();
  }, []);

  if (isLoading) {
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
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header com Status Online */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Olá, {user?.first_name} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            {isOnline ? 'Você está online e pronto para entregar' : 'Fique online para receber pedidos'}
          </p>
        </div>

        {/* Toggle Online/Offline */}
        <button
          onClick={handleToggleOnline}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '9999px',
            border: 'none',
            background: isOnline ? '#22c55e' : '#e2e8f0',
            color: isOnline ? 'white' : '#64748b',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9375rem',
            transition: 'all 0.2s',
            boxShadow: isOnline ? '0 4px 14px rgba(34, 197, 94, 0.4)' : 'none'
          }}
        >
          <div style={{
            width: '2.5rem', height: '1.375rem',
            borderRadius: '9999px',
            background: isOnline ? 'rgba(255,255,255,0.3)' : '#cbd5e1',
            position: 'relative',
            transition: 'all 0.2s'
          }}>
            <div style={{
              width: '1.125rem', height: '1.125rem',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '0.125rem',
              left: isOnline ? '1.25rem' : '0.125rem',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
          {isOnline ? 'Online' : 'Offline'}
        </button>
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

      {/* Pedido em andamento */}
      {currentOrder && (
        <div
          onClick={() => navigate('/delivery/active')}
          style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #2563eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.15)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: 600, color: '#1e293b' }}>Pedido em Andamento</span>
            </div>
            <span style={{ fontSize: '0.8125rem', color: '#2563eb', fontWeight: 500 }}>
              Acompanhar →
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Pedido</p>
              <p style={{ fontWeight: 600, color: '#1e293b' }}>#{currentOrder.order_number}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Status</p>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: '#dbeafe',
                color: '#2563eb'
              }}>
                {utils.getStatusText(currentOrder.status)}
              </span>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Valor</p>
              <p style={{ fontWeight: 600, color: '#1e293b' }}>{utils.formatCurrency(currentOrder.total_amount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          icon={<DollarSign size={22} />}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          label="Ganhos Hoje"
          value={stats ? utils.formatCurrency(stats.today_earnings) : 'R$ 0,00'}
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          iconBg="#dbeafe"
          iconColor="#2563eb"
          label="Ganhos da Semana"
          value={stats ? utils.formatCurrency(stats.week_earnings) : 'R$ 0,00'}
        />
        <StatCard
          icon={<Package size={22} />}
          iconBg="#f3e8ff"
          iconColor="#9333ea"
          label="Total Entregas"
          value={stats?.total_deliveries || 0}
        />
        <StatCard
          icon={<Star size={22} />}
          iconBg="#fef3c7"
          iconColor="#d97706"
          label="Avaliação"
          value={stats ? stats.average_rating.toFixed(1) : '5.0'}
          suffix="/5.0"
        />
      </div>

      {/* Ações Rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <ActionCard
          icon={<Package size={24} />}
          iconBg="#eff6ff"
          iconColor="#2563eb"
          title="Pedidos Disponíveis"
          description="Veja os pedidos disponíveis na sua região"
          onClick={() => navigate('/orders')}
        />
        <ActionCard
          icon={<DollarSign size={24} />}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
          title="Meus Ganhos"
          description="Acompanhe seu histórico de ganhos"
          onClick={() => navigate('/earnings')}
        />
        <ActionCard
          icon={<Clock size={24} />}
          iconBg="#faf5ff"
          iconColor="#9333ea"
          title="Histórico"
          description="Veja suas entregas anteriores"
          onClick={() => navigate('/history')}
        />
      </div>

      {/* Localização */}
      {location && (
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MapPin size={16} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </span>
          </div>
          <button
            onClick={getCurrentLocation}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#64748b',
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
          >
            <Navigation size={14} /> Atualizar
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// Componente de Card de Estatística
const StatCard = ({ icon, iconBg, iconColor, label, value, suffix = '' }) => (
  <div style={{
    background: 'white',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    cursor: 'default'
  }}
  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        padding: '0.625rem',
        borderRadius: '0.5rem',
        background: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>{suffix}</span></p>
      </div>
    </div>
  </div>
);

// Componente de Ação Rápida
const ActionCard = ({ icon, iconBg, iconColor, title, description, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      cursor: 'pointer',
      transition: 'all 0.15s',
      border: '1px solid transparent'
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          padding: '0.75rem',
          borderRadius: '0.5rem',
          background: iconBg,
          color: iconColor
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{title}</h3>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{description}</p>
        </div>
      </div>
      <ArrowRight size={18} style={{ color: '#cbd5e1' }} />
    </div>
  </div>
);

export default DashboardPage;
