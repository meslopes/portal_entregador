import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

/**
 * Link de Pedido Rápido (§7.2 EE) — página PÚBLICA.
 * O cliente abre o link compartilhado pelo estabelecimento (WhatsApp etc.)
 * e faz o pedido sem instalar nada.
 */
const OrderLinkPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState(null); // restaurant_name, city
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState(null); // order_number apos criar
  const [form, setForm] = useState({
    customer_name: '', phone: '', street: '', number: '',
    neighborhood: '', city: '', items: '', notes: '',
  });

  useEffect(() => {
    api.get(`/api/order-link/${token}`)
      .then(res => {
        if (res.data.valid) {
          setDados(res.data);
          if (res.data.city) setForm(p => ({ ...p, city: res.data.city }));
        } else {
          setErro('Este estabelecimento está inativo no momento.');
        }
      })
      .catch(err => setErro(err.response?.data?.error || 'Link inválido'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    if (!form.customer_name.trim() || !form.phone.trim() || !form.street.trim()) {
      setErro('Preencha nome, telefone e endereço'); return;
    }
    try {
      setEnviando(true);
      const res = await api.post(`/api/order-link/${token}`, form);
      setPedido(res.data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao enviar o pedido');
    } finally {
      setEnviando(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
    border: '1.5px solid #e2e8f0', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <ShoppingBag size={28} style={{ color: '#0d9488' }} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {dados ? dados.restaurant_name : 'Fazer pedido'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Preencha seus dados e envie o pedido
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0d9488' }} />
          </div>
        )}

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {erro}
          </div>
        )}

        {pedido && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
            <CheckCircle size={28} style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Pedido enviado!</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.375rem' }}>
              Número do pedido: <strong>#{pedido.seq_number ?? pedido.order_number}</strong>
            </div>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem', color: '#15803d' }}>
              {pedido.restaurant_name} já recebeu seu pedido.
            </div>
          </div>
        )}

        {!loading && dados && !pedido && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Seu nome *</label>
              <input style={inputStyle} value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Telefone *</label>
              <input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(51) 99999-9999" inputMode="tel" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Rua *</label>
                <input style={inputStyle} value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} placeholder="Rua das Flores" />
              </div>
              <div>
                <label style={labelStyle}>Número</label>
                <input style={inputStyle} value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} placeholder="123" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Bairro</label>
                <input style={inputStyle} value={form.neighborhood} onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))} placeholder="Centro" />
              </div>
              <div>
                <label style={labelStyle}>Cidade</label>
                <input style={inputStyle} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Cidade" />
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>O que você quer pedir?</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.items} onChange={e => setForm(p => ({ ...p, items: e.target.value }))} placeholder="Ex.: 2 pizzas grandes, 1 refrigerante" />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Observações</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ex.: sem cebola, entregar na portaria" />
            </div>
            <button type="submit" disabled={enviando} style={{
              width: '100%', padding: '0.875rem', borderRadius: '0.5rem', border: 'none',
              background: '#0d9488', color: 'white', fontSize: '1rem', fontWeight: 600,
              cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.7 : 1,
            }}>
              {enviando ? 'Enviando...' : 'Enviar pedido'}
            </button>
          </form>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default OrderLinkPage;
