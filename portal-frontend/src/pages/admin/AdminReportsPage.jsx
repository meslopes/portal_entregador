import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, Store, DollarSign,
  AlertCircle, Calendar, Star, Package, Clock, XCircle,
  Target, ArrowUpDown
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
  const [cancellations, setCancellations] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [deliveriesByDriver, setDeliveriesByDriver] = useState([]);

  useEffect(() => { loadAll(); }, [period]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [fin, orders, drivers, estabs, canc, rats, peaks, deliv] = await Promise.all([
        adminService.getFinancialSummary(period),
        adminService.getOrdersByDate(period),
        adminService.getDriversPerformance(period),
        adminService.getEstablishmentsRanking(period),
        adminService.getCancellations(period),
        adminService.getRatings(period),
        adminService.getPeakHours(period),
        adminService.getDeliveriesByDriver(period)
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

// Relatório de Avaliações
const RatingsReport = ({ data }) => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {[5,4,3,2,1].map(star => (
        <div key={star} style={{ background: 'white', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.125rem', marginBottom: '0.25rem' }}>
            {Array(star).fill(0).map((_, i) => <Star key={i} size={14} fill="#f59e0b" stroke="#f59e0b" />)}
          </div>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{data.distribution?.[star] || 0}</p>
        </div>
      ))}
    </div>
    {data.drivers?.length > 0 && (
      <ReportTable title="Avaliação por Entregador" headers={['Entregador', 'Média', 'Total', 'Positivas', 'Negativas']}>
        {data.drivers.map((d, i) => (
          <tr key={d.id}>
            <td style={{ ...tdStyle, fontWeight: 500 }}>{d.name}</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}><StarBadge value={d.avg_rating} /></td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{d.total_ratings}</td>
            <td style={{ ...tdStyle, textAlign: 'center', color: '#16a34a' }}>{d.positive}</td>
            <td style={{ ...tdStyle, textAlign: 'center', color: '#dc2626' }}>{d.negative}</td>
          </tr>
        ))}
      </ReportTable>
    )}
  </div>
);

// Relatório de Horários
const PeakHoursReport = ({ data }) => (
  <div>
    {data.hourly?.length > 0 && (
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} style={{ color: '#8b5cf6' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Pedidos por Hora</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
            {Array.from({ length: 24 }, (_, i) => {
              const hourData = data.hourly.find(h => h.hour === i);
              const count = hourData?.count || 0;
              const maxCount = Math.max(...data.hourly.map(h => h.count));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                  title={`${i}h: ${count} pedidos`}>
                  <div style={{ width: '100%', maxWidth: '16px', height: `${Math.max(height, 2)}%`, background: count === maxCount ? '#dc2626' : '#8b5cf6', borderRadius: '2px 2px 0 0' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.5rem', color: '#94a3b8' }}>
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </div>
      </div>
    )}
    {data.daily?.length > 0 && (
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} style={{ color: '#0d9488' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Pedidos por Dia da Semana</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '100px' }}>
            {data.daily.map((d, i) => {
              const maxCount = Math.max(...data.daily.map(x => x.count));
              const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                  title={`${d.day}: ${d.count} pedidos`}>
                  <div style={{ width: '100%', height: `${Math.max(height, 2)}%`, background: '#0d9488', borderRadius: '4px 4px 0 0' }} />
                  <p style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.25rem' }}>{d.day}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
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

const ReportTable = ({ title, headers, children }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#1e293b' }}>{title}</div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '0.625rem 1rem', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'center', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
    {React.Children.count(children) === 0 && (
      <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Sem dados no período</p>
    )}
  </div>
);

const tdStyle = { padding: '0.75rem 1rem', fontSize: '0.8125rem', borderBottom: '1px solid #f8fafc' };

const RankBadge = ({ rank }) => (
  <span style={{
    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
    background: rank === 1 ? '#22c55e' : rank === 2 ? '#3b82f6' : rank === 3 ? '#f59e0b' : '#e2e8f0',
    color: rank <= 3 ? 'white' : '#94a3b8',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.625rem', fontWeight: 700
  }}>{rank}</span>
);

const StarBadge = ({ value }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
    <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{value}</span>
  </span>
);

export default AdminReportsPage;
