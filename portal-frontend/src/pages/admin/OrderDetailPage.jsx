import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import api, { adminService, orderService, utils } from '@/lib/api';
import { showToast } from '@/components/Toast.utils';
import StatusActions from './order-detail/StatusActions';
import OrderTimeline from './order-detail/OrderTimeline';
import OrderInfoCards from './order-detail/OrderInfoCards';
import EditOrderModal from './order-detail/EditOrderModal';
import MapModal from './order-detail/MapModal';
import { parseSpecialInstructions } from './order-detail/utils';

const STATUS_CONFIG = {
  SCHEDULED: { color: '#6366f1', bg: '#e0e7ff', text: 'Agendado', icon: '⏰' },
  PENDING: { color: '#ef4444', bg: '#fee2e2', text: 'Tocando', icon: '🔔' },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito', icon: '✅' },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando', icon: '👨‍🍳' },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto', icon: '📦' },
  PICKED_UP: { color: '#f59e0b', bg: '#fef3c7', text: 'Coletado', icon: '🏍️' },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue', icon: '✅' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelado', icon: '❌' },
};

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [drivers, setDrivers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const loadOrder = useCallback(async () => {
    try {
      const response = await orderService.getOrderDetails(orderId);
      setOrder(response.order || response);
      setError('');
    } catch (err) {
      setError('Erro ao carregar pedido');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
    loadDrivers();
    const interval = setInterval(loadOrder, 10000);
    return () => clearInterval(interval);
  }, [loadOrder]);

  const loadDrivers = async () => {
    try {
      const response = await adminService.getDrivers(1, 100);
      const driversMap = {};
      (response.drivers || []).forEach(d => {
        driversMap[d.id] = d.user ? `${d.user.first_name} ${d.user.last_name}` : `Entregador #${d.id}`;
      });
      setDrivers(driversMap);
    } catch (err) {
      console.error('Erro ao carregar entregadores:', err);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      if (newStatus === 'CANCELLED') {
        const hasDriver = order.driver_id || order.establishment_driver_id;
        let refundDriver = false;
        let reason = '';

        if (hasDriver) {
          const confirmMsg = 'Deseja estornar o valor ao entregador?\n\n' +
            'Clique "OK" para estornar ou "Cancelar" para apenas cancelar o pedido.';
          refundDriver = window.confirm(confirmMsg);
        }

        reason = window.prompt('Motivo do cancelamento (opcional):') || '';

        await api.put(`/api/orders/${orderId}/cancel`, {
          refund_driver: refundDriver,
          reason: reason
        });
      } else {
        await orderService.updateOrderStatus(orderId, newStatus);
      }
      loadOrder();
    } catch (err) {
      showToast('Erro ao alterar status: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleEdit = async () => {
    try {
      setEditLoading(true);
      await api.put(`/api/orders/${orderId}/edit`, editForm);
      setShowEdit(false);
      loadOrder();
      showToast('Pedido atualizado com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao editar pedido: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = () => {
    if (!order) return;
    setEditForm({
      customer_name: order.customer?.name || '',
      customer_phone: order.customer?.phone || '',
      delivery_address: order.delivery_address?.street || '',
      delivery_neighborhood: order.delivery_address?.neighborhood || '',
      delivery_city: order.delivery_address?.city || '',
      delivery_state: order.delivery_address?.state || '',
      delivery_zip_code: order.delivery_address?.zip_code || '',
      special_instructions: order.special_instructions || ''
    });
    setShowEdit(true);
  };

  const handleFormChange = (field, value) => {
    setEditForm(p => ({ ...p, [field]: value }));
  };

  const hasGeolocation = order && (
    (order.delivery_latitude && order.delivery_longitude) ||
    (order.pickup_latitude && order.pickup_longitude)
  );

  const handleShowMap = () => {
    if (!hasGeolocation) {
      showToast('Este pedido não possui dados de geolocalização.', 'info');
      return;
    }
    setShowMap(true);
    setTimeout(() => initMap(), 100);
  };

  const initMap = () => {
    if (!mapRef.current || !window.L) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }
    const L = window.L;
    const map = L.map(mapRef.current);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    const markers = [];
    if (order.pickup_latitude && order.pickup_longitude) {
      const pickupMarker = L.marker([order.pickup_latitude, order.pickup_longitude])
        .addTo(map)
        .bindPopup(`<b>Coleta</b><br>${order.restaurant?.name || 'Estabelecimento'}`);
      markers.push(pickupMarker);
    }
    if (order.delivery_latitude && order.delivery_longitude) {
      const deliveryMarker = L.marker([order.delivery_latitude, order.delivery_longitude])
        .addTo(map)
        .bindPopup(`<b>Entrega</b><br>${order.delivery_address?.street || 'Endereço de entrega'}`);
      markers.push(deliveryMarker);
    }
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  };

  const toLocalTime = (dateStr) => {
    if (!dateStr) return null;
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(str);
  };

  const formatLocalDateTime = (dateStr) => {
    const date = toLocalTime(dateStr);
    return date ? date.toLocaleString('pt-BR') : '';
  };

  const getStatusDetail = (order, si) => {
    switch (order.status) {
      case 'SCHEDULED': return 'Será lançado automaticamente';
      case 'PENDING':
        if (si.current_offer) {
          const driverName = drivers[si.current_offer] || `Entregador #${si.current_offer}`;
          return `Oferecido para ${driverName}`;
        }
        return 'Aguardando entregador aceitar';
      case 'ACCEPTED': return `Aceito por ${order.driver?.user?.first_name || 'entregador'}`;
      case 'PICKED_UP': return 'Em rota de entrega';
      case 'DELIVERED': return 'Entrega concluída';
      case 'CANCELLED': return 'Pedido cancelado';
      default: return '';
    }
  };

  const getTimeline = () => {
    if (!order) return [];
    const timeline = [];
    const si = parseSpecialInstructions(order.special_instructions);

    timeline.push({
      status: 'CREATED', time: order.created_at, label: 'Pedido criado',
      detail: `Pedido #${order.order_number}`, icon: '📝', color: '#64748b'
    });

    if (order.scheduled_at) {
      timeline.push({
        status: 'SCHEDULED', time: order.scheduled_at, label: 'Agendado para',
        detail: 'Lançamento programado', icon: '⏰', color: '#6366f1'
      });
    }

    const statusConfig = STATUS_CONFIG[order.status];
    if (statusConfig) {
      timeline.push({
        status: order.status, time: order.updated_at, label: statusConfig.text,
        detail: getStatusDetail(order, si), icon: statusConfig.icon,
        color: statusConfig.color, current: true
      });
    }

    if (si.rejections && si.rejections.length > 0) {
      si.rejections.forEach((driverId) => {
        const driverName = drivers[driverId] || `Entregador #${driverId}`;
        timeline.push({
          status: 'REJECTED', time: null, label: `${driverName} recusou`,
          detail: 'Pedido repassado para próximo entregador', icon: '❌', color: '#ef4444'
        });
      });
    }

    if (si.timeouts && si.timeouts.length > 0) {
      si.timeouts.forEach((driverId) => {
        const driverName = drivers[driverId] || `Entregador #${driverId}`;
        timeline.push({
          status: 'TIMEOUT', time: null, label: `${driverName} não respondeu`,
          detail: 'Timeout - pedido repassado para próximo entregador', icon: '⏰', color: '#f59e0b'
        });
      });
    }

    if (si.current_offer && order.status === 'PENDING') {
      const driverName = drivers[si.current_offer] || `Entregador #${si.current_offer}`;
      timeline.push({
        status: 'OFFERED', time: null, label: `Oferecido para ${driverName}`,
        detail: 'Aguardando aceite', icon: '📱', color: '#f59e0b'
      });
    }

    return timeline;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <p style={{ color: '#64748b' }}>{error || 'Pedido não encontrado'}</p>
        <button onClick={() => navigate('/admin/orders')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}>
          Voltar para Pedidos
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || {};
  const si = parseSpecialInstructions(order.special_instructions);
  const timeline = getTimeline();

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/admin/orders')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
            Pedido #{order.order_number}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Criado em {formatLocalDateTime(order.created_at)}
          </p>
        </div>
        <button onClick={loadOrder} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b' }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <StatusActions
        order={order}
        statusConfig={statusConfig}
        statusDetail={getStatusDetail(order, si)}
        onEdit={openEditModal}
        onShowMap={handleShowMap}
        onChangeStatus={handleChangeStatus}
      />

      <OrderTimeline timeline={timeline} statusConfig={statusConfig} formatLocalDateTime={formatLocalDateTime} />

      <OrderInfoCards order={order} si={si} utils={utils} />

      {showMap && <MapModal order={order} mapRef={mapRef} onClose={() => setShowMap(false)} />}

      {showEdit && (
        <EditOrderModal
          order={order}
          editForm={editForm}
          editLoading={editLoading}
          onClose={() => setShowEdit(false)}
          onSave={handleEdit}
          onFormChange={handleFormChange}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OrderDetailPage;
