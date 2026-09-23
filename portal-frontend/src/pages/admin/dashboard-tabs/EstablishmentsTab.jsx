import { Store } from 'lucide-react';

export default function EstablishmentsTab({ establishments }) {
  if (establishments.length === 0) {
    return (
      <div style={{ padding: '0.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.75rem' }}>
          Nenhum estabelecimento com pedidos ativos
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem' }}>
      {establishments.map(est => (
        <div
          key={est.restaurant_id || est.id}
          style={{
            padding: '0.5rem', borderRadius: '0.375rem',
            background: 'white', marginBottom: '0.25rem',
            fontSize: '0.75rem', border: '1px solid #f1f5f9'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Store size={12} style={{ color: '#f59e0b' }} />
              <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.75rem' }}>{est.name}</span>
            </div>
            <span style={{
              padding: '0.125rem 0.375rem', borderRadius: '9999px',
              background: '#fee2e2', color: '#dc2626',
              fontSize: '0.75rem', fontWeight: 600
            }}>
              {est.active_orders || 0} pedidos
            </span>
          </div>
          <div style={{ color: '#64748b', marginTop: '0.125rem', fontSize: '0.75rem' }}>
            {est.address || 'Sem endereço'}
          </div>
        </div>
      ))}
    </div>
  );
}
