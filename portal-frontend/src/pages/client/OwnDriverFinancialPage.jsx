import React, { useState, useEffect } from 'react';
import { RefreshCw, Wallet, Settings, BarChart3 } from 'lucide-react';
import api from '@/lib/api';
import TabBtn from './own-driver-financial/TabBtn';
import FinancialStats from './own-driver-financial/FinancialStats';
import PaymentHistory from './own-driver-financial/PaymentHistory';
import PaymentConfigForm from './own-driver-financial/PaymentConfigForm';
import ComparisonView from './own-driver-financial/ComparisonView';

const OwnDriverFinancialPage = () => {
  const [activeTab, setActiveTab] = useState('earnings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dados
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [comparison, setComparison] = useState(null);
  
  // Filtros
  const [period, setPeriod] = useState('week');
  const [driverFilter, setDriverFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState('');
  
  // Edição
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    payment_type: 'PER_DELIVERY',
    fixed_value: 5.00,
    km_value: 1.50,
    percentage: 70.0,
    delivery_value: 3.00,
    max_deliveries: 10
  });

  useEffect(() => { loadData(); }, [period, driverFilter, paidFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      await Promise.all([
        loadPaymentConfig(),
        loadEarnings(),
        loadDrivers(),
        loadComparison()
      ]);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentConfig = async () => {
    try {
      const res = await api.get('/api/admin/establishment-drivers/payment-config');
      setPaymentConfig(res.data);
      setConfigForm(res.data);
    } catch (err) {
      console.error('Erro ao carregar config:', err);
    }
  };

  const loadEarnings = async () => {
    try {
      const params = { period };
      if (driverFilter) params.driver_id = driverFilter;
      if (paidFilter) params.is_paid = paidFilter;
      
      const res = await api.get('/api/admin/establishment-drivers/earnings', { params });
      setEarnings(res.data.earnings || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Erro ao carregar ganhos:', err);
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

  const loadComparison = async () => {
    try {
      const res = await api.get('/api/admin/establishment-drivers/earnings/comparison', {
        params: { period }
      });
      setComparison(res.data);
    } catch (err) {
      console.error('Erro ao carregar comparativo:', err);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const payload = { payment_type: configForm.payment_type };
      if (configForm.payment_type === 'PER_KM') {
        payload.km_value = configForm.km_value;
      } else if (configForm.payment_type === 'PERCENTAGE') {
        payload.percentage = configForm.percentage;
      } else if (configForm.payment_type === 'FIXED_PLUS_DELIVERY') {
        payload.fixed_value = configForm.fixed_value;
        payload.delivery_value = configForm.delivery_value;
      } else if (configForm.payment_type === 'FIXED_UP_TO_PLUS_DELIVERY') {
        payload.fixed_value = configForm.fixed_value;
        payload.delivery_value = configForm.delivery_value;
        payload.max_deliveries = configForm.max_deliveries;
      } else {
        payload.fixed_value = configForm.fixed_value;
      }
      await api.put('/api/admin/establishment-drivers/payment-config', payload);
      setPaymentConfig(configForm);
      setEditingConfig(false);
      setSuccess('Configuração salva!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao salvar configuração');
    }
  };

  const handlePayEarning = async (earningId) => {
    try {
      await api.post(`/api/admin/establishment-drivers/earnings/${earningId}/pay`, {
        payment_method: 'PIX'
      });
      loadEarnings();
      setSuccess('Pagamento registrado!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao registrar pagamento');
    }
  };

  const handlePayAll = async (driverId) => {
    if (!confirm('Marcar todos os ganhos pendentes como pagos?')) return;
    try {
      const res = await api.post('/api/admin/establishment-drivers/earnings/pay-all', {
        driver_id: driverId,
        payment_method: 'PIX'
      });
      loadEarnings();
      setSuccess(`${res.data.count} pagamentos registrados! Total: R$ ${(res.data.total_paid || 0).toFixed(2)}`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Erro ao registrar pagamentos');
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
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
            Financeiro - Entregadores Próprios
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Controle de pagamentos e ganhos dos seus entregadores
          </p>
        </div>
        <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <TabBtn active={activeTab === 'earnings'} onClick={() => setActiveTab('earnings')}>
          <Wallet size={16} /> Ganhos
        </TabBtn>
        <TabBtn active={activeTab === 'config'} onClick={() => setActiveTab('config')}>
          <Settings size={16} /> Configuração
        </TabBtn>
        <TabBtn active={activeTab === 'comparison'} onClick={() => setActiveTab('comparison')}>
          <BarChart3 size={16} /> Comparativo
        </TabBtn>
      </div>

      {/* Tab: Ganhos */}
      {activeTab === 'earnings' && (
        <div>
          <FinancialStats summary={summary} />
          <PaymentHistory
            earnings={earnings}
            summary={summary}
            drivers={drivers}
            driverFilter={driverFilter}
            paidFilter={paidFilter}
            period={period}
            onPeriodChange={setPeriod}
            onDriverFilterChange={setDriverFilter}
            onPaidFilterChange={setPaidFilter}
            onPayEarning={handlePayEarning}
            onPayAll={handlePayAll}
          />
        </div>
      )}

      {/* Tab: Configuração */}
      {activeTab === 'config' && (
        <PaymentConfigForm
          configForm={configForm}
          onConfigFormChange={setConfigForm}
          onSave={handleSaveConfig}
        />
      )}

      {/* Tab: Comparativo */}
      {activeTab === 'comparison' && comparison && (
        <ComparisonView comparison={comparison} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OwnDriverFinancialPage;
