import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import ExportButton from './payment-reports/ExportButton';
import PaymentFilters from './payment-reports/PaymentFilters';
import PaymentStats from './payment-reports/PaymentStats';
import PaymentList from './payment-reports/PaymentList';
import WithdrawalsList from './payment-reports/WithdrawalsList';

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
  const [activeTab, setActiveTab] = useState('reports');

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalSummary, setWithdrawalSummary] = useState(null);

  // Filtros
  const [period, setPeriod] = useState('month');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [restaurantFilter, setRestaurantFilter] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const res = await api.get('/api/user/profile');
      const isAdminUser = res.data.user_type === 'ADMIN';
      setIsAdmin(isAdminUser);
      if (isAdminUser) {
        loadRestaurants();
      }
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

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/finance/own-driver-withdrawals');
      setWithdrawals(res.data.drivers || []);
      setWithdrawalSummary(res.data.summary || {});
    } catch (err) {
      console.error('Erro ao carregar saques:', err);
      setError('Erro ao carregar saques');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessWithdrawal = async (driverId) => {
    if (!window.confirm('Processar saque via PIX?')) return;
    try {
      const res = await api.post('/api/finance/process-withdrawal', {
        driver_id: driverId,
        payment_method: 'PIX'
      });
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 5000);
      loadWithdrawals();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar saque');
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'withdrawals') loadWithdrawals();
  }, [activeTab, period, frequencyFilter, restaurantFilter]);

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

  const exportCSV = () => {
    if (activeTab === 'reports') {
      if (!reports.length) return;

      let csv = 'Entregador,Restaurante,Frequência,Total Ganhos,Total Pago,Pendente\n';

      reports.forEach(r => {
        csv += `"${r.driver_name}","${r.restaurant_name}","${r.payment_frequency}",${r.total_earning.toFixed(2)},${r.total_paid.toFixed(2)},${r.total_pending.toFixed(2)}\n`;
      });

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_pagamentos_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (activeTab === 'withdrawals') {
      if (!withdrawals.length) return;

      let csv = 'Entregador,Restaurante,PIX,Pendente,Pago,Frequência\n';

      withdrawals.forEach(d => {
        csv += `"${d.driver_name}","${d.restaurant_name}","${d.pix_key || '-'}",${d.pending_amount.toFixed(2)},${d.paid_amount.toFixed(2)},"${d.payment_frequency}"\n`;
      });

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_saques_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Financeiro - Entregadores Próprios
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Relatórios de pagamento por frequência e quitação por período
          </p>
        </div>
        <ExportButton onClick={exportCSV} />
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('reports')}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: activeTab === 'reports' ? '#2563eb' : 'white', color: activeTab === 'reports' ? 'white' : '#64748b', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
        >
          Relatórios
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: activeTab === 'withdrawals' ? '#2563eb' : 'white', color: activeTab === 'withdrawals' ? 'white' : '#64748b', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
        >
          Saques
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'reports' && (
        <PaymentFilters
          period={period}
          onPeriodChange={setPeriod}
          frequencyFilter={frequencyFilter}
          onFrequencyChange={setFrequencyFilter}
          restaurantFilter={restaurantFilter}
          onRestaurantChange={setRestaurantFilter}
          isAdmin={isAdmin}
          restaurants={restaurants}
        />
      )}

      {/* Stats */}
      {activeTab === 'reports' && (
        <PaymentStats summary={summary} variant="reports" formatCurrency={formatCurrency} />
      )}
      {activeTab === 'withdrawals' && (
        <PaymentStats summary={withdrawalSummary} variant="withdrawals" formatCurrency={formatCurrency} />
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : activeTab === 'reports' ? (
        <PaymentList
          reports={reports}
          expandedDriver={expandedDriver}
          expandedPeriod={expandedPeriod}
          onToggleDriver={(driverId) => setExpandedDriver(expandedDriver === driverId ? null : driverId)}
          onTogglePeriod={setExpandedPeriod}
          onPayAll={handlePayAll}
          onPayPeriod={handlePayPeriod}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          PAYMENT_FREQUENCY_LABELS={PAYMENT_FREQUENCY_LABELS}
        />
      ) : (
        <WithdrawalsList
          withdrawals={withdrawals}
          onProcessWithdrawal={handleProcessWithdrawal}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

export default PaymentReportsPage;
