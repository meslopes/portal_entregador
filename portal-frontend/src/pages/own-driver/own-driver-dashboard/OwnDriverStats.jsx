import React from 'react';
import { Package, DollarSign, Star, Clock } from 'lucide-react';
import { utils } from '@/lib/api';

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: 'white', borderRadius: '0.75rem', padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
    </div>
    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

const OwnDriverStats = ({ stats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
    <StatCard icon={<Package size={20} />} label="Entregas" value={stats?.total_deliveries || 0} color="#0d9488" />
    <StatCard icon={<DollarSign size={20} />} label="Ganhos" value={utils.formatCurrency(stats?.total_earning || 0)} color="#16a34a" />
    <StatCard icon={<Star size={20} />} label="Avaliação" value={(stats?.rating || 5).toFixed(1)} color="#f59e0b" />
    <StatCard icon={<Clock size={20} />} label="Tempo Médio" value={`${stats?.avg_delivery_time || 0} min`} color="#8b5cf6" />
  </div>
);

export default OwnDriverStats;
