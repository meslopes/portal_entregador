import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, CheckCircle, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import api, { utils } from '@/lib/api';

const PlatformInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/platform/billing/my-invoices');
      setInvoices(res.data.invoices || []);
      setTenantName(res.data.tenant_name || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const getStatusBadge = (status) => {
    const styles = {
      PAID: { bg: '#dcfce7', color: '#166534', label: 'Paga' },
      PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pendente' },
      OVERDUE: { bg: '#fef2f2', color: '#dc2626', label: 'Vencida' },
      CANCELLED: { bg: '#f1f5f9', color: '#64748b', label: 'Cancelada' },
    };
    const s = styles[status] || styles.PENDING;
    return (
      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: '#2563eb' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Faturas da Plataforma
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Cobranças da MuvLog para {tenantName || 'sua organização'}
          </p>
        </div>
        <button
          onClick={loadInvoices}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}
        >
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FileText size={18} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Total de Faturas</span>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{invoices.length}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={18} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Pagas</span>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
            {invoices.filter(i => i.status === 'PAID').length}
          </p>
        </div>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CreditCard size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Total Pendente</span>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
            {utils.formatCurrency(invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + (i.total_amount || 0), 0))}
          </p>
        </div>
      </div>

      {/* Tabela de faturas */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Histórico de Faturas</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Cobranças recorrentes da plataforma pelo uso do sistema</p>
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
            <p style={{ color: '#64748b', fontSize: '1rem' }}>Nenhuma fatura encontrada</p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              As faturas da plataforma aparecerão aqui quando forem geradas
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1.5rem' }}>Fatura</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Período</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Estabelecimentos</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pedidos</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Valor</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Vencimento</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, idx) => (
                  <tr key={inv.id} style={{ borderBottom: idx < invoices.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <td style={{ padding: '0.75rem 1.5rem', fontWeight: 600, color: '#1e293b' }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {inv.period_start?.split('T')[0]} — {inv.period_end?.split('T')[0]}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{inv.establishments_count}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{inv.orders_count}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                      {utils.formatCurrency(inv.total_amount)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {inv.due_date?.split('T')[0]}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {getStatusBadge(inv.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformInvoicesPage;
