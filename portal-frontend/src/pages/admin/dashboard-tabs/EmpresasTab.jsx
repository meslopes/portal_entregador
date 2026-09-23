import { Store, Plus } from 'lucide-react';

export default function EmpresasTab({ squares, selectedSquare, onSelectSquare }) {
  return (
    <div style={{ padding: '0.5rem' }}>
      <div style={{ padding: '0.5rem', marginBottom: '0.5rem' }}>
        <a
          href="/admin/squares"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.5rem', borderRadius: '0.375rem',
            background: '#2563eb', color: 'white',
            fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none'
          }}
        >
          <Plus size={14} /> Gerenciar Praças
        </a>
      </div>
      {squares.map(sq => (
        <div
          key={sq.id}
          onClick={() => onSelectSquare(selectedSquare?.id === sq.id ? null : sq)}
          style={{
            padding: '0.75rem', borderRadius: '0.375rem',
            background: selectedSquare?.id === sq.id ? '#eff6ff' : 'transparent',
            cursor: 'pointer', marginBottom: '0.25rem',
            border: selectedSquare?.id === sq.id ? '1px solid #bfdbfe' : '1px solid transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={14} style={{ color: '#64748b' }} />
            <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>{sq.name}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {sq.city}/{sq.state}
          </div>
        </div>
      ))}
    </div>
  );
}
