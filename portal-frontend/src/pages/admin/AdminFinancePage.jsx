import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Package, Clock,
  AlertCircle, Store, Truck, ArrowUpRight, BarChart3,
  Percent, Wallet, ArrowDownRight, CreditCard
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminFinancePage = () => {
  const [data, setData] = useState(null);
  const [estData, setEstData] = useState([]);
  const [driverPayments, setDriverPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [commission, setCommission] = useState(30); // % que o admin retém
  const [savingCommission, setSavingCommission] = useState(false);

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';

      const [finance, establishments, payments, configRes] = await Promise.all([
        adminService.getFinanceDashboard(period),
        adminService.getFinanceByEstablishment(period),
        fetch(`${API_URL}/api/admin/driver-payments`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_URL}/api/admin/settings`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      ]);

      setData(finance);
      setEstData(establishments.establishments || []);
      setDriverPayments(payments);
      if (configRes.commission_rate) setCommission(parseInt(configRes.commission_rate));
    } catch (err) {
      setError('Erro ao carregar dados financeiros');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveCommission = async () => {
    try {
      setSavingCommission(true);
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';
      await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_rate: commission.toString() })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCommission(false);
    }
  };

  // Calculos financeiros
  const totalFromEstablishments = data?.revenue || 0;
  const totalToDrivers = driverPayments?.total_pending || 0;
  const adminRetention = totalFromEstablishments - totalToDrivers;
  const retentionRate = totalFromEstablishments > 0 ? ((adminRetention / totalFromEstablishments) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Financeiro</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Controle de recebimentos, pagamentos e comissões</p>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {[{ key: 'today', label: 'Hoje' }, { key: 'week', label: '7 dias' }, { key: 'month', label: '30 dias' }, { key: 'year', label: '1 ano' }].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
              background: period === p.key ? '#2563eb' : '#f1f5f9',
              color: period === p.key ? 'white' : '#64748b'
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Fluxo Financeiro */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wallet size={18} style={{ color: '#2563eb' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Fluxo Financeiro</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Recebido dos estabelecimentos */}
            <div style={{ background: '#f0fdf4', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ArrowDownRight size={18} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 500 }}>Recebido (Estabelecimentos)</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>{utils.formatCurrency(totalFromEstablishments)}</p>
              <p style={{ fontSize: '0.6875rem', color: '#16a34a', marginTop: '0.25rem' }}>Frete total cobrado</p>
            </div>

            {/* Pago aos entregadores */}
            <div style={{ background: '#fef2f2', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ArrowUpRight size={18} style={{ color: '#dc2626' }} />
                <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 500 }}>A Pagar (Entregadores)</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991b1b' }}>{utils.formatCurrency(totalToDrivers)}</p>
              <p style={{ fontSize: '0.6875rem', color: '#dc2626', marginTop: '0.25rem' }}>{driverPayments?.total_drivers || 0} entregadores</p>
            </div>

            {/* Lucro do admin */}
            <div style={{ background: '#eff6ff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.8125rem', color: '#2563eb', fontWeight: 500 }}>Retenção (Nosso Lucro)</span>
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>{utils.formatCurrency(adminRetention)}</p>
              <p style={{ fontSize: '0.6875rem', color: '#2563eb', marginTop: '0.25rem' }}>{retentionRate}% de retenção</p>
            </div>
          </div>

          {/* Barra de composicao */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Composição do Frete</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>100%</span>
            </div>
            <div style={{ height: '2rem', borderRadius: '0.5rem', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${100 - commission}%`, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 600, color: 'white' }}>
                Entregadores ({100 - commission}%)
              </div>
              <div style={{ width: `${commission}%`, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 600, color: 'white' }}>
                Admin ({commission}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuracao de comissao */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Percent size={18} style={{ color: '#8b5cf6' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Taxa de Retenção (Comissão)</span>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
              Percentual retido pelo admin (%)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="range"
                min="0" max="50" value={commission}
                onChange={e => setCommission(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', minWidth: '60px', textAlign: 'right' }}>
                {commission}%
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Entregadores recebem {100 - commission}% • Admin retém {commission}%
            </p>
          </div>
          <button onClick={saveCommission} disabled={savingCommission} style={{
            padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none',
            background: '#8b5cf6', color: 'white', fontSize: '0.875rem', fontWeight: 600,
            cursor: savingCommission ? 'not-allowed' : 'pointer', opacity: savingCommission ? 0.7 : 1
          }}>
            {savingCommission ? 'Salvando...' : 'Salvar Taxa'}
          </button>
        </div>
      </div>

      {/* Resumo por Estabelecimento */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store size={18} style={{ color: '#0d9488' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Recebimentos por Estabelecimento</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', minWidth: '600px' }}>
            <span>Estabelecimento</span><span style={{ textAlign: 'center' }}>Pedidos</span><span style={{ textAlign: 'right' }}>Receita</span><span style={{ textAlign: 'right' }}>Frete</span><span style={{ textAlign: 'right' }}>Ticket Médio</span>
          </div>
          {estData.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Sem dados</p>
          ) : (
            estData.map((est, i) => (
              <div key={est.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', borderBottom: i < estData.length - 1 ? '1px solid #f8fafc' : 'none', fontSize: '0.8125rem', minWidth: '600px' }}>
                <span style={{ fontWeight: 500, color: '#1e293b' }}>{est.name}</span>
                <span style={{ textAlign: 'center', color: '#64748b' }}>{est.total_orders}</span>
                <span style={{ textAlign: 'right', color: '#16a34a', fontWeight: 500 }}>{utils.formatCurrency(est.revenue)}</span>
                <span style={{ textAlign: 'right', color: '#0d9488', fontWeight: 600 }}>{utils.formatCurrency(est.delivery_fees)}</span>
                <span style={{ textAlign: 'right', color: '#64748b' }}>{utils.formatCurrency(est.avg_order)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pendencias de Pagamento aos Entregadores */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Truck size={18} style={{ color: '#f59e0b' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Pagamentos Pendentes aos Entregadores</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', minWidth: '600px' }}>
            <span>Entregador</span><span style={{ textAlign: 'center' }}>Entregas</span><span style={{ textAlign: 'center' }}>Avaliação</span><span style={{ textAlign: 'center' }}>Pagamentos</span><span style={{ textAlign: 'right' }}>Valor Pendente</span>
          </div>
          {driverPayments?.drivers?.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum pagamento pendente</p>
          ) : (
            driverPayments?.drivers?.map((driver, i) => (
              <div key={driver.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1.5rem', borderBottom: i < (driverPayments?.drivers?.length || 0) - 1 ? '1px solid #f8fafc' : 'none', fontSize: '0.8125rem', minWidth: '600px' }}>
                <div>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{driver.name}</span>
                  {driver.pix_key && <p style={{ fontSize: '0.625rem', color: '#0d9488' }}>PIX: {driver.pix_key}</p>}
                </div>
                <span style={{ textAlign: 'center', color: '#64748b' }}>{driver.total_deliveries}</span>
                <span style={{ textAlign: 'center', color: driver.rating >= 4 ? '#16a34a' : driver.rating >= 3 ? '#f59e0b' : '#dc2626' }}>
                  {driver.rating ? `${driver.rating} ⭐` : '-'}
                </span>
                <span style={{ textAlign: 'center' }}>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>
                    {driver.pending_payments}
                  </span>
                </span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                  {utils.formatCurrency(driver.pending_amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminFinancePage;
