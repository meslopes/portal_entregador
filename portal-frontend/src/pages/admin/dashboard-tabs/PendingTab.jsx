export default function PendingTab({ pendingUsers, squares, tenants, selectedSquare, onApprove, onReject }) {
  if (pendingUsers.length === 0) {
    return (
      <div style={{ padding: '0.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.75rem' }}>
          Nenhum cadastro pendente
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem' }}>
      {pendingUsers.map(user => (
        <div
          key={user.id}
          style={{
            padding: '0.75rem', borderRadius: '0.375rem',
            background: 'white', marginBottom: '0.5rem',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>
                {user.first_name} {user.last_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {user.email}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {user.phone || 'Sem telefone'}
              </div>
            </div>
            <span style={{
              padding: '0.125rem 0.5rem', borderRadius: '9999px',
              background: user.user_type === 'DRIVER' ? '#dbeafe' : '#fef3c7',
              color: user.user_type === 'DRIVER' ? '#2563eb' : '#d97706',
              fontSize: '0.75rem', fontWeight: 600
            }}>
              {user.user_type === 'DRIVER' ? 'Entregador' : 'Estabelecimento'}
            </span>
          </div>

          {/* Seletor de tenant (apenas para super admin com tenants disponiveis) */}
          {tenants.length > 0 && !user.tenant_id && (
            <div style={{ marginBottom: '0.5rem' }}>
              <select
                id={`tenant-${user.id}`}
                style={{
                  width: '100%', padding: '0.375rem', borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0', fontSize: '0.75rem',
                  outline: 'none', background: 'white'
                }}
              >
                <option value="">Selecionar organizacao...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor de praca */}
          {squares.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <select
                id={`square-${user.id}`}
                style={{
                  width: '100%', padding: '0.375rem', borderRadius: '0.375rem',
                  border: '1px solid #e2e8f0', fontSize: '0.75rem',
                  outline: 'none', background: 'white'
                }}
                defaultValue={selectedSquare?.id || ''}
              >
                <option value="">Selecionar praca...</option>
                {squares.map(sq => (
                  <option key={sq.id} value={sq.id}>{sq.name} - {sq.city}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => {
                const tenantSelect = document.getElementById(`tenant-${user.id}`);
                const squareSelect = document.getElementById(`square-${user.id}`);
                const tenantId = tenantSelect ? parseInt(tenantSelect.value) || null : null;
                const squareId = squareSelect ? parseInt(squareSelect.value) || null : null;
                onApprove(user.id, squareId, tenantId);
              }}
              style={{
                flex: 1, padding: '0.375rem', borderRadius: '0.375rem',
                border: 'none', background: '#16a34a', color: 'white',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Aprovar
            </button>
            <button
              onClick={() => onReject(user.id)}
              style={{
                flex: 1, padding: '0.375rem', borderRadius: '0.375rem',
                border: '1px solid #e2e8f0', background: 'white', color: '#dc2626',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Rejeitar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
