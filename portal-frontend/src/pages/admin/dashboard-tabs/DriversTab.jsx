export default function DriversTab({ drivers }) {
  if (drivers.length === 0) {
    return (
      <div style={{ padding: '0.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.75rem' }}>
          Nenhum entregador encontrado
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem' }}>
      {drivers.map(driver => (
        <div
          key={driver.id}
          style={{
            padding: '0.5rem', borderRadius: '0.375rem',
            background: 'white', marginBottom: '0.25rem',
            fontSize: '0.75rem', border: '1px solid #f1f5f9'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontSize: '0.75rem' }}>{driver.is_online ? '🟢' : '⚪'}</span>
              <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.75rem' }}>
                {driver.user?.first_name} {driver.user?.last_name}
              </span>
            </div>
            <span style={{
              padding: '0.125rem 0.375rem', borderRadius: '9999px',
              background: driver.is_online ? '#dcfce7' : '#f1f5f9',
              color: driver.is_online ? '#166534' : '#64748b',
              fontSize: '0.75rem', fontWeight: 500
            }}>
              {driver.is_online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ color: '#64748b', marginTop: '0.125rem', fontSize: '0.75rem' }}>
            {driver.vehicle_type} • {driver.total_deliveries || 0} entregas
          </div>
        </div>
      ))}
    </div>
  );
}
