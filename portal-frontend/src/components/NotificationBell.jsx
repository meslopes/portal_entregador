import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Package, DollarSign, AlertCircle, X } from 'lucide-react';
import api from '@/lib/api';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    // Poll a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/api/user/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (err) {
      // Silently fail - not critical
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/api/user/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar notificação:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => api.put(`/api/user/notifications/${id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'NEW_ORDER': return <Package size={16} style={{ color: '#2563eb' }} />;
      case 'ORDER_STATUS': return <Package size={16} style={{ color: '#8b5cf6' }} />;
      case 'PAYMENT': return <DollarSign size={16} style={{ color: '#22c55e' }} />;
      case 'ALERT': return <AlertCircle size={16} style={{ color: '#f59e0b' }} />;
      default: return <Bell size={16} style={{ color: '#64748b' }} />;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem',
          color: '#64748b', transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: '#ef4444', color: 'white',
            fontSize: '0.625rem', fontWeight: 700,
            width: '1.125rem', height: '1.125rem',
            borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          width: '350px', maxHeight: '450px',
          background: 'white', borderRadius: '0.75rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden', zIndex: 100,
          marginTop: '0.5rem'
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem 1rem 0.75rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
              Notificações
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none', border: 'none',
                  color: '#2563eb', fontSize: '0.75rem',
                  fontWeight: 500, cursor: 'pointer'
                }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '2rem', textAlign: 'center',
                color: '#94a3b8', fontSize: '0.875rem'
              }}>
                <Bell size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(notification => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid #f8fafc',
                    display: 'flex', gap: '0.75rem',
                    cursor: notification.is_read ? 'default' : 'pointer',
                    background: notification.is_read ? 'white' : '#f8fafc',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = notification.is_read ? 'white' : '#f8fafc'}
                >
                  <div style={{
                    width: '2rem', height: '2rem',
                    borderRadius: '50%',
                    background: notification.is_read ? '#f1f5f9' : '#eff6ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.8125rem', fontWeight: notification.is_read ? 400 : 600,
                      color: '#1e293b', marginBottom: '0.25rem',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {notification.title || 'Notificação'}
                    </p>
                    <p style={{
                      fontSize: '0.75rem', color: '#64748b',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {notification.message}
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div style={{
                      width: '0.5rem', height: '0.5rem',
                      borderRadius: '50%', background: '#2563eb',
                      flexShrink: 0, marginTop: '0.375rem'
                    }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '0.75rem', borderTop: '1px solid #f1f5f9',
              textAlign: 'center'
            }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none', border: 'none',
                  color: '#64748b', fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
