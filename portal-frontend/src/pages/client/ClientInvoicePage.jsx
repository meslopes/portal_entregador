import React, { useState, useEffect } from 'react';
import {
  Receipt, Calendar, Download, AlertCircle, CheckCircle,
  Clock, Package, DollarSign, CreditCard, Copy, Check
} from 'lucide-react';
import { orderService, utils } from '@/lib/api';

const ClientInvoicePage = () => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');

  useEffect(() => {
    // Define semana atual
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    setWeekStart(start.toISOString().split('T')[0]);
    setWeekEnd(end.toISOString().split('T')[0]);
  }, []);

  const generateInvoice = async () => {
    if (!weekStart || !weekEnd) return;
    try {
      setLoading(true);
      setError('');
      // Precisa do restaurant_id - vamos buscar dos dados do usuario
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Busca o restaurant_id atraves do perfil do cliente
      const API_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';
      const profileRes = await fetch(`${API_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profileData = await profileRes.json();

      // O restaurant_id vem do perfil do usuario logado
      const establishment = profileData.restaurant || profileData.customer?.restaurant;

      if (!establishment) {
        setError('Estabelecimento não encontrado');
        return;
      }

      const data = await orderService.generateInvoice(establishment.id, weekStart, weekEnd);
      setInvoice(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar fatura');
    } finally {
      setLoading(false);
    }
  };

  const copyPixKey = () => {
    if (invoice?.payment?.pix_key) {
      navigator.clipboard.writeText(invoice.payment.pix_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Faturas</h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gere e visualize suas faturas de pagamento</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Gerador de fatura */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={18} style={{ color: '#0d9488' }} />
          <span style={{ fontWeight: 600, color: '#1e293b' }}>Gerar Fatura Semanal</span>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Data Início</label>
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Data Fim</label>
              <input type="date" value={weekEnd} onChange={e => setWeekEnd(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button onClick={generateInvoice} disabled={loading} style={{
              padding: '0.625rem 1.5rem', borderRadius: '0.5rem', border: 'none',
              background: '#0d9488', color: 'white', fontSize: '0.875rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
            }}>
              {loading ? 'Gerando...' : 'Gerar Fatura'}
            </button>
          </div>
        </div>
      </div>

      {/* Fatura gerada */}
      {invoice && (
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {/* Header da fatura */}
          <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', padding: '1.5rem', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>FATURA</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{invoice.invoice_number}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Período</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{invoice.period.start} a {invoice.period.end}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Empresa</p>
                <p style={{ fontSize: '1rem', fontWeight: 600 }}>{invoice.restaurant.name}</p>
                {invoice.restaurant.cnpj && <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>CNPJ: {invoice.restaurant.cnpj}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Valor Total</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{utils.formatCurrency(invoice.summary.total_delivery_fees)}</p>
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <Package size={20} style={{ color: '#0d9488', marginBottom: '0.25rem' }} />
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{invoice.summary.total_orders}</p>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Entregas</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <DollarSign size={20} style={{ color: '#0d9488', marginBottom: '0.25rem' }} />
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(invoice.summary.total_amount)}</p>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Total Pedidos</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f0fdfa', borderRadius: '0.5rem', border: '1px solid #99f6e4' }}>
              <CreditCard size={20} style={{ color: '#0d9488', marginBottom: '0.25rem' }} />
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0d9488' }}>{utils.formatCurrency(invoice.summary.total_delivery_fees)}</p>
              <p style={{ fontSize: '0.6875rem', color: '#0d9488' }}>Frete Total</p>
            </div>
          </div>

          {/* QR Code + Pagamento */}
          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
            {/* QR Code */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Escaneie para pagar</p>
              {invoice.qr_code_base64 && (
                <div style={{ display: 'inline-block', padding: '0.75rem', background: 'white', borderRadius: '0.75rem', border: '2px solid #e2e8f0' }}>
                  <img src={`data:image/png;base64,${invoice.qr_code_base64}`} alt="QR Code PIX" style={{ width: '200px', height: '200px' }} />
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>PIX Copia e Cola</p>
            </div>

            {/* Dados de pagamento */}
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Dados para Pagamento</p>
              <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Banco</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{invoice.payment.bank_name || '-'}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Agência</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{invoice.payment.bank_agency || '-'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Conta</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{invoice.payment.bank_account || '-'}</p>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Chave PIX</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', flex: 1, wordBreak: 'break-all' }}>{invoice.payment.pix_key || '-'}</p>
                    <button onClick={copyPixKey} style={{ border: 'none', background: copied ? '#dcfce7' : '#f1f5f9', borderRadius: '0.375rem', padding: '0.375rem', cursor: 'pointer', color: copied ? '#16a34a' : '#64748b' }}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem', borderLeft: '3px solid #f59e0b' }}>
                <p style={{ fontSize: '0.8125rem', color: '#92400e' }}>
                  <strong>Valor a pagar: {utils.formatCurrency(invoice.payment.amount)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Detalhes dos pedidos */}
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalhes das Entregas</p>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.5rem 1rem', background: '#f8fafc', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                <span>Pedido</span><span>Data</span><span style={{ textAlign: 'right' }}>Total</span><span style={{ textAlign: 'right' }}>Frete</span>
              </div>
              {invoice.orders?.map((order, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '0.5rem 1rem', borderBottom: i < invoice.orders.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#1e293b', fontWeight: 500 }}>#{order.order_number}</span>
                  <span style={{ color: '#64748b' }}>{order.date}</span>
                  <span style={{ textAlign: 'right', color: '#1e293b' }}>{utils.formatCurrency(order.amount)}</span>
                  <span style={{ textAlign: 'right', color: '#0d9488', fontWeight: 600 }}>{utils.formatCurrency(order.delivery_fee)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientInvoicePage;
