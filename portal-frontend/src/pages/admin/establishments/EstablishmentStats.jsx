import React from 'react';
import { Store, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';
import { utils } from '@/lib/api';

const StatCard = ({ icon, iconBg, iconColor, label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

const EstablishmentStats = ({ establishments, total }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
    <StatCard icon={<Store size={22} />} iconBg="#f0fdfa" iconColor="#0d9488" label="Total" value={total} />
    <StatCard icon={<CheckCircle size={22} />} iconBg="#dcfce7" iconColor="#16a34a" label="Ativos" value={establishments.filter(e => e.is_active).length} />
    <StatCard icon={<TrendingUp size={22} />} iconBg="#dbeafe" iconColor="#2563eb" label="Pedidos Hoje" value={establishments.reduce((sum, e) => sum + (e.today_orders || 0), 0)} />
    <StatCard icon={<DollarSign size={22} />} iconBg="#fef3c7" iconColor="#d97706" label="Receita Total" value={utils.formatCurrency(establishments.reduce((sum, e) => sum + (e.total_revenue || 0), 0))} />
  </div>
);

export default EstablishmentStats;
