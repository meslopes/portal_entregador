import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Package, DollarSign, Clock, Settings,
  LayoutDashboard, Users, Store, BarChart3, FileText, CreditCard, MapPin, Trophy, Wallet, TrendingUp, Globe, AlertTriangle, Route, Bike
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.hooks';
import { driverService } from '@/lib/api';
import { sendGPS as sendGPSBroadcast, isRealtimeAvailable } from '@/lib/realtime';
import OrderOfferPopup from '@/components/OrderOfferPopup';
import LayoutHeader from '@/components/layout/LayoutHeader';
import LayoutNav from '@/components/layout/LayoutNav';
import LayoutFooter from '@/components/layout/LayoutFooter';
import MobileNav from '@/components/layout/MobileNav';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  // GPS persistente para entregadores da plataforma — funciona em TODAS as páginas
  // Supabase Realtime Broadcast a cada 2s (tempo real) + HTTP POST a cada 30s (persistência)
  const gpsBroadcastRef = useRef(null);
  const gpsHttpRef = useRef(null);
  useEffect(() => {
    const isDriver = user?.user_type === 'DRIVER';
    if (!isDriver || !user?.driver?.is_online) {
      if (gpsBroadcastRef.current) { clearInterval(gpsBroadcastRef.current); gpsBroadcastRef.current = null; }
      if (gpsHttpRef.current) { clearInterval(gpsHttpRef.current); gpsHttpRef.current = null; }
      return;
    }

    const driverId = user?.driver?.id;
    const tenantId = user?.tenant_id;

    // Broadcast via Supabase Realtime (tempo real, ~100ms latência)
    const broadcast = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isRealtimeAvailable() && driverId) {
            sendGPSBroadcast(driverId, pos.coords.latitude, pos.coords.longitude, tenantId, 'platform');
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
      );
    };

    // HTTP POST para persistência no banco (a cada 30s)
    const persist = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => { driverService.updateLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {}); },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    };

    broadcast(); persist();
    gpsBroadcastRef.current = setInterval(broadcast, 2000);
    gpsHttpRef.current = setInterval(persist, 30000);

    return () => {
      if (gpsBroadcastRef.current) { clearInterval(gpsBroadcastRef.current); gpsBroadcastRef.current = null; }
      if (gpsHttpRef.current) { clearInterval(gpsHttpRef.current); gpsHttpRef.current = null; }
    };
  }, [user?.user_type, user?.driver?.is_online, user?.driver?.id, user?.tenant_id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.user_type === 'ADMIN';
  // Super admin: campo is_super_admin do backend
  const isSuperAdmin = user?.user_type === 'ADMIN' && user?.is_super_admin;

  const driverNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Pedidos', href: '/orders', icon: Package },
    { name: 'Ganhos', href: '/earnings', icon: DollarSign },
    { name: 'Carteira', href: '/wallet', icon: Wallet },
    { name: 'Histórico', href: '/history', icon: Clock },
    { name: 'Ranking', href: '/ranking', icon: Trophy },
  ];

  const adminNavigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    {
      name: 'Operações',
      icon: Package,
      children: [
        { name: 'Pedidos', href: '/admin/orders', icon: Package },
        { name: 'Rotas', href: '/admin/platform-routes', icon: Bike },
        { name: 'Config. Rotas', href: '/admin/route-settings', icon: Route },
      ]
    },
    {
      name: 'Negócios',
      icon: Store,
      children: [
        { name: 'Estabelecimentos', href: '/admin/establishments', icon: Store },
        { name: 'Praças', href: '/admin/squares', icon: MapPin },
        { name: 'Entregadores', href: '/admin/drivers', icon: Users },
      ]
    },
    {
      name: 'Financeiro',
      icon: DollarSign,
      children: [
        { name: 'Visão Geral', href: '/admin/finance', icon: BarChart3 },
        { name: 'Pagamentos Próprios', href: '/admin/payment-reports', icon: Wallet },
        { name: 'Assinaturas', href: '/admin/subscriptions', icon: CreditCard },
        { name: 'Inadimplência', href: '/admin/overdue-report', icon: AlertTriangle },
        { name: 'Saques', href: '/admin/withdrawals', icon: CreditCard },
        { name: 'Faturas', href: '/admin/invoices', icon: FileText },
      ]
    },
    {
      name: 'Configurações',
      icon: Settings,
      children: [
        { name: 'Geral', href: '/admin/settings', icon: Settings },
        { name: 'Preços', href: '/admin/pricing', icon: DollarSign },
        { name: 'Taxas', href: '/admin/dynamic-pricing', icon: TrendingUp },
        { name: 'Integrações', href: '/admin/integrations', icon: Globe },
        { name: 'Relatórios', href: '/admin/reports', icon: FileText },
      ]
    },
  ];

  const platformNavigation = [
    { name: 'Dashboard', href: '/platform', icon: LayoutDashboard },
  ];

  const navigation = isSuperAdmin && location.pathname.startsWith('/platform')
    ? platformNavigation
    : isAdmin
      ? adminNavigation
      : driverNavigation;

  const userInitials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`
    : user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
      <LayoutHeader
        user={user}
        userInitials={userInitials}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        desktopNav={
          <LayoutNav
            navigation={navigation}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
          />
        }
        mobileNav={
          isMobileMenuOpen && (
            <MobileNav
              navigation={navigation}
              isSuperAdmin={isSuperAdmin}
              onCloseMenu={() => setIsMobileMenuOpen(false)}
            />
          )
        }
      />

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>

      {/* Order Offer Popup (apenas para entregadores) */}
      {!isAdmin && !isSuperAdmin && <OrderOfferPopup />}

      <LayoutFooter />
    </div>
  );
};

export default Layout;
