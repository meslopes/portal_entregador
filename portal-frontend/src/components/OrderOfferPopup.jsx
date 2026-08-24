import React, { useState, useEffect, useRef } from 'react';
import { Package, MapPin, DollarSign, Clock, CheckCircle, X, Navigation, Store } from 'lucide-react';
import api from '@/lib/api';
import { startSiren, stopSiren } from '@/lib/notify';

const OrderOfferPopup = () => {
  const [offer, setOffer] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    // Verificar ofertas a cada 5 segundos
    checkForOffers();
    pollRef.current = setInterval(checkForOffers, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      stopSiren();
    };
  }, []);

  const checkForOffers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Verificar se o usuario e um entregador
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      if (user.user_type !== 'DRIVER') return;

      // Verificar se o entregador está online antes de buscar pedidos
      if (user.user_type === 'DRIVER') {
        const isOnline = user.driver?.is_online;
        if (isOnline === false) return;
      }

      const response = await api.get('/api/orders/available');
      const orders = response.data.orders || [];

      // Verificar se ha algum pedido oferecido para este entregador
      // (nao ha como saber pelo backend, entao mostramos qualquer pedido disponivel)
      if (orders.length > 0 && !isVisible) {
        const order = orders[0]; // Mostrar o primeiro pedido disponivel
        setOffer(order);
        setIsVisible(true);
        setTimeLeft(60);
        startSiren();

        // Iniciar contagem regressiva
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              handleDismiss();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      // Silencioso
    }
  };

  const handleAccept = async () => {
    if (!offer || isAccepting) return;
    
    try {
      setIsAccepting(true);
      stopSiren();
      await api.post(`/api/orders/${offer.id}/accept`);
      setIsVisible(false);
      setOffer(null);
      if (timerRef.current) clearInterval(timerRef.current);
      // Redirecionar para a pagina de pedidos ativos
      window.location.href = `/delivery/${offer.id}`;
    } catch (err) {
      console.error('Erro ao aceitar pedido:', err);
      alert(err.response?.data?.error || 'Erro ao aceitar pedido');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDismiss = () => {
    stopSiren();
    setIsVisible(false);
    setOffer(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (!isVisible || !offer) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '1rem', padding: '1.5rem',
        maxWidth: '400px', width: '100%', position: 'relative',
        animation: 'pulse 0.5s ease-in-out infinite alternate'
      }}>
        {/* Botao fechar */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8'
          }}
        >
          <X size={20} />
        </button>

        {/* Icone de alerta */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: '#fef3c7', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 1rem',
          animation: 'bounce 0.5s ease-in-out infinite alternate'
        }}>
          <Package size={32} style={{ color: '#d97706' }} />
        </div>

        {/* Titulo */}
        <h2 style={{
          fontSize: '1.25rem', fontWeight: 700, color: '#1e293b',
          textAlign: 'center', marginBottom: '0.5rem'
        }}>
          Novo Pedido Disponivel!
        </h2>

        {/* Contagem regressiva */}
        <div style={{
          textAlign: 'center', marginBottom: '1rem',
          fontSize: '0.875rem', color: '#ef4444', fontWeight: 600
        }}>
          Tempo restante: {timeLeft}s
        </div>

        {/* Detalhes do pedido */}
        <div style={{
          background: '#f8fafc', borderRadius: '0.75rem',
          padding: '1rem', marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Store size={16} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>
              {offer.restaurant?.name || 'Restaurante'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <MapPin size={16} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {offer.delivery_address?.street || 'Endereco de entrega'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={16} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>
              R$ {(offer.delivery_fee || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Botoes */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleDismiss}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
              border: '1px solid #e2e8f0', background: 'white',
              color: '#64748b', cursor: 'pointer', fontSize: '0.875rem'
            }}
          >
            Rejeitar
          </button>
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            style={{
              flex: 2, padding: '0.75rem', borderRadius: '0.5rem',
              border: 'none', background: '#16a34a', color: 'white',
              cursor: isAccepting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            {isAccepting ? (
              'Aceitando...'
            ) : (
              <>
                <CheckCircle size={18} /> Aceitar Pedido
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.02); }
        }
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

export default OrderOfferPopup;
