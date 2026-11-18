import React, { useState, useEffect } from 'react';
import { History, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import api from '@/lib/api';

/**
 * Registro de Atividades (§7.2 do backlog EE — suporte/auditoria).
 * Quem fez o quê, em qual entidade e quando — as mutações principais
 * do admin são gravadas automaticamente (utils/activity_log.py).
 */
const AdminActivityPage = () => {
  const [atividades, setAtividades] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroEntity, setFiltroEntity] = useState('');
  const [filtroAction, setFiltroAction] = useState('');

  const carregar = async () => {
    try {
      setLoading(true);
      setErro('');
      const params = { limit: 100 };
      if (filtroEntity) params.entity = filtroEntity;
      if (filtroAction) params.action = filtroAction;
      const res = await api.get('/api/admin/activity-log', { params });
      setAtividades(res.data.activities || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao carregar o registro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [filtroEntity, filtroAction]);

  const cores = {
    CREATE: '#16a34a', UPDATE: '#2563eb', DELETE: '#dc2626',
    APPROVE: '#0d9488', REJECT: '#b45309',
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={26} /> Registro de Atividades
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
            Quem fez o quê, em qual entidade e quando — apoio e auditoria
          </p>
        </div>
        <button onClick={carregar} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
        <Filter size={16} style={{ color: '#64748b' }} />
        <select value={filtroEntity} onChange={e => setFiltroEntity(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}>
          <option value="">Todas as entidades</option>
          <option value="driver">Entregador</option>
          <option value="establishment">Estabelecimento</option>
          <option value="pricing">Preços</option>
          <option value="user">Usuário</option>
        </select>
        <select value={filtroAction} onChange={e => setFiltroAction(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem' }}>
          <option value="">Todas as ações</option>
          <option value="CREATE">Criação</option>
          <option value="UPDATE">Alteração</option>
          <option value="DELETE">Exclusão</option>
        </select>
        <span style={{ fontSize: '0.8125rem', color: '#64748b', marginLeft: 'auto' }}>{total} registro(s)</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Carregando...</div>
      ) : atividades.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
          Nenhuma atividade registrada ainda.
          <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>As ações da equipe (criar/editar/excluir) aparecem aqui automaticamente.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {atividades.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ padding: '0.125rem 0.625rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 700, background: (cores[a.action] || '#64748b') + '22', color: cores[a.action] || '#64748b', minWidth: '70px', textAlign: 'center' }}>
                {a.action}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                  <strong>{a.user_email || 'sistema'}</strong>
                  {' · '}{a.entity}{a.entity_id ? ` #${a.entity_id}` : ''}
                  {a.entity_label ? ` — ${a.entity_label}` : ''}
                </div>
                {a.details && <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.details}</div>}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminActivityPage;
