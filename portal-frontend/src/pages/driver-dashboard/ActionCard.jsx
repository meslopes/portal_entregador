import React from 'react';
import { ArrowRight } from 'lucide-react';

const ActionCard = ({ icon, iconBg, iconColor, title, description, onClick, badge }) => (
  <div
    onClick={onClick}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); }}}
    role="button"
    tabIndex={0}
    aria-label={title}
    style={{
      background: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      cursor: 'pointer',
      transition: 'all 0.15s',
      border: badge ? '2px solid #f59e0b' : '1px solid transparent'
    }}
    onMouseEnter={e => { if (!badge) { e.currentTarget.style.borderColor = '#e2e8f0'; } e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = badge ? '#f59e0b' : 'transparent'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          padding: '0.75rem',
          borderRadius: '0.5rem',
          background: iconBg,
          color: iconColor,
          position: 'relative'
        }}>
          {icon}
          {badge && (
            <div style={{
              position: 'absolute', top: '-0.375rem', right: '-0.375rem',
              background: '#ef4444', color: 'white', borderRadius: '9999px',
              width: '1.25rem', height: '1.25rem', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', fontWeight: 700,
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              {badge}
            </div>
          )}
        </div>
        <div>
          <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{title}</h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>{description}</p>
        </div>
      </div>
      <ArrowRight size={18} style={{ color: '#cbd5e1' }} />
    </div>
  </div>
);

export default ActionCard;
