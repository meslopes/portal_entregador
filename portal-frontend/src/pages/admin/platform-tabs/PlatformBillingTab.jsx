import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, CheckCircle, RefreshCw, Loader2, AlertCircle, Calculator, Pencil, X } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';

/**
 * Cobrança MUV → admin (tenant) — motor por COMPONENTES (2026-11-20).
 *
 * total = [FIXO] + [R$/estab × contagem(modo, N)] + [R$/pedido × máx(0, pedidos − cota)]
 *
 * Cada componente é ligável (preço 0 = desligado) e o modo de contagem do
 * estabelecimento muda o que é "estabelecimento do ciclo":
 *   SNAPSHOT     = ativos no instante (legado)
 *   USO          = estab. com ≥N pedidos no ciclo
 *   PRO_RATA_USO = proporcional aos dias com pedido no ciclo
 * Contratos diferentes para admins diferentes — tudo configurável aqui.
 */
const MODOS = [
  { value: 'SNAPSHOT', label: 'Ativos no instante', ajuda: 'Conta is_active no momento da fatura (comportamento antigo)' },
  { value: 'USO', label: 'Uso (≥N pedidos)', ajuda: 'Conta só estab. com N ou mais pedidos no ciclo — teste sem venda não conta' },
  { value: 'PRO_RATA_USO', label: 'Proporcional (dias)', ajuda: 'Proporcional aos dias com pedido no ciclo — ativação relâmpago cobra fração' },
];

const FORM_VAZIO = {
  tenant_id: '', billing_cycle: 'MONTHLY',
  fixed_price: '0',
  price_per_establishment: '100', establishment_count_mode: 'SNAPSHOT', min_orders_per_establishment: '1',
  price_per_order: '0', orders_included: '0',
};

const PlatformBillingTab = () => {
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null); // id da assinatura em edição
  const [form, setForm] = useState(FORM_VAZIO);
  const [preview, setPreview] = useState(null); // { tenant_name, breakdown, ... }

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

  const payloadDoForm = () => ({
    billing_cycle: form.billing_cycle,
    fixed_price: parseFloat(form.fixed_price) || 0,
    price_per_establishment: parseFloat(form.price_per_establishment) || 0,
    establishment_count_mode: form.establishment_count_mode,
    min_orders_per_establishment: parseInt(form.min_orders_per_establishment) || 1,
    price_per_order: parseFloat(form.price_per_order) || 0,
    orders_included: parseInt(form.orders_included) || 0,
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/platform/billing/subscriptions', {
        tenant_id: parseInt(form.tenant_id),
        ...payloadDoForm(),
      });
      showToast('Assinatura da plataforma criada', 'success');
      setShowForm(false);
      setForm(FORM_VAZIO);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao criar assinatura', 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/platform/billing/subscriptions/${editId}`, payloadDoForm());
      showToast('Assinatura atualizada', 'success');
      setEditId(null);
      setForm(FORM_VAZIO);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao atualizar assinatura', 'error');
    }
  };

  const abrirEdicao = (s) => {
    setEditId(s.id);
    setShowForm(false);
    setForm({
      tenant_id: String(s.tenant_id),
      billing_cycle: s.billing_cycle || 'MONTHLY',
      fixed_price: String(s.fixed_price ?? 0),
      price_per_establishment: String(s.price_per_establishment ?? 0),
      establishment_count_mode: s.establishment_count_mode || 'SNAPSHOT',
      min_orders_per_establishment: String(s.min_orders_per_establishment ?? 1),
      price_per_order: String(s.price_per_order ?? 0),
      orders_included: String(s.orders_included ?? 0),
    });
  };

  const handlePreview = async (s) => {
    try {
      const res = await api.get(`/api/platform/billing/subscriptions/${s.id}/preview`);
      setPreview({ tenant_name: s.tenant_name || `Tenant #${s.tenant_id}`, ...res.data });
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao simular fatura', 'error');
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

  const nomeModo = (m) => MODOS.find(x => x.value === (m || 'SNAPSHOT'))?.label || m;

  // resumo da composição da assinatura (o "contrato" em uma linha)
  const resumoComponentes = (s) => {
    const partes = [];
    if (Number(s.fixed_price) > 0) partes.push(`R$ ${Number(s.fixed_price).toFixed(2)} fixo`);
    if (Number(s.price_per_establishment) > 0) {
      partes.push(`R$ ${Number(s.price_per_establishment).toFixed(2)}/estab (${nomeModo(s.establishment_count_mode)}${s.establishment_count_mode === 'USO' ? `, N=${s.min_orders_per_establishment}` : ''})`);
    }
    if (Number(s.price_per_order) > 0) {
      partes.push(`R$ ${Number(s.price_per_order).toFixed(2)}/pedido${Number(s.orders_included) > 0 ? ` (cota ${s.orders_included})` : ''}`);
    }
    return partes.length ? partes.join(' + ') : 'Nenhum componente ligado';
  };

  const inputStyle = {
    width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
  };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' };
  const blocoStyle = { background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem' };

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
            O que a MUV cobra dos admins — fórmula por componentes: fixo + por estabelecimento + por pedido (cada contrato configura o seu)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer' }}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditId(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Nova Assinatura
          </button>
        </div>
      </div>

      {(showForm || editId) && (
        <form onSubmit={editId ? handleUpdate : handleCreate} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              {editId ? 'Editar assinatura (componentes do contrato)' : 'Nova assinatura (componentes do contrato)'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(FORM_VAZIO); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: editId ? '1fr 1fr' : '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {!editId && (
              <div>
                <label style={labelStyle}>Tenant (admin)</label>
                <select value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))} style={inputStyle} required>
                  <option value="">Selecione...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>Ciclo</label>
              <select value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))} style={inputStyle}>
                <option value="MONTHLY">Mensal</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {/* Componente 1 — Fixo */}
            <div style={blocoStyle}>
              <label style={labelStyle}>1. Fixo por ciclo (R$) — 0 = desligado</label>
              <input type="number" step="0.01" min="0" value={form.fixed_price} onChange={e => setForm(f => ({ ...f, fixed_price: e.target.value }))} style={inputStyle} />
            </div>

            {/* Componente 2 — Por estabelecimento */}
            <div style={blocoStyle}>
              <label style={labelStyle}>2. Por estabelecimento (R$) — 0 = desligado</label>
              <input type="number" step="0.01" min="0" value={form.price_per_establishment} onChange={e => setForm(f => ({ ...f, price_per_establishment: e.target.value }))} style={inputStyle} />
              <label style={{ ...labelStyle, marginTop: '0.5rem' }}>Modo de contagem</label>
              <select value={form.establishment_count_mode} onChange={e => setForm(f => ({ ...f, establishment_count_mode: e.target.value }))} style={inputStyle}>
                {MODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '0.375rem 0 0' }}>
                {MODOS.find(m => m.value === form.establishment_count_mode)?.ajuda}
              </p>
              {form.establishment_count_mode === 'USO' && (
                <>
                  <label style={{ ...labelStyle, marginTop: '0.5rem' }}>N mínimo de pedidos no ciclo</label>
                  <input type="number" min="1" max="10000" value={form.min_orders_per_establishment} onChange={e => setForm(f => ({ ...f, min_orders_per_establishment: e.target.value }))} style={inputStyle} />
                </>
              )}
            </div>

            {/* Componente 3 — Por pedido */}
            <div style={blocoStyle}>
              <label style={labelStyle}>3. Por pedido (R$) — 0 = desligado</label>
              <input type="number" step="0.01" min="0" value={form.price_per_order} onChange={e => setForm(f => ({ ...f, price_per_order: e.target.value }))} style={inputStyle} />
              <label style={{ ...labelStyle, marginTop: '0.5rem' }}>Cota de pedidos inclusa</label>
              <input type="number" min="0" max="1000000" value={form.orders_included} onChange={e => setForm(f => ({ ...f, orders_included: e.target.value }))} style={inputStyle} />
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '0.375rem 0 0' }}>
                Só cobra pedidos acima da cota no ciclo
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button type="submit" style={{ padding: '0.55rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
              {editId ? 'Salvar alterações' : 'Criar'}
            </button>
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
                  {s.billing_cycle === 'WEEKLY' ? 'Semanal' : 'Mensal'} · {resumoComponentes(s)}
                  {s.is_active ? '' : ' · INATIVA'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handlePreview(s)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#2563eb', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Calculator size={14} /> Simular
                </button>
                <button onClick={() => abrirEdicao(s)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Pencil size={14} /> Editar
                </button>
                <button onClick={() => handleGenerate(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                  <FileText size={14} /> Gerar Fatura
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de simulação (prévia) */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setPreview(null)}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', width: 'min(420px, 92vw)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Simulação — {preview.tenant_name}</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Ciclo atual ({preview.billing_cycle === 'WEEKLY' ? 'semanal' : 'mensal'}) — prévia, nada foi cobrado
            </p>
            {(() => {
              const b = preview.breakdown || {};
              const linhas = [];
              if (b.fixed_total > 0) linhas.push(['Fixo', `R$ ${Number(b.fixed_total).toFixed(2)}`]);
              if (Number(b.price_per_establishment) > 0) {
                linhas.push([
                  `Estabelecimentos (${nomeModo(b.establishment_count_mode)})`,
                  `${b.establishments_count} × R$ ${Number(b.price_per_establishment).toFixed(2)} = R$ ${Number(b.establishments_total).toFixed(2)}`,
                ]);
              }
              if (Number(b.price_per_order) > 0) {
                linhas.push([
                  `Pedidos (${b.orders_count} no ciclo${Number(b.orders_included) > 0 ? `, cota ${b.orders_included}` : ''})`,
                  `${b.orders_billed} × R$ ${Number(b.price_per_order).toFixed(2)} = R$ ${Number(b.orders_total).toFixed(2)}`,
                ]);
              }
              return (
                <>
                  {linhas.map(([rot, val]) => (
                    <div key={rot} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                      <span style={{ color: '#64748b' }}>{rot}</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Total do ciclo</span>
                    <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>R$ {Number(b.total || 0).toFixed(2)}</span>
                  </div>
                </>
              );
            })()}
            <button onClick={() => setPreview(null)} style={{ marginTop: '1rem', width: '100%', padding: '0.55rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Fechar</button>
          </div>
        </div>
      )}

      {/* Faturas */}
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Faturas</h3>
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Número', 'Tenant', 'Detalhes do cálculo', 'Total', 'Status', 'Vencimento', 'Ações'].map(h => (
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
                <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.75rem' }}>
                  {Number(i.price_per_establishment) > 0 && `${i.establishments_count} × R$ ${Number(i.price_per_establishment).toFixed(2)} (${nomeModo(i.establishment_count_mode)})`}
                  {Number(i.price_per_establishment) > 0 && Number(i.price_per_order) > 0 && ' + '}
                  {Number(i.price_per_order) > 0 && `${i.orders_billed} ped. × R$ ${Number(i.price_per_order).toFixed(2)}`}
                  {Number(i.price_per_establishment) === 0 && Number(i.price_per_order) === 0 && Number(i.fixed_price) > 0 && 'Somente fixo'}
                </td>
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
