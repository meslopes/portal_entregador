import React, { useState, useEffect } from 'react';
import {
  CreditCard, Calendar, Users, DollarSign, CheckCircle,
  AlertCircle, Plus, Settings, FileText, TrendingUp,
  ChevronDown, ChevronRight, Download, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';

const SubscriptionPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Formulário de criação
  const [createForm, setCreateForm] = useState({
    restaurant_id: '',
    billing_cycle: 'WEEKLY',
    price_per_driver: 50.00
  });

  useEffect(() => {
    checkUserRole();
    loadData();
  }, []);

  const checkUserRole = async () => {
    try {
      const res = await api.get('/api/user/profile');
      setIsAdmin(res.data.user_type === 'ADMIN');
      if (res.data.user_type === 'ADMIN') {
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [subsRes, invRes] = await Promise.all([
        api.get('/api/finance/subscriptions'),
        api.get('/api/finance/invoices')
      ]);
      setSubscriptions(subsRes.data.subscriptions || []);
      setInvoices(invRes.data.invoices || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/finance/subscriptions', createForm);
      setSuccess('Assinatura criada com sucesso!');
      setShowCreateModal(false);
      setCreateForm({ restaurant_id: '', billing_cycle: 'WEEKLY', price_per_driver: 50.00 });
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar assinatura');
    }
  };

  const handleGenerateInvoice = async (subscriptionId) => {
    try {
      const res = await api.post(`/api/finance/subscriptions/${subscriptionId}/generate-invoice`);
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar fatura');
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    try {
      const res = await api.post(`/api/finance/invoices/${invoiceId}/pay`, {
        payment_method: 'PIX'
      });
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao pagar fatura');
    }
  };

  const handleGenerateAllInvoices = async () => {
    if (!window.confirm('Gerar faturas para todas as assinaturas com cobrança pendente?')) return;
    try {
      const res = await api.post('/api/finance/generate-all-invoices');
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar faturas');
    }
  };

  const formatCurrency = (value) => `R$ ${(value || 0).toFixed(2).replace('.', ',')}`;
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '-';

  const getStatusBadge = (status) => {
    const configs = {
      PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pendente' },
      PAID: { bg: '#dcfce7', color: '#16a34a', label: 'Pago' },
      OVERDUE: { bg: '#fef2f2', color: '#dc2626', label: 'Vencido' },
      CANCELLED: { bg: '#f1f5f9', color: '#64748b', label: 'Cancelado' }
    };
    const config = configs[status] || configs.PENDING;
    return (
      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: config.bg, color: config.color }}>
        {config.label}
      </span>
    );
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Assinaturas - Entregadores Próprios
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Gerencie cobranças semanais/mensais para estabelecimentos com entregadores próprios
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isAdmin && (
            <>
              <button
                onClick={handleGenerateAllInvoices}
                style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={16} /> Gerar Faturas Pendentes
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} /> Nova Assinatura
              </button>
            </>
          )}
        </div>
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
          onClick={() => setActiveTab('subscriptions')}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: activeTab === 'subscriptions' ? '#2563eb' : 'white', color: activeTab === 'subscriptions' ? 'white' : '#64748b', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
        >
          Assinaturas
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: activeTab === 'invoices' ? '#2563eb' : 'white', color: activeTab === 'invoices' ? 'white' : '#64748b', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
        >
          Faturas
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* Tab Assinaturas */}
          {activeTab === 'subscriptions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {subscriptions.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <CreditCard size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhuma assinatura cadastrada</p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Crie uma assinatura para começar a cobrar pelos entregadores próprios.
                  </p>
                </div>
              ) : (
                subscriptions.map(sub => (
                  <div key={sub.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.125rem' }}>{sub.restaurant_name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: sub.billing_cycle === 'WEEKLY' ? '#dbeafe' : '#ede9fe', color: sub.billing_cycle === 'WEEKLY' ? '#1d4ed8' : '#6d28d9' }}>
                            {sub.billing_cycle === 'WEEKLY' ? '📆 Semanal' : '🗓️ Mensal'}
                          </span>
                          <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: sub.is_active ? '#dcfce7' : '#fef2f2', color: sub.is_active ? '#16a34a' : '#dc2626' }}>
                            {sub.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Por entregador/ciclo</p>
                        <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.25rem' }}>{formatCurrency(sub.price_per_driver)}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Última Cobrança</p>
                        <p style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(sub.last_billed_at)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Próxima Cobrança</p>
                        <p style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(sub.next_billing_at)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Faturado</p>
                        <p style={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(sub.total_billed)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pendente</p>
                        <p style={{ fontWeight: 600, color: sub.pending_amount > 0 ? '#d97706' : '#059669' }}>{formatCurrency(sub.pending_amount)}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => handleGenerateInvoice(sub.id)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', color: '#374151', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Gerar Fatura
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Faturas */}
          {activeTab === 'invoices' && (
            <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Fatura</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Estabelecimento</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Período</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Entregadores</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Valor</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Vencimento</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        Nenhuma fatura encontrada
                      </td>
                    </tr>
                  ) : (
                    invoices.map(invoice => (
                      <tr key={invoice.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{invoice.invoice_number}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#475569' }}>{invoice.restaurant_name}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
                          {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.875rem', color: '#475569' }}>{invoice.drivers_count}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(invoice.total_amount)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.8125rem', color: '#64748b' }}>{formatDate(invoice.due_date)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{getStatusBadge(invoice.status)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {invoice.status === 'PENDING' && (
                            <button
                              onClick={() => handlePayInvoice(invoice.id)}
                              style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none', background: '#059669', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
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
          )}
        </>
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Nova Assinatura</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            
            <form onSubmit={handleCreateSubscription}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Estabelecimento *</label>
                <select
                  value={createForm.restaurant_id}
                  onChange={e => setCreateForm({ ...createForm, restaurant_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}
                >
                  <option value="">Selecione...</option>
                  {restaurants.filter(r => r.has_own_drivers).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Ciclo de Cobrança</label>
                <select
                  value={createForm.billing_cycle}
                  onChange={e => setCreateForm({ ...createForm, billing_cycle: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}
                >
                  <option value="WEEKLY">📆 Semanal</option>
                  <option value="MONTHLY">🗓️ Mensal</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Preço por Entregador (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.price_per_driver}
                  onChange={e => setCreateForm({ ...createForm, price_per_driver: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Criar Assinatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
