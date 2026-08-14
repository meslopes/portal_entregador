import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Home, Package, DollarSign, Clock, User, Settings, LogOut,
  Menu, X, LayoutDashboard, Users, ChevronDown, Store, BarChart3, FileText, CreditCard, MapPin, Trophy, Shield, Plus, Wallet, TrendingUp, Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import SquareSelector from '@/components/SquareSelector';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.user_type === 'ADMIN';
  const isSuperAdmin = !user?.tenant_id || ['plataform@muv.log.br', 'muvy.log@gmail.com'].includes(user?.email);

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
    { name: 'Clientes', href: '/admin/establishments', icon: Store },
    { name: 'Entregadores', href: '/admin/drivers', icon: Users },
    { name: 'Pedidos', href: '/admin/orders', icon: Package },
    { name: 'Financeiro', href: '/admin/finance', icon: BarChart3 },
    { name: 'Preços', href: '/admin/pricing', icon: DollarSign },
    { name: 'Taxas', href: '/admin/dynamic-pricing', icon: TrendingUp },
    { name: 'Integrações', href: '/admin/integrations', icon: Globe },
    { name: 'Saques', href: '/admin/withdrawals', icon: CreditCard },
    { name: 'Faturas', href: '/admin/invoices', icon: FileText },
    { name: 'Relatórios', href: '/admin/reports', icon: FileText },
    { name: 'Configurações', href: '/admin/settings', icon: Settings },
  ];

  const platformNavigation = [
    { name: 'Dashboard', href: '/platform', icon: LayoutDashboard },
    { name: 'Tenants', href: '/platform', icon: Store },
    { name: 'Usuários', href: '/platform', icon: Users },
  ];

  const navigation = isSuperAdmin && location.pathname.startsWith('/platform') 
    ? platformNavigation 
    : isAdmin 
      ? adminNavigation 
      : driverNavigation;
  const isActive = (href) => location.pathname === href;

  const userInitials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`
    : user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4.5rem' }}>
            {/* Logo */}
            <Link to={isSuperAdmin && location.pathname.startsWith('/platform') ? '/platform' : isAdmin ? '/admin' : '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
              <img src="/logo-muvy.jpg" alt="muv.log" style={{ height: '2.5rem', borderRadius: '0.5rem' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                {isSuperAdmin && location.pathname.startsWith('/platform') ? 'muv.log Platform' : 'muv.log'}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap', overflowX: 'auto' }}>
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      background: active ? '#eff6ff' : 'transparent',
                      color: active ? '#2563eb' : '#64748b',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={16} />
                    {item.name}
                  </Link>
                );
              })}
              {isAdmin && !isSuperAdmin && (
                <Link
                  to="/client/new-order"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: '#2563eb',
                    color: 'white',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={16} />
                  Lançar Pedido
                </Link>
              )}
            </nav>

            {/* User Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, position: 'relative', zIndex: 100001 }}>
              {isAdmin && !isSuperAdmin && <SquareSelector />}
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}>
                    <Avatar style={{ height: '2rem', width: '2rem' }}>
                      <AvatarFallback style={{ fontSize: '0.75rem', background: '#2563eb', color: 'white' }}>{userInitials}</AvatarFallback>
                    </Avatar>
                    <ChevronDown size={14} style={{ color: '#94a3b8' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" style={{ width: '220px', zIndex: 100002 }}>
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{user?.first_name} {user?.last_name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user?.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate(isAdmin ? '/admin/settings' : '/profile')} style={{ cursor: 'pointer', padding: '0.625rem 0.75rem' }}>
                    <User size={16} style={{ marginRight: '0.75rem', color: '#64748b' }} />
                    <span style={{ fontSize: '0.875rem' }}>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} style={{ cursor: 'pointer', padding: '0.625rem 0.75rem', color: '#dc2626' }}>
                    <LogOut size={16} style={{ marginRight: '0.75rem' }} />
                    <span style={{ fontSize: '0.875rem' }}>Sair do sistema</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="mobile-menu-btn"
                aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isMobileMenuOpen}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div style={{ padding: '0.5rem 1rem 1rem', borderTop: '1px solid #f1f5f9' }}>
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    marginBottom: '0.25rem',
                    background: active ? '#eff6ff' : 'transparent',
                    color: active ? '#2563eb' : '#475569'
                  }}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
        {children}
      </main>

      <style>{`
        .mobile-menu-btn { display: none; }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          nav { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Layout;
