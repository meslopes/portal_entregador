import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';

const AdminWithdrawalsPage = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadWithdrawals(); }, []);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/withdrawals');
      setWithdrawals(response.data.withdrawals || []);
    } catch (err) {
      setError('Erro ao carregar saques');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id, action) => {
    try {
      await api.post(`/api/admin/withdrawals/${id}/process`, { action });
      setSuccess(action === 'approve' ? 'Saque aprovado!' : 'Saque rejeitado!');
      loadWithdrawals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar');
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
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Saques Pendentes</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Processe as solicitações de saque dos entregadores</p>
        </div>
        <button onClick={loadWithdrawals} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

      {withdrawals.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <DollarSign size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Nenhuma solicitação de saque pendente</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {withdrawals.map(w => (
            <div key={w.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{w.driver_name}</span>
                    <span style={{ padding: '0.125rem 0.5rem', background: '#fef3c7', borderRadius: '9999px', fontSize: '0.625rem', color: '#d97706', fontWeight: 600 }}>Pendente</span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{w.driver_email}</p>
                  {w.pix_key && (
                    <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <strong>PIX:</strong> {w.pix_key}
                    </p>
                  )}
                  <p style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                    {w.created_at ? new Date(w.created_at + 'Z').toLocaleString('pt-BR') : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                    R$ {(w.amount || 0).toFixed(2).replace('.', ',')}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleProcess(w.id, 'reject')}
                      style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #ef4444', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}
                    >
                      <XCircle size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                      Rejeitar
                    </button>
                    <button
                      onClick={() => handleProcess(w.id, 'approve')}
                      style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                    >
                      <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                      Aprovar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminWithdrawalsPage;
