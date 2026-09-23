import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import Tooltip from '@/components/Tooltip';
import { showConfirm } from '@/components/ConfirmDialog';
import AvailableOrders from './establishment-routes/AvailableOrders';
import RoutesList from './establishment-routes/RoutesList';
import RouteForm from './establishment-routes/RouteForm';
import MoveOrderModal from './establishment-routes/MoveOrderModal';

const EstablishmentRoutesPage = () => {
  const [routes, setRoutes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [movingStop, setMovingStop] = useState(null);
  const [targetRouteId, setTargetRouteId] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const userRes = await api.get('/api/user/profile');
      const restaurantId = userRes.data.restaurant_id;

      const [routesRes, ordersRes, driversRes] = await Promise.all([
        api.get('/api/routes/establishment/list'),
        restaurantId ? api.get(`/api/admin/establishment/orders?status=PENDING,ACCEPTED,SCHEDULED&restaurant_id=${restaurantId}`) : Promise.resolve({ data: { orders: [] } }),
        restaurantId ? api.get(`/api/admin/establishment-drivers?restaurant_id=${restaurantId}`) : Promise.resolve({ data: { drivers: [] } })
      ]);
      const allRoutes = routesRes.data.routes || [];
      const activeRoutes = allRoutes.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED');
      setRoutes(activeRoutes);
      setOrders(ordersRes.data.orders || []);
      setDrivers(driversRes.data.drivers || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async () => {
    if (selectedOrders.length === 0) {
      setError('Selecione pelo menos um pedido');
      return;
    }

    try {
      setCreateLoading(true);
      setError('');

      const res = await api.post('/api/routes/create', {
        order_ids: selectedOrders.map(id => parseInt(id))
      });

      setSuccess(res.data.message);
      setShowCreateModal(false);
      setSelectedOrders([]);
      setSelectedDriver('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar rota');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAssignDriver = async (routeId) => {
    if (!selectedDriver) {
      setError('Selecione um entregador');
      return;
    }

    try {
      setError('');
      const res = await api.post(`/api/routes/${routeId}/assign-driver`, {
        driver_id: parseInt(selectedDriver)
      });
      setSuccess(res.data.message);
      setSelectedDriver('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atribuir entregador');
    }
  };

  const handleAddOrdersToRoute = async (routeId) => {
    if (selectedOrders.length === 0) {
      setError('Selecione pelo menos um pedido para adicionar');
      return;
    }

    try {
      setError('');
      const res = await api.post(`/api/routes/${routeId}/add-orders`, {
        order_ids: selectedOrders.map(id => parseInt(id))
      });
      setSuccess(res.data.message);
      setSelectedOrders([]);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar pedidos');
    }
  };

  const handleDeleteRoute = async (routeId) => {
    showConfirm('Tem certeza que deseja excluir esta rota?', async () => {
      try {
        await api.delete(`/api/routes/${routeId}`);
        loadData();
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao excluir rota');
      }
    });
  };

  const handleRemoveOrder = async (routeId, orderId) => {
    showConfirm('Remover este pedido da rota? Ele ficará disponível novamente.', async () => {
      try {
        setError('');
        const res = await api.post(`/api/routes/${routeId}/remove-order`, { order_id: orderId });
        setSuccess(res.data.message);
        loadData();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao remover pedido');
      }
    });
  };

  const handleMoveOrder = async () => {
    if (!movingStop || !targetRouteId) return;
    try {
      setError('');
      const res = await api.post(`/api/routes/${movingStop.route_id}/move-order`, {
        order_id: movingStop.order_id,
        target_route_id: parseInt(targetRouteId)
      });
      setSuccess(res.data.message);
      setMovingStop(null);
      setTargetRouteId('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao mover pedido');
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Rotas de Entrega</h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Gerencie as rotas dos seus entregadores</p>
          {lastUpdated && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Tooltip text="Atualizar lista de rotas" position="bottom">
            <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
              <RefreshCw size={16} /> Atualizar
            </button>
          </Tooltip>
          <Tooltip text="Criar nova rota para seus entregadores" position="bottom">
            <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
              <Plus size={16} /> Nova Rota
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <AvailableOrders
        orders={orders}
        selectedOrders={selectedOrders}
        onToggleOrder={toggleOrderSelection}
      />

      <RoutesList
        routes={routes}
        drivers={drivers}
        selectedDriver={selectedDriver}
        onSetSelectedDriver={setSelectedDriver}
        onAssignDriver={handleAssignDriver}
        onDeleteRoute={handleDeleteRoute}
        onRemoveOrder={handleRemoveOrder}
        onMoveOrder={(stop) => { setMovingStop(stop); setTargetRouteId(''); }}
        onAddOrders={handleAddOrdersToRoute}
        selectedOrders={selectedOrders}
      />

      {showCreateModal && (
        <RouteForm
          orders={orders}
          selectedOrders={selectedOrders}
          onToggleOrder={toggleOrderSelection}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRoute}
          loading={createLoading}
        />
      )}

      {movingStop && (
        <MoveOrderModal
          movingStop={movingStop}
          targetRouteId={targetRouteId}
          routes={routes}
          onSetTargetRouteId={setTargetRouteId}
          onClose={() => { setMovingStop(null); setTargetRouteId(''); }}
          onMove={handleMoveOrder}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EstablishmentRoutesPage;
