import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

const WalletPage = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showPixEdit, setShowPixEdit] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadWallet(); }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/driver/wallet');
      setWallet(response.data || {});
      setPixKey(response.data?.pix_key || '');
    } catch (err) {
      setError('Erro ao carregar carteira');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Informe um valor válido');
      return;
    }
    try {
      await api.post('/api/driver/wallet/withdraw', { amount: parseFloat(withdrawAmount) });
      setSuccess('Solicitação de saque enviada!');
      setWithdrawAmount('');
      setShowWithdraw(false);
      loadWallet();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao solicitar saque');
    }
  };

  const handleSavePix = async () => {
    if (!pixKey.trim()) {
      setError('Informe sua chave PIX');
      return;
    }
    try {
      await api.put('/api/driver/wallet/pix-key', { pix_key: pixKey.trim() });
      setSuccess('Chave PIX atualizada!');
      setShowPixEdit(false);
      loadWallet();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar PIX');
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
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Minha Carteira</h1>
        <button onClick={loadWallet} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b' }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

      {/* Saldo */}
      <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '1rem', padding: '1.5rem', color: 'white', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.25rem' }}>Saldo Disponível</p>
        <p style={{ fontSize: '2rem', fontWeight: 700 }}>R$ {(wallet?.balance || 0).toFixed(2).replace('.', ',')}</p>
        {wallet?.locked_balance > 0 && (
          <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.5rem' }}>
            🔒 Bloqueado: R$ {wallet.locked_balance.toFixed(2).replace('.', ',')}
          </p>
        )}
      </div>

      {/* Ações */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowWithdraw(true)}
          disabled={!wallet?.balance || wallet.balance <= 0}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: 'white', cursor: wallet?.balance > 0 ? 'pointer' : 'not-allowed', opacity: wallet?.balance > 0 ? 1 : 0.5 }}
        >
          <ArrowUpCircle size={24} style={{ color: '#2563eb' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>Sacar via PIX</span>
        </button>
        <button
          onClick={() => setShowPixEdit(true)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
        >
          <Wallet size={24} style={{ color: '#0d9488' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>{wallet?.pix_key ? 'Alterar PIX' : 'Configurar PIX'}</span>
        </button>
      </div>

      {/* Chave PIX atual */}
      {wallet?.pix_key && (
        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#0d9488', marginBottom: '0.25rem' }}>Chave PIX</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{wallet.pix_key}</p>
        </div>
      )}

      {/* Histórico */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>Últimas Transações</h3>
        {wallet?.recent_payments?.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>Nenhuma transação</p>
        ) : (
          wallet?.recent_payments?.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {p.amount > 0 ? (
                  <ArrowDownCircle size={16} style={{ color: '#22c55e' }} />
                ) : (
                  <ArrowUpCircle size={16} style={{ color: '#ef4444' }} />
                )}
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>
                    {p.type === 'WITHDRAWAL' ? 'Saque PIX' : 'Ganho de entrega'}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                    {p.created_at ? new Date(p.created_at + 'Z').toLocaleString('pt-BR') : ''}
                  </p>
                </div>
              </div>
              <span style={{ fontWeight: 600, color: p.amount > 0 ? '#22c55e' : '#ef4444' }}>
                {p.amount > 0 ? '+' : ''}R$ {Math.abs(p.amount).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Modal Saque */}
      {showWithdraw && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={() => setShowWithdraw(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', zIndex: 100000, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Solicitar Saque</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
              Saldo disponível: <strong>R$ {(wallet?.balance || 0).toFixed(2).replace('.', ',')}</strong>
            </p>
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="Valor do saque"
              style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowWithdraw(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleWithdraw} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Sacar</button>
            </div>
          </div>
        </>
      )}

      {/* Modal PIX */}
      {showPixEdit && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={() => setShowPixEdit(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', zIndex: 100000, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Chave PIX</h3>
            <input
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              placeholder="CPF, telefone, email ou chave aleatória"
              style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowPixEdit(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSavePix} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#0d9488', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default WalletPage;
