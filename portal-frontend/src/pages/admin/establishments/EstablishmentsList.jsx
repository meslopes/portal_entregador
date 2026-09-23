import React from 'react';
import { Store, Search, Phone, Mail, MapPin, Edit, Trash2 } from 'lucide-react';
import { utils } from '@/lib/api';

const EstablishmentsList = ({
  establishments, loading, search, page, totalPages,
  onSearch, onPageChange, onOpenDetails, onEdit, onDelete, onToggleActive
}) => {
  if (loading) {
    return (
      <div style={{ minHeight: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '3rem', height: '3rem', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (establishments.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Store size={24} style={{ color: '#64748b' }} />
        </div>
        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
          {search ? 'Nenhum estabelecimento encontrado' : 'Nenhum estabelecimento cadastrado'}
        </p>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          {search ? 'Tente outro termo de busca' : 'Clique em "NOVO ESTABELECIMENTO" para cadastrar'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Busca */}
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '500px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Buscar por nome, endereço, CNPJ ou telefone..."
            value={search}
            onChange={onSearch}
            style={{
              width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem',
              border: '1.5px solid #e2e8f0', borderRadius: '0.5rem',
              fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Header da tabela */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 100px',
          padding: '0.75rem 1.25rem', borderBottom: '1px solid #f1f5f9',
          background: '#f8fafc', fontSize: '0.75rem', fontWeight: 600,
          color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'
        }} className="table-header">
          <span>Estabelecimento</span>
          <span>Contato</span>
          <span style={{ textAlign: 'center' }}>Status</span>
          <span style={{ textAlign: 'center' }}>Hoje</span>
          <span style={{ textAlign: 'center' }}>Semana</span>
          <span style={{ textAlign: 'right' }}>Receita Total</span>
          <span style={{ textAlign: 'center' }}>Ações</span>
        </div>

        {/* Linhas */}
        {establishments.map((est) => (
          <div
            key={est.id}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 100px',
              padding: '1rem 1.25rem', borderBottom: '1px solid #f8fafc',
              alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s'
            }}
            className="table-row"
            onClick={() => onOpenDetails(est.id)}
          >
            {/* Estabelecimento */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                background: '#f0fdfa', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0
              }}>
                <Store size={16} style={{ color: '#0d9488' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{est.name}</p>
                  {est.has_own_drivers && (
                    <span style={{
                      padding: '0.0625rem 0.375rem', borderRadius: '9999px',
                      fontSize: '0.5625rem', fontWeight: 600,
                      background: '#dbeafe', color: '#1d4ed8'
                    }}>
                      Próprios
                    </span>
                  )}
                  {!est.square_id && (
                    <span style={{
                      padding: '0.0625rem 0.375rem', borderRadius: '9999px',
                      fontSize: '0.5625rem', fontWeight: 600,
                      background: '#fef3c7', color: '#92400e'
                    }}>
                      Sem Praça
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.6875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={10} /> {est.address?.length > 30 ? est.address.substring(0, 30) + '...' : est.address}
                </p>
              </div>
            </div>

            {/* Contato */}
            <div>
              {est.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                  <Phone size={12} style={{ color: '#64748b' }} />
                  <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{est.phone}</span>
                </div>
              )}
              {est.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Mail size={12} style={{ color: '#64748b' }} />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{est.email}</span>
                </div>
              )}
              {!est.phone && !est.email && (
                <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>-</span>
              )}
            </div>

            {/* Status */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleActive(est); }}
                style={{
                  padding: '0.125rem 0.625rem', borderRadius: '9999px',
                  fontSize: '0.6875rem', fontWeight: 600, border: 'none',
                  cursor: 'pointer',
                  background: est.is_active ? '#dcfce7' : '#f1f5f9',
                  color: est.is_active ? '#16a34a' : '#64748b'
                }}
              >
                {est.is_active ? 'Ativo' : 'Inativo'}
              </button>
            </div>

            {/* Pedidos Hoje */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                {est.today_orders || 0}
              </span>
            </div>

            {/* Pedidos Semana */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.875rem' }}>
                {est.week_orders || 0}
              </span>
            </div>

            {/* Receita */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                {utils.formatCurrency(est.total_revenue || 0)}
              </span>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => onEdit(est)}
                style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                title="Editar"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDelete(est.id, est.total_orders > 0)}
                style={{ padding: '0.375rem', borderRadius: '0.375rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={() => onPageChange(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.375rem',
              border: '1px solid #e2e8f0', background: 'white',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1, fontSize: '0.875rem'
            }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.375rem',
              border: '1px solid #e2e8f0', background: 'white',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.5 : 1, fontSize: '0.875rem'
            }}
          >
            Próxima
          </button>
        </div>
      )}
    </>
  );
};

export default EstablishmentsList;
