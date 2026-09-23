import React, { useState, useEffect } from 'react';
import { orderService, utils } from '@/lib/api';
import api from '@/lib/api';
import { showToast } from '@/components/Toast';

import EditOrderModal from './order-detail/EditOrderModal';
import OrderInfoSection from './order-detail/OrderInfoSection';
import StatusButtons from './order-detail/StatusButtons';
import DistributionSection from './order-detail/DistributionSection';

// ── main detail component ────────────────────────────────────────────────────

const ClientOrderDetail = ({ order, onClose, onOrderUpdated }) => {
  const [ownDrivers, setOwnDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [callingPlatform, setCallingPlatform] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

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
      setTimeout(() => onOrderUpdated(), 1500);
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
      setTimeout(() => onOrderUpdated(), 1500);
    } catch (err) {
      setActionResult({ type: 'error', message: err.response?.data?.error || 'Erro ao chamar plataforma' });
    } finally {
      setCallingPlatform(false);
    }
  };

  const handleEdit = async () => {
    try {
      setEditLoading(true);
      await api.put(`/api/orders/${order.id}/edit`, editForm);
      setShowEdit(false);
      onOrderUpdated();
      showToast('Pedido atualizado!', 'success');
    } catch (err) {
      showToast('Erro ao editar: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      customer_name: order.customer?.name || '',
      customer_phone: order.customer?.phone || '',
      delivery_address: order.delivery_address?.street || '',
      delivery_neighborhood: order.delivery_address?.neighborhood || '',
      delivery_city: order.delivery_address?.city || '',
      delivery_state: order.delivery_address?.state || '',
      special_instructions: order.special_instructions || ''
    });
    setShowEdit(true);
  };

  const isPending = order.status === 'PENDING' || order.status === 'SCHEDULED';
  const hasOwnDriver = order.assigned_to_own_driver;
  const calledPlatform = order.called_platform;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div role="dialog" aria-modal="true" aria-label={`Pedido #${order.order_number}`} style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Pedido #{order.order_number}</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{utils.formatDateTime(order.created_at)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {['SCHEDULED', 'PENDING', 'OFFERED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
              <button onClick={openEditModal} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #2563eb', background: 'white', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                ✏️ Editar
              </button>
            )}
            <button onClick={onClose} aria-label="Fechar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.25rem' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <OrderInfoSection order={order} />
          <StatusButtons order={order} onUpdated={onOrderUpdated} />

          <DistributionSection
            order={order}
            ownDrivers={ownDrivers}
            selectedDriverId={selectedDriverId}
            setSelectedDriverId={setSelectedDriverId}
            assigning={assigning}
            callingPlatform={callingPlatform}
            actionResult={actionResult}
            handleAssignOwn={handleAssignOwn}
            handleCallPlatform={handleCallPlatform}
            hasOwnDriver={hasOwnDriver}
            calledPlatform={calledPlatform}
            isPending={isPending}
          />
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <EditOrderModal
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
          loading={editLoading}
        />
      )}
    </div>
  );
};

export default ClientOrderDetail;
