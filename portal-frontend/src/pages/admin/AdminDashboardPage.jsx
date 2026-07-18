import React, { useState, useEffect } from 'react';
import {
  Users, Truck, Package, DollarSign, TrendingUp,
  AlertCircle, Clock, CheckCircle, ArrowUpRight, BarChart3
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError('Erro ao carregar dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Painel Administrativo
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Visão geral do sistema muv.log
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<Users size={22} />} iconBg="#dbeafe" iconColor="#2563eb" label="Total Entregadores" value={dashboard?.total_drivers || 0} />
        <StatCard icon={<Truck size={22} />} iconBg="#dcfce7" iconColor="#16a34a" label="Online Agora" value={dashboard?.online_drivers || 0} />
        <StatCard icon={<Package size={22} />} iconBg="#f3e8ff" iconColor="#9333ea" label="Total Pedidos" value={dashboard?.total_orders || 0} />
        <StatCard icon={<DollarSign size={22} />} iconBg="#fef3c7" iconColor="#d97706" label="Receita Hoje" value={utils.formatCurrency(dashboard?.today_revenue || 0)} />
      </div>

      {/* Resumo + Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Resumo do dia */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Resumo do Dia</span>
          </div>
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <SummaryRow label="Pedidos Hoje" value={dashboard?.today_orders || 0} />
            <SummaryRow label="Entregas Hoje" value={dashboard?.today_deliveries || 0} />
            <SummaryRow label="Receita Hoje" value={utils.formatCurrency(dashboard?.today_revenue || 0)} highlight />
          </div>
        </div>

        {/* Pedidos por status */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} style={{ color: '#9333ea' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Pedidos por Status</span>
          </div>
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {dashboard?.orders_by_status && Object.entries(dashboard.orders_by_status).map(([status, count]) => (
              <StatusRow key={status} status={status} count={count} />
            ))}
            {(!dashboard?.orders_by_status || Object.keys(dashboard.orders_by_status).length === 0) && (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontSize: '0.875rem' }}>Nenhum pedido registrado</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Entregadores */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} style={{ color: '#16a34a' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Entregadores Mais Ativos</span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Últimos 7 dias</span>
        </div>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {dashboard?.top_drivers?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dashboard.top_drivers.map((driver, index) => (
                <div key={driver.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', borderRadius: '0.5rem',
                  background: index === 0 ? '#f0fdf4' : '#f8fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                      background: index === 0 ? '#22c55e' : index === 1 ? '#3b82f6' : index === 2 ? '#f59e0b' : '#e2e8f0',
                      color: index < 3 ? 'white' : '#94a3b8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700
                    }}>
                      {index + 1}
                    </span>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{driver.name}</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2563eb' }}>
                    {driver.deliveries} entregas
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontSize: '0.875rem' }}>Nenhum entregador ativo</p>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const StatCard = ({ icon, iconBg, iconColor, label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

const SummaryRow = ({ label, value, highlight = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid #f8fafc' }}>
    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{label}</span>
    <span style={{ fontWeight: 600, color: highlight ? '#22c55e' : '#1e293b' }}>{value}</span>
  </div>
);

const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'Pendente' },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito' },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando' },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto' },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'Coletado' },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelado' },
};

const StatusRow = ({ status, count }) => {
  const config = STATUS_CONFIG[status] || { color: '#94a3b8', bg: '#f1f5f9', text: status };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: config.color }} />
        <span style={{ fontSize: '0.875rem', color: '#475569' }}>{config.text}</span>
      </div>
      <span style={{
        padding: '0.125rem 0.625rem', borderRadius: '9999px',
        fontSize: '0.75rem', fontWeight: 600,
        background: config.bg, color: config.color
      }}>
        {count}
      </span>
    </div>
  );
};

export default AdminDashboardPage;
