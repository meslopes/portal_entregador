import React from 'react';
import { Package, Clock, Volume2, VolumeX, Bell, BellOff, RefreshCw } from 'lucide-react';
import { iconBtn, refreshBtn } from './styles';

const OrdersHeader = ({
  activeTab, ordersCount, activeOrdersCount,
  isLoading, soundEnabled, notifEnabled,
  onToggleSound, onToggleNotifications, onRefresh,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
        Meus Pedidos
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
        {activeTab === 'available'
          ? `${ordersCount} pedido${ordersCount !== 1 ? 's' : ''} disponível${ordersCount !== 1 ? 'eis' : ''}`
          : `${activeOrdersCount} pedido${activeOrdersCount !== 1 ? 's' : ''} em andamento`}
        {!isLoading && <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>• atualiza a cada 10s</span>}
      </p>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {activeTab === 'available' && ordersCount > 0 && (
        <span style={{
          padding: '0.375rem 0.75rem', borderRadius: '9999px',
          background: '#fef2f2', color: '#dc2626',
          fontSize: '0.75rem', fontWeight: 600,
          animation: 'pulse-siren 1s ease-in-out infinite'
        }}>
          🔴 SIRENE ATIVA
        </span>
      )}
      <button onClick={onToggleSound} style={iconBtn(soundEnabled)} title={soundEnabled ? 'Som ON' : 'Som OFF'}>
        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      <button onClick={onToggleNotifications} style={iconBtn(notifEnabled)} title={notifEnabled ? 'Notificações ON' : 'Notificações OFF'}>
        {notifEnabled ? <Bell size={18} /> : <BellOff size={18} />}
      </button>
      <button onClick={onRefresh} disabled={isLoading} style={refreshBtn}>
        <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
        Atualizar
      </button>
    </div>
  </div>
);

const OrdersTabs = ({ activeTab, ordersCount, activeOrdersCount, onTabChange }) => (
  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', borderRadius: '0.75rem', padding: '0.25rem' }}>
    {[
      { id: 'available', label: `Disponíveis (${ordersCount})`, icon: <Package size={16} /> },
      { id: 'active', label: `Em Andamento (${activeOrdersCount})`, icon: <Clock size={16} /> },
    ].map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        style={{
          flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
          background: activeTab === tab.id ? 'white' : 'transparent',
          color: activeTab === tab.id ? '#2563eb' : '#64748b',
          fontSize: '0.875rem', fontWeight: activeTab === tab.id ? 600 : 400,
          cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}
      >
        {tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);

export { OrdersHeader, OrdersTabs };
