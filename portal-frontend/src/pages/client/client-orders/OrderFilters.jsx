import React from 'react';
import { Search } from 'lucide-react';

const FilterBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', border: 'none', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', background: active ? '#0d9488' : '#f1f5f9', color: active ? 'white' : '#64748b' }}>
    {children}
  </button>
);

const OrderFilters = ({ search, setSearch, filter, setFilter, setPage }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input
          type="text"
          placeholder="Buscar por número, cliente ou endereço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        <FilterBtn active={filter === ''} onClick={() => { setFilter(''); setPage(1); }}>Todos</FilterBtn>
        <FilterBtn active={filter === 'pending'} onClick={() => { setFilter('pending'); setPage(1); }}>Pendentes</FilterBtn>
        <FilterBtn active={filter === 'active'} onClick={() => { setFilter('active'); setPage(1); }}>Em Andamento</FilterBtn>
        <FilterBtn active={filter === 'DELIVERED'} onClick={() => { setFilter('DELIVERED'); setPage(1); }}>Entregues</FilterBtn>
        <FilterBtn active={filter === 'CANCELLED'} onClick={() => { setFilter('CANCELLED'); setPage(1); }}>Cancelados</FilterBtn>
      </div>
    </div>
  </div>
);

export default OrderFilters;
