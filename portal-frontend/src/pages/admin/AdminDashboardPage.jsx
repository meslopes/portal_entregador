import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Truck, Package, DollarSign, TrendingUp,
  AlertCircle, Clock, CheckCircle, BarChart3, MapPin,
  Star, RefreshCw, Navigation
} from 'lucide-react';
import { adminService, utils } from '@/lib/api';

const AdminDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    loadDashboard();
    loadTracking();
    // Auto-refresh tracking a cada 15 segundos
    const interval = setInterval(loadTracking, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError('Erro ao carregar dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTracking = async () => {
    try {
      const data = await adminService.getLiveTracking();
      setTracking(data);
      updateMapMarkers(data.drivers || []);
    } catch (err) {
      console.error('Erro ao carregar tracking:', err);
    }
  };

  // Inicializa o mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Carrega Leaflet dinamicamente
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      if (mapRef.current && !mapInstanceRef.current) {
        const L = window.L;
        mapInstanceRef.current = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([-29.95, -50.45], 12); // Porto Alegre area

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(mapInstanceRef.current);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Atualiza marcadores no mapa
  const updateMapMarkers = (drivers) => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Remove marcadores antigos
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (drivers.length === 0) return;

    const bounds = [];

    drivers.forEach(driver => {
      if (!driver.latitude || !driver.longitude) return;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: ${driver.current_order ? '#2563eb' : '#22c55e'};
          border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px; font-weight: bold;
        ">🚗</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([driver.latitude, driver.longitude], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 150px">
            <strong>${driver.name}</strong><br>
            <small>${driver.vehicle_type}</small><br>
            ${driver.current_order
              ? `<span style="color: #2563eb">📦 Em entrega</span>`
              : `<span style="color: #22c55e">✅ Disponível</span>`
            }
          </div>
        `);

      markersRef.current.push(marker);
      bounds.push([driver.latitude, driver.longitude]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Painel Administrativo
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Visão geral do sistema muv.log
          </p>
        </div>
        <button onClick={() => { loadDashboard(); loadTracking(); }} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
          borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white',
          cursor: 'pointer', fontSize: '0.8125rem', color: '#475569'
        }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Links de Cadastro */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Links para Repassar</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
            <Truck size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534' }}>Cadastro de Entregadores</p>
              <p style={{ fontSize: '0.6875rem', color: '#16a34a', wordBreak: 'break-all' }}>https://portal-entregador-gamma.vercel.app/register</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText('https://portal-entregador-gamma.vercel.app/register')} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: '#dcfce7', cursor: 'pointer', color: '#16a34a' }} title="Copiar link">
              📋
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
            <Store size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e40af' }}>Cadastro de Estabelecimentos</p>
              <p style={{ fontSize: '0.6875rem', color: '#2563eb', wordBreak: 'break-all' }}>https://portal-entregador-gamma.vercel.app/client/register</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText('https://portal-entregador-gamma.vercel.app/client/register')} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: '#dbeafe', cursor: 'pointer', color: '#2563eb' }} title="Copiar link">
              📋
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fcd34d' }}>
            <User size={20} style={{ color: '#d97706', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>Acesso Entregador</p>
              <p style={{ fontSize: '0.6875rem', color: '#d97706', wordBreak: 'break-all' }}>https://portal-entregador-gamma.vercel.app/login</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText('https://portal-entregador-gamma.vercel.app/login')} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: '#fef3c7', cursor: 'pointer', color: '#d97706' }} title="Copiar link">
              📋
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f0fdfa', borderRadius: '0.5rem', border: '1px solid #99f6e4' }}>
            <Store size={20} style={{ color: '#0d9488', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#134e4a' }}>Acesso Estabelecimento</p>
              <p style={{ fontSize: '0.6875rem', color: '#0d9488', wordBreak: 'break-all' }}>https://portal-entregador-gamma.vercel.app/client/login</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText('https://portal-entregador-gamma.vercel.app/client/login')} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: '#ccfbf1', cursor: 'pointer', color: '#0d9488' }} title="Copiar link">
              📋
            </button>
          </div>
        </div>
      </div>

      {/* Cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<Users size={22} />} iconBg="#dbeafe" iconColor="#2563eb" label="Total Entregadores" value={dashboard?.total_drivers || 0} />
        <StatCard icon={<Truck size={22} />} iconBg="#dcfce7" iconColor="#16a34a" label="Online Agora" value={dashboard?.online_drivers || 0} pulse={dashboard?.online_drivers > 0} />
        <StatCard icon={<Package size={22} />} iconBg="#f3e8ff" iconColor="#9333ea" label="Total Pedidos" value={dashboard?.total_orders || 0} />
        <StatCard icon={<DollarSign size={22} />} iconBg="#fef3c7" iconColor="#d97706" label="Receita Hoje" value={utils.formatCurrency(dashboard?.today_revenue || 0)} />
      </div>

      {/* Mapa + Tracking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1rem', marginBottom: '1.5rem' }} className="dashboard-grid">
        {/* Mapa */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Entregadores em Tempo Real</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tracking?.count || 0} online</span>
          </div>
          <div ref={mapRef} style={{ height: '400px', background: '#e5e7eb' }} />
        </div>

        {/* Lista de entregadores online */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Entregadores Online</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
            {tracking?.drivers?.length > 0 ? tracking.drivers.map((driver, i) => (
              <div key={i} style={{
                padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.375rem',
                background: driver.current_order ? '#eff6ff' : '#f0fdf4',
                borderLeft: `3px solid ${driver.current_order ? '#2563eb' : '#22c55e'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{driver.name}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{driver.vehicle_type}</p>
                  </div>
                  <span style={{
                    padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600,
                    background: driver.current_order ? '#dbeafe' : '#dcfce7',
                    color: driver.current_order ? '#2563eb' : '#16a34a'
                  }}>
                    {driver.current_order ? '📦 Em entrega' : '✅ Livre'}
                  </span>
                </div>
              </div>
            )) : (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.8125rem' }}>Nenhum entregador online</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumo + Status + Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Resumo do dia */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: '#2563eb' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Resumo do Dia</span>
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            <SummaryRow label="Pedidos Hoje" value={dashboard?.today_orders || 0} />
            <SummaryRow label="Entregas Hoje" value={dashboard?.today_deliveries || 0} />
            <SummaryRow label="Receita Hoje" value={utils.formatCurrency(dashboard?.today_revenue || 0)} highlight />
          </div>
        </div>

        {/* Pedidos por status */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} style={{ color: '#9333ea' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Pedidos por Status</span>
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            {dashboard?.orders_by_status && Object.entries(dashboard.orders_by_status).map(([status, count]) => (
              <StatusRow key={status} status={status} count={count} />
            ))}
            {(!dashboard?.orders_by_status || Object.keys(dashboard.orders_by_status).length === 0) && (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.8125rem' }}>Nenhum pedido</p>
            )}
          </div>
        </div>

        {/* Ranking de entregadores */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} style={{ color: '#16a34a' }} />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Ranking Entregadores</span>
          </div>
          <div style={{ padding: '0.5rem' }}>
            {dashboard?.top_drivers?.length > 0 ? dashboard.top_drivers.map((driver, index) => (
              <div key={driver.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.625rem 0.75rem', borderRadius: '0.375rem', marginBottom: '0.25rem',
                background: index === 0 ? '#f0fdf4' : 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{
                    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                    background: index === 0 ? '#22c55e' : index === 1 ? '#3b82f6' : index === 2 ? '#f59e0b' : '#e2e8f0',
                    color: index < 3 ? 'white' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.625rem', fontWeight: 700
                  }}>
                    {index + 1}
                  </span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>{driver.name}</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>
                  {driver.deliveries} entregas
                </span>
              </div>
            )) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.8125rem' }}>Sem dados</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dashboard-grid { grid-template-columns: 1fr 350px; }
        @media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

// Componentes auxiliares
const StatCard = ({ icon, iconBg, iconColor, label, value, pulse }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
    {pulse && <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 2s infinite' }} />}
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ padding: '0.625rem', borderRadius: '0.5rem', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '0.125rem' }}>{label}</p>
        <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
      </div>
    </div>
    <style>{`@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
  </div>
);

const SummaryRow = ({ label, value, highlight = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
    <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{label}</span>
    <span style={{ fontWeight: 600, color: highlight ? '#22c55e' : '#1e293b', fontSize: '0.9375rem' }}>{value}</span>
  </div>
);

const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', bg: '#fef3c7', text: 'Pendente' },
  ACCEPTED: { color: '#2563eb', bg: '#dbeafe', text: 'Aceito' },
  PREPARING: { color: '#8b5cf6', bg: '#f3e8ff', text: 'Preparando' },
  READY: { color: '#06b6d4', bg: '#cffafe', text: 'Pronto' },
  PICKED_UP: { color: '#3b82f6', bg: '#dbeafe', text: 'Coletado' },
  DELIVERED: { color: '#22c55e', bg: '#dcfce7', text: 'Entregue' },
  CANCELLED: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelado' },
};

const StatusRow = ({ status, count }) => {
  const config = STATUS_CONFIG[status] || { color: '#94a3b8', bg: '#f1f5f9', text: status };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: config.color }} />
        <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{config.text}</span>
      </div>
      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: config.bg, color: config.color }}>
        {count}
      </span>
    </div>
  );
};

export default AdminDashboardPage;
