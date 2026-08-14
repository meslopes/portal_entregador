import React, { useState, useEffect } from 'react';
import {
  X, Users, Send, Truck, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { orderService } from '@/lib/api';
import api from '@/lib/api';

const DistributionModal = ({ order, onClose, onDistributed }) => {
  const [ownDrivers, setOwnDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [callingPlatform, setCallingPlatform] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  useEffect(() => {
    const loadOwnDrivers = async () => {
      try {
        const userRes = await api.get('/api/user/profile');
        const restaurantId = userRes.data.restaurant_id;
        if (restaurantId) {
          const res = await api.get(`/api/admin/establishment-drivers?restaurant_id=${restaurantId}`);
          const onlineDrivers = (res.data.drivers || []).filter(d => d.is_online && d.is_active);
          setOwnDrivers(onlineDrivers);
        }
      } catch (err) {
        console.error('Erro ao carregar entregadores próprios:', err);
      }
    };
    loadOwnDrivers();
  }, []);

  const handleAssignOwn = async () => {
    if (!selectedDriverId) return;
    try {
      setAssigning(true);
      setActionResult(null);
      const result = await orderService.assignOwnDriver(order.id, parseInt(selectedDriverId));
      setActionResult({ type: 'success', message: result.message });
      setTimeout(() => onDistributed?.(), 1500);
    } catch (err) {
      setActionResult({ type: 'error', message: err.response?.data?.error || 'Erro ao atribuir entregador' });
    } finally {
      setAssigning(false);
    }
  };

  const handleCallPlatform = async () => {
    try {
      setCallingPlatform(true);
      setActionResult(null);
      const result = await orderService.callPlatformDrivers(order.id);
      setActionResult({
        type: result.driver_name ? 'success' : 'warning',
        message: result.message
      });
      setTimeout(() => onDistributed?.(), 1500);
    } catch (err) {
      setActionResult({ type: 'error', message: err.response?.data?.error || 'Erro ao chamar plataforma' });
    } finally {
      setCallingPlatform(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem'
    }} role="dialog" aria-modal="true" aria-label="Distribuir Pedido">
      <div style={{
        background: 'white', borderRadius: '0.75rem', width: '100%',
        maxWidth: '460px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
              Distribuir Pedido
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              #{order.order_number}
            </p>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: '1.25rem', padding: '0.25rem'
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Info do pedido */}
          <div style={{
            padding: '0.875rem', borderRadius: '0.5rem',
            background: '#f0fdf4', border: '1px solid #86efac',
            marginBottom: '1.25rem', textAlign: 'center'
          }}>
            <CheckCircle size={24} style={{ color: '#22c55e', marginBottom: '0.375rem' }} />
            <p style={{ fontWeight: 600, color: '#166534', fontSize: '0.875rem' }}>
              Pedido criado com sucesso!
            </p>
            <p style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.25rem' }}>
              Escolha como distribuir a entrega
            </p>
          </div>

          {/* Resultado da ação */}
          {actionResult && (
            <div style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: actionResult.type === 'success' ? '#dcfce7' : actionResult.type === 'warning' ? '#fef3c7' : '#fef2f2',
              border: `1px solid ${actionResult.type === 'success' ? '#86efac' : actionResult.type === 'warning' ? '#fde68a' : '#fecaca'}`,
              color: actionResult.type === 'success' ? '#166534' : actionResult.type === 'warning' ? '#92400e' : '#dc2626'
            }}>
              {actionResult.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {actionResult.message}
            </div>
          )}

          {/* Entregador Próprio */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{
              fontSize: '0.75rem', fontWeight: 600, color: '#475569',
              marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem'
            }}>
              <Users size={14} style={{ color: '#2563eb' }} />
              Entregador Próprio
            </p>
            {ownDrivers.length > 0 ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={selectedDriverId}
                  onChange={e => setSelectedDriverId(e.target.value)}
                  style={{
                    flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                    border: '1.5px solid #e2e8f0', fontSize: '0.8125rem',
                    outline: 'none', background: 'white', color: '#1e293b'
                  }}
                >
                  <option value="">Selecione um entregador...</option>
                  {ownDrivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.vehicle_type === 'MOTO' ? '🏍️' : d.vehicle_type === 'BIKE' ? '🚲' : '🚗'} {d.vehicle_plate || ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignOwn}
                  disabled={!selectedDriverId || assigning}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                    background: selectedDriverId && !assigning ? '#2563eb' : '#94a3b8',
                    color: 'white', cursor: selectedDriverId && !assigning ? 'pointer' : 'not-allowed',
                    fontSize: '0.8125rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {assigning ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Users size={14} />}
                  Atribuir
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', padding: '0.5rem 0' }}>
                Nenhum entregador próprio online no momento.
              </p>
            )}
          </div>

          {/* Separador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>OU</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Chamar Plataforma */}
          <div>
            <p style={{
              fontSize: '0.75rem', fontWeight: 600, color: '#475569',
              marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem'
            }}>
              <Truck size={14} style={{ color: '#16a34a' }} />
              Plataforma MUV
            </p>
            <button
              onClick={handleCallPlatform}
              disabled={callingPlatform}
              style={{
                width: '100%', padding: '0.625rem 1rem', borderRadius: '0.5rem',
                border: '1.5px solid #0d9488', background: 'white',
                color: '#0d9488', cursor: callingPlatform ? 'not-allowed' : 'pointer',
                fontSize: '0.8125rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {callingPlatform ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={14} />}
              Chamar Entregador da Plataforma
            </button>
          </div>

          {/* Pular */}
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '0.625rem', borderRadius: '0.5rem',
              border: 'none', background: 'none', color: '#94a3b8',
              fontSize: '0.8125rem', cursor: 'pointer', marginTop: '0.75rem'
            }}
          >
            Distribuir depois
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DistributionModal;
