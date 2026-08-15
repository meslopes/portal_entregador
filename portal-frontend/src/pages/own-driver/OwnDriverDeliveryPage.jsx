import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Package, Truck, CheckCircle,
  Navigation, Camera, AlertCircle, Clock, Shield
} from 'lucide-react';
import api from '@/lib/api';
import { utils } from '@/lib/api';

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
    } catch (err) {
      setError('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (status) => {
    setNextStatus(status);
    // Se precisa de código, mostra modal
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

      // Obter localização
      let locationData = {};
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        locationData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
      } catch (e) {
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
      const url = `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`;
      window.open(url, '_blank');
    } else if (addr?.street) {
      const query = encodeURIComponent(`${addr.street}, ${addr.neighborhood || ''}, ${addr.city || ''}`);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
      window.open(url, '_blank');
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

        {/* Status Timeline */}
        <div style={{
          background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            {['ACCEPTED', 'PICKED_UP', 'DELIVERED'].map((status, i) => {
              const isActive = order.status === status;
              const isPast = ['ACCEPTED', 'PICKED_UP', 'DELIVERED'].indexOf(order.status) > i;
              return (
                <div key={status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1 }}>
                  <div style={{
                    width: '2rem', height: '2rem', borderRadius: '50%',
                    background: isPast ? '#22c55e' : isActive ? '#3b82f6' : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isPast || isActive ? 'white' : '#64748b', fontSize: '0.75rem', fontWeight: 600
                  }}>
                    {isPast ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span style={{ fontSize: '0.625rem', color: isPast || isActive ? '#1e293b' : '#64748b', marginTop: '0.25rem', fontWeight: isActive ? 600 : 400 }}>
                    {status === 'ACCEPTED' ? 'Aceito' : status === 'PICKED_UP' ? 'Coletado' : 'Entregue'}
                  </span>
                </div>
              );
            })}
            <div style={{ position: 'absolute', top: '1rem', left: '15%', right: '15%', height: '2px', background: '#e2e8f0', zIndex: 0 }}>
              <div style={{
                height: '100%', background: '#22c55e',
                width: order.status === 'ACCEPTED' ? '0%' : order.status === 'PICKED_UP' ? '50%' : '100%'
              }} />
            </div>
          </div>
        </div>

        {/* Códigos de Segurança */}
        {(order.pickup_code || order.delivery_code) && !isDelivered && (
          <div style={{
            background: '#fffbeb', borderRadius: '0.75rem', padding: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem',
            border: '1px solid #fde68a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Shield size={16} style={{ color: '#92400e' }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>Códigos de Segurança</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {order.pickup_code && order.status === 'ACCEPTED' && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.625rem', color: '#92400e', marginBottom: '0.125rem' }}>Coleta</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400e', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
                    {order.pickup_code}
                  </p>
                </div>
              )}
              {order.delivery_code && order.status === 'PICKED_UP' && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.625rem', color: '#92400e', marginBottom: '0.125rem' }}>Entrega</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400e', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
                    {order.delivery_code}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Restaurante (Coleta) */}
        {order.restaurant && (
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Coleta
            </p>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
              {order.restaurant.name}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <MapPin size={14} /> {order.restaurant.address}
            </p>
            {order.restaurant.phone && (
              <a
                href={`tel:${order.restaurant.phone}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  marginTop: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                  background: '#f0fdfa', color: '#0d9488', fontSize: '0.8125rem',
                  fontWeight: 500, textDecoration: 'none'
                }}
              >
                <Phone size={14} /> Ligar
              </a>
            )}
          </div>
        )}

        {/* Endereço de Entrega */}
        {order.delivery_address && (
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Entrega
            </p>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
              {order.customer?.name}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '0.375rem' }}>
              <MapPin size={14} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
              {order.delivery_address.street}, {order.delivery_address.neighborhood}
            </p>
            {order.customer?.phone && (
              <a
                href={`tel:${order.customer.phone}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  marginTop: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                  background: '#f0fdfa', color: '#0d9488', fontSize: '0.8125rem',
                  fontWeight: 500, textDecoration: 'none'
                }}
              >
                <Phone size={14} /> Ligar
              </a>
            )}

            {/* Botão Navegar */}
            <button
              onClick={openNavigation}
              style={{
                width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem',
                border: '1.5px solid #0d9488', background: 'white', color: '#0d9488',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <Navigation size={16} /> Abrir no Google Maps
            </button>
          </div>
        )}

        {/* Prova de Entrega (foto) */}
        {order.status === 'PICKED_UP' && (
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Prova de Entrega (Opcional)
            </p>
            {proofPhoto ? (
              <div style={{ position: 'relative' }}>
                <img src={proofPhoto} alt="Prova" style={{ width: '100%', borderRadius: '0.5rem', maxHeight: '200px', objectFit: 'cover' }} />
                <button
                  onClick={() => setProofPhoto(null)}
                  style={{
                    position: 'absolute', top: '0.5rem', right: '0.5rem',
                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                    color: 'white', width: '2rem', height: '2rem', cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={handleTakePhoto}
                style={{
                  width: '100%', padding: '1.5rem', borderRadius: '0.5rem',
                  border: '2px dashed #e2e8f0', background: '#f8fafc', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  color: '#64748b'
                }}
              >
                <Camera size={24} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Tirar Foto</span>
              </button>
            )}
          </div>
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

      {/* Modal de Código */}
      {showCodeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '1rem'
        }}>
          <div style={{
            background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
            width: '100%', maxWidth: '360px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem', textAlign: 'center' }}>
              {nextStatus === 'PICKED_UP' ? 'Código de Coleta' : 'Código de Entrega'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Peça o código ao {nextStatus === 'PICKED_UP' ? 'estabelecimento' : 'cliente'}
            </p>

            <input
              type="text"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              style={{
                width: '100%', padding: '1rem', borderRadius: '0.5rem',
                border: '2px solid #e2e8f0', fontSize: '2rem', textAlign: 'center',
                letterSpacing: '0.5rem', fontFamily: 'monospace', outline: 'none',
                boxSizing: 'border-box', marginBottom: '1rem'
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowCodeModal(false); setCodeInput(''); }}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0', background: 'white', color: '#475569',
                  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmStatusUpdate(nextStatus, codeInput)}
                disabled={codeInput.length !== 6 || updating}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                  border: 'none', background: codeInput.length === 6 ? '#0d9488' : '#64748b',
                  color: 'white', fontSize: '0.875rem', fontWeight: 600,
                  cursor: codeInput.length === 6 ? 'pointer' : 'not-allowed'
                }}
              >
                {updating ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnDriverDeliveryPage;
