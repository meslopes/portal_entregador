import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, Clock, DollarSign, Store, User, Phone,
  AlertCircle, Navigation, CheckCircle, ArrowRight, ChevronRight,
  Camera, Image, X, ExternalLink
} from 'lucide-react';
import { orderService, utils } from '@/lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para icones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STATUS_FLOW = [
  { key: 'ACCEPTED', label: 'Aceito', icon: CheckCircle },
  { key: 'PREPARING', label: 'Preparando', icon: Package },
  { key: 'READY', label: 'Pronto', icon: CheckCircle },
  { key: 'PICKED_UP', label: 'Coletado', icon: Navigation },
  { key: 'DELIVERED', label: 'Entregue', icon: MapPin },
];

const STATUS_ACTIONS = {
  ACCEPTED: { label: 'Cheguei ao Restaurante', next: 'PREPARING', color: '#f59e0b' },
  PREPARING: { label: 'Pedido Pronto para Retirada', next: 'READY', color: '#8b5cf6', waitMsg: 'Aguardando restaurante preparar...' },
  READY: { label: 'Coletar Pedido', next: 'PICKED_UP', color: '#2563eb' },
  PICKED_UP: { label: 'Entregar Pedido', next: 'DELIVERED', color: '#22c55e' },
};

const ActiveDeliveryPage = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [proofPhoto, setProofPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapTarget, setMapTarget] = useState(null); // 'restaurant' or 'customer'
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const isMounted = useRef(true);

  // Funcao para abrir navegacao externa (Google Maps/Waze)
  const openNavigation = (lat, lng, label) => {
    if (!lat || !lng) {
      // Se nao tem coordenadas, abre busca por endereco
      const address = mapTarget === 'restaurant' ? order?.restaurant?.address : order?.delivery_address?.street;
      if (address) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
      }
      return;
    }
    // Abre Google Maps com as coordenadas
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // Funcao para calcular distancia (Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    isMounted.current = true;
    loadCurrentOrder();
    return () => { isMounted.current = false; };
  }, []);

  const loadCurrentOrder = async () => {
    try {
      setIsLoading(true);
      const response = await orderService.getCurrentOrder();
      if (!isMounted.current) return;
      if (response.order) {
        setOrder(response.order);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Erro ao carregar pedido:', err);
      const msg = err.response?.data?.error || err.message || 'Erro ao carregar pedido';
      setError(msg);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!order || isUpdating) return;

    const action = STATUS_ACTIONS[order.status];
    if (!action) return;

    // Se for entrega, pede foto
    if (action.next === 'DELIVERED' && !proofPhoto) {
      setShowCamera(true);
      return;
    }

    try {
      setIsUpdating(true);
      setError('');

      const payload = { status: action.next };
      if (action.next === 'DELIVERED' && proofPhoto) {
        payload.proof_of_delivery = proofPhoto;
      }

      const response = await orderService.updateOrderStatus(order.id, action.next, payload);

      // Atualiza o status localmente
      setOrder(prev => prev ? { ...prev, status: action.next } : prev);

      // Se entregue, redireciona para o dashboard
      if (action.next === 'DELIVERED') {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Erro ao atualizar status:', err);
      const msg = err.response?.data?.error || err.message || 'Erro ao atualizar status';
      setError(msg);
    } finally {
      if (isMounted.current) setIsUpdating(false);
    }
  };

  // Funcoes de camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Erro ao acessar camera:', err);
      setError('Não foi possível acessar a câmera');
    }
  };

  useEffect(() => {
    if (showCamera && !previewUrl) {
      startCamera();
    }
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [showCamera, previewUrl]);

  // Inicializa o mapa quando abre
  useEffect(() => {
    if (showMap && mapRef.current && !mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView([-29.95, -50.45], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);
      mapInstanceRef.current = map;

      // Aguarda um frame para o mapa renderizar
      setTimeout(() => map.invalidateSize(), 100);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap]);

  // Atualiza marcadores do mapa
  useEffect(() => {
    if (!mapInstanceRef.current || !order) return;

    const map = mapInstanceRef.current;
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Marcador do restaurante
    if (order.restaurant?.latitude && order.restaurant?.longitude) {
      const restaurantIcon = L.divIcon({
        html: '<div style="background:#f59e0b;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([order.restaurant.latitude, order.restaurant.longitude], { icon: restaurantIcon })
        .addTo(map)
        .bindPopup(`<b>${order.restaurant.name}</b><br>${order.restaurant.address}`);
    }

    // Marcador do cliente
    if (order.delivery_address?.latitude && order.delivery_address?.longitude) {
      const customerIcon = L.divIcon({
        html: '<div style="background:#22c55e;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([order.delivery_address.latitude, order.delivery_address.longitude], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`<b>${order.customer?.name}</b><br>${order.delivery_address.street}`);
    }

    // Ajusta zoom para mostrar ambos
    const bounds = [];
    if (order.restaurant?.latitude) bounds.push([order.restaurant.latitude, order.restaurant.longitude]);
    if (order.delivery_address?.latitude) bounds.push([order.delivery_address.latitude, order.delivery_address.longitude]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [showMap, order]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const url = canvas.toDataURL('image/jpeg', 0.8);
    setPreviewUrl(url);
    // Para o stream
    video.srcObject?.getTracks().forEach(t => t.stop());
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const confirmPhoto = () => {
    setProofPhoto(previewUrl);
    setShowCamera(false);
    setPreviewUrl(null);
  };

  const skipPhoto = () => {
    setShowCamera(false);
    setPreviewUrl(null);
    // Avanca sem foto
    handleAdvanceStatusSkip();
  };

  const handleAdvanceStatusSkip = async () => {
    if (!order || isUpdating) return;
    const action = STATUS_ACTIONS[order.status];
    if (!action) return;
    try {
      setIsUpdating(true);
      setError('');
      await orderService.updateOrderStatus(order.id, action.next, { status: action.next });
      setOrder(prev => prev ? { ...prev, status: action.next } : prev);
      if (action.next === 'DELIVERED') {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (!isMounted.current) return;
      setError(err.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      if (isMounted.current) setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '3rem', height: '3rem',
          border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  if (!order) return null;

  const currentStepIndex = STATUS_FLOW.findIndex(s => s.key === order.status);
  const action = STATUS_ACTIONS[order.status];
  const isDelivered = order.status === 'DELIVERED';

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
            padding: '0.25rem', display: 'flex'
          }}>
            ← Voltar
          </button>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Pedido #{order.order_number}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Acompanhe o andamento da entrega
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Status Steps */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          {/* Linha de fundo */}
          <div style={{
            position: 'absolute', top: '1.25rem', left: '2.5rem', right: '2.5rem',
            height: '3px', background: '#e2e8f0', zIndex: 0
          }} />
          {/* Linha progresso */}
          <div style={{
            position: 'absolute', top: '1.25rem', left: '2.5rem',
            width: `${(currentStepIndex / (STATUS_FLOW.length - 1)) * (100 - 12)}%`,
            height: '3px', background: '#2563eb', zIndex: 1,
            transition: 'width 0.5s ease'
          }} />

          {STATUS_FLOW.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem',
                  borderRadius: '50%',
                  background: isCompleted ? '#22c55e' : isCurrent ? '#2563eb' : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isCompleted || isCurrent ? 'white' : '#94a3b8',
                  transition: 'all 0.3s',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none'
                }}>
                  {isCompleted ? <CheckCircle size={18} /> : <StepIcon size={18} />}
                </div>
                <span style={{
                  fontSize: '0.6875rem',
                  marginTop: '0.5rem',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? '#1e293b' : '#94a3b8',
                  textAlign: 'center'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entrega concluída */}
      {isDelivered && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '4rem', height: '4rem',
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <CheckCircle size={32} style={{ color: 'white' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
            Entrega Concluída!
          </h2>
          <p style={{ color: '#16a34a', marginBottom: '1rem' }}>
            Parabéns! Sua entrega foi realizada com sucesso.
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>
            +{utils.formatCurrency(order.delivery?.driver_earnings || 0)}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#16a34a', marginTop: '0.25rem' }}>ganho nesta entrega</p>
        </div>
      )}

      {/* Botão de ação */}
      {action && !isDelivered && (
        <button
          onClick={handleAdvanceStatus}
          disabled={isUpdating}
          style={{
            width: '100%',
            padding: '1rem 1.5rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: action.color,
            color: 'white',
            fontSize: '1.0625rem',
            fontWeight: 700,
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            transition: 'all 0.15s',
            opacity: isUpdating ? 0.7 : 1,
            boxShadow: `0 4px 14px ${action.color}40`
          }}
        >
          {isUpdating ? (
            <>
              <div style={{
                width: '1.25rem', height: '1.25rem',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
              Atualizando...
            </>
          ) : (
            <>
              {action.label}
              <ArrowRight size={20} />
            </>
          )}
        </button>
      )}

      {/* Foto de prova preview */}
      {proofPhoto && !isDelivered && (
        <div style={{
          background: 'white', borderRadius: '0.75rem',
          padding: '1rem', marginBottom: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <div style={{ width: '4rem', height: '4rem', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0 }}>
            <img src={proofPhoto} alt="Prova" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Prova de entrega</p>
            <p style={{ fontSize: '0.75rem', color: '#16a34a' }}>Foto capturada ✓</p>
          </div>
          <button onClick={() => { setProofPhoto(null); setPreviewUrl(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Modal de Camera */}
      {showCamera && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', zIndex: 100, padding: '1rem'
        }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'white', fontSize: '1.125rem', fontWeight: 600 }}>Prova de Entrega</h3>
              <button onClick={() => { setShowCamera(false); setPreviewUrl(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'white' }}>
                <X size={24} />
              </button>
            </div>

            {/* Preview da foto */}
            {previewUrl ? (
              <div style={{ marginBottom: '1rem' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', borderRadius: '0.75rem', maxHeight: '60vh', objectFit: 'contain' }} />
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '0.75rem', background: '#000' }} />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Botoes */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              {!previewUrl ? (
                <>
                  <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: 'none', background: '#374151', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Image size={20} /> Galeria
                  </button>
                  <button onClick={takePhoto} style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Camera size={20} /> Tirar Foto
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setPreviewUrl(null); }} style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: 'none', background: '#374151', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }}>
                    Nova Foto
                  </button>
                  <button onClick={confirmPhoto} style={{ flex: 1, padding: '1rem', borderRadius: '0.5rem', border: 'none', background: '#22c55e', color: 'white', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} /> Confirmar
                  </button>
                </>
              )}
            </div>

            {/* Sem foto */}
            <button onClick={skipPhoto} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: '#9ca3af', fontSize: '0.8125rem', cursor: 'pointer', marginTop: '0.75rem' }}>
              Pular foto e entregar
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>
      )}

      {/* Mensagem de espera (PREPARING) */}
      {order.status === 'PREPARING' && (
        <div style={{
          background: '#faf5ff',
          border: '1px solid #e9d5ff',
          borderRadius: '0.5rem',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: '#7c3aed'
        }}>
          <Clock size={16} /> Aguardando restaurante preparar o pedido...
        </div>
      )}

      {/* Modal de Mapa */}
      {showMap && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', flexDirection: 'column', zIndex: 100
        }}>
          <div style={{
            padding: '1rem', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
            background: 'white'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
              {mapTarget === 'restaurant' ? 'Restaurante' : 'Cliente'}
            </h3>
            <button onClick={() => { setShowMap(false); setMapTarget(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={24} />
            </button>
          </div>
          <div ref={mapRef} style={{ flex: 1, minHeight: '400px' }} />
          <div style={{ padding: '1rem', background: 'white', display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => {
                const lat = mapTarget === 'restaurant' ? order.restaurant?.latitude : order.delivery_address?.latitude;
                const lng = mapTarget === 'restaurant' ? order.restaurant?.longitude : order.delivery_address?.longitude;
                openNavigation(lat, lng);
              }}
              style={{
                flex: 1, padding: '0.875rem', borderRadius: '0.5rem',
                border: 'none', background: '#2563eb', color: 'white',
                fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <Navigation size={18} /> Navegar
            </button>
            <button
              onClick={() => {
                const lat = mapTarget === 'restaurant' ? order.restaurant?.latitude : order.delivery_address?.latitude;
                const lng = mapTarget === 'restaurant' ? order.restaurant?.longitude : order.delivery_address?.longitude;
                const phone = mapTarget === 'restaurant' ? order.restaurant?.phone : order.customer?.phone;
                if (phone) window.open(`tel:${phone}`);
              }}
              style={{
                flex: 1, padding: '0.875rem', borderRadius: '0.5rem',
                border: '1.5px solid #e2e8f0', background: 'white', color: '#374151',
                fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              <Phone size={18} /> Ligar
            </button>
          </div>
        </div>
      )}

      {/* Info do Pedido */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem'
      }}>
        {/* Restaurante */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{
              width: '2.5rem', height: '2.5rem',
              borderRadius: '0.5rem',
              background: '#fef3c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Store size={16} style={{ color: '#d97706' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
                Coletar em
              </p>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
                {order.restaurant?.name}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {order.restaurant?.address}
              </p>
              {order.restaurant?.phone && (
                <a href={`tel:${order.restaurant.phone}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  fontSize: '0.8125rem', color: '#2563eb', marginTop: '0.375rem', textDecoration: 'none'
                }}>
                  <Phone size={12} /> Ligar
                </a>
              )}
            </div>
            <button
              onClick={() => { setMapTarget('restaurant'); setShowMap(true); }}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                color: '#2563eb'
              }}
            >
              <Navigation size={16} />
            </button>
          </div>
        </div>

        {/* Cliente */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{
              width: '2.5rem', height: '2.5rem',
              borderRadius: '0.5rem',
              background: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <MapPin size={16} style={{ color: '#16a34a' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
                Entregar em
              </p>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
                {order.customer?.name}
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {order.delivery_address?.street}{order.delivery_address?.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}
              </p>
              {order.customer?.phone && (
                <a href={`tel:${order.customer.phone}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  fontSize: '0.8125rem', color: '#2563eb', marginTop: '0.375rem', textDecoration: 'none'
                }}>
                  <Phone size={12} /> Ligar
                </a>
              )}
            </div>
            <button
              onClick={() => { setMapTarget('customer'); setShowMap(true); }}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                color: '#22c55e'
              }}
            >
              <Navigation size={16} />
            </button>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Valor Total</p>
              <p style={{ fontWeight: 700, color: '#1e293b' }}>{utils.formatCurrency(order.total_amount)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Seus Ganhos</p>
              <p style={{ fontWeight: 700, color: '#22c55e' }}>
                {utils.formatCurrency(order.delivery?.driver_earnings || 0)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Pagamento</p>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                {utils.getStatusText(order.payment_method)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Itens</p>
              <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                {order.items?.length || 0} ite{order.items?.length !== 1 ? 'ns' : 'm'}
              </p>
            </div>
          </div>

          {/* Itens */}
          {order.items && order.items.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '0.875rem',
              background: '#f8fafc',
              borderRadius: '0.5rem'
            }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                Itens do Pedido
              </p>
              {order.items.map((item, index) => (
                <div key={index} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '0.8125rem', color: '#64748b',
                  padding: '0.25rem 0'
                }}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>{utils.formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Instruções */}
          {order.special_instructions && (
            <div style={{
              marginTop: '1rem',
              background: '#fffbeb',
              borderLeft: '3px solid #f59e0b',
              padding: '0.75rem 1rem',
              borderRadius: '0 0.375rem 0.375rem 0',
              fontSize: '0.8125rem',
              color: '#92400e'
            }}>
              📝 {order.special_instructions}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ActiveDeliveryPage;
