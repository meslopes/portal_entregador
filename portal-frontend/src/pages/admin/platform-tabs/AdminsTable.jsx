import React from 'react';
import { Trash2, Edit, Users, Check, X } from 'lucide-react';

const cardStyle = {
  background: 'white', borderRadius: '0.75rem', padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

// Rótulo e cores do badge de status do admin
const STATUS_BADGE = {
  ACTIVE: { label: 'Ativo', background: '#dcfce7', color: '#16a34a' },
  INACTIVE: { label: 'Pendente', background: '#fef3c7', color: '#b45309' },
  SUSPENDED: { label: 'Suspenso', background: '#fef2f2', color: '#dc2626' },
};

const AdminsTable = ({ admins, onEditUser, onDeleteAdmin, onApprove, onReject }) => {
  if (admins.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
        <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p style={{ fontSize: '0.9375rem' }}>Nenhum admin cadastrado</p>
        <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
          Clique em "Novo Admin" para começar
        </p>
      </div>
    );
  }

  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Admin</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Empresa</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Estab.</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Entr.</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Pedidos</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <tr key={admin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div>
                    <p style={{ fontWeight: 500, color: '#1e293b' }}>
                      {admin.first_name} {admin.last_name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{admin.email}</p>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                  {admin.tenant_name || admin.company_name || '-'}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  {admin.establishments}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  {admin.drivers}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  {admin.orders_month}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  {(() => {
                    const badge = STATUS_BADGE[admin.status] || STATUS_BADGE.SUSPENDED;
                    return (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: badge.background,
                        color: badge.color
                      }}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {/* Admin pendente: aprovar / rejeitar (só super admin — ver backend) */}
                    {admin.status === 'INACTIVE' && onApprove && (
                      <button
                        onClick={() => onApprove(admin.id, admin.first_name)}
                        style={{
                          padding: '0.375rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#16a34a'
                        }}
                        title="Aprovar (liberar acesso)"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    {admin.status === 'INACTIVE' && onReject && (
                      <button
                        onClick={() => onReject(admin.id, admin.first_name)}
                        style={{
                          padding: '0.375rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
                        title="Rejeitar cadastro"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onEditUser(admin)}
                      style={{
                        padding: '0.375rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#2563eb'
                      }}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteAdmin(admin.id, admin.first_name)}
                      style={{
                        padding: '0.375rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#dc2626'
                      }}
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminsTable;
