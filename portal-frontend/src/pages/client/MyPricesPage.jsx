import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';
import TierBandsField from '@/components/TierBandsField';

/**
 * Meus Preços — o estabelecimento define os preços de entrega que cobra do seu cliente.
 * Só campos de frete (princípio da independência: custos de entregador ficam em
 * "Pagamentos" — ver docs/PLAN_MONETIZACAO_ENTREGAS_PROPRIAS.md).
 */
const MyPricesPage = () => {
  const [form, setForm] = useState({
    price_per_km: '', fixed_fee: '', min_distance_km: '',
    min_delivery_fee: '', max_delivery_fee: '',
    pricing_mode: 'PER_KM', tier_bands: [], free_delivery_min_order: '',
    round_trip: false, round_trip_rate_per_km: '', pickup_rate_per_km: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const loadTable = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/my-pricing-table');
      const t = res.data.pricing_table;
      if (!t) {
        setInfo('Nenhuma tabela de preços vinculada ao seu estabelecimento. Fale com o administrador.');
        return;
      }
      setForm({
        price_per_km: String(t.price_per_km ?? '2.95'),
        fixed_fee: String(t.fixed_fee ?? '0'),
        min_distance_km: String(t.min_distance_km ?? '4'),
        min_delivery_fee: t.min_delivery_fee != null ? String(t.min_delivery_fee) : '',
        max_delivery_fee: t.max_delivery_fee != null ? String(t.max_delivery_fee) : '',
        pricing_mode: t.pricing_mode || 'PER_KM',
        tier_bands: (t.tier_bands || []).map(b => ({ to_km: b.to_km ?? '', price: String(b.price ?? '') })),
        free_delivery_min_order: t.free_delivery_min_order != null ? String(t.free_delivery_min_order) : '',
        round_trip: false, // regra: entregas proprias nunca cobram volta
        round_trip_rate_per_km: t.round_trip_rate_per_km != null ? String(t.round_trip_rate_per_km) : '',
        pickup_rate_per_km: t.pickup_rate_per_km != null ? String(t.pickup_rate_per_km) : '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar os preços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTable(); }, []);

  // Mesma regra do cálculo do sistema (calcular_frete_tabela)
  const calcularFrete = (km) => {
    const aplicarLimites = (v) => {
      let fee = v;
      const minFee = parseFloat(form.min_delivery_fee);
      if (!isNaN(minFee)) fee = Math.max(fee, minFee);
      const maxFee = parseFloat(form.max_delivery_fee);
      if (!isNaN(maxFee)) fee = Math.min(fee, maxFee);
      return fee;
    };
    // Modo faixas (sem volta): preço da faixa que contém a distância
    if (form.pricing_mode === 'TIERS' && form.tier_bands.length) {
      const faixas = form.tier_bands
        .map(b => ({ to_km: b.to_km === '' ? null : parseFloat(b.to_km), price: parseFloat(b.price) || 0 }))
        .sort((a, b) => (a.to_km === null) - (b.to_km === null) || (a.to_km || 0) - (b.to_km || 0));
      let ultimo = 0;
      for (const f of faixas) {
        ultimo = f.price;
        if (f.to_km === null || km <= f.to_km) return aplicarLimites(f.price);
      }
      return aplicarLimites(ultimo);
    }
    const fixed = parseFloat(form.fixed_fee) || 0;
    if (fixed > 0) return fixed;
    const price = parseFloat(form.price_per_km) || 0;
    const minKm = parseFloat(form.min_distance_km) || 4;
    return aplicarLimites(Math.max(km, minKm) * price);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        price_per_km: form.price_per_km,
        fixed_fee: form.fixed_fee,
        min_distance_km: form.min_distance_km,
        min_delivery_fee: form.min_delivery_fee || null,
        max_delivery_fee: form.max_delivery_fee || null,
        pricing_mode: form.pricing_mode,
        free_delivery_min_order: form.free_delivery_min_order || null,
        pickup_rate_per_km: form.pickup_rate_per_km || 0,
        round_trip_rate_per_km: form.round_trip_rate_per_km || 0,
        round_trip: false, // regra de dominio: proprios nunca cobram volta
      };
      if (form.pricing_mode === 'TIERS') {
        payload.tier_bands = form.tier_bands
          .filter(b => b.price !== '' && b.price != null)
          .map(b => ({ to_km: b.to_km === '' ? null : parseFloat(b.to_km), price: parseFloat(b.price) }));
      }
      const res = await api.put('/api/admin/my-pricing-table', payload);
      showToast(res.data.message || 'Preços salvos!', 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar os preços');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
  };
  const labelStyle = {
    display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem'
  };

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Meus Preços</h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Defina quanto o seu cliente paga pela entrega. Estes preços valem para os pedidos do seu estabelecimento.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {info && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Tipo de precificação */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Tipo de precificação</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[['PER_KM', 'Por km / tarifa fixa'], ['TIERS', 'Por faixa de km']].map(([modo, rotulo]) => (
              <button key={modo} type="button" onClick={() => setForm(p => ({ ...p, pricing_mode: modo }))}
                style={{
                  padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                  border: `1.5px solid ${form.pricing_mode === modo ? '#2563eb' : '#e2e8f0'}`,
                  background: form.pricing_mode === modo ? '#2563eb' : 'white',
                  color: form.pricing_mode === modo ? 'white' : '#475569'
                }}>
                {rotulo}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.375rem' }}>
            {form.pricing_mode === 'TIERS'
              ? 'Cada faixa tem um preço fixo até X km — sem contar a volta (seu entregador sempre retorna).'
              : 'Cobrança por km rodado, com opção de tarifa fixa por entrega.'}
          </p>
        </div>

        {form.pricing_mode === 'TIERS' ? (
          <div style={{ marginBottom: '1rem' }}>
            <TierBandsField value={form.tier_bands} onChange={bands => setForm(p => ({ ...p, tier_bands: bands }))} />
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Preço por KM (R$)</label>
                <input type="number" step="0.01" min="0.01" value={form.price_per_km} required
                  onChange={e => setForm(p => ({ ...p, price_per_km: e.target.value }))} style={inputStyle} placeholder="2.95" />
              </div>
              <div>
                <label style={labelStyle}>Distância Mínima (km)</label>
                <input type="number" step="0.1" min="0.1" value={form.min_distance_km} required
                  onChange={e => setForm(p => ({ ...p, min_distance_km: e.target.value }))} style={inputStyle} placeholder="4" />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Tarifa Fixa (R$)</label>
              <input type="number" step="0.01" min="0" value={form.fixed_fee} required
                onChange={e => setForm(p => ({ ...p, fixed_fee: e.target.value }))} style={inputStyle} placeholder="0" />
              <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>Acima de zero, vale sempre este valor</p>
            </div>
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Frete Mínimo (R$)</label>
            <input type="number" step="0.01" min="0" value={form.min_delivery_fee}
              onChange={e => setForm(p => ({ ...p, min_delivery_fee: e.target.value }))} style={inputStyle} placeholder="Opcional" />
          </div>
          <div>
            <label style={labelStyle}>Frete Máximo (R$)</label>
            <input type="number" step="0.01" min="0" value={form.max_delivery_fee}
              onChange={e => setForm(p => ({ ...p, max_delivery_fee: e.target.value }))} style={inputStyle} placeholder="Opcional" />
          </div>
          <div>
            <label style={labelStyle}>Frete Grátis acima de (R$)</label>
            <input type="number" step="0.01" min="0" value={form.free_delivery_min_order}
              onChange={e => setForm(p => ({ ...p, free_delivery_min_order: e.target.value }))} style={inputStyle} placeholder="Opcional" />
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>Valor dos produtos</p>
          </div>
        </div>

        {/* Volta + deslocamento (§7.4) — taxas próprias em R$/km */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Taxa de deslocamento até a coleta (R$/km)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.pickup_rate_per_km}
              onChange={e => setForm(p => ({ ...p, pickup_rate_per_km: e.target.value }))} style={inputStyle} placeholder="0 = não cobrar" />
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
              Por km do trajeto do motorista até pegar o pedido (estimado pela posição dos motoristas online)
            </p>
          </div>
          <div>
            <label style={labelStyle}>Considerar a volta (R$/km)</label>
            <input type="number" step="0.01" min="0" max="100" value={form.round_trip_rate_per_km} disabled
              onChange={e => setForm(p => ({ ...p, round_trip_rate_per_km: e.target.value }))}
              style={{ ...inputStyle, background: '#f1f5f9', color: '#94a3b8' }} placeholder="—" />
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>
              Indisponível para entregas próprias: seu entregador sempre retorna ao estabelecimento.
            </p>
          </div>
        </div>

        {/* Prévia — mesma regra de cálculo do sistema */}
        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0d9488', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Prévia do frete que o cliente verá
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
            {[2, 5, 10].map(km => (
              <div key={km}>
                <p style={{ color: '#64748b', margin: 0 }}>{km} km</p>
                <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>R$ {calcularFrete(km).toFixed(2)}</p>
              </div>
            ))}
          </div>
          {form.pickup_rate_per_km && parseFloat(form.pickup_rate_per_km) > 0 && (
            <p style={{ fontSize: '0.75rem', color: '#0d9488', margin: '0.5rem 0 0' }}>
              + taxa de deslocamento (varia conforme a posição do motorista no momento do pedido)
            </p>
          )}
          {form.free_delivery_min_order && (
            <p style={{ fontSize: '0.75rem', color: '#0d9488', margin: '0.5rem 0 0' }}>
              ✓ Frete grátis para pedidos com produtos acima de R$ {parseFloat(form.free_delivery_min_order).toFixed(2)}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} style={{
            padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb',
            color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
            {saving ? 'Salvando...' : 'Salvar Preços'}
          </button>
        </div>
      </form>

      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', lineHeight: 1.6 }}>
        <DollarSign size={12} style={{ verticalAlign: 'middle' }} /> O pagamento que você faz aos seus entregadores é
        configurado em <strong>Pagamentos</strong> — os dois são independentes.
      </p>
    </div>
  );
};

export default MyPricesPage;
