import React from 'react';
import { DollarSign, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import StatCard from './StatCard';
import { formatCurrency } from './constants';

const FinancialStats = ({ summary }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
    <StatCard
      label="Total Ganhos"
      value={formatCurrency(summary?.total_earning)}
      icon={<DollarSign size={20} />}
      color="#059669"
    />
    <StatCard
      label="Total Pago"
      value={formatCurrency(summary?.total_paid)}
      icon={<CheckCircle size={20} />}
      color="#2563eb"
    />
    <StatCard
      label="Pendente"
      value={formatCurrency(summary?.total_pending)}
      icon={<AlertCircle size={20} />}
      color="#f59e0b"
    />
    <StatCard
      label="Entregas"
      value={summary?.count || 0}
      icon={<TrendingUp size={20} />}
      color="#8b5cf6"
    />
  </div>
);

export default FinancialStats;
