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
  Home, Package, Clock, User, LogOut, Menu, X, ChevronDown, Plus, DollarSign, Receipt, Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';

const ClientLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/client/login');
  };

  const navigation = [
    { name: 'Início', href: '/client', icon: Home },
    { name: 'Novo Pedido', href: '/client/new-order', icon: Plus },
    { name: 'Meus Pedidos', href: '/client/orders', icon: Package },
    { name: 'Financeiro', href: '/client/financial', icon: DollarSign },
    { name: 'Faturas', href: '/client/invoices', icon: Receipt },
    { name: 'Integrações', href: '/client/integrations', icon: Globe },
  ];

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
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
            {/* Logo */}
            <Link to="/client" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <img src="/logo-muvy.jpg" alt="muv.log" style={{ height: '2rem', borderRadius: '0.375rem' }} />
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>muv.log</span>
              <span style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.625rem',
                fontWeight: 600,
                background: '#f0fdfa',
                color: '#0d9488'
              }}>
                Estabelecimento
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav style={{ display: 'flex', gap: '0.25rem' }}>
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
                      background: active ? '#f0fdfa' : 'transparent',
                      color: active ? '#0d9488' : '#64748b'
                    }}
                  >
                    <Icon size={16} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.375rem 0.75rem', borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0', background: 'white',
                    cursor: 'pointer'
                  }}>
                    <Avatar style={{ height: '2rem', width: '2rem' }}>
                      <AvatarFallback style={{ fontSize: '0.75rem', background: '#0d9488', color: 'white' }}>{userInitials}</AvatarFallback>
                    </Avatar>
                    <ChevronDown size={14} style={{ color: '#94a3b8' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" style={{ width: '220px' }}>
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{user?.first_name} {user?.last_name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user?.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate('/client/profile')} style={{ cursor: 'pointer', padding: '0.625rem 0.75rem' }}>
                    <User size={16} style={{ marginRight: '0.75rem', color: '#64748b' }} />
                    <span style={{ fontSize: '0.875rem' }}>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} style={{ cursor: 'pointer', padding: '0.625rem 0.75rem', color: '#dc2626' }}>
                    <LogOut size={16} style={{ marginRight: '0.75rem' }} />
                    <span style={{ fontSize: '0.875rem' }}>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                style={{
                  display: 'none', padding: '0.5rem', borderRadius: '0.375rem',
                  border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b'
                }}
                className="mobile-menu-btn"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '0.5rem' }} className="mobile-nav">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', borderRadius: '0.5rem',
                    fontSize: '0.9375rem', fontWeight: 500, textDecoration: 'none',
                    marginBottom: '0.25rem',
                    background: active ? '#f0fdfa' : 'transparent',
                    color: active ? '#0d9488' : '#475569'
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
      <main style={{ minHeight: 'calc(100vh - 4rem)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '1rem 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            © 2026 muv.log — Portal do Estabelecimento
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#" style={{ fontSize: '0.8125rem', color: '#94a3b8', textDecoration: 'none' }}>Suporte</a>
            <a href="#" style={{ fontSize: '0.8125rem', color: '#94a3b8', textDecoration: 'none' }}>Termos</a>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          nav { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ClientLayout;
