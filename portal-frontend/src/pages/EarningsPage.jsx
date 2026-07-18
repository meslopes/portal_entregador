import React, { useState, useEffect } from 'react';
import {
  DollarSign, Calendar, TrendingUp, AlertCircle,
  Package, Clock, Wallet, ArrowUpRight
} from 'lucide-react';
import { driverService, utils } from '@/lib/api';

const EarningsPage = () => {
  const [earnings, setEarnings] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [earningsRes, statsRes] = await Promise.all([
        driverService.getEarningsHistory(),
        driverService.getStats()
      ]);
      setEarnings(earningsRes);
      setStats(statsRes);
    } catch (err) {
      setError('Erro ao carregar dados de ganhos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '3rem', height: '3rem',
          border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Ganhos
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Acompanhe seus ganhos e pagamentos
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <SummaryCard
          icon={<DollarSign size={22} />}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          label="Ganhos Hoje"
          value={utils.formatCurrency(stats?.today_earnings)}
        />
        <SummaryCard
          icon={<Calendar size={22} />}
          iconBg="#dbeafe"
          iconColor="#2563eb"
          label="Esta Semana"
          value={utils.formatCurrency(stats?.week_earnings)}
        />
        <SummaryCard
          icon={<TrendingUp size={22} />}
          iconBg="#f3e8ff"
          iconColor="#9333ea"
          label="Total Acumulado"
          value={utils.formatCurrency(stats?.total_earnings)}
          large
        />
      </div>

      {/* Stats extras */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <MiniStat icon={<Package size={16} />} label="Entregas Hoje" value={stats?.today_deliveries || 0} />
        <MiniStat icon={<Package size={16} />} label="Entregas Semana" value={stats?.week_deliveries || 0} />
        <MiniStat icon={<Clock size={16} />} label="Média por Entrega" value={
          stats?.total_deliveries > 0
            ? utils.formatCurrency((stats?.total_earnings || 0) / stats.total_deliveries)
            : 'R$ 0,00'
        } />
      </div>

      {/* Lista de pagamentos */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={18} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Histórico de Pagamentos</span>
          </div>
          {earnings?.payments && (
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              {earnings.payments.length} registro{earnings.payments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {earnings?.payments?.length > 0 ? (
          <div>
            {earnings.payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '3rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '4rem', height: '4rem',
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <DollarSign size={24} style={{ color: '#94a3b8' }} />
            </div>
            <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
              Nenhum pagamento registrado
            </p>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Seus pagamentos aparecerão aqui
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const SummaryCard = ({ icon, iconBg, iconColor, label, value, large = false }) => (
  <div style={{
    background: 'white',
    borderRadius: '0.75rem',
    padding: large ? '1.5rem' : '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'transform 0.15s, box-shadow 0.15s'
  }}
  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        padding: '0.625rem',
        borderRadius: '0.5rem',
        background: iconBg,
        color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: large ? '1.5rem' : '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
  </div>
);

const MiniStat = ({ icon, label, value }) => (
  <div style={{
    background: 'white',
    borderRadius: '0.5rem',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  }}>
    <div style={{ color: '#94a3b8' }}>{icon}</div>
    <div>
      <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>{value}</p>
    </div>
  </div>
);

const PaymentRow = ({ payment }) => {
  const typeConfig = {
    DELIVERY_EARNING: { label: 'Entrega realizada', color: '#16a34a', bg: '#dcfce7' },
    BONUS: { label: 'Bônus', color: '#d97706', bg: '#fef3c7' },
    ADJUSTMENT: { label: 'Ajuste', color: '#2563eb', bg: '#dbeafe' },
  };

  const config = typeConfig[payment.payment_type] || typeConfig.DELIVERY_EARNING;

  return (
    <div style={{
      padding: '1rem 1.5rem',
      borderBottom: '1px solid #f8fafc',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background 0.15s'
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          width: '2.5rem', height: '2.5rem',
          borderRadius: '50%',
          background: config.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <ArrowUpRight size={16} style={{ color: config.color }} />
        </div>
        <div>
          <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{config.label}</p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {utils.formatDateTime(payment.created_at)}
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontWeight: 700, color: '#22c55e', fontSize: '1rem' }}>
          +{utils.formatCurrency(payment.amount)}
        </p>
        <span style={{
          fontSize: '0.6875rem',
          padding: '0.125rem 0.5rem',
          borderRadius: '9999px',
          background: payment.status === 'PAID' ? '#dcfce7' : '#fef3c7',
          color: payment.status === 'PAID' ? '#16a34a' : '#d97706'
        }}>
          {utils.getStatusText(payment.status)}
        </span>
      </div>
    </div>
  );
};

export default EarningsPage;
