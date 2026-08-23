import React, { useState, useEffect } from 'react';
import {
  DollarSign, Calendar, Users, TrendingUp, CheckCircle,
  AlertCircle, Download, Filter, ChevronDown, ChevronRight,
  Wallet, CreditCard, ArrowDownRight, BarChart3, Clock
} from 'lucide-react';
import api from '@/lib/api';

const PAYMENT_FREQUENCY_LABELS = {
  DAILY: { label: 'Diário', icon: '📅', color: '#2563eb' },
  WEEKLY: { label: 'Semanal', icon: '📆', color: '#7c3aed' },
  MONTHLY: { label: 'Mensal', icon: '🗓️', color: '#059669' },
  ON_DEMAND: { label: 'Sob Demanda', icon: '⚡', color: '#d97706' }
};

const PaymentReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  
  // Filtros
  const [period, setPeriod] = useState('month');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [restaurantFilter, setRestaurantFilter] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUserRole();
    loadRestaurants();
  }, []);

  useEffect(() => {
    loadReports();
  }, [period, frequencyFilter, restaurantFilter]);

  const checkUserRole = async () => {
    try {
      const res = await api.get('/api/user/profile');
      setIsAdmin(res.data.user_type === 'ADMIN');
    } catch (err) {
      console.error(err);
    }
  };

  const loadRestaurants = async () => {
    try {
      const res = await api.get('/api/admin/establishments');
      setRestaurants(res.data.establishments || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { period };
      if (frequencyFilter) params.frequency = frequencyFilter;
      if (restaurantFilter) params.restaurant_id = restaurantFilter;
      
      const res = await api.get('/api/finance/payment-reports', { params });
      setReports(res.data.reports || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
      setError('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const handlePayPeriod = async (driverId, periodStart, paymentMethod = 'PIX') => {
    try {
      const res = await api.post('/api/finance/pay-period', {
        driver_id: driverId,
        period_start: periodStart,
        payment_method: paymentMethod
      });
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 3000);
      loadReports();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento');
    }
  };

  const handlePayAll = async (driverId, paymentMethod = 'PIX') => {
    if (!window.confirm('Marcar todos os ganhos pendentes como pagos?')) return;
    try {
      const res = await api.post('/api/finance/pay-all', {
        driver_id: driverId,
        payment_method: paymentMethod
      });
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 3000);
      loadReports();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento');
    }
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Financeiro - Entregadores Próprios
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Relatórios de pagamento por frequência e quitação por período
        </p>
      </div>

      {/* Mensagens */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Período</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}>
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="all">Todo Período</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Frequência</label>
          <select value={frequencyFilter} onChange={e => setFrequencyFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}>
            <option value="">Todas</option>
            <option value="DAILY">Diário</option>
            <option value="WEEKLY">Semanal</option>
            <option value="MONTHLY">Mensal</option>
            <option value="ON_DEMAND">Sob Demanda</option>
          </select>
        </div>
        {isAdmin && (
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Restaurante</label>
            <select value={restaurantFilter} onChange={e => setRestaurantFilter(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}>
              <option value="">Todos</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Resumo Geral */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', borderRadius: '0.75rem', padding: '1.25rem', color: 'white' }}>
            <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Total Ganhos</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(summary.total_earning)}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Pago</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{formatCurrency(summary.total_paid)}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Pendente</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{formatCurrency(summary.total_pending)}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Entregadores</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{summary.total_drivers}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <DollarSign size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhum pagamento registrado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reports.map(report => {
            const freqConfig = PAYMENT_FREQUENCY_LABELS[report.payment_frequency] || PAYMENT_FREQUENCY_LABELS.WEEKLY;
            const isExpanded = expandedDriver === report.driver_id;
            
            return (
              <div key={report.driver_id} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {/* Header do entregador */}
                <div
                  onClick={() => setExpandedDriver(isExpanded ? null : report.driver_id)}
                  style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={16} style={{ color: '#0d9488' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: '#1e293b' }}>{report.driver_name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                          {report.restaurant_name}
                        </span>
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600, background: `${freqConfig.color}20`, color: freqConfig.color }}>
                          {freqConfig.icon} {freqConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pendente</p>
                      <p style={{ fontWeight: 700, color: report.total_pending > 0 ? '#d97706' : '#059669', fontSize: '1.125rem' }}>
                        {formatCurrency(report.total_pending)}
                      </p>
                    </div>
                    {report.total_pending > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePayAll(report.driver_id); }}
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#059669', color: 'white', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                      >
                        Pagar Tudo
                      </button>
                    )}
                    {isExpanded ? <ChevronDown size={20} style={{ color: '#64748b' }} /> : <ChevronRight size={20} style={{ color: '#64748b' }} />}
                  </div>
                </div>

                {/* Períodos expandidos */}
                {isExpanded && (
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {report.periods.map((period, idx) => {
                        const isPeriodExpanded = expandedPeriod === `${report.driver_id}-${idx}`;
                        
                        return (
                          <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                            {/* Header do período */}
                            <div
                              onClick={() => setExpandedPeriod(isPeriodExpanded ? null : `${report.driver_id}-${idx}`)}
                              style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: period.is_paid ? '#f0fdf4' : '#fffbeb' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Calendar size={16} style={{ color: '#64748b' }} />
                                <div>
                                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                                    {formatDate(period.period_start)} - {formatDate(period.period_end)}
                                  </p>
                                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {period.delivery_count} entrega(s)
                                  </p>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total</p>
                                  <p style={{ fontWeight: 700, color: '#1e293b' }}>{formatCurrency(period.total_earning)}</p>
                                </div>
                                {period.is_paid ? (
                                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>
                                    ✓ Pago
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePayPeriod(report.driver_id, period.period_start); }}
                                    style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none', background: '#059669', color: 'white', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                                  >
                                    Pagar
                                  </button>
                                )}
                                {isPeriodExpanded ? <ChevronDown size={16} style={{ color: '#64748b' }} /> : <ChevronRight size={16} style={{ color: '#64748b' }} />}
                              </div>
                            </div>

                            {/* Detalhes do período */}
                            {isPeriodExpanded && (
                              <div style={{ padding: '0.75rem 1rem', background: '#f8fafc' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b' }}>Pedido</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b' }}>Data</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b' }}>Tipo</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b' }}>Frete</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b' }}>Ganho</th>
                                      <th style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {period.earnings.map(earning => (
                                      <tr key={earning.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '0.5rem' }}>#{earning.order_id}</td>
                                        <td style={{ padding: '0.5rem' }}>{formatDateTime(earning.created_at)}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                          <span style={{ padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.625rem', background: '#dbeafe', color: '#1d4ed8' }}>
                                            {earning.payment_type}
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(earning.delivery_fee)}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(earning.driver_earning)}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                          {earning.is_paid ? (
                                            <span style={{ color: '#059669' }}>✓</span>
                                          ) : (
                                            <span style={{ color: '#d97706' }}>⏳</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentReportsPage;
