import React from 'react';
import { Package, DollarSign, Route } from 'lucide-react';

const ActionButton = ({ icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
      transition: 'all 0.15s'
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <span style={{ color }}>{icon}</span>
    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{label}</span>
  </button>
);

const OwnDriverActions = ({ onNavigate }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
    <ActionButton
      icon={<Package size={20} />}
      label="Histórico"
      onClick={() => onNavigate('/own-driver/orders')}
      color="#2563eb"
    />
    <ActionButton
      icon={<DollarSign size={20} />}
      label="Ganhos"
      onClick={() => onNavigate('/own-driver/earnings')}
      color="#16a34a"
    />
    <ActionButton
      icon={<Route size={20} />}
      label="Rotas"
      onClick={() => onNavigate('/own-driver/routes')}
      color="#8b5cf6"
    />
  </div>
);

export default OwnDriverActions;
