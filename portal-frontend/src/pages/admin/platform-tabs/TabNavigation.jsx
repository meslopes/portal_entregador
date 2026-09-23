import React from 'react';
import { Building2, Users, BarChart3, Shield } from 'lucide-react';

const tabs = [
  { key: 'overview', label: 'Visão Geral', icon: BarChart3 },
  { key: 'tenants', label: 'Tenants', icon: Building2 },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'admins', label: 'Admins', icon: Shield },
  { key: 'pending', label: 'Pendentes', icon: Users }
];

const TabNavigation = ({ activeTab, onTabChange }) => (
  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto', flexWrap: 'nowrap' }}>
    {tabs.map(tab => (
      <button
        key={tab.key}
        onClick={() => onTabChange(tab.key)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', borderRadius: '0.5rem',
          border: 'none', background: activeTab === tab.key ? '#eff6ff' : 'transparent',
          color: activeTab === tab.key ? '#2563eb' : '#64748b',
          cursor: 'pointer', fontSize: '0.875rem', fontWeight: activeTab === tab.key ? 600 : 400
        }}
      >
        <tab.icon size={16} /> {tab.label}
      </button>
    ))}
  </div>
);

export default TabNavigation;
