import React, { useState, useEffect } from 'react';
import {
  BarChart3, Users, Clock, DollarSign, Star, TrendingUp,
  Package, AlertCircle, Filter, Target
} from 'lucide-react';
import api from '@/lib/api';
import { utils } from '@/lib/api';

const OwnDriverMetricsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [period, setPeriod] = useState('month');
  const [driverFilter, setDriverFilter] = useState('');

  useEffect(() => { loadData(); }, [period, driverFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      await Promise.all([loadDrivers(), loadMetrics()]);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const userRes = await api.get('/api/user/profile');
      const restaurantId = userRes.data.restaurant_id;
      if (restaurantId) {
        const res = await api.get(`/api/admin/establishment-drivers?restaurant_id=${restaurantId}`);
        setDrivers(res.data.drivers || []);
      }
    } catch (err) {
      console.error('Erro ao carregar entregadores:', err);
    }
  };

  const loadMetrics = async () => {
    try {
      const params = { period };
      if (driverFilter) params.driver_id = driverFilter;
      const res = await api.get('/api/admin/establishment-drivers/metrics', { params });
      setMetrics(res.data.drivers || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return '#16a34a';
    if (rating >= 3.5) return '#0d9488';
    if (rating >= 2.5) return '#f59e0b';
    return '#ef4444';
  };

  const getRatingLabel = (rating) => {
    if (rating >= 4.5) return 'Excelente';
    if (rating >= 3.5) return 'Bom';
    if (rating >= 2.5) return 'Regular';
    return 'Atenção';
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Desempenho dos Entregadores
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Métricas e avaliações dos seus entregadores próprios
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={16} style={{ color: '#64748b' }} />
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', outline: 'none', background: 'white' }}
        >
          <option value="week">Última Semana</option>
          <option value="month">Último Mês</option>
        </select>
        <select
          value={driverFilter}
          onChange={e => setDriverFilter(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', outline: 'none', background: 'white' }}
        >
          <option value="">Todos os Entregadores</option>
          {drivers.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Cards de Resumo */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <SummaryCard
            icon={<Users size={22} />}
            iconBg="#dbeafe"
            iconColor="#2563eb"
            label="Entregadores Ativos"
            value={summary.total_drivers}
          />
          <SummaryCard
            icon={<Package size={22} />}
            iconBg="#f0fdfa"
            iconColor="#0d9488"
            label="Total de Entregas"
            value={summary.total_deliveries}
          />
          <SummaryCard
            icon={<DollarSign size={22} />}
            iconBg="#dcfce7"
            iconColor="#16a34a"
            label="Total Ganhos"
            value={utils.formatCurrency(summary.total_earning)}
          />
          <SummaryCard
            icon={<Clock size={22} />}
            iconBg="#fef3c7"
            iconColor="#f59e0b"
            label="Tempo Médio"
            value={`${summary.avg_delivery_time || 0} min`}
          />
        </div>
      )}

      {/* Cards de Entregadores */}
      {metrics.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Users size={24} style={{ color: '#64748b' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
            Nenhum entregador encontrado
          </p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Cadastre entregadores próprios para ver as métricas
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {metrics.map(m => (
            <DriverMetricCard
              key={m.driver.id}
              metric={m}
              getRatingColor={getRatingColor}
              getRatingLabel={getRatingLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Card de resumo
const SummaryCard = ({ icon, iconBg, iconColor, label, value }) => (
  <div style={{
    background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s'
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

// Card de métricas do entregador
const DriverMetricCard = ({ metric, getRatingColor, getRatingLabel }) => {
  const { driver, orders, delivery_time, financial, rating } = metric;
  const vehicleEmoji = driver.vehicle_type === 'MOTO' ? '🏍️' : driver.vehicle_type === 'BIKE' ? '🚲' : '🚗';

  return (
    <div style={{
      background: 'white', borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      overflow: 'hidden', borderLeft: `4px solid ${getRatingColor(rating.average)}`
    }}>
      {/* Header */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '50%',
            background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            {vehicleEmoji}
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{driver.name}</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {driver.vehicle_type} {driver.vehicle_plate ? `• ${driver.vehicle_plate}` : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            padding: '0.375rem 0.75rem', borderRadius: '9999px',
            background: `${getRatingColor(rating.average)}15`,
            color: getRatingColor(rating.average),
            fontSize: '0.8125rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.375rem'
          }}>
            <Star size={14} fill={getRatingColor(rating.average || 0)} />
            {(rating.average || 0).toFixed(1)}
          </div>
          <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
            ({rating.total_ratings} {rating.total_ratings === 1 ? 'avaliação' : 'avaliações'})
          </span>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <MetricItem
          icon={<Package size={16} />}
          label="Entregas"
          value={orders.delivered}
          sub={`${orders.cancelled} canceladas`}
          color="#0d9488"
        />
        <MetricItem
          icon={<Clock size={16} />}
          label="Tempo Médio"
          value={`${delivery_time.avg_minutes} min`}
          sub={delivery_time.min_minutes > 0 ? `Mín: ${delivery_time.min_minutes} min` : ''}
          color="#f59e0b"
        />
        <MetricItem
          icon={<DollarSign size={16} />}
          label="Ganhos"
          value={utils.formatCurrency(financial.total_earning)}
          sub={`${utils.formatCurrency(financial.avg_per_delivery)}/entrega`}
          color="#16a34a"
        />
        <MetricItem
          icon={<Target size={16} />}
          label="Taxa Sucesso"
          value={`${orders.acceptance_rate}%`}
          sub={`${orders.total} pedidos`}
          color="#2563eb"
        />
      </div>

      {/* Barra de desempenho */}
      <div style={{ padding: '0 1.25rem 1.25rem' }}>
        <div style={{ background: '#f1f5f9', borderRadius: '9999px', height: '0.5rem', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, orders.acceptance_rate)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${getRatingColor(rating.average)}, ${getRatingColor(rating.average)}88)`,
            borderRadius: '9999px',
            transition: 'width 0.5s'
          }} />
        </div>
        <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.375rem', textAlign: 'center' }}>
          {getRatingLabel(rating.average)} — {orders.acceptance_rate}% de entregas concluídas
        </p>
      </div>
    </div>
  );
};

// Item de métrica
const MetricItem = ({ icon, label, value, sub, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
    </div>
    <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{value}</span>
    {sub && <span style={{ fontSize: '0.625rem', color: '#64748b' }}>{sub}</span>}
  </div>
);

export default OwnDriverMetricsPage;
