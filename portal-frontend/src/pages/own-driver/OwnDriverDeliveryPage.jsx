import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { utils } from '@/lib/api';
import DeliverySteps from './own-driver-delivery/DeliverySteps';
import DeliveryOrderInfo from './own-driver-delivery/DeliveryOrderInfo';
import DeliveryProof from './own-driver-delivery/DeliveryProof';
import CodeModal from './own-driver-delivery/CodeModal';

const STATUS_FLOW = [
  { key: 'ACCEPTED', label: 'Aceito', next: 'PICKED_UP', nextLabel: 'Coletar Pedido' },
  { key: 'PICKED_UP', label: 'A Caminho', next: 'DELIVERED', nextLabel: 'Confirmar Entrega' },
];

const OwnDriverDeliveryPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [proofPhoto, setProofPhoto] = useState(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get(`/api/own-driver/orders?status=all`, { headers });
      const found = res.data.orders.find(o => o.id === parseInt(orderId));
      if (found) {
        setOrder(found);
      } else {
        setError('Pedido não encontrado');
      }
    } catch {
      setError('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (status) => {
    setNextStatus(status);
    if (status === 'PICKED_UP' && order.pickup_code) {
      setShowCodeModal(true);
    } else if (status === 'DELIVERED' && order.delivery_code) {
      setShowCodeModal(true);
    } else {
      confirmStatusUpdate(status);
    }
  };

  const confirmStatusUpdate = async (status, code) => {
    try {
      setUpdating(true);
      setError('');
      const token = localStorage.getItem('own_driver_token');
      const headers = { Authorization: `Bearer ${token}` };

      let locationData = {};
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        locationData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      } catch {
        // Sem localização
      }

      const payload = { status, ...locationData };
      if (code) {
        if (status === 'PICKED_UP') payload.pickup_code = code;
        if (status === 'DELIVERED') payload.delivery_code = code;
      }
      if (status === 'DELIVERED' && proofPhoto) {
        payload.proof_of_delivery = proofPhoto;
      }

      const res = await api.put(`/api/own-driver/orders/${orderId}/status`, payload, { headers });
      setOrder(res.data.order);
      setShowCodeModal(false);
      setCodeInput('');

      if (status === 'DELIVERED') {
        setTimeout(() => navigate('/own-driver'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      setUpdating(false);
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
        reader.onload = (ev) => {
          setProofPhoto(ev.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const openNavigation = () => {
    const addr = order.delivery_address;
    if (addr?.latitude && addr?.longitude) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        const useWaze = window.confirm('Abrir no Waze?\n\nCancelar = Google Maps');
        if (useWaze) {
          window.open(`https://www.waze.com/ul?ll=${addr.latitude},${addr.longitude}&navigate=yes`, '_blank');
        } else {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`, '_blank');
        }
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`, '_blank');
      }
    } else if (addr?.street) {
      const query = encodeURIComponent(`${addr.street}, ${addr.neighborhood || ''}, ${addr.city || ''}`);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <p style={{ color: '#64748b' }}>Pedido não encontrado</p>
      </div>
    );
  }

  const isDelivered = order.status === 'DELIVERED';
  const currentStep = STATUS_FLOW.find(s => s.key === order.status);
  const canAdvance = currentStep && !isDelivered;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        color: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <button onClick={() => navigate('/own-driver')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Pedido #{order.order_number}</h1>
          <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{utils.formatDateTime(order.created_at)}</p>
        </div>
      </header>

      <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        {/* Erro */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <DeliverySteps status={order.status} />

        <DeliveryOrderInfo
          order={order}
          isDelivered={isDelivered}
          onOpenNavigation={openNavigation}
        />

        {order.status === 'PICKED_UP' && (
          <DeliveryProof
            proofPhoto={proofPhoto}
            onTakePhoto={handleTakePhoto}
            onRemovePhoto={() => setProofPhoto(null)}
          />
        )}

        {/* Botão de Ação Principal */}
        {canAdvance && (
          <button
            onClick={() => handleStatusUpdate(currentStep.next)}
            disabled={updating}
            style={{
              width: '100%', padding: '1rem', borderRadius: '0.75rem',
              border: 'none', background: '#0d9488', color: 'white',
              fontSize: '1.125rem', fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer',
              opacity: updating ? 0.7 : 1, boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            {updating ? 'Atualizando...' : currentStep.nextLabel}
          </button>
        )}

        {isDelivered && (
          <div style={{
            background: '#dcfce7', borderRadius: '0.75rem', padding: '1.5rem',
            textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <CheckCircle size={40} style={{ color: '#22c55e', marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: '#166534' }}>Entrega Concluída!</p>
            <p style={{ fontSize: '0.875rem', color: '#15803d', marginTop: '0.25rem' }}>
              {order.delivery_time ? utils.formatDateTime(order.delivery_time) : 'Agora'}
            </p>
          </div>
        )}
      </div>

      {showCodeModal && (
        <CodeModal
          nextStatus={nextStatus}
          codeInput={codeInput}
          onCodeChange={setCodeInput}
          onConfirm={() => confirmStatusUpdate(nextStatus, codeInput)}
          onClose={() => { setShowCodeModal(false); setCodeInput(''); }}
          updating={updating}
        />
      )}
    </div>
  );
};

export default OwnDriverDeliveryPage;
