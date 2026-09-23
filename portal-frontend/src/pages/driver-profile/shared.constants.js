export const cardStyle = {
  background: 'white', borderRadius: '0.75rem',
  padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

export const inputStyle = {
  width: '100%', padding: '0.625rem 0.75rem',
  border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
  fontSize: '0.9375rem', outline: 'none',
};

export const saveBtnStyle = (isSaving) => ({
  width: '100%', padding: '0.75rem',
  borderRadius: '0.5rem', border: 'none',
  background: '#2563eb', color: 'white',
  fontSize: '0.9375rem', fontWeight: 600,
  cursor: isSaving ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: '0.5rem', opacity: isSaving ? 0.7 : 1,
});
