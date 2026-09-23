import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Store, DollarSign,
  AlertCircle, Star, Package, XCircle,
  Clock, Target
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';
import { useSquare } from '@/contexts/SquareContext';
import DateRangeFilter from '@/components/DateRangeFilter';
import {
  ReportCard, MiniReport, ReportTable, tdStyle, RankBadge, StarBadge
} from './reports/shared';
import PeakHoursReport from './reports/PeakHoursReport';
import RatingsReport from './reports/RatingsReport';

const AdminReportsPage = () => {
  const { squareId } = useSquare();
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState('financial');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [financial, setFinancial] = useState(null);
  const [ordersByDate, setOrdersByDate] = useState([]);
  const [driversPerf, setDriversPerf] = useState([]);
  const [estabRanking, setEstabRanking] = useState([]);
  const [cancellations, setCancellations] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [deliveriesByDriver, setDeliveriesByDriver] = useState([]);

  useEffect(() => { loadAll(); }, [period, squareId]);
  useEffect(() => { if (dateRange) loadAll(); }, [dateRange]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [fin, orders, drivers, estabs, canc, rats, peaks, deliv] = await Promise.all([
        adminService.getFinancialSummary(period, squareId),
        adminService.getOrdersByDate(period, squareId),
        adminService.getDriversPerformance(period, squareId),
        adminService.getEstablishmentsRanking(period, squareId),
        adminService.getCancellations(period, squareId),
        adminService.getRatings(period, squareId),
        adminService.getPeakHours(period, squareId),
        adminService.getDeliveriesByDriver(period, squareId)
      ]);
      setFinancial(fin);
      setOrdersByDate(orders.data || []);
      setDriversPerf(drivers.drivers || []);
      setEstabRanking(estabs.establishments || []);
      setCancellations(canc);
      setRatings(rats);
      setPeakHours(peaks);
      setDeliveriesByDriver(deliv.drivers || []);
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
    { key: 'cancellations', label: 'Cancelamentos', icon: XCircle },
    { key: 'ratings', label: 'Avaliações', icon: Star },
    { key: 'peak', label: 'Horários', icon: Clock },
    { key: 'deliveries', label: 'Entregas', icon: Target },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Relatórios</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Análises detalhadas do sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[7, 15, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)} style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
              background: period === d ? '#2563eb' : '#f1f5f9',
              color: period === d ? 'white' : '#64748b'
            }}>{d} dias</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filtro de Datas */}
      <DateRangeFilter onChange={(range) => setDateRange(range)} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'white', borderRadius: '0.75rem', padding: '0.375rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: 'none',
              fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeTab === tab.key ? '#2563eb' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#64748b',
              display: 'flex', alignItems: 'center', gap: '0.375rem'
            }}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteudo */}
      {activeTab === 'financial' && financial && <FinancialReport data={financial} />}
      {activeTab === 'orders' && <OrdersReport data={ordersByDate} />}
      {activeTab === 'drivers' && <DriversReport data={driversPerf} />}
      {activeTab === 'establishments' && <EstablishmentsReport data={estabRanking} />}
      {activeTab === 'cancellations' && cancellations && <CancellationsReport data={cancellations} />}
      {activeTab === 'ratings' && ratings && <RatingsReport data={ratings} />}
      {activeTab === 'peak' && peakHours && <PeakHoursReport data={peakHours} />}
      {activeTab === 'deliveries' && <DeliveriesReport data={deliveriesByDriver} />}

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
  <ReportTable title="Pedidos por Dia" headers={['Data', 'Pedidos', 'Receita', 'Frete']}>
    {data.map((day, i) => (
      <tr key={i}>
        <td style={tdStyle}>{day.date}</td>
        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{day.orders}</td>
        <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>{utils.formatCurrency(day.revenue)}</td>
        <td style={{ ...tdStyle, textAlign: 'right' }}>{utils.formatCurrency(day.delivery_fees)}</td>
      </tr>
    ))}
  </ReportTable>
);

// Relatório de Entregadores
const DriversReport = ({ data }) => (
  <ReportTable title="Desempenho dos Entregadores" headers={['#', 'Entregador', 'Entregas', 'Avaliação', 'Ganhos']}>
    {data.map((driver, i) => (
      <tr key={driver.id}>
        <td style={tdStyle}><RankBadge rank={i + 1} /></td>
        <td style={{ ...tdStyle, fontWeight: 500 }}>{driver.name}</td>
        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{driver.deliveries}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{driver.avg_rating ? <StarBadge value={driver.avg_rating} /> : '-'}</td>
        <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{utils.formatCurrency(driver.total_earnings)}</td>
      </tr>
    ))}
  </ReportTable>
);

// Relatório de Estabelecimentos
const EstablishmentsReport = ({ data }) => (
  <ReportTable title="Ranking de Estabelecimentos" headers={['#', 'Estabelecimento', 'Pedidos', 'Receita', 'Ticket Médio']}>
    {data.map((est, i) => (
      <tr key={est.id}>
        <td style={tdStyle}><RankBadge rank={i + 1} /></td>
        <td style={{ ...tdStyle, fontWeight: 500 }}>{est.name}</td>
        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{est.orders}</td>
        <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{utils.formatCurrency(est.revenue)}</td>
        <td style={{ ...tdStyle, textAlign: 'right' }}>{utils.formatCurrency(est.avg_order)}</td>
      </tr>
    ))}
  </ReportTable>
);

// Relatório de Cancelamentos
const CancellationsReport = ({ data }) => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      <ReportCard icon={<XCircle size={20} />} iconBg="#fef2f2" iconColor="#dc2626" label="Total Cancelamentos" value={data.total_cancellations} />
      <ReportCard icon={<Package size={20} />} iconBg="#dbeafe" iconColor="#2563eb" label="Total Pedidos" value={data.total_orders} />
      <ReportCard icon={<AlertCircle size={20} />} iconBg="#fef3c7" iconColor="#d97706" label="Taxa de Cancelamento" value={`${data.cancel_rate}%`} />
    </div>
    {data.daily?.length > 0 && (
      <ReportTable title="Cancelamentos por Dia" headers={['Data', 'Cancelamentos']}>
        {data.daily.map((day, i) => (
          <tr key={i}>
            <td style={tdStyle}>{day.date}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#dc2626' }}>{day.count}</td>
          </tr>
        ))}
      </ReportTable>
    )}
  </div>
);

// Relatório de Entregas por Entregador
const DeliveriesReport = ({ data }) => (
  <ReportTable title="Entregas Detalhadas por Entregador" headers={['Entregador', 'Veículo', 'Entregas', 'Frete Total', 'Distância Média', 'Avaliação']}>
    {data.map((d, i) => (
      <tr key={d.id}>
        <td style={{ ...tdStyle, fontWeight: 500 }}>{d.name}</td>
        <td style={tdStyle}>{d.vehicle}</td>
        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{d.deliveries}</td>
        <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>{utils.formatCurrency(d.total_fees)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{d.avg_distance} km</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>{d.avg_rating ? <StarBadge value={d.avg_rating} /> : '-'}</td>
      </tr>
    ))}
  </ReportTable>
);

export default AdminReportsPage;
