import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { adminService, orderService } from '@/lib/api';
import api from '@/lib/api';
import { useSquare } from '@/contexts/SquareContext';
import { showToast } from '@/components/Toast';
import { Sidebar, MapSection, AssignDriverModal, SettingsModal } from './dashboard-tabs';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { squareId, selectedSquare, setSelectedSquare } = useSquare();

  // ── State ──────────────────────────────────────────────────────────────────
  const [tracking, setTracking] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('status');
  const [searchTerm, setSearchTerm] = useState('');
  const [squares, setSquares] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [timeInterval, setTimeInterval] = useState(60);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [showSettings, setShowSettings] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState(null);
  const [onlineDrivers, setOnlineDrivers] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [allEstablishments, setAllEstablishments] = useState([]);
  const [platformRoutes, setPlatformRoutes] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedStatus, setExpandedStatus] = useState('PENDING');
  const [selectedOrderMenu, setSelectedOrderMenu] = useState(null);
  const [cityCenter, setCityCenter] = useState(null);

  const abortControllerRef = useRef(null);
  const geocodeCityCache = useRef({});

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      await adminService.getDashboard(squareId);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError('Erro ao carregar dados do dashboard');
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
      const data = await adminService.getOrders(1, 20, '', squareId);
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

  const loadTenants = async () => {
    try {
      const response = await api.get('/api/platform/tenants');
      setTenants(response.data.tenants || []);
    } catch {
      console.log('Tenants not available');
    }
  };

  const loadTracking = async () => {
    try {
      const data = await adminService.getLiveTracking(squareId || null);
      setTracking(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao carregar tracking:', err);
    }
  };

  const loadOnlineDrivers = async () => {
    try {
      const data = await adminService.getDrivers(1, 100, '', 'online');
      setOnlineDrivers(data.drivers || []);
    } catch (err) {
      console.error('Erro ao carregar entregadores:', err);
    }
  };

  const loadAllDrivers = async () => {
    try {
      const data = await adminService.getDrivers(1, 100, '', 'online');
      setAllDrivers(data.drivers || []);
    } catch (err) {
      console.error('Erro ao carregar entregadores:', err);
    }
  };

  const loadPlatformRoutes = async () => {
    try {
      const res = await api.get('/api/platform-routes/list');
      setPlatformRoutes(res.data.routes || []);
    } catch (err) {
      console.error('Erro ao carregar rotas da plataforma:', err);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAssignDriver = async (driverId) => {
    if (!orderToAssign) return;
    try {
      setAssignLoading(true);
      await adminService.assignOrderToDriver(orderToAssign.id, driverId);
      setShowAssignModal(false);
      setOrderToAssign(null);
      setSelectedOrderMenu(null);
      loadOrders();
      loadTracking();
    } catch (err) {
      showToast('Erro ao atribuir entregador: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  const openAssignModal = (order) => {
    setOrderToAssign(order);
    setShowAssignModal(true);
    loadOnlineDrivers();
  };

  const handleChangeStatus = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      setSelectedOrderMenu(null);
      loadOrders();
    } catch {
      showToast('Erro ao alterar status', 'error');
    }
  };

  const handleApprove = async (userId, assignedSquareId = null, tenantId = null) => {
    try {
      await adminService.approveUser(userId, assignedSquareId, tenantId);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      loadDashboard();
      loadOrders();
      loadPendingUsers();
      loadAllDrivers();
    } catch (err) {
      showToast('Erro ao aprovar: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Rejeitar e excluir este cadastro?')) return;
    try {
      await adminService.rejectUser(userId);
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      loadDashboard();
    } catch (err) {
      showToast('Erro ao rejeitar: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleCenterMap = (lat, lng) => {
    window.__adminMapCenter?.(lat, lng);
    setSelectedOrderMenu(null);
  };

  const getTimeRemaining = (scheduledAt) => {
    if (!scheduledAt) return null;
    const now = new Date();
    const scheduledStr = scheduledAt.endsWith('Z') ? scheduledAt : scheduledAt + 'Z';
    const scheduled = new Date(scheduledStr);
    const diffMs = scheduled - now;
    if (diffMs <= 0) return 'Agora';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Menos de 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}min`;
  };

  const geocodeCity = async (city, state) => {
    try {
      const query = `${city}, ${state}, Brasil`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`,
        { headers: { 'User-Agent': 'muvlog-portal/1.0' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (err) {
      console.warn('Erro ao geocodificar cidade:', err);
      return null;
    }
  };

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadDashboard();
    loadTracking();
    loadPendingUsers();
    loadOrders();
    loadSquares();
    loadAllDrivers();
    loadTenants();
    loadPlatformRoutes();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (tracking && tracking.establishments) {
      setAllEstablishments(tracking.establishments);
    }
  }, [tracking]);

  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    loadTracking();
    loadDashboard();
    loadOrders();
    loadPendingUsers();
    loadAllDrivers();
  }, [selectedSquare]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadTracking();
      loadOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedSquare]);

  useEffect(() => {
    if (!selectedSquare?.city) {
      setCityCenter(null);
      return;
    }
    const cityName = selectedSquare.city;
    const state = selectedSquare.state || 'RS';
    const cacheKey = `${cityName.toLowerCase()}-${state.toLowerCase()}`;
    if (!geocodeCityCache.current[cacheKey]) {
      geocodeCityCache.current[cacheKey] = geocodeCity(cityName, state);
    }
    geocodeCityCache.current[cacheKey].then(coords => {
      setCityCenter(coords);
    });
  }, [selectedSquare]);

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <AlertCircle size={48} style={{ color: '#ef4444' }} />
        <p style={{ color: '#64748b', fontSize: '1rem' }}>{error}</p>
        <button onClick={loadDashboard} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Tentar novamente</button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', background: '#f1f5f9', position: 'relative' }}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        pendingUsers={pendingUsers}
        platformRoutes={platformRoutes}
        orders={orders}
        allDrivers={allDrivers}
        allEstablishments={allEstablishments}
        squares={squares}
        selectedSquare={selectedSquare}
        onSelectSquare={setSelectedSquare}
        tenants={tenants}
        onApprove={handleApprove}
        onReject={handleReject}
        onOpenAssign={openAssignModal}
        onCenterMap={handleCenterMap}
        getTimeRemaining={getTimeRemaining}
        onChangeStatus={handleChangeStatus}
        onNavigate={navigate}
        onOpenSettings={() => setShowSettings(true)}
        expandedStatus={expandedStatus}
        setExpandedStatus={setExpandedStatus}
        selectedOrderMenu={selectedOrderMenu}
        setSelectedOrderMenu={setSelectedOrderMenu}
      />

      <MapSection
        tracking={tracking}
        lastUpdated={lastUpdated}
        selectedSquare={selectedSquare}
        squares={squares}
        onSelectSquare={setSelectedSquare}
        cityCenter={cityCenter}
      />

      {showSettings && (
        <SettingsModal
          timeInterval={timeInterval}
          onSelectInterval={setTimeInterval}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showAssignModal && (
        <AssignDriverModal
          orderToAssign={orderToAssign}
          onlineDrivers={onlineDrivers}
          assignLoading={assignLoading}
          onAssign={handleAssignDriver}
          onClose={() => { setShowAssignModal(false); setOrderToAssign(null); }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .admin-sidebar { display: none !important; }
          .admin-sidebar.open { display: block !important; position: absolute; z-index: 1000; height: 100%; width: 85vw !important; max-width: 320px; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboardPage;
