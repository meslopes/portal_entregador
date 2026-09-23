import React from 'react';
import { DollarSign, TrendingUp, Package, Star } from 'lucide-react';
import { utils } from '@/lib/api';
import StatCard from './StatCard';

const DriverStats = ({ stats }) => (
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
      value={stats ? (stats.average_rating ?? 5).toFixed(1) : '5.0'}
      suffix="/5.0"
    />
  </div>
);

export default DriverStats;
