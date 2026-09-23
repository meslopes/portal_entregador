import React from 'react';

const selectStyle = {
  padding: '0.5rem 1rem', borderRadius: '0.5rem',
  border: '1.5px solid #e2e8f0', fontSize: '0.875rem'
};

const labelStyle = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
  color: '#374151', marginBottom: '0.375rem'
};

const PaymentFilters = ({
  period,
  onPeriodChange,
  frequencyFilter,
  onFrequencyChange,
  restaurantFilter,
  onRestaurantChange,
  isAdmin,
  restaurants
}) => (
  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
    <div>
      <label style={labelStyle}>Período</label>
      <select value={period} onChange={e => onPeriodChange(e.target.value)} style={selectStyle}>
        <option value="week">Última Semana</option>
        <option value="month">Último Mês</option>
        <option value="all">Todo Período</option>
      </select>
    </div>
    <div>
      <label style={labelStyle}>Frequência</label>
      <select value={frequencyFilter} onChange={e => onFrequencyChange(e.target.value)} style={selectStyle}>
        <option value="">Todas</option>
        <option value="DAILY">Diário</option>
        <option value="WEEKLY">Semanal</option>
        <option value="MONTHLY">Mensal</option>
        <option value="ON_DEMAND">Sob Demanda</option>
      </select>
    </div>
    {isAdmin && (
      <div>
        <label style={labelStyle}>Restaurante</label>
        <select value={restaurantFilter} onChange={e => onRestaurantChange(e.target.value)} style={selectStyle}>
          <option value="">Todos</option>
          {restaurants.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
    )}
  </div>
);

export default PaymentFilters;
