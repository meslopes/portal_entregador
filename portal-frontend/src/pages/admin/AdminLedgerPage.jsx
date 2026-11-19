import React, { useState } from 'react';
import { BookOpen, RefreshCw, AlertCircle, Search, Loader2 } from 'lucide-react';
import api from '@/lib/api';

/**
 * Livro Financeiro (F-11) — extrato imutável de movimentos de dinheiro.
 * Cada linha = um lançamento (nunca editado/apagado). Saldo = soma.
 * Lançamentos nascem dos eventos (entrega, saque, bônus) — não há
 * botão de criar/editar aqui por design: o livro é imutável.
 */
const AdminLedgerPage = () => {
  const [partyType, setPartyType] = useState('DRIVER');
  const [partyId, setPartyId] = useState('');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const consultar = async () => {
    try {
      setLoading(true);
      setErro('');
      const params = { party_type: partyType, limit: 100 };
      if (partyType !== 'PLATFORM' && partyId) params.party_id = partyId;
      const res = await api.get('/api/admin/ledger', { params });
      setDados(res.data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao consultar o livro');
      setDados(null);
    } finally {
      setLoading(false);
    }
  };

  const rotulos = {
    ORDER_FEE: 'Frete/Comissão', DRIVER_PAYOUT: 'Repasse', WITHDRAWAL: 'Saque',
    BONUS: 'Bônus', SUBSCRIPTION: 'Assinatura', REFUND: 'Estorno', ADJUSTMENT: 'Ajuste',
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={26} /> Livro Financeiro
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Histórico imutável do dinheiro: cada lançamento é uma linha que nunca muda.
          Saldo = soma dos créditos − débitos.
        </p>
      </div>

      {/* Consulta */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'end', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Tipo de parte</label>
          <select value={partyType} onChange={e => setPartyType(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}>
            <option value="DRIVER">Entregador</option>
            <option value="ESTABLISHMENT">Estabelecimento</option>
            <option value="PLATFORM">Plataforma (muvlog)</option>
            <option value="TENANT">Organização</option>
          </select>
        </div>
        {partyType !== 'PLATFORM' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>ID</label>
            <input type="number" value={partyId} onChange={e => setPartyId(e.target.value)} placeholder="ex.: 12"
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', width: '120px' }} />
          </div>
        )}
        <button onClick={consultar} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
          {loading ? <Loader2 size={16} /> : <Search size={16} />} Consultar
        </button>
        {dados && (
          <button onClick={consultar} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer', color: '#64748b' }}>
            <RefreshCw size={16} /> Atualizar
          </button>
        )}
      </div>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {dados && (
        <>
          {/* Saldo */}
          <div style={{ background: dados.balance >= 0 ? '#dcfce7' : '#fee2e2', border: `1px solid ${dados.balance >= 0 ? '#86efac' : '#fecaca'}`, borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: '#475569' }}>Saldo atual ({dados.total} lançamento(s))</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: dados.balance >= 0 ? '#166534' : '#b91c1c' }}>
                R$ {dados.balance.toFixed(2).replace('.', ',')}
              </div>
            </div>
            <BookOpen size={32} style={{ color: dados.balance >= 0 ? '#16a34a' : '#dc2626', opacity: 0.3 }} />
          </div>

          {/* Extrato */}
          {dados.entries.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
              Nenhum lançamento para esta parte.
              <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>Os lançamentos nascem automaticamente em entregas, saques e bônus.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {dados.entries.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: l.entry_type === 'CREDIT' ? '#16a34a' : '#dc2626', minWidth: '95px' }}>
                    {l.entry_type === 'CREDIT' ? '+' : '−'} R$ {Number(l.amount).toFixed(2).replace('.', ',')}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                      <strong>{rotulos[l.reason] || l.reason}</strong>
                      {l.description ? ` — ${l.description}` : ''}
                    </div>
                    {l.reference_type && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        ref: {l.reference_type} #{l.reference_id}
                        {l.snapshot ? ' · regras da época anotadas' : ''}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {l.occurred_at ? new Date(l.occurred_at).toLocaleString('pt-BR') : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminLedgerPage;
