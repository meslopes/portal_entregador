import React, { useState, useEffect } from 'react';
import {
  CreditCard, Users, DollarSign, AlertCircle, CheckCircle,
  Star, Truck, Phone, Mail, Send, Filter
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminDriverPaymentsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}/api/admin/driver-payments`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (driverId) => {
    if (!window.confirm('Confirmar pagamento para este entregador?')) return;
    try {
      setPaying(driverId);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com'}/api/admin/driver-payments/${driverId}/pay`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        loadData();
      } else {
        alert(result.error || 'Erro ao processar pagamento');
      }
    } catch (err) {
      alert('Erro ao processar pagamento');
    } finally {
      setPaying(null);
    }
  };

  const filtered = data?.drivers?.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Pagamentos aos Entregadores</h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Controle de pagamentos pendentes</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={22} /></div>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Total Pendente</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(data?.total_pending || 0)}</p>
            </div>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={22} /></div>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Entregadores com Pendência</p>
              <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{data?.total_drivers || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <input type="text" placeholder="Buscar entregador..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* Lista */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }} className="table-header">
          <span>Entregador</span><span style={{ textAlign: 'center' }}>Entregas</span><span style={{ textAlign: 'center' }}>Avaliação</span><span style={{ textAlign: 'center' }}>Pagamentos</span><span style={{ textAlign: 'right' }}>Valor Pendente</span><span style={{ textAlign: 'center' }}>Ação</span>
        </div>
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Nenhum entregador com pendência</p>
        ) : (
          filtered.map(driver => (
            <div key={driver.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', padding: '1rem 1.25rem', borderBottom: '1px solid #f8fafc', alignItems: 'center' }} className="table-row">
              <div>
                <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{driver.name}</p>
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{driver.email}</p>
                {driver.pix_key && <p style={{ fontSize: '0.625rem', color: '#0d9488' }}>PIX: {driver.pix_key}</p>}
              </div>
              <span style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>{driver.total_deliveries}</span>
              <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                {driver.rating ? <><Star size={14} fill="#f59e0b" stroke="#f59e0b" /> <span style={{ fontSize: '0.8125rem' }}>{driver.rating}</span></> : <span style={{ color: '#94a3b8' }}>-</span>}
              </span>
              <span style={{ textAlign: 'center' }}>
                <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>
                  {driver.pending_payments}
                </span>
              </span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626', fontSize: '0.9375rem' }}>
                {utils.formatCurrency(driver.pending_amount)}
              </span>
              <div style={{ textAlign: 'center' }}>
                <button onClick={() => handlePay(driver.id)} disabled={paying === driver.id || driver.pending_amount === 0} style={{
                  padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none',
                  background: driver.pending_amount > 0 ? '#22c55e' : '#e2e8f0',
                  color: driver.pending_amount > 0 ? 'white' : '#94a3b8',
                  fontSize: '0.75rem', fontWeight: 600, cursor: driver.pending_amount > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
                }}>
                  {paying === driver.id ? '...' : <><Send size={12} /> Pagar</>}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .table-header { display: grid; }
        .table-row:hover { background: #f8fafc; }
        @media (max-width: 768px) { .table-header { display: none; } .table-row { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default AdminDriverPaymentsPage;
