export const PAYMENT_TYPES = {
  PER_DELIVERY: { label: 'Por Entrega', description: 'Valor fixo por entrega', icon: '📦' },
  PER_KM: { label: 'Por Km', description: 'Valor por km rodado', icon: '🛣️' },
  PERCENTAGE: { label: 'Percentual', description: '% do frete cobrado', icon: '📊' },
  DAILY: { label: 'Diária', description: 'Valor fixo por dia', icon: '📅' },
  FIXED: { label: 'Fixo', description: 'Valor fixo combinado', icon: '💰' },
  FIXED_PLUS_DELIVERY: { label: 'Fixo + Entrega', description: 'Valor fixo + por entrega', icon: '📦💰' },
  FIXED_UP_TO_PLUS_DELIVERY: { label: 'Fixo (até X) + Extra', description: 'Fixo até N entregas + extra', icon: '📦📊' }
};

export const selectStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.8125rem',
  outline: 'none',
  background: 'white',
  color: '#1e293b',
  minWidth: '150px'
};

export const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box'
};

export const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '0.375rem'
};

export const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

export const tdStyle = {
  padding: '0.75rem 1rem',
  fontSize: '0.8125rem',
  color: '#1e293b'
};

export const formatCurrency = (value) => `R$ ${(value || 0).toFixed(2)}`;
export const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '-';
