import { Bike, Route } from 'lucide-react';

export default function RoutesTab({ routes, onNavigate }) {
  return (
    <div style={{ padding: '0.5rem' }}>
      <div style={{ padding: '0.5rem', marginBottom: '0.5rem' }}>
        <a
          href="/admin/platform-routes"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.5rem', borderRadius: '0.375rem',
            background: '#2563eb', color: 'white',
            fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none'
          }}
        >
          <Route size={14} /> Gerenciar Rotas
        </a>
      </div>
      {routes.map(route => (
        <div
          key={route.id}
          onClick={() => onNavigate('/admin/platform-routes')}
          style={{
            padding: '0.75rem', borderRadius: '0.375rem',
            background: 'transparent', cursor: 'pointer', marginBottom: '0.25rem',
            border: '1px solid transparent'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bike size={14} style={{ color: route.status === 'PENDING' ? '#f59e0b' : '#2563eb' }} />
              <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>Rota #{route.id}</span>
            </div>
            <span style={{
              padding: '0.125rem 0.5rem', borderRadius: '9999px',
              fontSize: '0.75rem', fontWeight: 600,
              background: route.status === 'PENDING' ? '#fef3c7' : '#dbeafe',
              color: route.status === 'PENDING' ? '#92400e' : '#1d4ed8'
            }}>
              {route.status === 'PENDING' ? 'Aguardando' : 'Em Rota'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {route.driver_name || 'Sem entregador'} • {route.stops_count} paradas
          </div>
        </div>
      ))}
    </div>
  );
}
