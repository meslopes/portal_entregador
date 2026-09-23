import React from 'react';
import { Filter } from 'lucide-react';

const StatusFilterBar = ({ statusFilter, onFilterChange, statusFilters }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <Filter size={16} style={{ color: '#64748b' }} />
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Filtrar por status</span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
      {statusFilters.map(f => {
        const isActive = statusFilter === f.key;
        return (
          <button key={f.key} onClick={() => onFilterChange(f.key)}
            style={{
              padding: '0.375rem 0.875rem', borderRadius: '9999px',
              border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              background: isActive ? f.color : '#f1f5f9',
              color: isActive ? 'white' : '#64748b',
              transition: 'all 0.15s'
            }}>
            {f.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default StatusFilterBar;
