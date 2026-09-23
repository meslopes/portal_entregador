import { Plus, Eye, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

export default function TenantsTab({ tenants, onCreateTenant, onToggleTenant, onViewTenant }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
          Todos os Tenants
        </h2>
        <button
          onClick={onCreateTenant}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
            border: 'none', background: '#2563eb', color: 'white',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer'
          }}
        >
          <Plus size={18} /> Novo Tenant
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>NOME</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>SLUG</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>PLANO</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>USUÁRIOS</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>ENTREGADORES</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>PEDIDOS</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>RECEITA</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>STATUS</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(tenant => (
              <tr key={tenant.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{tenant.name}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#64748b' }}>{tenant.slug}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '9999px',
                    background: tenant.plan === 'premium' ? '#dbeafe' : tenant.plan === 'platinum' ? '#e8e8f0' : '#f1f5f9',
                    color: tenant.plan === 'premium' ? '#2563eb' : tenant.plan === 'platinum' ? '#6366f1' : '#64748b',
                    fontSize: '0.75rem', fontWeight: 500
                  }}>{tenant.plan}</span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#1e293b' }}>{tenant.users_count}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#1e293b' }}>{tenant.drivers_count}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#1e293b' }}>{tenant.orders_count}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500, color: '#16a34a' }}>
                  R$ {Number(tenant.revenue || 0).toFixed(2)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <button
                    onClick={() => onToggleTenant(tenant.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.25rem 0.5rem', borderRadius: '9999px',
                      border: 'none', cursor: 'pointer',
                      background: tenant.is_active ? '#dcfce7' : '#fee2e2',
                      color: tenant.is_active ? '#166534' : '#991b1b',
                      fontSize: '0.75rem', fontWeight: 500
                    }}
                  >
                    {tenant.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {tenant.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <button
                    onClick={() => onViewTenant(tenant.id)}
                    style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366f1' }}
                    title="Ver detalhes"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
