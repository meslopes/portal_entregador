import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from './own-driver-routes/PageHeader';
import RouteCard from './own-driver-routes/RouteCard';
import DeliveryConfirmationModal from './own-driver-routes/DeliveryConfirmationModal';

const OwnDriverRoutesPage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const prevPendingCount = useRef(0);
  const audioContextRef = useRef(null);
  const audioEnabledRef = useRef(false);

  // Estado do modal de entrega via rota
  const [deliveryModal, setDeliveryModal] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [proofPhoto, setProofPhoto] = useState(null);
  const [delivering, setDelivering] = useState(false);

  // Habilitar áudio após primeira interação do usuário
  useEffect(() => {
    const enableAudio = () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        audioEnabledRef.current = true;
      } catch (e) {}
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });

    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, []);

  // Auto-refresh a cada 15 segundos
  useEffect(() => {
    loadRoutes();
    const interval = setInterval(() => loadRoutes(true), 15000);
    return () => clearInterval(interval);
  }, []);

  // Tocar som quando novas rotas pendentes aparecem
  useEffect(() => {
    const newPending = routes.filter(r => r.status === 'PENDING').length;
    if (newPending > prevPendingCount.current && prevPendingCount.current > 0) {
      playNotification();
    }
    prevPendingCount.current = newPending;
    setPendingCount(newPending);
  }, [routes]);

  const playNotification = () => {
    try {
      if (audioEnabledRef.current && audioContextRef.current) {
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1000;
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.5, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.3);
        }, 350);
      }

      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (e) {
      // Silenciar erro de áudio
    }
  };

  const loadRoutes = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get('/api/routes/own-driver/active', { headers });
      const allRoutes = res.data.routes || [];
      const activeRoutes = allRoutes.filter(route => {
        if (route.status === 'COMPLETED') return false;
        if (route.stops && route.stops.length > 0) {
          const allDone = route.stops.every(s => s.status === 'COMPLETED');
          if (allDone) return false;
        }
        return true;
      });
      setRoutes(activeRoutes);
    } catch (err) {
      console.error('Erro ao carregar rotas:', err);
      if (!isRefresh) setError('Erro ao carregar rotas');
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const acceptRoute = async (routeId) => {
    try {
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/routes/${routeId}/accept`, {}, { headers });
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao aceitar rota');
    }
  };

  const rejectRoute = async (routeId) => {
    if (!window.confirm('Tem certeza que deseja rejeitar esta rota? O estabelecimento será notificado.')) return;
    try {
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      await api.post(`/api/routes/${routeId}/reject`, {}, { headers });
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao rejeitar rota');
    }
  };

  const handleDeliverStop = (routeId, stop) => {
    setDeliveryModal({
      routeId,
      stopId: stop.id,
      orderId: stop.order_id,
      orderNumber: stop.order_number || stop.order_id,
      deliveryCode: stop.delivery_code || null,
      pickupCode: stop.pickup_code || null,
    });
    setCodeInput('');
    setProofPhoto(null);
  };

  const confirmDelivery = async () => {
    if (!deliveryModal) return;
    try {
      setDelivering(true);
      setError('');
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };

      let locationData = {};
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        locationData = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) { /* Sem GPS */ }

      const payload = { status: 'DELIVERED', ...locationData };

      if (deliveryModal.deliveryCode) {
        if (!codeInput) {
          setError('Informe o código de entrega');
          setDelivering(false);
          return;
        }
        payload.delivery_code = codeInput;
      }

      if (proofPhoto) {
        payload.proof_of_delivery = proofPhoto;
      }

      await api.put(`/api/own-driver/orders/${deliveryModal.orderId}/status`, payload, { headers });
      setDeliveryModal(null);
      setCodeInput('');
      setProofPhoto(null);
      loadRoutes();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao concluir entrega');
    } finally {
      setDelivering(false);
    }
  };

  const handleTakePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => setProofPhoto(ev.target.result);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <PageHeader pendingCount={pendingCount} onBack={() => navigate('/own-driver')} />

      <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : routes.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '2rem',
            textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <Route size={40} style={{ color: '#64748b', marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, color: '#1e293b' }}>Nenhuma rota ativa</p>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
              Quando você tiver múltiplos pedidos, eles serão agrupados em uma rota.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {routes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                onAccept={acceptRoute}
                onReject={rejectRoute}
                onDeliverStop={handleDeliverStop}
              />
            ))}
          </div>
        )}
      </div>

      <DeliveryConfirmationModal
        deliveryModal={deliveryModal}
        codeInput={codeInput}
        onCodeInputChange={setCodeInput}
        proofPhoto={proofPhoto}
        onRemovePhoto={() => setProofPhoto(null)}
        onTakePhoto={handleTakePhoto}
        onConfirm={confirmDelivery}
        delivering={delivering}
        onClose={() => setDeliveryModal(null)}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes ring {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default OwnDriverRoutesPage;
