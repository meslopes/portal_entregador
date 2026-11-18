import React, { useState, useEffect } from 'react';
import { ShieldOff, RefreshCw, AlertCircle, CheckCircle, Plus, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';

/**
 * Evitamentos entregador↔estabelecimento (G-08 — punição silenciosa com
 * controle do admin). O mecanismo automático desprioriza nas ofertas os
 * entregadores que avaliam mal o estabelecimento (sem reciprocidade);
 * aqui o admin vê, suspende manualmente e REVOGA a qualquer momento.
 */
const AdminAvoidancesPage = () => {
  const [evitamentos, setEvitamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [autoLigado, setAutoLigado] = useState(true);
  const [salvandoToggle, setSalvandoToggle] = useState(false);
  // Suspensão manual
  const [drivers, setDrivers] = useState([]);
  const [estabs, setEstabs] = useState([]);
  const [novo, setNovo] = useState({ driver_id: '', restaurant_id: '', reason: '' });
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      const [evRes, cfgRes, drvRes, estRes] = await Promise.all([
        api.get('/api/admin/avoidances'),
        api.get('/api/admin/pricing/settings').catch(() => ({ data: {} })),
        api.get('/api/admin/drivers').catch(() => ({ data: { drivers: [] } })),
        api.get('/api/admin/establishments').catch(() => ({ data: { establishments: [] } })),
      ]);
      setEvitamentos(evRes.data.avoidances || []);
      const cfg = cfgRes.data?.config || cfgRes.data || {};
      setAutoLigado(String(cfg.avoidance_auto_enabled ?? 'true').toLowerCase() !== 'false');
      setDrivers(drvRes.data.drivers || []);
      setEstabs(estRes.data.establishments || []);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao carregar evitamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const alternarAuto = async () => {
    const novoValor = !autoLigado;
    setAutoLigado(novoValor);
    setSalvandoToggle(true);
    try {
      await api.put('/api/admin/pricing/settings', { avoidance_auto_enabled: novoValor ? 'true' : 'false' });
      showToast(novoValor ? 'Mecanismo automático LIGADO' : 'Mecanismo automático DESLIGADO', 'success');
    } catch {
      setAutoLigado(!novoValor);
      showToast('Erro ao salvar a configuração', 'error');
    } finally {
      setSalvandoToggle(false);
    }
  };

  const revogar = async (id) => {
    if (!confirm('Revogar este evitamento? O par volta a ser ofertado normalmente.')) return;
    try {
      await api.post(`/api/admin/avoidances/${id}/revoke`);
      showToast('Evitamento revogado', 'success');
      carregar();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao revogar', 'error');
    }
  };

  const suspender = async (e) => {
    e.preventDefault();
    if (!novo.driver_id || !novo.restaurant_id) { showToast('Escolha o entregador e o estabelecimento', 'error'); return; }
    try {
      setSalvando(true);
      await api.post('/api/admin/avoidances', novo);
      showToast('Evitamento ativado (revogável)', 'success');
      setNovo({ driver_id: '', restaurant_id: '', reason: '' });
      carregar();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao ativar', 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldOff size={26} /> Evitamentos (G-08)
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Entregador avalia mal um estabelecimento (sem reciprocidade) → é despriorizado nas ofertas dele.
            Conflito recíproco → alerta. Você controla tudo aqui.
          </p>
        </div>
        <button onClick={carregar} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {/* Toggle do mecanismo automático */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Mecanismo automático</div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Quando LIGADO, avaliações negativas criam evitamento sozinhas (punição silenciosa / alerta de conflito recíproco)
          </div>
        </div>
        <button onClick={alternarAuto} disabled={salvandoToggle} style={{
          padding: '0.5rem 1.25rem', borderRadius: '9999px', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
          background: autoLigado ? '#16a34a' : '#e2e8f0', color: autoLigado ? 'white' : '#64748b',
        }}>
          {autoLigado ? 'LIGADO' : 'DESLIGADO'}
        </button>
      </div>

      {/* Suspensão manual */}
      <form onSubmit={suspender} style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem', marginBottom: '0.75rem' }}>
          <Plus size={14} style={{ verticalAlign: 'middle' }} /> Suspensão manual (revogável)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <select value={novo.driver_id} onChange={e => setNovo(p => ({ ...p, driver_id: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}>
            <option value="">Entregador...</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name || `${d.user?.first_name || ''} ${d.user?.last_name || ''}`.trim() || `#${d.id}`}</option>)}
          </select>
          <select value={novo.restaurant_id} onChange={e => setNovo(p => ({ ...p, restaurant_id: e.target.value }))} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}>
            <option value="">Estabelecimento...</option>
            {estabs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input value={novo.reason} onChange={e => setNovo(p => ({ ...p, reason: e.target.value }))} placeholder="Motivo (opcional)" style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }} />
          <button type="submit" disabled={salvando} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
            {salvando ? <Loader2 size={14} /> : 'Ativar'}
          </button>
        </div>
      </form>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} /></div>
      ) : evitamentos.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
          Nenhum evitamento ativo.
          <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>Quando um entregador avaliar mal um estabelecimento (sem o contrário), ele aparece aqui.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {evitamentos.map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 700, background: ev.source === 'MANUAL' ? '#fef3c7' : '#fee2e2', color: ev.source === 'MANUAL' ? '#92400e' : '#b91c1c' }}>
                {ev.source === 'MANUAL' ? 'MANUAL' : 'AUTO'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                  <strong>{ev.driver_name}</strong> → <strong>{ev.restaurant_name}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.reason}</div>
              </div>
              <button onClick={() => revogar(ev.id)} style={{ padding: '0.4rem 0.9rem', borderRadius: '0.5rem', border: '1.5px solid #dc2626', background: 'white', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                Revogar
              </button>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', lineHeight: 1.6 }}>
        <CheckCircle size={12} style={{ verticalAlign: 'middle' }} /> Revogar devolve o entregador à fila normal daquele estabelecimento imediatamente.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminAvoidancesPage;
