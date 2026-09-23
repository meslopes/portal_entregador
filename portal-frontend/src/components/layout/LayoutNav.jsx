import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';

const LayoutNav = ({ navigation, openDropdown, setOpenDropdown, isAdmin, isSuperAdmin }) => {
  const location = useLocation();
  const isActive = (href) => location.pathname === href;

  return (
    <nav style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap', overflow: 'visible' }}>
      {navigation.map((item) => {
        const Icon = item.icon;

        // Dropdown menu item
        if (item.children) {
          const isAnyChildActive = item.children.some(c => isActive(c.href));
          const isOpen = openDropdown === item.name;
          return (
            <div
              key={item.name}
              style={{ position: 'relative' }}
              onMouseEnter={() => setOpenDropdown(item.name)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                onClick={() => setOpenDropdown(isOpen ? null : item.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: 'none',
                  background: isAnyChildActive ? '#eff6ff' : 'transparent',
                  color: isAnyChildActive ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                {item.name}
                <ChevronDown size={14} />
              </button>
              {isOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  minWidth: '180px',
                  zIndex: 1000,
                  padding: '0.5rem 0'
                }}>
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.name}
                        to={child.href}
                        onClick={() => setOpenDropdown(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          background: childActive ? '#eff6ff' : 'transparent',
                          color: childActive ? '#2563eb' : '#64748b',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <ChildIcon size={14} />
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Regular menu item
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
      {/* Lançar Pedido - disponível para todos os admins no painel admin */}
      {isAdmin && (!isSuperAdmin || location.pathname.startsWith('/admin')) && (
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
  );
};

export default LayoutNav;
