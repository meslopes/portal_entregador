import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Truck, Package, DollarSign, TrendingUp,
  AlertCircle, Clock, CheckCircle, BarChart3, MapPin,
  Search, Filter, ChevronDown, ChevronRight, Store, X
} from 'lucide-react';
import { adminService, orderService, utils } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const STATUS_CONFIG = {
  PENDING: { color: '#ef4444', bg: '#fee2e2', text: 'Tocando', icon: '🔴' },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceitos', icon: '🔵' },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando', icon: '🟣' },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto', icon: '🟢' },
  PICKED_UP: { color: '#f59e0b', bg: '#fef3c7', text: 'Coletados', icon: '🟡' },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregues', icon: '✅' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelados', icon: '❌' },
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('status');
  const [expandedStatus, setExpandedStatus] = useState('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [squares, setSquares] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState('');
  const [timeInterval, setTimeInterval] = useState(60); // minutos
  const [showSettings, setShowSettings] = useState(false);
  const [selectedOrderMenu, setSelectedOrderMenu] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    loadDashboard();
    loadTracking();
    loadPendingUsers();
    loadOrders();
    loadSquares();
  }, []);

  // Auto-refresh tracking e pedidos
  useEffect(() => {
    const interval = setInterval(() => {
      loadTracking();
      loadOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingUsers = async () => {
    try {
      const data = await adminService.getPendingUsers();
      setPendingUsers(data.users || []);
    } catch (err) {
      console.error('Erro ao carregar pendentes:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await adminService.getOrders(1, 100);
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    }
  };

  const loadSquares = async () => {
    try {
      const data = await adminService.getSquares();
      setSquares(data.squares || []);
    } catch (err) {
      console.error('Erro ao carregar pracas:', err);
    }
  };

  const loadTracking = async () => {
    try {
      const data = await adminService.getLiveTracking();
      setTracking(data);
    } catch (err) {
      console.error('Erro ao carregar tracking:', err);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await adminService.approveUser(userId);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      loadDashboard();
    } catch (err) {
      alert('Erro ao aprovar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Rejeitar e excluir este cadastro?')) return;
    try {
      await adminService.rejectUser(userId);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      loadDashboard();
    } catch (err) {
      alert('Erro ao rejeitar: ' + (err.response?.data?.error || err.message));
    }
  };

  // Initialize map
  const mapCallbackRef = useCallback((node) => {
    if (!node) return;
    mapRef.current = node;

    if (mapInstanceRef.current) return;

    const initMap = () => {
      if (!node || mapInstanceRef.current) return;
      const L = window.L;
      if (!L) return;
      mapInstanceRef.current = L.map(node, { zoomControl: true, scrollWheelZoom: true })
        .setView([-29.72, -50.00], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstanceRef.current);
    };

    if (window.L) {
      initMap();
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !tracking) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    const allPoints = [];

    // Drivers
    if (tracking.drivers) {
      tracking.drivers.forEach(driver => {
        if (driver.latitude && driver.longitude) {
          const color = driver.current_order ? '#2563eb' : '#22c55e';
          const icon = L.divIcon({
            html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
            </div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          const marker = L.marker([driver.latitude, driver.longitude], { icon })
            .addTo(map)
            .bindPopup(`<b>${driver.name}</b><br>${driver.vehicle_type}<br>${driver.current_order ? 'Em entrega' : 'Livre'}`);
          markersRef.current.push(marker);
          allPoints.push([driver.latitude, driver.longitude]);
        }
      });
    }

    // Establishments
    if (tracking.establishments) {
      tracking.establishments.forEach(est => {
        if (est.latitude && est.longitude) {
          const icon = L.divIcon({
            html: `<div style="background:#f59e0b;width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>
            </div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const marker = L.marker([est.latitude, est.longitude], { icon })
            .addTo(map)
            .bindPopup(`<b>${est.name}</b><br>${est.address || ''}<br>Pedidos: ${est.active_orders}`);
          markersRef.current.push(marker);
          allPoints.push([est.latitude, est.longitude]);
        }
      });
    }

    // Delivery addresses
    if (tracking.deliveries) {
      tracking.deliveries.forEach(del => {
        if (del.latitude && del.longitude) {
          const color = del.status === 'PICKED_UP' ? '#22c55e' : '#94a3b8';
          const icon = L.divIcon({
            html: `<div style="background:${color};width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            </div>`,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker([del.latitude, del.longitude], { icon })
            .addTo(map)
            .bindPopup(`<b>#${del.order_number}</b><br>${del.customer_name}<br>${del.street}`);
          markersRef.current.push(marker);
          allPoints.push([del.latitude, del.longitude]);
        }
      });
    }

    if (allPoints.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [tracking]);

  // Filter orders by status - mostra todos os pedidos com este status
  const getOrdersByStatus = (status) => {
    return orders.filter(o => o.status === status);
  };

  const filteredOrders = orders.filter(o => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return o.order_number?.toLowerCase().includes(search) ||
             o.customer?.name?.toLowerCase().includes(search);
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', background: '#f1f5f9' }}>
      {/* Sidebar Esquerda */}
      <div style={{ width: '320px', background: 'white', borderRight: '1px solid #e2e8f0', overflow: 'auto', flexShrink: 0 }}>
        {/* Filtros */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Filter size={16} style={{ color: '#64748b' }} />
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Filtros</span>
          </div>
          
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar por ID, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem',
                  border: '1px solid #e2e8f0', borderRadius: '0.375rem',
                  fontSize: '0.8125rem', outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              style={{ padding: '0.375rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', outline: 'none' }}
            >
              <option value="">Todos os clientes</option>
            </select>
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              style={{ padding: '0.375rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', outline: 'none' }}
            >
              <option value="">Todos os entreg.</option>
            </select>
          </div>
        </div>

        {/* Abas Status */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('status')}
            style={{
              flex: 1, padding: '0.75rem', border: 'none', background: 'transparent',
              fontWeight: 600,
              color: '#2563eb',
              borderBottom: '2px solid #2563eb',
              cursor: 'pointer', fontSize: '0.875rem'
            }}
          >
            Status
          </button>
          <button
            onClick={() => {
              console.log('Settings clicked, showSettings:', showSettings);
              setShowSettings(true);
            }}
            style={{
              padding: '0.5rem', border: 'none', background: 'transparent',
              cursor: 'pointer', color: '#64748b', fontSize: '1.25rem'
            }}
            title="Configurações"
          >
            ⚙️
          </button>
        </div>

        {/* Lista de Status */}
        {activeTab === 'status' && (
          <div style={{ padding: '0.5rem' }}>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = getOrdersByStatus(status).length;
              const isExpanded = expandedStatus === status;
              
              return (
                <div key={status} style={{ marginBottom: '0.25rem' }}>
                  <button
                    onClick={() => setExpandedStatus(isExpanded ? null : status)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '0.75rem', border: 'none',
                      background: isExpanded ? '#f8fafc' : 'transparent',
                      borderRadius: '0.375rem', cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>{config.icon}</span>
                      <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>
                        Pedidos {config.text}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.125rem 0.5rem', borderRadius: '9999px',
                        background: config.bg, color: config.color,
                        fontSize: '0.75rem', fontWeight: 600
                      }}>
                        {count}
                      </span>
                      <ChevronDown
                        size={14}
                        style={{
                          color: '#94a3b8',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    </div>
                  </button>
                  
                  {isExpanded && count > 0 && (
                    <div style={{ padding: '0.25rem 0.5rem' }}>
                      {getOrdersByStatus(status).slice(0, 5).map(order => (
                          <div
                            key={order.id}
                            style={{
                              padding: '0.5rem', borderRadius: '0.25rem',
                              background: 'white', marginBottom: '0.25rem',
                              fontSize: '0.75rem',
                              border: '1px solid #f1f5f9',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 500, color: '#1e293b' }}>#{order.order_number}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>{utils.formatCurrency(order.total_amount)}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderMenu(selectedOrderMenu === order.id ? null : order.id);
                                  }}
                                  style={{
                                    padding: '0.125rem 0.25rem', border: 'none', background: 'transparent',
                                    cursor: 'pointer', color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1
                                  }}
                                >
                                  ⋮
                                </button>
                              </div>
                            </div>
                            <div style={{ color: '#64748b', marginTop: '0.125rem', fontSize: '0.6875rem' }}>
                              {order.customer?.name || 'Cliente'}
                            </div>

                            {/* Menu do pedido */}
                            {selectedOrderMenu === order.id && (
                              <div style={{
                                position: 'absolute', right: 0, top: '100%', zIndex: 50,
                                background: 'white', borderRadius: '0.5rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                border: '1px solid #e2e8f0', width: '220px',
                                padding: '0.5rem'
                              }}>
                                {/* Detalhes do pedido */}
                                <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.25rem' }}>
                                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Detalhes</p>
                                  <p style={{ fontSize: '0.6875rem', color: '#1e293b' }}>Rest: {order.restaurant?.name}</p>
                                  <p style={{ fontSize: '0.6875rem', color: '#1e293b' }}>Cliente: {order.customer?.name}</p>
                                  <p style={{ fontSize: '0.6875rem', color: '#1e293b' }}>Frete: {utils.formatCurrency(order.delivery_fee)}</p>
                                  <p style={{ fontSize: '0.6875rem', color: '#1e293b' }}>Total: {utils.formatCurrency(order.total_amount)}</p>
                                </div>

                                {/* Opções de status */}
                                <p style={{ fontSize: '0.625rem', color: '#94a3b8', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>Alterar Status</p>
                                {['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].map(s => {
                                  if (s === order.status) return null;
                                  const cfg = STATUS_CONFIG[s];
                                  return (
                                    <button
                                      key={s}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await orderService.updateOrderStatus(order.id, s);
                                          setSelectedOrderMenu(null);
                                          loadOrders();
                                        } catch (err) {
                                          alert('Erro ao alterar status');
                                        }
                                      }}
                                      style={{
                                        width: '100%', padding: '0.375rem 0.5rem',
                                        border: 'none', background: 'transparent',
                                        borderRadius: '0.25rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                                        fontSize: '0.6875rem', color: '#1e293b',
                                        textAlign: 'left'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <span style={{ fontSize: '0.75rem' }}>{cfg.icon}</span>
                                      {cfg.text}
                                    </button>
                                  );
                                })}

                                {/* Ver no mapa */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (order.restaurant?.latitude && order.restaurant?.longitude) {
                                      mapInstanceRef.current?.setView([order.restaurant.latitude, order.restaurant.longitude], 15);
                                    }
                                    setSelectedOrderMenu(null);
                                  }}
                                  style={{
                                    width: '100%', padding: '0.375rem 0.5rem',
                                    border: 'none', background: 'transparent',
                                    borderRadius: '0.25rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    fontSize: '0.6875rem', color: '#2563eb',
                                    borderTop: '1px solid #f1f5f9', marginTop: '0.25rem', paddingTop: '0.5rem'
                                  }}
                                >
                                  <MapPin size={12} /> Ver no Mapa
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      {count > 5 && (
                        <div style={{ textAlign: 'center', padding: '0.25rem', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer' }}
                          onClick={() => navigate(`/admin/orders?status=${status}`)}>
                          Ver todos ({count})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lista de Empresas */}
        {activeTab === 'empresas' && (
          <div style={{ padding: '0.5rem' }}>
            {squares.map(sq => (
              <div
                key={sq.id}
                onClick={() => setSelectedSquare(selectedSquare === sq.id ? '' : sq.id)}
                style={{
                  padding: '0.75rem', borderRadius: '0.375rem',
                  background: selectedSquare === sq.id ? '#eff6ff' : 'transparent',
                  cursor: 'pointer', marginBottom: '0.25rem',
                  border: selectedSquare === sq.id ? '1px solid #bfdbfe' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Store size={14} style={{ color: '#64748b' }} />
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>{sq.name}</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {sq.city}/{sq.state}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conteudo Principal - Mapa */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header do Mapa */}
        <div style={{ padding: '0.75rem 1rem', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Mapa em Tempo Real</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
              {tracking?.drivers?.length || 0} entregadores | {tracking?.establishments?.length || 0} estabelecimentos
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={selectedSquare}
              onChange={(e) => setSelectedSquare(e.target.value)}
              style={{ padding: '0.375rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none' }}
            >
              <option value="">Todas as Praças</option>
              {squares.map(sq => (
                <option key={sq.id} value={sq.id}>{sq.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mapa */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapCallbackRef} style={{ width: '100%', height: '100%' }} />
          
          {/* Legenda */}
          <div style={{
            position: 'absolute', bottom: '1rem', left: '1rem',
            background: 'white', borderRadius: '0.5rem', padding: '0.75rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 1000
          }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>Legenda</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb' }} />
                <span>Entregador em entrega</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
                <span>Entregador livre</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} />
                <span>Estabelecimento</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#22c55e' }} />
                <span>Local de entrega</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1rem', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>© 2026 muv.log — Controle de Entregadores</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
            <a href="/support" style={{ color: '#64748b', textDecoration: 'none' }}>Suporte</a>
            <a href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Termos</a>
            <a href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacidade</a>
          </div>
        </div>
      </div>

      {/* Modal de Configurações */}
      {showSettings && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999 }}
            onClick={() => setShowSettings(false)}
          />
          <div style={{ 
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 100000 
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Configurações da Sidebar</h2>
              <button onClick={() => setShowSettings(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                  Intervalo de Tempo (minutos)
                </label>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  Mostra pedidos criados nos últimos X minutos
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[15, 30, 60, 120, 240].map(min => (
                    <button
                      key={min}
                      onClick={() => setTimeInterval(min)}
                      style={{
                        padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                        border: timeInterval === min ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: timeInterval === min ? '#eff6ff' : 'white',
                        color: timeInterval === min ? '#2563eb' : '#64748b',
                        fontSize: '0.8125rem', fontWeight: timeInterval === min ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {min}min
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  Atual: {timeInterval} minutos ({timeInterval >= 60 ? `${Math.floor(timeInterval/60)}h` : `${timeInterval}min`})
                </p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                  border: 'none', background: '#2563eb', color: 'white',
                  fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboardPage;
