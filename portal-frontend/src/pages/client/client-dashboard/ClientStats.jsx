import React from 'react';
import { Package, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { utils } from '@/lib/api';

const StatCard = ({ icon, iconBg, iconColor, label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

const ClientStats = ({ stats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
    <StatCard icon={<Package size={22} />} iconBg="#f0fdfa" iconColor="#0d9488" label="Pedidos Hoje" value={stats?.today_orders || 0} />
    <StatCard icon={<Clock size={22} />} iconBg="#fef3c7" iconColor="#f59e0b" label="Em Andamento" value={stats?.active_orders || 0} />
    <StatCard icon={<TrendingUp size={22} />} iconBg="#dbeafe" iconColor="#2563eb" label="Esta Semana" value={stats?.week_orders || 0} />
    <StatCard icon={<DollarSign size={22} />} iconBg="#dcfce7" iconColor="#16a34a" label="Total Receita" value={utils.formatCurrency(stats?.total_revenue || 0)} />
  </div>
);

export default ClientStats;
