import React from 'react';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';

const PlatformAdmins = ({ admins, onCreateClick, onEditAdmin, onDeleteAdmin }) => (
  <div style={{
    background: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden'
  }}>
    <div style={{
      padding: '1.25rem 1.5rem',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>
        Admins Cadastrados
      </h2>
      <button
        onClick={onCreateClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: '#2563eb',
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <Plus size={18} />
        Novo Admin
      </button>
    </div>

    {admins.length === 0 ? (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: '#64748b'
      }}>
        <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p style={{ fontSize: '0.9375rem' }}>Nenhum admin cadastrado</p>
        <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
          Clique em "Novo Admin" para começar
        </p>
      </div>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem'
        }}>
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
                  {admin.company_name || '-'}
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
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: admin.status === 'ACTIVE' ? '#dcfce7' : '#fef2f2',
                    color: admin.status === 'ACTIVE' ? '#16a34a' : '#dc2626'
                  }}>
                    {admin.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => onEditAdmin(admin)}
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
    )}
  </div>
);

export default PlatformAdmins;
