import React, { useState, useEffect } from 'react';
import { Link2, RefreshCw, Copy, MessageCircle, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { showToast } from '@/components/Toast.utils';

/**
 * Link de Pedido Rápido (§7.2 EE) — o estabelecimento gera o link e
 * compartilha no WhatsApp; o cliente faz o pedido sem instalar nada.
 */
const ClientOrderLinkPage = () => {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/order-link');
      setDados(res.data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao carregar o link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const gerar = async () => {
    try {
      setGerando(true);
      const res = await api.post('/api/order-link');
      setDados(res.data);
      showToast('Link gerado!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao gerar o link', 'error');
    } finally {
      setGerando(false);
    }
  };

  const urlCompleta = dados?.order_link_path ? window.location.origin + dados.order_link_path : '';

  const mensagem = `Olá! Faça seu pedido pelo link:${'\n'}${urlCompleta}`;

  const copiar = () => {
    navigator.clipboard.writeText(mensagem).then(() => showToast('Mensagem copiada!', 'success'))
      .catch(() => showToast('Erro ao copiar', 'error'));
  };

  const whatsapp = () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(mensagem), '_blank');
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link2 size={26} /> Link de Pedido Rápido
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Compartilhe o link no WhatsApp — o cliente abre e faz o pedido sem instalar nada.
        </p>
      </div>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0d9488' }} />
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {dados?.order_link_path ? (
            <>
              <div style={{ padding: '1rem', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '0.5rem', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 600, marginBottom: '0.5rem' }}>SEU LINK DE PEDIDOS</p>
                <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', wordBreak: 'break-all', color: '#0f766e', margin: 0 }}>{urlCompleta}</p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={whatsapp} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#25d366', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  <MessageCircle size={16} /> Compartilhar no WhatsApp
                </button>
                <button onClick={copiar} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <Copy size={16} /> Copiar mensagem
                </button>
                <button onClick={gerar} disabled={gerando} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer', color: '#b45309' }}>
                  <RefreshCw size={16} /> {gerando ? 'Gerando...' : 'Gerar novo link'}
                </button>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', lineHeight: 1.6 }}>
                <CheckCircle size={12} style={{ verticalAlign: 'middle' }} /> Ao gerar um novo link, o anterior deixa de funcionar.
                Os pedidos feitos pelo link aparecem na sua lista de pedidos normalmente.
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>{dados?.message || 'Nenhum link gerado ainda.'}</p>
              <button onClick={gerar} disabled={gerando} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', background: '#0d9488', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}>
                {gerando ? 'Gerando...' : 'Gerar link de pedidos'}
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ClientOrderLinkPage;
