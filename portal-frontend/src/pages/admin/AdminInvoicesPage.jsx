import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, CheckCircle, Clock, AlertCircle, DollarSign, QrCode, ExternalLink, Bell } from 'lucide-react';
import api from '@/lib/api';
import DateRangeFilter from '@/components/DateRangeFilter';

const AdminInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [chargingId, setChargingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [paymentLinks, setPaymentLinks] = useState({});

  useEffect(() => { loadInvoices(); }, [filter]);
  useEffect(() => { if (dateRange) loadInvoices(); }, [dateRange]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter.toUpperCase());
      if (dateRange) {
        params.append('date_from', dateRange.startDate);
        params.append('date_to', dateRange.endDate);
      }
      const response = await api.get(`/api/admin/invoices?${params.toString()}`);
      setInvoices(response.data.invoices || []);
    } catch (err) {
      setError('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (period) => {
    try {
      setGenerating(true);
      let body = {};
      if (period === 'current_week') {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        body = {
          week_start: monday.toISOString().split('T')[0] + 'T00:00:00',
          week_end: sunday.toISOString().split('T')[0] + 'T23:59:59'
        };
      }
      const response = await api.post('/api/admin/invoices/generate', body);
      setSuccess(response.data.message + (response.data.skipped?.length ? ` (${response.data.skipped.length} já existentes)` : ''));
      loadInvoices();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar faturas');
    } finally {
      setGenerating(false);
    }
  };

  const handlePay = async (id) => {
    if (!confirm('Confirmar pagamento? Isso desbloqueará o saldo dos entregadores.')) return;
    try {
      const response = await api.post(`/api/admin/invoices/${id}/pay`);
      setSuccess(response.data.message);
      loadInvoices();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar pagamento');
    }
  };

  const handleCharge = async (id) => {
    if (!confirm('Gerar cobrança PIX no Asaas para esta fatura?')) return;
    try {
      setChargingId(id);
      setError('');
      const response = await api.post(`/api/admin/invoices/${id}/charge`);
      if (response.data.payment_url) {
        setPaymentLinks(prev => ({ ...prev, [id]: response.data.payment_url }));
        setSuccess('Cobrança PIX criada! Clique no link para copiar ou envie para o estabelecimento.');
      }
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar cobrança. Verifique se o Asaas está configurado.');
    } finally {
      setChargingId(null);
    }
  };

  const handleSendLink = async (id) => {
    const url = paymentLinks[id];
    if (!url) return;
    try {
      await api.post(`/api/admin/invoices/${id}/send-link`, { payment_url: url });
      setSuccess('Link de pagamento enviado para o estabelecimento!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar link.');
    }
  };

  const statusBadge = (status) => {
    const styles = {
      PENDING: { bg: '#fef3c7', color: '#d97706', label: 'Pendente' },
      PAID: { bg: '#dcfce7', color: '#166534', label: 'Paga' },
      OVERDUE: { bg: '#fef2f2', color: '#dc2626', label: 'Vencida' }
    };
    const s = styles[status] || styles.PENDING;
    return (
      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Faturas Semanais</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Faturas dos estabelecimentos por semana</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadInvoices} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button onClick={() => handleGenerate('previous_week')} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: generating ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, opacity: generating ? 0.7 : 1 }}>
            <FileText size={16} /> {generating ? 'Gerando...' : 'Gerar Semana Anterior'}
          </button>
          <button onClick={() => handleGenerate('current_week')} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#8b5cf6', color: 'white', cursor: generating ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, opacity: generating ? 0.7 : 1 }}>
            <FileText size={16} /> {generating ? 'Gerando...' : 'Gerar Semana Atual'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

      {/* Filtro de Datas */}
      <DateRangeFilter onChange={(range) => setDateRange(range)} />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['all', 'pending', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: filter === f ? '2px solid #2563eb' : '1px solid #e2e8f0', background: filter === f ? '#eff6ff' : 'white', color: filter === f ? '#2563eb' : '#64748b', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: filter === f ? 600 : 400 }}>
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Pagas'}
          </button>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <FileText size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Nenhuma fatura encontrada</p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>Clique em "Gerar Faturas" para criar faturas da semana anterior</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {invoices.map(inv => (
            <div key={inv.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${inv.status === 'PAID' ? '#22c55e' : '#f59e0b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{inv.restaurant_name}</span>
                    {statusBadge(inv.status)}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                    Semana: {new Date(inv.week_start + 'Z').toLocaleDateString('pt-BR')} a {new Date(inv.week_end + 'Z').toLocaleDateString('pt-BR')}
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                    {inv.deliveries_count} entregas
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                    R$ {inv.total_amount.toFixed(2).replace('.', ',')}
                  </p>
                  <p style={{ color: '#16a34a', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                    Entregadores: R$ {inv.driver_earnings.toFixed(2).replace('.', ',')}
                  </p>
                  {inv.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {paymentLinks[inv.id] ? (
                        <>
                          <a href={paymentLinks[inv.id]} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#8b5cf6', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
                            <ExternalLink size={14} /> Abrir Link
                          </a>
                          <button onClick={() => handleSendLink(inv.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#0ea5e9', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                            <Bell size={14} /> Enviar Link
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleCharge(inv.id)} disabled={chargingId === inv.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#8b5cf6', color: 'white', cursor: chargingId === inv.id ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 600, opacity: chargingId === inv.id ? 0.7 : 1 }}>
                          <QrCode size={14} /> {chargingId === inv.id ? 'Gerando...' : 'Gerar Cobrança PIX'}
                        </button>
                      )}
                      <button onClick={() => handlePay(inv.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                        <CheckCircle size={14} /> Marcar como Paga
                      </button>
                    </div>
                  )}
                  {inv.status === 'PAID' && inv.paid_at && (
                    <p style={{ color: '#16a34a', fontSize: '0.75rem' }}>
                      Paga em: {new Date(inv.paid_at + 'Z').toLocaleDateString('pt-BR')}
                    </p>
                  )}
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

export default AdminInvoicesPage;
