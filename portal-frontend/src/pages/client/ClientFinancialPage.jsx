import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Package, Clock, AlertCircle,
  Calendar, ArrowUpRight, Receipt, CreditCard
} from 'lucide-react';
import { orderService, utils } from '@/lib/api';

const ClientFinancialPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const financialData = await orderService.getMyFinancial();
      setData(financialData);
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
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Financeiro
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Acompanhe seus pagamentos e entregas
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && (
        <>
          {/* Cards Principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <FinanceCard
              icon={<DollarSign size={22} />}
              iconBg="#fef2f2"
              iconColor="#dc2626"
              label="Total a Pagar"
              value={utils.formatCurrency(data.total_owed)}
              sub={`${data.total_deliveries} entregas realizadas`}
              alert
            />
            <FinanceCard
              icon={<Calendar size={22} />}
              iconBg="#fef3c7"
              iconColor="#d97706"
              label="Esta Semana"
              value={utils.formatCurrency(data.week_owed)}
              sub={`${data.week_deliveries} entregas`}
            />
            <FinanceCard
              icon={<TrendingUp size={22} />}
              iconBg="#dbeafe"
              iconColor="#2563eb"
              label="Este Mês"
              value={utils.formatCurrency(data.month_owed)}
              sub="Frete acumulado"
            />
            <FinanceCard
              icon={<Package size={22} />}
              iconBg="#dcfce7"
              iconColor="#16a34a"
              label="Total Entregas"
              value={data.total_deliveries}
              sub="Desde o início"
            />
          </div>

          {/* Aviso de cobrança */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
            border: '1px solid #fcd34d',
            borderRadius: '0.75rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem'
          }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={16} style={{ color: 'white' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>Cobrança Semanal</p>
              <p style={{ fontSize: '0.875rem', color: '#a16207' }}>
                As cobranças são geradas toda segunda-feira às 7:30h com base nas entregas realizadas de segunda a domingo.
                O valor cobrado corresponde às taxas de frete acumuladas no período.
              </p>
            </div>
          </div>

          {/* Historico Semanal */}
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: '#0d9488' }} />
              <span style={{ fontWeight: 600, color: '#1e293b' }}>Histórico Semanal</span>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {data.weekly_history?.map((week, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem 1.5rem',
                  borderBottom: i < data.weekly_history.length - 1 ? '1px solid #f8fafc' : 'none',
                  background: i === 0 ? '#f0fdfa' : 'transparent'
                }}>
                  <div>
                    <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                      {i === 0 ? 'Esta Semana' : `Semana de ${formatWeekDate(week.week_start)}`}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {week.orders} entrega{week.orders !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: week.delivery_fees > 0 ? '#dc2626' : '#94a3b8', fontSize: '1rem' }}>
                      {utils.formatCurrency(week.delivery_fees)}
                    </p>
                    {i === 0 && week.delivery_fees > 0 && (
                      <p style={{ fontSize: '0.6875rem', color: '#f59e0b' }}>A cobrar</p>
                    )}
                  </div>
                </div>
              ))}
              {(!data.weekly_history || data.weekly_history.length === 0) && (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Sem dados</p>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Funcao auxiliar
const formatWeekDate = (dateStr) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Componentes auxiliares
const FinanceCard = ({ icon, iconBg, iconColor, label, value, sub, alert }) => (
  <div style={{
    background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: alert ? '2px solid #fca5a5' : 'none',
    transition: 'all 0.15s'
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{label}</p>
    </div>
    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.125rem' }}>{value}</p>
    {sub && <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sub}</p>}
  </div>
);

export default ClientFinancialPage;
