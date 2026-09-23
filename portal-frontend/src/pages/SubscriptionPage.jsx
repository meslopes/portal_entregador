import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckCircle, Plus, RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import SubscriptionCards from './subscription/SubscriptionCards';
import InvoicesTable from './subscription/InvoicesTable';
import CreateSubscriptionModal from './subscription/CreateSubscriptionModal';

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
  const [_actionLoading, setActionLoading] = useState(false);

  // Formulário de criação
  const [createForm, setCreateForm] = useState({
    restaurant_id: '',
    billing_cycle: 'WEEKLY',
    price_per_driver: 50.00,
    fixed_price: 0
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
      setActionLoading(true);
      await api.post('/api/finance/subscriptions', createForm);
      setSuccess('Assinatura criada com sucesso!');
      setShowCreateModal(false);
      setCreateForm({ restaurant_id: '', billing_cycle: 'WEEKLY', price_per_driver: 50.00, fixed_price: 0 });
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar assinatura');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async (subscriptionId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/api/finance/subscriptions/${subscriptionId}/generate-invoice`);
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar fatura');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    try {
      setActionLoading(true);
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

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {activeTab === 'subscriptions' && (
            <SubscriptionCards
              subscriptions={subscriptions}
              onGenerateInvoice={handleGenerateInvoice}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesTable
              invoices={invoices}
              onPayInvoice={handlePayInvoice}
            />
          )}
        </>
      )}

      {/* Modal de Criação */}
      <CreateSubscriptionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubscription}
        createForm={createForm}
        setCreateForm={setCreateForm}
        restaurants={restaurants}
      />
    </div>
  );
};

export default SubscriptionPage;
