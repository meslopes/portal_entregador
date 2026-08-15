import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, ArrowLeft, MapPin, Clock, CheckCircle, Truck, DollarSign, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { utils } from '@/lib/api';

const STATUS_CONFIG = {
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito', icon: CheckCircle },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando', icon: Package },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto', icon: CheckCircle },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'A Caminho', icon: Truck },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue', icon: CheckCircle },
};

const OwnDriverOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadOrders(); }, [filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get(`/api/own-driver/orders?status=${filter}`, { headers });
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      setError('Erro ao carregar pedidos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <button onClick={() => navigate('/own-driver')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Meus Pedidos</h1>
      </header>

      <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        {/* Erro */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Filtros */}
        <div style={{
          display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto',
          padding: '0.25rem'
        }}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Ativos' },
            { key: 'completed', label: 'Concluídos' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '9999px', border: 'none',
                background: filter === f.key ? '#0d9488' : 'white',
                color: filter === f.key ? 'white' : '#64748b',
                fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : orders.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '2rem',
            textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <Package size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map(order => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.ACCEPTED;
              const StatusIcon = config.icon;

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/own-driver/delivery/${order.id}`)}
                  style={{
                    background: 'white', borderRadius: '0.75rem', padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer',
                    borderLeft: `4px solid ${config.color}`, transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9375rem' }}>
                      #{order.order_number}
                    </span>
                    <span style={{
                      padding: '0.125rem 0.5rem', borderRadius: '9999px',
                      fontSize: '0.6875rem', fontWeight: 600,
                      background: config.bg, color: config.color,
                      display: 'flex', alignItems: 'center', gap: '0.25rem'
                    }}>
                      <StatusIcon size={10} /> {config.text}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>
                    <MapPin size={14} style={{ color: '#64748b' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.delivery_address?.street || 'Endereço não informado'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>{order.customer?.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <DollarSign size={12} /> {order.delivery_fee?.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnDriverOrdersPage;
