import React, { useState, useEffect } from 'react';
import {
  Route, Plus, Users, Package, MapPin, Clock, CheckCircle,
  AlertCircle, RefreshCw, Trash2, Play, Eye, X, ArrowRightLeft
} from 'lucide-react';
import api from '@/lib/api';

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
  const [routeName, setRouteName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [movingStop, setMovingStop] = useState(null);
  const [targetRouteId, setTargetRouteId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Buscar restaurant_id do usuário logado
      const userRes = await api.get('/api/user/profile');
      const restaurantId = userRes.data.restaurant_id;
      
      const [routesRes, ordersRes, driversRes] = await Promise.all([
        api.get('/api/routes/establishment/list'),
        restaurantId ? api.get(`/api/admin/establishment/orders?status=PENDING,ACCEPTED,SCHEDULED&restaurant_id=${restaurantId}`) : Promise.resolve({ data: { orders: [] } }),
        restaurantId ? api.get(`/api/admin/establishment-drivers?restaurant_id=${restaurantId}`) : Promise.resolve({ data: { drivers: [] } })
      ]);
      // Filtrar rotas concluídas e rejeitadas
      const allRoutes = routesRes.data.routes || [];
      const activeRoutes = allRoutes.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED');
      setRoutes(activeRoutes);
      setOrders(ordersRes.data.orders || []);
      setDrivers(driversRes.data.drivers || []);
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
    if (!window.confirm('Tem certeza que deseja excluir esta rota?')) return;
    try {
      await api.delete(`/api/routes/${routeId}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir rota');
    }
  };

  const handleRemoveOrder = async (routeId, orderId) => {
    if (!window.confirm('Remover este pedido da rota? Ele ficará disponível novamente.')) return;
    try {
      setError('');
      const res = await api.post(`/api/routes/${routeId}/remove-order`, { order_id: orderId });
      setSuccess(res.data.message);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao remover pedido');
    }
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

  const getStatusBadge = (status) => {
    const configs = {
      CREATED: { bg: '#f1f5f9', color: '#475569', label: 'Sem Entregador' },
      PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Aguardando Aceite' },
      ACTIVE: { bg: '#dbeafe', color: '#1d4ed8', label: 'Em Rota' },
      COMPLETED: { bg: '#dcfce7', color: '#166534', label: 'Concluída' },
      CANCELLED: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelada' },
      REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'Rejeitada' }
    };
    const config = configs[status] || configs.CREATED;
    return (
      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: config.bg, color: config.color }}>
        {config.label}
      </span>
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
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            <Plus size={16} /> Nova Rota
          </button>
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

      {/* Pedidos Disponíveis */}
      {orders.length > 0 && (
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>
              Pedidos Disponíveis ({orders.length})
              {selectedOrders.length > 0 && <span style={{ color: '#2563eb', marginLeft: '0.5rem' }}>- {selectedOrders.length} selecionado(s)</span>}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Selecione os pedidos e clique em "Adicionar Pedidos" na rota desejada</p>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => toggleOrderSelection(order.id)}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  background: selectedOrders.includes(order.id) ? '#eff6ff' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'background 0.15s'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order.id)}
                  onChange={() => {}}
                  style={{ cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</span>
                    <span style={{ padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.625rem', background: order.status === 'SCHEDULED' ? '#ede9fe' : '#dbeafe', color: order.status === 'SCHEDULED' ? '#6d28d9' : '#1d4ed8' }}>
                      {order.status === 'SCHEDULED' ? 'Agendado' : order.status === 'PENDING' ? 'Pendente' : 'Aceito'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>{order.customer?.name} • {order.delivery_address?.street}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Rotas */}
      {routes.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Route size={48} style={{ color: '#64748b', marginBottom: '1rem' }} />
          <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.125rem' }}>Nenhuma rota criada</p>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Clique em "Nova Rota" para criar uma rota para seus entregadores</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {routes.map(route => (
            <div key={route.id} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              {/* Header da Rota */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Route size={20} style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>{route.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: route.driver_name ? '#64748b' : '#dc2626' }}>
                        <Users size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        {route.driver_name || 'Sem entregador'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        <Package size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        {route.stops_count} entregas
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {getStatusBadge(route.status)}
                  {['CREATED', 'PENDING'].includes(route.status) && (
                    <button onClick={() => handleDeleteRoute(route.id)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Ações da Rota */}
              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Atribuir entregador */}
                {route.status === 'CREATED' && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={selectedDriver}
                      onChange={e => setSelectedDriver(e.target.value)}
                      style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.75rem', background: 'white' }}
                    >
                      <option value="">Selecionar entregador...</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignDriver(route.id)}
                      disabled={!selectedDriver}
                      style={{
                        padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                        border: 'none', background: selectedDriver ? '#2563eb' : '#94a3b8',
                        color: 'white', fontSize: '0.75rem', fontWeight: 600,
                        cursor: selectedDriver ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Atribuir Entregador
                    </button>
                  </div>
                )}
                
                {/* Adicionar pedidos */}
                {['CREATED', 'PENDING', 'ACTIVE'].includes(route.status) && (
                  <button
                    onClick={() => handleAddOrdersToRoute(route.id)}
                    disabled={selectedOrders.length === 0}
                    style={{
                      padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                      border: '1px solid #0d9488', background: 'white',
                      color: selectedOrders.length > 0 ? '#0d9488' : '#94a3b8',
                      fontSize: '0.75rem', fontWeight: 600,
                      cursor: selectedOrders.length > 0 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    + Adicionar Pedidos ({selectedOrders.length})
                  </button>
                )}
              </div>

              {/* Paradas da Rota */}
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {route.stops?.map((stop, index) => (
                    <div key={stop.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: stop.status === 'COMPLETED' ? '#f0fdf4' : '#f8fafc', borderRadius: '0.375rem' }}>
                      <span style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: stop.status === 'COMPLETED' ? '#22c55e' : '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 600 }}>
                        {stop.stop_order}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500 }}>{stop.address}</p>
                        <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{stop.customer_name} • Pedido #{stop.order_number}</p>
                      </div>
                      {stop.status === 'COMPLETED' && <CheckCircle size={16} style={{ color: '#22c55e' }} />}
                      {stop.status !== 'COMPLETED' && ['CREATED', 'PENDING', 'ACTIVE'].includes(route.status) && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => { setMovingStop({ ...stop, route_id: route.id }); setTargetRouteId(''); }}
                            title="Mover para outra rota"
                            style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }}
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                          <button
                            onClick={() => handleRemoveOrder(route.id, stop.order_id)}
                            title="Remover da rota"
                            style={{ padding: '0.25rem', borderRadius: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação de Rota */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Nova Rota</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {/* Selecionar Pedidos */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Pedidos * ({selectedOrders.length} selecionados)
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  {orders.length === 0 ? (
                    <p style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>Nenhum pedido disponível</p>
                  ) : (
                    orders.map(order => (
                      <div
                        key={order.id}
                        onClick={() => toggleOrderSelection(order.id)}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: selectedOrders.includes(order.id) ? '#eff6ff' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</p>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.customer?.name} • {order.delivery_address?.street}</p>
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{order.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreateModal(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRoute}
                  disabled={createLoading || selectedOrders.length === 0}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: createLoading || selectedOrders.length === 0 ? '#94a3b8' : '#2563eb',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: createLoading || selectedOrders.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {createLoading ? 'Criando...' : 'Criar Rota'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mover Pedido */}
      {movingStop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Mover Pedido</h2>
              <button onClick={() => { setMovingStop(null); setTargetRouteId(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Mover pedido <strong>#{movingStop.order_number}</strong> para outra rota:
              </p>
              <select
                value={targetRouteId}
                onChange={e => setTargetRouteId(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', marginBottom: '1rem' }}
              >
                <option value="">Selecionar rota de destino...</option>
                {routes.filter(r => r.id !== movingStop.route_id && ['CREATED', 'PENDING', 'ACTIVE'].includes(r.status)).map(r => (
                  <option key={r.id} value={r.id}>{r.name} - {r.driver_name || 'Sem entregador'} ({r.stops_count} entregas)</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => { setMovingStop(null); setTargetRouteId(''); }} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleMoveOrder}
                  disabled={!targetRouteId}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none',
                    background: targetRouteId ? '#2563eb' : '#94a3b8',
                    color: 'white', fontSize: '0.875rem', fontWeight: 600,
                    cursor: targetRouteId ? 'pointer' : 'not-allowed'
                  }}
                >
                  Mover Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EstablishmentRoutesPage;
