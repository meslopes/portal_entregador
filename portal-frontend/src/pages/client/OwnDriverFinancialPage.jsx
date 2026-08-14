import React, { useState, useEffect } from 'react';
import {
  DollarSign, Settings, TrendingUp, Users, CheckCircle,
  AlertCircle, RefreshCw, Download, Filter, ChevronDown,
  Wallet, CreditCard, ArrowDownRight, BarChart3
} from 'lucide-react';
import api from '@/lib/api';

const PAYMENT_TYPES = {
  PER_DELIVERY: { label: 'Por Entrega', description: 'Valor fixo por entrega', icon: '📦' },
  PER_KM: { label: 'Por Km', description: 'Valor por km rodado', icon: '🛣️' },
  PERCENTAGE: { label: 'Percentual', description: '% do frete cobrado', icon: '📊' },
  DAILY: { label: 'Diária', description: 'Valor fixo por dia', icon: '📅' },
  FIXED: { label: 'Fixo', description: 'Valor fixo combinado', icon: '💰' }
};

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
    percentage: 70.0
  });

  useEffect(() => { loadData(); }, [period, driverFilter, paidFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
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
      await api.put('/api/admin/establishment-drivers/payment-config', configForm);
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

  const formatCurrency = (value) => `R$ ${(value || 0).toFixed(2)}`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '-';

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
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle size={16} /> {success}
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
          {/* Cards de Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard
              label="Total Ganhos"
              value={formatCurrency(summary?.total_earning)}
              icon={<DollarSign size={20} />}
              color="#059669"
            />
            <StatCard
              label="Total Pago"
              value={formatCurrency(summary?.total_paid)}
              icon={<CheckCircle size={20} />}
              color="#2563eb"
            />
            <StatCard
              label="Pendente"
              value={formatCurrency(summary?.total_pending)}
              icon={<AlertCircle size={20} />}
              color="#f59e0b"
            />
            <StatCard
              label="Entregas"
              value={summary?.count || 0}
              icon={<TrendingUp size={20} />}
              color="#8b5cf6"
            />
          </div>

          {/* Filtros */}
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={selectStyle}>
              <option value="week">Última Semana</option>
              <option value="month">Último Mês</option>
              <option value="all">Todos</option>
            </select>
            <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)} style={selectStyle}>
              <option value="">Todos Entregadores</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select value={paidFilter} onChange={e => setPaidFilter(e.target.value)} style={selectStyle}>
              <option value="">Todos Status</option>
              <option value="false">Pendentes</option>
              <option value="true">Pagos</option>
            </select>
          </div>

          {/* Lista de Ganhos */}
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Pedido</th>
                  <th style={thStyle}>Entregador</th>
                  <th style={thStyle}>Frete</th>
                  <th style={thStyle}>Ganho</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {earnings.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      Nenhum ganho registrado
                    </td>
                  </tr>
                ) : (
                  earnings.map(earning => (
                    <tr key={earning.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>#{earning.order_number}</td>
                      <td style={tdStyle}>{earning.driver_name}</td>
                      <td style={tdStyle}>{formatCurrency(earning.delivery_fee)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#059669' }}>
                        {formatCurrency(earning.driver_earning)}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', background: '#dbeafe', color: '#1d4ed8' }}>
                          {PAYMENT_TYPES[earning.payment_type]?.label || earning.payment_type}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {earning.is_paid ? (
                          <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}>
                            <CheckCircle size={14} /> Pago
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}>
                            <AlertCircle size={14} /> Pendente
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {!earning.is_paid && (
                          <button
                            onClick={() => handlePayEarning(earning.id)}
                            style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Botão Pagar Todos */}
          {driverFilter && summary?.total_pending > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handlePayAll(driverFilter)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: '#059669', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
              >
                <CreditCard size={16} /> Pagar Todos ({formatCurrency(summary.total_pending)})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Configuração */}
      {activeTab === 'config' && (
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
            Configuração de Pagamento
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Defina como seus entregadores próprios serão pagos por cada entrega.
            </p>
          </div>

          {/* Tipos de Pagamento */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {Object.entries(PAYMENT_TYPES).map(([key, type]) => (
              <div
                key={key}
                onClick={() => setConfigForm({ ...configForm, payment_type: key })}
                style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${configForm.payment_type === key ? '#2563eb' : '#e2e8f0'}`,
                  background: configForm.payment_type === key ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{type.icon}</div>
                <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{type.label}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{type.description}</p>
              </div>
            ))}
          </div>

          {/* Valores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {(configForm.payment_type === 'PER_DELIVERY' || configForm.payment_type === 'DAILY' || configForm.payment_type === 'FIXED') && (
              <div>
                <label style={labelStyle}>Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={configForm.fixed_value}
                  onChange={e => setConfigForm({ ...configForm, fixed_value: parseFloat(e.target.value) })}
                  style={inputStyle}
                />
              </div>
            )}
            {configForm.payment_type === 'PER_KM' && (
              <div>
                <label style={labelStyle}>Valor por Km (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={configForm.km_value}
                  onChange={e => setConfigForm({ ...configForm, km_value: parseFloat(e.target.value) })}
                  style={inputStyle}
                />
              </div>
            )}
            {configForm.payment_type === 'PERCENTAGE' && (
              <div>
                <label style={labelStyle}>Percentual (%)</label>
                <input
                  type="number"
                  step="1"
                  value={configForm.percentage}
                  onChange={e => setConfigForm({ ...configForm, percentage: parseFloat(e.target.value) })}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* Botão Salvar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveConfig}
              style={{ padding: '0.75rem 2rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
            >
              Salvar Configuração
            </button>
          </div>
        </div>
      )}

      {/* Tab: Comparativo */}
      {activeTab === 'comparison' && comparison && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Entregadores Próprios */}
            <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, color: '#1e293b' }}>Entregadores Próprios</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Sua equipe</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregas</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{comparison.own_drivers.deliveries}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo Total</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{formatCurrency(comparison.own_drivers.total_earning)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo/Entrega</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(comparison.own_drivers.avg_cost_per_delivery)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Frete Total</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(comparison.own_drivers.total_delivery_fee)}</p>
                </div>
              </div>
            </div>

            {/* Plataforma */}
            <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, color: '#1e293b' }}>Plataforma MUV</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregadores da rede</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Entregas</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{comparison.platform.deliveries}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo Total</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(comparison.platform.total_delivery_fee)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Custo/Entrega</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(comparison.platform.avg_cost_per_delivery)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Frete Total</p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(comparison.platform.total_delivery_fee)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Economia */}
          <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '0.75rem', padding: '1.5rem', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownRight size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>Economia estimada no período</p>
                <p style={{ fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(comparison.savings.estimated_savings)}</p>
                <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  {(comparison.savings.savings_percentage || 0).toFixed(1)}% de economia em relação à plataforma
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// Componentes auxiliares
const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      border: 'none',
      background: active ? '#2563eb' : 'transparent',
      color: active ? 'white' : '#64748b',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: active ? 600 : 500,
      transition: 'all 0.15s'
    }}
  >
    {children}
  </button>
);

const StatCard = ({ label, value, icon, color }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
      <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color }}>{icon}</span>
      </div>
    </div>
    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
  </div>
);

const selectStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.8125rem',
  outline: 'none',
  background: 'white',
  color: '#1e293b',
  minWidth: '150px'
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '0.375rem'
};

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tdStyle = {
  padding: '0.75rem 1rem',
  fontSize: '0.8125rem',
  color: '#1e293b'
};

export default OwnDriverFinancialPage;
