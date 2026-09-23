import { Users, Edit, Trash2, RefreshCw, Loader2 } from 'lucide-react';

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

export default function UsersTab({ users, usersLoading, tenants, selectedTenantFilter, onFilterChange, onRefresh, onEditUser, onDeleteUser }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>Usuários por Tenant</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={selectedTenantFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', fontSize: '0.75rem', outline: 'none', background: 'white' }}
          >
            <option value="">Todos os Tenants</option>
            {tenants.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
          <button onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {usersLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ fontSize: '0.875rem' }}>Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>NOME</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>EMAIL</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>TIPO</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>TENANT</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>STATUS</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>CRIADO EM</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{user.first_name} {user.last_name}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#64748b' }}>{user.email}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', background: user.user_type === 'ADMIN' ? '#dbeafe' : user.user_type === 'DRIVER' ? '#dcfce7' : '#fef3c7', color: user.user_type === 'ADMIN' ? '#2563eb' : user.user_type === 'DRIVER' ? '#16a34a' : '#d97706', fontSize: '0.75rem', fontWeight: 500 }}>
                      {user.user_type === 'ADMIN' ? 'Admin' : user.user_type === 'DRIVER' ? 'Entregador' : 'Cliente'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>{user.tenant_name || 'Plataforma'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', background: user.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: user.status === 'ACTIVE' ? '#166534' : '#991b1b', fontSize: '0.75rem', fontWeight: 500 }}>
                      {user.status === 'ACTIVE' ? 'Ativo' : user.status === 'INACTIVE' ? 'Inativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={() => onEditUser(user)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }} title="Editar"><Edit size={16} /></button>
                      <button onClick={() => onDeleteUser(user.id, user.first_name)} style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }} title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
