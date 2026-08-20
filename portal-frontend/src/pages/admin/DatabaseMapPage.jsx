import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

const DatabaseMapPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/database-map');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar mapa');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando mapa do banco...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!data) return null;

  const section = (title, children) => (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>{title}</h2>
      {children}
    </div>
  );

  const badge = (text, color, bg) => (
    <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 600, background: bg, color, marginRight: '0.25rem' }}>{text}</span>
  );

  const card = (children) => (
    <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderLeft: '3px solid #e2e8f0' }}>
      {children}
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Mapa do Banco de Dados</h1>
        <button onClick={loadData} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}>Atualizar</button>
      </div>

      {/* Tenants */}
      {section(`Tenants (${data.tenants?.length || 0})`,
        data.tenants?.length ? data.tenants.map(t => card(
          <div key={t.id}>
            <strong>ID:{t.id}</strong> {t.name} {badge(t.plan, '#1e40af', '#dbeafe')} {t.is_active ? badge('Ativo', '#166534', '#dcfce7') : badge('Inativo', '#dc2626', '#fee2e2')}
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>slug: {t.slug}</span>
          </div>
        )) : <p style={{ color: '#64748b' }}>Nenhum tenant cadastrado</p>
      )}

      {/* Pracas */}
      {section(`Praças (${data.squares?.length || 0})`,
        data.squares?.length ? data.squares.map(s => card(
          <div key={s.id}>
            <strong>ID:{s.id}</strong> {s.name} - {s.city}/{s.state}
            {s.tenant_id ? badge(`tenant:${s.tenant_id}`, '#7c3aed', '#f3e8ff') : badge('sem tenant', '#64748b', '#f1f5f9')}
            {s.is_active ? badge('Ativo', '#166534', '#dcfce7') : badge('Inativo', '#dc2626', '#fee2e2')}
          </div>
        )) : <p style={{ color: '#64748b' }}>Nenhuma praça cadastrada</p>
      )}

      {/* Usuarios */}
      {section(`Usuários (${data.users?.length || 0})`,
        data.users?.length ? data.users.map(u => {
          const typeColors = { ADMIN: ['#7c3aed', '#f3e8ff'], CLIENT: ['#0d9488', '#f0fdfa'], DRIVER: ['#2563eb', '#dbeafe'] };
          const [c, bg] = typeColors[u.user_type] || ['#64748b', '#f1f5f9'];
          return card(
            <div key={u.id}>
              <strong>ID:{u.id}</strong> {u.first_name} {u.last_name} {badge(u.user_type, c, bg)}
              {u.tenant_id ? badge(`tenant:${u.tenant_id}`, '#7c3aed', '#f3e8ff') : badge('super-admin', '#f59e0b', '#fef3c7')}
              {badge(u.status, u.status === 'ACTIVE' ? '#166534' : '#dc2626', u.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2')}
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                {u.email} {u.phone ? `• ${u.phone}` : ''}
              </div>
            </div>
          );
        }) : <p style={{ color: '#64748b' }}>Nenhum usuário</p>
      )}

      {/* Restaurantes */}
      {section(`Restaurantes (${data.restaurants?.length || 0})`,
        data.restaurants?.length ? data.restaurants.map(r => card(
          <div key={r.id}>
            <strong>ID:{r.id}</strong> {r.name}
            {r.tenant_id ? badge(`tenant:${r.tenant_id}`, '#7c3aed', '#f3e8ff') : null}
            {r.square_id ? badge(`praça:${r.square_id}`, '#0d9488', '#f0fdfa') : null}
            {r.has_own_drivers ? badge('Tem Próprios', '#f59e0b', '#fef3c7') : null}
            {r.is_active ? badge('Ativo', '#166534', '#dcfce7') : badge('Inativo', '#dc2626', '#fee2e2')}
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.address}</div>
          </div>
        )) : <p style={{ color: '#64748b' }}>Nenhum restaurante</p>
      )}

      {/* Entregadores da Plataforma */}
      {section(`Entregadores da Plataforma (${data.platform_drivers?.length || 0})`,
        data.platform_drivers?.length ? data.platform_drivers.map(d => card(
          <div key={d.id}>
            <strong>ID:{d.id}</strong> {d.name} {badge('PLATAFORMA', '#2563eb', '#dbeafe')}
            {d.vehicle_type} {d.vehicle_plate ? `• ${d.vehicle_plate}` : ''}
            {d.square_id ? badge(`praça:${d.square_id}`, '#0d9488', '#f0fdfa') : null}
            {d.tenant_id ? badge(`tenant:${d.tenant_id}`, '#7c3aed', '#f3e8ff') : null}
            {d.is_online ? badge('Online', '#166534', '#dcfce7') : badge('Offline', '#64748b', '#f1f5f9')}
            {d.is_blocked ? badge('BLOQUEADO', '#dc2626', '#fee2e2') : null}
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {d.email} • entregas:{d.total_deliveries} • nota:{d.rating || '-'}
            </div>
          </div>
        )) : <p style={{ color: '#64748b' }}>Nenhum entregador da plataforma</p>
      )}

      {/* Entregadores Próprios */}
      {section(`Entregadores Próprios (${data.own_drivers?.length || 0})`,
        data.own_drivers?.length ? data.own_drivers.map(d => card(
          <div key={d.id} style={{ borderLeftColor: '#f59e0b' }}>
            <strong>ID:{d.id}</strong> {d.name} {badge('PRÓPRIO', '#92400e', '#fef3c7')}
            {d.vehicle_type} {d.vehicle_plate ? `• ${d.vehicle_plate}` : ''}
            <span style={{ fontWeight: 500, color: '#0d9488', marginLeft: '0.5rem' }}>
              Restaurante: {d.restaurant_name} (ID:{d.restaurant_id})
            </span>
            {d.square_name ? badge(`${d.square_name}`, '#0d9488', '#f0fdfa') : null}
            {d.tenant_id ? badge(`tenant:${d.tenant_id}`, '#7c3aed', '#f3e8ff') : null}
            {d.is_online ? badge('Online', '#166534', '#dcfce7') : badge('Offline', '#64748b', '#f1f5f9')}
            {d.has_pin ? badge('PIN ✓', '#1d4ed8', '#dbeafe') : badge('SEM PIN', '#dc2626', '#fee2e2')}
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              tel:{d.phone} • entregas:{d.total_deliveries}
            </div>
          </div>
        )) : <p style={{ color: '#64748b' }}>Nenhum entregador próprio</p>
      )}

      {/* Pedidos */}
      {section(`Pedidos - Resumo por Status`,
        data.order_summary?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {data.order_summary.map(s => (
              <div key={s.status} style={{ background: 'white', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{s.count}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.status}</p>
              </div>
            ))}
          </div>
        ) : <p style={{ color: '#64748b' }}>Nenhum pedido</p>
      )}

      {/* Últimos Pedidos */}
      {section(`Últimos 15 Pedidos`,
        data.recent_orders?.length ? data.recent_orders.map(o => {
          const driverBadge = o.driver_type === 'OWN' ? badge('PRÓPRIO', '#92400e', '#fef3c7')
            : o.driver_type === 'PLATFORM' ? badge('PLATAFORMA', '#2563eb', '#dbeafe')
            : badge('SEM ENTREGADOR', '#dc2626', '#fee2e2');
          return card(
            <div key={o.id}>
              <strong>#{o.order_number}</strong> {badge(o.status, '#64748b', '#f1f5f9')} {driverBadge}
              <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.25rem' }}>
                {o.restaurant_name} → {o.customer_name}
                {o.driver_name ? ` • Entregador: ${o.driver_name}` : ''}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{o.created_at}</div>
            </div>
          );
        }) : <p style={{ color: '#64748b' }}>Nenhum pedido</p>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#1e40af' }}>
        <strong>Dica:</strong> Esta página consulta o endpoint <code>/api/admin/database-map</code>. 
        Atualize após cada deploy para ver o estado atual do banco.
      </div>
    </div>
  );
};

export default DatabaseMapPage;
