import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Calendar, DollarSign, Users, CheckCircle,
  AlertCircle, Download, RefreshCw, Clock, TrendingDown
} from 'lucide-react';
import api from '@/lib/api';

const OverdueReportPage = () => {
  const [overdueData, setOverdueData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => { loadReport(); }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/finance/overdue-report');
      setOverdueData(res.data.overdue_restaurants || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
      setError('Erro ao carregar relatório de inadimplência');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckDueDates = async () => {
    try {
      setChecking(true);
      setError('');
      const res = await api.post('/api/finance/check-invoice-due-dates');
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 5000);
      loadReport();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao verificar vencimentos');
    } finally {
      setChecking(false);
    }
  };

  const formatCurrency = (value) => `R$ ${(value || 0).toFixed(2).replace('.', ',')}`;
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '-';
  
  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getOverdueColor = (days) => {
    if (days <= 7) return '#f59e0b';
    if (days <= 30) return '#f97316';
    return '#dc2626';
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Relatório de Inadimplência
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Faturas vencidas e estabelecimentos com pendências
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleCheckDueDates}
            disabled={checking}
            style={{
              padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
              border: '1.5px solid #e2e8f0', background: 'white',
              color: '#374151', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Verificando...' : 'Verificar Vencimentos'}
          </button>
          <button
            onClick={loadReport}
            style={{
              padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
              border: 'none', background: '#2563eb', color: 'white',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Atualizar
          </button>
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

      {/* Resumo */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', borderRadius: '0.75rem', padding: '1.25rem', color: 'white' }}>
            <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Total Inadimplente</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(summary.total_overdue)}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Estabelecimentos</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{summary.restaurants_count}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Faturas Vencidas</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{summary.invoices_count}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : overdueData.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <CheckCircle size={40} style={{ color: '#059669', marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhuma inadimplência!</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
            Todos os estabelecimentos estão com pagamentos em dia.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {overdueData.map(restaurant => (
            <div key={restaurant.restaurant_id} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              {/* Header do restaurante */}
              <div style={{ padding: '1rem 1.25rem', background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.125rem' }}>{restaurant.restaurant_name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#dc262620', color: '#dc2626' }}>
                        {restaurant.invoices.length} fatura(s) vencida(s)
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Mais antiga: {formatDate(restaurant.oldest_due)}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Vencido</p>
                    <p style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.5rem' }}>{formatCurrency(restaurant.total_overdue)}</p>
                  </div>
                </div>
              </div>

              {/* Lista de faturas */}
              <div style={{ padding: '1rem 1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b' }}>Fatura</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b' }}>Período</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>Vencimento</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>Dias Atrasado</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurant.invoices.map(invoice => {
                      const daysOverdue = getDaysOverdue(invoice.due_date);
                      return (
                        <tr key={invoice.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{invoice.invoice_number}</td>
                          <td style={{ padding: '0.5rem', color: '#64748b' }}>
                            {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>{formatDate(invoice.due_date)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '0.125rem 0.5rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.6875rem', 
                              fontWeight: 600, 
                              background: `${getOverdueColor(daysOverdue)}20`, 
                              color: getOverdueColor(daysOverdue) 
                            }}>
                              {daysOverdue} dia(s)
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                            {formatCurrency(invoice.total_amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OverdueReportPage;
