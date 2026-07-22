import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, Store, DollarSign,
  AlertCircle, Calendar, Star, Package, ArrowUpRight, Download
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminReportsPage = () => {
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('financial');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [financial, setFinancial] = useState(null);
  const [ordersByDate, setOrdersByDate] = useState([]);
  const [driversPerf, setDriversPerf] = useState([]);
  const [estabRanking, setEstabRanking] = useState([]);

  useEffect(() => { loadAll(); }, [period]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [fin, orders, drivers, estabs] = await Promise.all([
        adminService.getFinancialSummary(period),
        adminService.getOrdersByDate(period),
        adminService.getDriversPerformance(period),
        adminService.getEstablishmentsRanking(period)
      ]);
      setFinancial(fin);
      setOrdersByDate(orders.data || []);
      setDriversPerf(drivers.drivers || []);
      setEstabRanking(estabs.establishments || []);
    } catch (err) {
      setError('Erro ao carregar relatórios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'financial', label: 'Financeiro', icon: DollarSign },
    { key: 'orders', label: 'Pedidos', icon: Package },
    { key: 'drivers', label: 'Entregadores', icon: Users },
    { key: 'establishments', label: 'Estabelecimentos', icon: Store },
  ];

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Relatórios</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Análises e dados do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[7, 15, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)} style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
              background: period === d ? '#2563eb' : '#f1f5f9',
              color: period === d ? 'white' : '#64748b'
            }}>
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'white', borderRadius: '0.75rem', padding: '0.375rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.625rem 1rem', borderRadius: '0.5rem', border: 'none',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === tab.key ? '#2563eb' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#64748b'
            }}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteudo */}
      {activeTab === 'financial' && financial && <FinancialReport data={financial} />}
      {activeTab === 'orders' && <OrdersReport data={ordersByDate} />}
      {activeTab === 'drivers' && <DriversReport data={driversPerf} />}
      {activeTab === 'establishments' && <EstablishmentsReport data={estabRanking} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Relatório Financeiro
const FinancialReport = ({ data }) => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      <ReportCard icon={<DollarSign size={20} />} iconBg="#dcfce7" iconColor="#16a34a" label="Receita Total" value={utils.formatCurrency(data.total_revenue)} />
      <ReportCard icon={<TrendingUp size={20} />} iconBg="#dbeafe" iconColor="#2563eb" label="Lucro Admin" value={utils.formatCurrency(data.admin_profit)} />
      <ReportCard icon={<Users size={20} />} iconBg="#f3e8ff" iconColor="#9333ea" label="Pagamentos Entregadores" value={utils.formatCurrency(data.driver_payments)} />
      <ReportCard icon={<Package size={20} />} iconBg="#fef3c7" iconColor="#d97706" label="Ticket Médio" value={utils.formatCurrency(data.avg_order_value)} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <MiniReport label="Total Pedidos" value={data.total_orders} />
      <MiniReport label="Pedidos Entregues" value={data.delivered_orders} />
      <MiniReport label="Taxa de Conversão" value={`${data.conversion_rate}%`} />
      <MiniReport label="Frete Total" value={utils.formatCurrency(data.total_delivery_fees)} />
    </div>
  </div>
);

// Relatório de Pedidos
const OrdersReport = ({ data }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontWeight: 600, color: '#1e293b' }}>Pedidos por Dia</span>
    </div>
    {data.length === 0 ? (
      <p style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Sem dados no período</p>
    ) : (
      <div style={{ padding: '1.5rem' }}>
        {/* Grafico de barras */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '150px', marginBottom: '1rem' }}>
          {data.map((day, i) => {
            const maxOrders = Math.max(...data.map(d => d.orders));
            const height = maxOrders > 0 ? (day.orders / maxOrders) * 100 : 0;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                title={`${day.date}: ${day.orders} pedidos - ${utils.formatCurrency(day.revenue)}`}>
                <div style={{ width: '100%', maxWidth: '16px', height: `${Math.max(height, 2)}%`, background: 'linear-gradient(to top, #2563eb, #60a5fa)', borderRadius: '2px 2px 0 0' }} />
              </div>
            );
          })}
        </div>
        {/* Tabela */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            <span>Data</span><span style={{ textAlign: 'center' }}>Pedidos</span><span style={{ textAlign: 'right' }}>Receita</span><span style={{ textAlign: 'right' }}>Frete</span>
          </div>
          {data.slice().reverse().map((day, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc', fontSize: '0.8125rem' }}>
              <span style={{ color: '#475569' }}>{day.date}</span>
              <span style={{ textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>{day.orders}</span>
              <span style={{ textAlign: 'right', color: '#16a34a' }}>{utils.formatCurrency(day.revenue)}</span>
              <span style={{ textAlign: 'right', color: '#64748b' }}>{utils.formatCurrency(day.delivery_fees)}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Relatório de Entregadores
const DriversReport = ({ data }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontWeight: 600, color: '#1e293b' }}>Desempenho dos Entregadores</span>
    </div>
    {data.length === 0 ? (
      <p style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Sem dados no período</p>
    ) : (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
          <span>#</span><span>Entregador</span><span style={{ textAlign: 'center' }}>Entregas</span><span style={{ textAlign: 'center' }}>Avaliação</span><span style={{ textAlign: 'right' }}>Ganhos</span>
        </div>
        {data.map((driver, i) => (
          <div key={driver.id} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr', padding: '0.875rem 1.5rem', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
            <span style={{
              width: '1.5rem', height: '1.5rem', borderRadius: '50%',
              background: i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : i === 2 ? '#f59e0b' : '#e2e8f0',
              color: i < 3 ? 'white' : '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700
            }}>{i + 1}</span>
            <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{driver.name}</span>
            <span style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{driver.deliveries}</span>
            <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              {driver.avg_rating ? (
                <><Star size={14} fill="#f59e0b" stroke="#f59e0b" /> <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{driver.avg_rating}</span></>
              ) : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>}
            </span>
            <span style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{utils.formatCurrency(driver.total_earnings)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Relatório de Estabelecimentos
const EstablishmentsReport = ({ data }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontWeight: 600, color: '#1e293b' }}>Ranking de Estabelecimentos</span>
    </div>
    {data.length === 0 ? (
      <p style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Sem dados no período</p>
    ) : (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
          <span>#</span><span>Estabelecimento</span><span style={{ textAlign: 'center' }}>Pedidos</span><span style={{ textAlign: 'right' }}>Receita</span><span style={{ textAlign: 'right' }}>Ticket Médio</span>
        </div>
        {data.map((est, i) => (
          <div key={est.id} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr', padding: '0.875rem 1.5rem', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
            <span style={{
              width: '1.5rem', height: '1.5rem', borderRadius: '50%',
              background: i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : i === 2 ? '#f59e0b' : '#e2e8f0',
              color: i < 3 ? 'white' : '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700
            }}>{i + 1}</span>
            <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{est.name}</span>
            <span style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{est.orders}</span>
            <span style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{utils.formatCurrency(est.revenue)}</span>
            <span style={{ textAlign: 'right', color: '#64748b' }}>{utils.formatCurrency(est.avg_order)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Componentes auxiliares
const ReportCard = ({ icon, iconBg, iconColor, label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
      <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{label}</p>
    </div>
    <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

const MiniReport = ({ label, value }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '3px solid #2563eb' }}>
    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</p>
    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

export default AdminReportsPage;
