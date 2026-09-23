import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';

const MobileNav = ({ navigation, isSuperAdmin, onCloseMenu }) => {
  const location = useLocation();
  const isActive = (href) => location.pathname === href;

  return (
    <div style={{ padding: '0.5rem 1rem 1rem', borderTop: '1px solid #f1f5f9' }}>
      {/* Botão para super admin alternar entre Platform e Admin (mobile) */}
      {isSuperAdmin && (
        <Link
          to={location.pathname.startsWith('/platform') ? '/admin' : '/platform'}
          onClick={onCloseMenu}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: '0.5rem',
            background: location.pathname.startsWith('/platform') ? '#2563eb' : '#7c3aed',
            color: 'white'
          }}
        >
          <Shield size={18} />
          {location.pathname.startsWith('/platform') ? 'Painel Admin' : 'Painel Plataforma'}
        </Link>
      )}
      {navigation.map((item) => {
        const Icon = item.icon;

        // Handle dropdown items with children
        if (item.children) {
          return (
            <div key={item.name} style={{ marginBottom: '0.5rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', fontSize: '0.875rem',
                fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <Icon size={16} />
                {item.name}
              </div>
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const childActive = isActive(child.href);
                return (
                  <Link
                    key={child.name}
                    to={child.href}
                    onClick={onCloseMenu}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.625rem 1rem 0.625rem 2.5rem',
                      borderRadius: '0.5rem', fontSize: '0.875rem',
                      fontWeight: 500, textDecoration: 'none',
                      marginBottom: '0.125rem',
                      background: childActive ? '#eff6ff' : 'transparent',
                      color: childActive ? '#2563eb' : '#475569'
                    }}
                  >
                    <ChildIcon size={16} />
                    {child.name}
                  </Link>
                );
              })}
            </div>
          );
        }

        // Regular menu item
        const active = isActive(item.href);
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={onCloseMenu}
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
  );
};

export default MobileNav;
