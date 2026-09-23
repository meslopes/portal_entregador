import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Menu, X, ChevronDown, Shield, RefreshCw } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

const LayoutHeader = ({
  user,
  userInitials,
  isAdmin,
  isSuperAdmin,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleLogout,
  desktopNav,
  mobileNav,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4.5rem' }}>
          {/* Logo */}
          <Link to={isSuperAdmin && location.pathname.startsWith('/platform') ? '/platform' : isAdmin ? '/admin' : '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
            <img src={user?.tenant?.logo_url || '/logo-muvlog.jpg'} alt={user?.tenant?.name || 'muv.log'} style={{ height: '2.5rem', borderRadius: '0.5rem', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: user?.tenant?.primary_color || '#1e293b' }}>
              {user?.tenant?.name || (isSuperAdmin && location.pathname.startsWith('/platform') ? 'muv.log Platform' : 'muv.log')}
            </span>
          </Link>

          {/* Desktop Navigation (rendered by parent) */}
          {desktopNav}

          {/* User Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, position: 'relative', zIndex: 100001 }}>
            {/* Refresh - disponível para todos os admins no painel admin */}
            {isAdmin && (!isSuperAdmin || location.pathname.startsWith('/admin')) && (
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  cursor: 'pointer',
                  color: '#64748b',
                  transition: 'all 0.15s'
                }}
                title="Atualizar dados"
              >
                <RefreshCw size={16} />
              </button>
            )}
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
                  <ChevronDown size={14} style={{ color: '#64748b' }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ width: '220px', zIndex: 100002 }}>
                <div style={{ padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{user?.first_name} {user?.last_name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={() => navigate(isAdmin ? '/admin/settings' : '/profile')} style={{ cursor: 'pointer', padding: '0.625rem 0.75rem' }}>
                  <User size={16} style={{ marginRight: '0.75rem', color: '#64748b' }} />
                  <span style={{ fontSize: '0.875rem' }}>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Opção para super admin alternar entre Platform e Admin */}
                {isSuperAdmin && (
                  <DropdownMenuItem onClick={() => navigate(location.pathname.startsWith('/platform') ? '/admin' : '/platform')} style={{ cursor: 'pointer', padding: '0.625rem 0.75rem' }}>
                    <Shield size={16} style={{ marginRight: '0.75rem', color: location.pathname.startsWith('/platform') ? '#2563eb' : '#7c3aed' }} />
                    <span style={{ fontSize: '0.875rem' }}>{location.pathname.startsWith('/platform') ? 'Painel Admin' : 'Painel Plataforma'}</span>
                  </DropdownMenuItem>
                )}
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

      {/* Mobile Navigation (rendered by parent) */}
      {mobileNav}
    </header>
  );
};

export default LayoutHeader;
