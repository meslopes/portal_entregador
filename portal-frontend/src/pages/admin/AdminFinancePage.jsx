import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Package, Clock,
  AlertCircle, Store, Truck, ArrowUpRight, BarChart3
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminFinancePage = () => {
  const [data, setData] = useState(null);
  const [estData, setEstData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [finance, establishments] = await Promise.all([
        adminService.getFinanceDashboard(period),
        adminService.getFinanceByEstablishment(period)
      ]);
      setData(finance);
      setEstData(establishments.establishments || []);
    } catch (err) {
      setError('Erro ao carregar dados financeiros');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Financeiro
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Visão geral das finanças do sistema
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[
            { key: 'today', label: 'Hoje' },
            { key: 'week', label: '7 dias' },
            { key: 'month', label: '30 dias' },
            { key: 'year', label: '1 ano' }
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                background: period === p.key ? '#2563eb' : '#f1f5f9',
                color: period === p.key ? 'white' : '#64748b',
                transition: 'all 0.15s'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && (
        <>
          {/* Cards Principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <FinanceCard icon={<DollarSign size={22} />} iconBg="#dcfce7" iconColor="#16a34a" label="Receita Total" value={utils.formatCurrency(data.revenue)} sub="Pedidos entregues" />
            <FinanceCard icon={<Package size={22} />} iconBg="#dbeafe" iconColor="#2563eb" label="Pedidos Entregues" value={data.delivered_orders} sub={`de ${data.total_orders} totais`} />
            <FinanceCard icon={<Truck size={22} />} iconBg="#f3e8ff" iconColor="#9333ea" label="Ganhos Entregadores" value={utils.formatCurrency(data.driver_payments)} sub="Pagamentos processados" />
            <FinanceCard icon={<TrendingUp size={22} />} iconBg="#fef3c7" iconColor="#d97706" label="Ticket Médio" value={utils.formatCurrency(data.avg_order_value)} sub="Por pedido entregue" />
          </div>

          {/* Cards Secundarios */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <MiniCard label="Frete Total" value={utils.formatCurrency(data.total_delivery_fees)} color="#0d9488" />
            <MiniCard label="Pedidos Pendentes" value={data.pending_orders} color="#f59e0b" />
            <MiniCard label="Pagamentos Pendentes" value={utils.formatCurrency(data.pending_payments)} color="#ef4444" />
            <MiniCard label="Entregas Pendentes" value={data.total_orders - data.delivered_orders} color="#8b5cf6" />
          </div>

          {/* Grafico de Receita Diaria */}
          {data.daily_revenue && data.daily_revenue.length > 0 && (
            <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} style={{ color: '#2563eb' }} />
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Receita Diária (últimos 30 dias)</span>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
                  {data.daily_revenue.map((day, i) => {
                    const maxRevenue = Math.max(...data.daily_revenue.map(d => d.revenue));
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                        title={`${day.date}: ${utils.formatCurrency(day.revenue)} (${day.orders} pedidos)`}>
                        <div style={{
                          width: '100%', maxWidth: '20px', height: `${Math.max(height, 2)}%`,
                          background: 'linear-gradient(to top, #2563eb, #60a5fa)',
                          borderRadius: '3px 3px 0 0', transition: 'all 0.3s'
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.625rem', color: '#94a3b8' }}>
                  <span>{data.daily_revenue[0]?.date}</span>
                  <span>{data.daily_revenue[data.daily_revenue.length - 1]?.date}</span>
                </div>
              </div>
            </div>
          )}

          {/* Receita por Estabelecimento */}
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Store size={18} style={{ color: '#0d9488' }} />
              <span style={{ fontWeight: 600, color: '#1e293b' }}>Receita por Estabelecimento</span>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {estData.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>Nenhum dado disponível</p>
              ) : (
                estData.map((est, i) => (
                  <div key={est.id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', borderBottom: i < estData.length - 1 ? '1px solid #f8fafc' : 'none', gap: '1rem' }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '50%',
                      background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#f8fafc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: i === 0 ? '#d97706' : i === 1 ? '#64748b' : '#94a3b8'
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{est.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{est.total_orders} pedidos • Ticket: {utils.formatCurrency(est.avg_order)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.9375rem' }}>{utils.formatCurrency(est.revenue)}</p>
                      <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Frete: {utils.formatCurrency(est.delivery_fees)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Componentes auxiliares
const FinanceCard = ({ icon, iconBg, iconColor, label, value, sub }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{label}</p>
    </div>
    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.125rem' }}>{value}</p>
    {sub && <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sub}</p>}
  </div>
);

const MiniCard = ({ label, value, color }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `3px solid ${color}` }}>
    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</p>
    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

export default AdminFinancePage;
