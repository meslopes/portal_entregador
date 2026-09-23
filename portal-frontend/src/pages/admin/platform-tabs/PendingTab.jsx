import { Users, RefreshCw, Loader2, Check, X } from 'lucide-react';

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

export default function PendingTab({ pendingUsers, pendingLoading, onRefresh, onApprove, onReject }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>Cadastros Pendentes</h2>
        <button onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {pendingLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
        </div>
      ) : pendingUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ fontSize: '0.875rem' }}>Nenhum cadastro pendente</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {pendingUsers.map(user => (
            <div key={user.id} style={{ background: 'white', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{user.first_name} {user.last_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.phone || 'Sem telefone'}</div>
                </div>
                <span style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', background: user.user_type === 'DRIVER' ? '#dbeafe' : '#fef3c7', color: user.user_type === 'DRIVER' ? '#2563eb' : '#d97706', fontSize: '0.6875rem', fontWeight: 600 }}>
                  {user.user_type === 'DRIVER' ? 'Entregador' : 'Estabelecimento'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => onApprove(user.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: '#16a34a', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                  <Check size={14} /> Aprovar
                </button>
                <button onClick={() => onReject(user.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                  <X size={14} /> Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
