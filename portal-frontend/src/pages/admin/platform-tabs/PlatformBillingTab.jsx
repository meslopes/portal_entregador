import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, CheckCircle, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';

/**
 * Cobrança MUV → admin (tenant) — Fase E do plano de monetização.
 * Total = FIXO + (R$/estabelecimento ativo × estabelecimentos ativos).
 * Default R$ 100/estabelecimento (margem de negociação do admin).
 */
const PlatformBillingTab = () => {
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenant_id: '', billing_cycle: 'MONTHLY', price_per_establishment: '100', fixed_price: '0' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, i, t] = await Promise.all([
        api.get('/api/platform/billing/subscriptions'),
        api.get('/api/platform/billing/invoices'),
        api.get('/api/platform/tenants'),
      ]);
      setSubs(s.data.subscriptions || []);
      setInvoices(i.data.invoices || []);
      setTenants(t.data.tenants || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao carregar cobrança', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/platform/billing/subscriptions', {
        tenant_id: parseInt(form.tenant_id),
        billing_cycle: form.billing_cycle,
        price_per_establishment: parseFloat(form.price_per_establishment) || 100,
        fixed_price: parseFloat(form.fixed_price) || 0,
      });
      showToast('Assinatura da plataforma criada', 'success');
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao criar assinatura', 'error');
    }
  };

  const handleGenerate = async (subId) => {
    try {
      const res = await api.post(`/api/platform/billing/subscriptions/${subId}/generate-invoice`);
      showToast(res.data.message || 'Fatura gerada', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao gerar fatura', 'error');
    }
  };

  const handlePay = async (invoiceId) => {
    try {
      await api.post(`/api/platform/billing/invoices/${invoiceId}/pay`);
      showToast('Fatura marcada como paga', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao pagar fatura', 'error');
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>Cobrança da Plataforma</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            O que a MUV cobra dos admins (tenants) — R$/estabelecimento ativo + fixo por ciclo
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer' }}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Nova Assinatura
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Tenant (admin)</label>
              <select value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))} style={inputStyle} required>
                <option value="">Selecione...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Ciclo</label>
              <select value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))} style={inputStyle}>
                <option value="MONTHLY">Mensal</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>R$/estab. ativo</label>
              <input type="number" step="0.01" min="0" value={form.price_per_establishment} onChange={e => setForm(f => ({ ...f, price_per_establishment: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Fixo (R$)</label>
              <input type="number" step="0.01" min="0" value={form.fixed_price} onChange={e => setForm(f => ({ ...f, fixed_price: e.target.value }))} style={inputStyle} />
            </div>
            <button type="submit" style={{ padding: '0.55rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Criar</button>
          </div>
        </form>
      )}

      {/* Assinaturas */}
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Assinaturas</h3>
      {subs.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
          <AlertCircle size={24} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
          <p style={{ fontSize: '0.875rem' }}>Nenhuma assinatura — crie uma para começar a cobrar os admins</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {subs.map(s => (
            <div key={s.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <p style={{ fontWeight: 600, color: '#1e293b' }}>{s.tenant_name || `Tenant #${s.tenant_id}`}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {s.billing_cycle === 'WEEKLY' ? 'Semanal' : 'Mensal'} · R$ {Number(s.price_per_establishment).toFixed(2)}/estab.
                  {s.fixed_price > 0 && ` + R$ ${Number(s.fixed_price).toFixed(2)} fixo`}
                  {s.is_active ? '' : ' · INATIVA'}
                </p>
              </div>
              <button onClick={() => handleGenerate(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                <FileText size={14} /> Gerar Fatura
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Faturas */}
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Faturas</h3>
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Número', 'Tenant', 'Estab.', 'Total', 'Status', 'Vencimento', 'Ações'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>Nenhuma fatura gerada</td></tr>
            ) : invoices.map(i => (
              <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>{i.invoice_number}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{i.tenant_name}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{i.establishments_count} × R$ {Number(i.price_per_establishment).toFixed(2)}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>R$ {Number(i.total_amount).toFixed(2)}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600,
                    background: i.status === 'PAID' ? '#dcfce7' : '#fef3c7',
                    color: i.status === 'PAID' ? '#16a34a' : '#b45309'
                  }}>{i.status === 'PAID' ? 'Paga' : 'Pendente'}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{i.due_date ? new Date(i.due_date).toLocaleDateString('pt-BR') : '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {i.status !== 'PAID' && (
                    <button onClick={() => handlePay(i.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none', background: '#16a34a', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      <CheckCircle size={13} /> Marcar Paga
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlatformBillingTab;
