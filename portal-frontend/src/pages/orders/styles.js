// Shared inline-style helpers used by Orders sub-components

export const iconBtn = (active) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  background: active ? '#dcfce7' : 'white',
  color: active ? '#16a34a' : '#64748b',
  cursor: 'pointer', transition: 'all 0.15s'
});

export const refreshBtn = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
  border: '1px solid #e2e8f0', background: 'white',
  color: '#475569', fontSize: '0.875rem', fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.15s'
};
