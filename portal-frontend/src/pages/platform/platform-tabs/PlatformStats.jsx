import React from 'react';
import { Users, Building2, Bike, Package, DollarSign, TrendingUp } from 'lucide-react';

const MetricCard = ({ icon, label, value, color, bg }) => (
  <div style={{
    background: 'white',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

const PlatformStats = ({ dashboard }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  }}>
    <MetricCard
      icon={<Users size={24} />}
      label="Admins"
      value={dashboard?.admins || 0}
      color="#2563eb"
      bg="#eff6ff"
    />
    <MetricCard
      icon={<Building2 size={24} />}
      label="Estabelecimentos"
      value={dashboard?.establishments || 0}
      color="#059669"
      bg="#ecfdf5"
    />
    <MetricCard
      icon={<Bike size={24} />}
      label="Entregadores"
      value={dashboard?.drivers || 0}
      color="#d97706"
      bg="#fffbeb"
    />
    <MetricCard
      icon={<Package size={24} />}
      label="Pedidos (mês)"
      value={dashboard?.orders_month || 0}
      color="#7c3aed"
      bg="#f5f3ff"
    />
    <MetricCard
      icon={<DollarSign size={24} />}
      label="Receita (mês)"
      value={`R$ ${(dashboard?.revenue_month || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      color="#059669"
      bg="#ecfdf5"
    />
    <MetricCard
      icon={<TrendingUp size={24} />}
      label="MRR Estimado"
      value={`R$ ${(dashboard?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      color="#2563eb"
      bg="#eff6ff"
    />
  </div>
);

export default PlatformStats;
