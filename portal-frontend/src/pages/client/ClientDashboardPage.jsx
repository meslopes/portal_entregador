import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Clock, DollarSign, ShoppingBag,
  Plus, AlertCircle, ChevronRight, Store, User, Phone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ClientDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lista de pedidos será implementada com a API
    setLoading(false);
  }, []);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Bem-vindo, {user?.first_name}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Gerencie seus pedidos de entrega
        </p>
      </div>

      {/* Botão de novo pedido */}
      <button
        onClick={() => navigate('/client/new-order')}
        style={{
          width: '100%',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '2px dashed #0d9488',
          background: '#f0fdfa',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          transition: 'all 0.15s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f766e'; e.currentTarget.style.background = '#ccfbf1'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.background = '#f0fdfa'; }}
      >
        <Plus size={24} style={{ color: '#0d9488' }} />
        <span style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#0f766e' }}>Lançar Novo Pedido</span>
      </button>

      {/* Cards informativos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.125rem' }}>Pedidos Hoje</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>0</p>
            </div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.125rem' }}>Em Andamento</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>0</p>
            </div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={22} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.125rem' }}>Entregas Semana</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pedidos recentes */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
          Últimos Pedidos
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Carregando...</div>
        ) : orders.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '0.75rem',
            padding: '3rem 2rem', textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              width: '4rem', height: '4rem', borderRadius: '50%',
              background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <Package size={24} style={{ color: '#94a3b8' }} />
            </div>
            <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
              Nenhum pedido lançado
            </p>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Lance seu primeiro pedido clicando no botão acima
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map(order => (
              <div key={order.id} style={{
                background: 'white', borderRadius: '0.75rem',
                padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Package size={20} style={{ color: '#0d9488' }} />
                  <div>
                    <p style={{ fontWeight: 500, color: '#1e293b' }}>Pedido #{order.order_number}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.customer_name}</p>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: '#cbd5e1' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info do estabelecimento */}
      <div style={{
        background: 'white', borderRadius: '0.75rem',
        padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Store size={16} style={{ color: '#0d9488' }} />
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Seu Estabelecimento</span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          {user?.customer?.name || user?.first_name + ' ' + user?.last_name}
        </p>
        <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
          {user?.phone || 'Telefone não informado'}
        </p>
      </div>
    </div>
  );
};

export default ClientDashboardPage;
