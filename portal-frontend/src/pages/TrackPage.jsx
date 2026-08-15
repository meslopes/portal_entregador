import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package, CheckCircle, Clock, Truck, MapPin, Store, User } from 'lucide-react';
import api from '@/lib/api';

const statusConfig = {
  SCHEDULED: { color: '#6366f1', icon: Clock, label: 'Pedido criado' },
  PENDING: { color: '#f59e0b', icon: Clock, label: 'Aguardando entregador' },
  ACCEPTED: { color: '#2563eb', icon: CheckCircle, label: 'Aceito por entregador' },
  PREPARING: { color: '#8b5cf6', icon: Package, label: 'Em preparo' },
  READY: { color: '#06b6d4', icon: CheckCircle, label: 'Pronto para coleta' },
  PICKED_UP: { color: '#f59e0b', icon: Truck, label: 'Coletado' },
  DELIVERED: { color: '#22c55e', icon: CheckCircle, label: 'Entregue' },
  CANCELLED: { color: '#ef4444', icon: Package, label: 'Cancelado' },
};

const TrackPage = () => {
  const { token } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTracking();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadTracking, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const loadTracking = async () => {
    try {
      const response = await api.get(`/api/orders/track/${token}`);
      setTracking(response.data);
      setError('');
    } catch (err) {
      setError('Pedido não encontrado');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <Package size={48} style={{ color: '#64748b', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>{error}</h2>
          <p style={{ color: '#64748b' }}>Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[tracking.status] || statusConfig.PENDING;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '1.5rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo-muvy.jpg" alt="muv.log" style={{ height: '60px', borderRadius: '0.5rem', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Rastreio de Pedido</h1>
        </div>

        {/* Card principal */}
        <div style={{ background: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {/* Status atual */}
          <div style={{ padding: '1.5rem', background: `linear-gradient(135deg, ${currentStatus.color}10, ${currentStatus.color}05)`, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${currentStatus.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <currentStatus.icon size={24} style={{ color: currentStatus.color }} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Status atual</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, color: currentStatus.color }}>{currentStatus.label}</p>
              </div>
            </div>
          </div>

          {/* Informações do pedido */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pedido</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>#{tracking.order_number}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Estabelecimento</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{tracking.restaurant_name}</p>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Progresso</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tracking.timeline?.map((step, index) => {
                  const stepConfig = statusConfig[step.status];
                  const isActive = tracking.status === step.status;
                  const isPast = tracking.timeline.findIndex(s => s.status === tracking.status) > index;
                  
                  return (
                    <div key={step.status} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: isPast || isActive ? stepConfig.color : '#e2e8f0',
                        border: isActive ? `2px solid ${stepConfig.color}` : 'none',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: isActive ? 600 : 400, color: isPast || isActive ? '#1e293b' : '#64748b' }}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Localização do entregador */}
            {tracking.driver_location && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Truck size={16} style={{ color: '#2563eb' }} />
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>Entregador a caminho</p>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {tracking.driver_location.name} • {tracking.driver_location.vehicle_type}
                </p>
              </div>
            )}

            {/* Bairro de entrega */}
            {tracking.delivery_neighborhood && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} style={{ color: '#64748b' }} />
                <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Entrega em: {tracking.delivery_neighborhood}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Atualização automática a cada 30 segundos
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default TrackPage;
