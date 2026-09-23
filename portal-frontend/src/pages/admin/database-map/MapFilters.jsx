import React from 'react';
import { section, badge, actionBtn, card } from './DataSection.helpers';

export const TenantsSection = ({ tenants, onToggleActive }) =>
  section(`Tenants (${tenants?.length || 0})`,
    tenants?.length ? tenants.map(t => card(
      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>ID:{t.id}</strong> {t.name} {badge(t.plan, '#1e40af', '#dbeafe')} {t.is_active ? badge('Ativo', '#166534', '#dcfce7') : badge('Inativo', '#dc2626', '#fee2e2')}
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>slug: {t.slug}</span>
        </div>
        <div>
          {actionBtn(
            t.is_active ? 'Desativar' : 'Ativar',
            t.is_active ? '#dc2626' : '#166534',
            t.is_active ? '#fee2e2' : '#dcfce7',
            () => onToggleActive(t)
          )}
        </div>
      </div>
    )) : <p style={{ color: '#64748b' }}>Nenhum tenant cadastrado</p>
  );

export const SquaresSection = ({ squares }) =>
  section(`Praças (${squares?.length || 0})`,
    squares?.length ? squares.map(s => card(
      <div key={s.id}>
        <strong>ID:{s.id}</strong> {s.name} - {s.city}/{s.state}
        {s.tenant_id ? badge(`tenant:${s.tenant_id}`, '#7c3aed', '#f3e8ff') : badge('sem tenant', '#64748b', '#f1f5f9')}
        {s.is_active ? badge('Ativo', '#166534', '#dcfce7') : badge('Inativo', '#dc2626', '#fee2e2')}
      </div>
    )) : <p style={{ color: '#64748b' }}>Nenhuma praça cadastrada</p>
  );

export const UsersSection = ({ users, onEdit, onDelete }) =>
  section(`Usuários (${users?.length || 0})`,
    users?.length ? users.map(u => {
      const typeColors = { ADMIN: ['#7c3aed', '#f3e8ff'], CLIENT: ['#0d9488', '#f0fdfa'], DRIVER: ['#2563eb', '#dbeafe'] };
      const [c, bg] = typeColors[u.user_type] || ['#64748b', '#f1f5f9'];
      const isSuperAdmin = u.user_type === 'ADMIN' && u.is_super_admin;
      return card(
        <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>ID:{u.id}</strong> {u.first_name} {u.last_name} {badge(u.user_type, c, bg)}
            {isSuperAdmin ? badge('SUPER ADMIN', '#f59e0b', '#fef3c7') : (u.tenant_id ? badge(`tenant:${u.tenant_id}`, '#7c3aed', '#f3e8ff') : null)}
            {badge(u.status, u.status === 'ACTIVE' ? '#166534' : '#dc2626', u.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2')}
            {u.square_name ? badge(`praça: ${u.square_name}`, '#0d9488', '#f0fdfa') : null}
            {u.linked_name ? <span style={{ fontSize: '0.6875rem', color: '#64748b', marginLeft: '0.25rem' }}>({u.linked_name})</span> : null}
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {u.email} {u.phone ? `• ${u.phone}` : ''} {u.cpf ? `• CPF: ${u.cpf}` : ''}
              {u.vehicle_type ? ` • ${u.vehicle_type}` : ''} {u.vehicle_plate ? `• ${u.vehicle_plate}` : ''}
            </div>
          </div>
          <div>
            {actionBtn('Editar', '#2563eb', '#dbeafe', () => onEdit(u))}
            {!isSuperAdmin && actionBtn('Excluir', '#dc2626', '#fee2e2', () => onDelete(u))}
          </div>
        </div>
      );
    }) : <p style={{ color: '#64748b' }}>Nenhum usuário</p>
  );

export const RestaurantsSection = ({ restaurants, onDelete }) =>
  section(`Restaurantes (${restaurants?.length || 0})`,
    restaurants?.length ? restaurants.map(r => card(
      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>ID:{r.id}</strong> {r.name}
          {r.tenant_id ? badge(`tenant:${r.tenant_id}`, '#7c3aed', '#f3e8ff') : null}
          {r.square_id ? badge(`praça:${r.square_id}`, '#0d9488', '#f0fdfa') : null}
          {r.has_own_drivers ? badge('Tem Próprios', '#f59e0b', '#fef3c7') : null}
          {r.is_active ? badge('Ativo', '#166534', '#dcfce7') : badge('Inativo', '#dc2626', '#fee2e2')}
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.address}</div>
        </div>
        <div>
          {actionBtn('Excluir', '#dc2626', '#fee2e2', () => onDelete(r))}
        </div>
      </div>
    )) : <p style={{ color: '#64748b' }}>Nenhum restaurante</p>
  );

export const PlatformDriversSection = ({ drivers }) =>
  section(`Entregadores da Plataforma (${drivers?.length || 0})`,
    drivers?.length ? drivers.map(d => card(
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
  );

export const OwnDriversSection = ({ drivers, onDelete }) =>
  section(`Entregadores Próprios (${drivers?.length || 0})`,
    drivers?.length ? drivers.map(d => card(
      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeftColor: '#f59e0b' }}>
        <div>
          <strong>ID:{d.id}</strong> {d.name} {badge('PRÓPRIO', '#92400e', '#fef3c7')}
          {d.vehicle_type} {d.vehicle_plate ? `• ${d.vehicle_plate}` : ''}
          <span style={{ fontWeight: 500, color: '#0d9488', marginLeft: '0.5rem' }}>Restaurante: {d.restaurant_name} (ID:{d.restaurant_id})</span>
          {d.square_name ? badge(`${d.square_name}`, '#0d9488', '#f0fdfa') : null}
          {d.tenant_id ? badge(`tenant:${d.tenant_id}`, '#7c3aed', '#f3e8ff') : null}
          {d.is_online ? badge('Online', '#166534', '#dcfce7') : badge('Offline', '#64748b', '#f1f5f9')}
          {d.has_pin ? badge('PIN ✓', '#1d4ed8', '#dbeafe') : badge('SEM PIN', '#dc2626', '#fee2e2')}
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>tel:{d.phone} • entregas:{d.total_deliveries}</div>
        </div>
        <div>
          {actionBtn('Excluir', '#dc2626', '#fee2e2', () => onDelete(d))}
        </div>
      </div>
    )) : <p style={{ color: '#64748b' }}>Nenhum entregador próprio</p>
  );

export const OrderSummarySection = ({ orderSummary }) =>
  section(`Pedidos - Resumo por Status`,
    orderSummary?.length ? (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
        {orderSummary.map(s => (
          <div key={s.status} style={{ background: 'white', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{s.count}</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.status}</p>
          </div>
        ))}
      </div>
    ) : <p style={{ color: '#64748b' }}>Nenhum pedido</p>
  );

export const RecentOrdersSection = ({ orders }) =>
  section(`Últimos Pedidos`,
    orders?.length ? orders.map(o => {
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
  );
