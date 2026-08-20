import React, { useState, useEffect } from 'react';
import api, { adminService } from '@/lib/api';

const DatabaseMapPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

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

  const showMsg = (msg, isError = false) => {
    setActionMsg({ text: msg, isError });
    setTimeout(() => setActionMsg(''), 4000);
  };

  const handleDeleteUser = async (user) => {
    const isSuperAdmin = user.user_type === 'ADMIN' && !user.tenant_id;
    if (isSuperAdmin) { alert('Não é possível excluir o super admin.'); return; }
    if (!window.confirm(`Excluir ${user.first_name} ${user.last_name} (${user.email})?`)) return;
    try {
      await adminService.deleteUser(user.id);
      showMsg(`${user.first_name} ${user.last_name} excluído`);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao excluir', true);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      // User fields
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      cpf: user.cpf || '',
      status: user.status || 'ACTIVE',
      user_type: user.user_type || '',
      tenant_id: user.tenant_id || '',
      // Driver fields
      vehicle_type: user.vehicle_type || 'MOTORCYCLE',
      vehicle_plate: user.vehicle_plate || '',
      vehicle_model: user.vehicle_model || '',
      vehicle_year: user.vehicle_year || '',
      driver_license: user.driver_license || '',
      pix_key: user.pix_key || '',
      bank_account: user.bank_account || '',
      max_concurrent_orders: user.max_concurrent_orders || 3,
      square_id: user.square_id || '',
      // Client fields
      customer_name: user.linked_name || '',
      restaurant_id: user.restaurant_id || '',
      // Password
      new_password: ''
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);

      // Prepare user data
      const userData = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        cpf: editForm.cpf,
        status: editForm.status,
        user_type: editForm.user_type
      };

      // Add driver-specific fields
      if (editingUser.user_type === 'DRIVER') {
        userData.vehicle_type = editForm.vehicle_type;
        userData.vehicle_plate = editForm.vehicle_plate;
        userData.vehicle_model = editForm.vehicle_model;
        userData.vehicle_year = editForm.vehicle_year ? parseInt(editForm.vehicle_year) : null;
        userData.driver_license = editForm.driver_license;
        userData.pix_key = editForm.pix_key;
        userData.bank_account = editForm.bank_account;
        userData.max_concurrent_orders = editForm.max_concurrent_orders ? parseInt(editForm.max_concurrent_orders) : 3;
        userData.square_id = editForm.square_id ? parseInt(editForm.square_id) : null;
      }

      // Add client-specific fields
      if (editingUser.user_type === 'CLIENT') {
        userData.customer_name = editForm.customer_name;
      }

      await adminService.updateUser(editingUser.id, userData);

      // Reset password if provided
      if (editForm.new_password && editForm.new_password.length >= 4) {
        try {
          await api.post(`/api/admin/users/${editingUser.id}/reset-password`, {
            new_password: editForm.new_password
          });
        } catch (pwErr) {
          showMsg('Dados salvos, mas erro ao redefinir senha: ' + (pwErr.response?.data?.error || 'erro'), true);
          setSaving(false);
          return;
        }
      }

      showMsg(`${editForm.first_name} ${editForm.last_name} atualizado com sucesso`);
      setEditingUser(null);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao atualizar', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOwnDriver = async (driver) => {
    if (!window.confirm(`Excluir entregador próprio "${driver.name}"?`)) return;
    try {
      await api.delete(`/api/admin/establishment-drivers/${driver.id}`);
      showMsg(`Entregador ${driver.name} excluído`);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao excluir', true);
    }
  };

  const handleDeleteRestaurant = async (restaurant) => {
    if (!window.confirm(`Excluir restaurante "${restaurant.name}"?`)) return;
    try {
      await api.delete(`/api/admin/restaurants/${restaurant.id}`);
      showMsg(`Restaurante ${restaurant.name} excluído`);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erro ao excluir', true);
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

  const actionBtn = (label, color, bg, onClick, title = '') => (
    <button onClick={onClick} title={title || label} style={{
      padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: 'none',
      background: bg, color, fontSize: '0.6875rem', fontWeight: 600,
      cursor: 'pointer', marginLeft: '0.375rem', transition: 'opacity 0.15s'
    }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
       onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
      {label}
    </button>
  );

  const card = (children, borderColor = '#e2e8f0') => (
    <div style={{ background: 'white', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderLeft: `3px solid ${borderColor}` }}>
      {children}
    </div>
  );

  // Get available squares for dropdown
  const squares = data.squares || [];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>Mapa do Banco de Dados</h1>
        <button onClick={loadData} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Atualizar</button>
      </div>

      {actionMsg && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', background: actionMsg.isError ? '#fef2f2' : '#dcfce7', border: `1px solid ${actionMsg.isError ? '#fecaca' : '#86efac'}`, color: actionMsg.isError ? '#dc2626' : '#166534', fontSize: '0.875rem' }}>
          {actionMsg.text}
        </div>
      )}

      {/* Tenants */}
      {section(`Tenants (${data.tenants?.length || 0})`,
        data.tenants?.length ? data.tenants.map(t => card(
          <div key={t.id}>
            <strong>ID:{t.id}</strong> {t.name} {badge(t.plan, '#1e40af', '#dbeafe')} {t.is_active ? badge('Ativo', '#166534', '#dcfce7') : badge('Inativo', '#dc2626', '#fee2e2')}
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>slug: {t.slug}</span>
          </div>
        )) : <p style={{ color: '#64748b' }}>Nenhum tenant cadastrado</p>
      )}

      {/* Praças */}
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
          const isSuperAdmin = u.user_type === 'ADMIN' && !u.tenant_id;
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
                {actionBtn('Editar', '#2563eb', '#dbeafe', () => openEdit(u))}
                {!isSuperAdmin && actionBtn('Excluir', '#dc2626', '#fee2e2', () => handleDeleteUser(u))}
              </div>
            </div>
          );
        }) : <p style={{ color: '#64748b' }}>Nenhum usuário</p>
      )}

      {/* Restaurantes */}
      {section(`Restaurantes (${data.restaurants?.length || 0})`,
        data.restaurants?.length ? data.restaurants.map(r => card(
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
              {actionBtn('Excluir', '#dc2626', '#fee2e2', () => handleDeleteRestaurant(r))}
            </div>
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
              {actionBtn('Excluir', '#dc2626', '#fee2e2', () => handleDeleteOwnDriver(d))}
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

      {/* ====== MODAL DE EDIÇÃO COMPLETA ====== */}
      {editingUser && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={() => setEditingUser(null)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', zIndex: 100000, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                Editar Usuário ID:{editingUser.id} — {editingUser.first_name} {editingUser.last_name}
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ padding: '1.25rem' }}>

              {/* SEÇÃO: DADOS PESSOAIS */}
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0d9488', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dados Pessoais</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <Field label="Nome" value={editForm.first_name} onChange={v => setEditForm(p => ({ ...p, first_name: v }))} />
                <Field label="Sobrenome" value={editForm.last_name} onChange={v => setEditForm(p => ({ ...p, last_name: v }))} />
                <Field label="Email" value={editForm.email} onChange={v => setEditForm(p => ({ ...p, email: v }))} type="email" />
                <Field label="Telefone" value={editForm.phone} onChange={v => setEditForm(p => ({ ...p, phone: v }))} />
                <Field label="CPF" value={editForm.cpf} onChange={v => setEditForm(p => ({ ...p, cpf: v }))} />
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* SEÇÃO: VÍNCULOS */}
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#7c3aed', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vínculos</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select value={editForm.user_type} onChange={e => setEditForm(p => ({ ...p, user_type: e.target.value }))} style={inputStyle}>
                    <option value="DRIVER">DRIVER (Entregador)</option>
                    <option value="CLIENT">CLIENT (Estabelecimento)</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Tenant ID</label>
                  <input value={editForm.tenant_id} onChange={e => setEditForm(p => ({ ...p, tenant_id: e.target.value }))} style={inputStyle} placeholder="null = super admin" />
                </div>
                {editingUser.user_type === 'DRIVER' && (
                  <div>
                    <label style={labelStyle}>Praça</label>
                    <select value={editForm.square_id} onChange={e => setEditForm(p => ({ ...p, square_id: e.target.value }))} style={inputStyle}>
                      <option value="">Nenhuma</option>
                      {squares.map(s => <option key={s.id} value={s.id}>{s.name} - {s.city}/{s.state}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* SEÇÃO: DADOS DO ENTREGADOR (DRIVER) */}
              {editingUser.user_type === 'DRIVER' && (
                <>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dados do Entregador</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Veículo</label>
                      <select value={editForm.vehicle_type} onChange={e => setEditForm(p => ({ ...p, vehicle_type: e.target.value }))} style={inputStyle}>
                        <option value="MOTORCYCLE">🏍️ Moto</option>
                        <option value="BICYCLE">🚲 Bicicleta</option>
                        <option value="CAR">🚗 Carro</option>
                      </select>
                    </div>
                    <Field label="Placa" value={editForm.vehicle_plate} onChange={v => setEditForm(p => ({ ...p, vehicle_plate: v }))} />
                    <Field label="Modelo" value={editForm.vehicle_model} onChange={v => setEditForm(p => ({ ...p, vehicle_model: v }))} />
                    <Field label="Ano" value={editForm.vehicle_year} onChange={v => setEditForm(p => ({ ...p, vehicle_year: v }))} />
                    <Field label="CNH" value={editForm.driver_license} onChange={v => setEditForm(p => ({ ...p, driver_license: v }))} />
                    <Field label="PIX" value={editForm.pix_key} onChange={v => setEditForm(p => ({ ...p, pix_key: v }))} />
                    <Field label="Conta Bancária" value={editForm.bank_account} onChange={v => setEditForm(p => ({ ...p, bank_account: v }))} />
                    <Field label="Pedidos Simultâneos" value={editForm.max_concurrent_orders} onChange={v => setEditForm(p => ({ ...p, max_concurrent_orders: v }))} type="number" />
                  </div>
                </>
              )}

              {/* SEÇÃO: DADOS DO ESTABELECIMENTO (CLIENT) */}
              {editingUser.user_type === 'CLIENT' && (
                <>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0d9488', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dados do Estabelecimento</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <Field label="Nome do Estabelecimento (Customer)" value={editForm.customer_name} onChange={v => setEditForm(p => ({ ...p, customer_name: v }))} />
                    {editingUser.restaurant_id && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.5rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
                        Restaurante vinculado: ID:{editingUser.restaurant_id} — {editingUser.restaurant_name}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* SEÇÃO: REDEFINIR SENHA */}
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Redefinir Senha</h4>
              <div style={{ marginBottom: '1.5rem' }}>
                <Field label="Nova Senha (deixe vazio para não alterar)" value={editForm.new_password} onChange={v => setEditForm(p => ({ ...p, new_password: v }))} type="password" placeholder="Mínimo 4 caracteres" />
              </div>

              {/* BOTÕES */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'white', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => setEditingUser(null)} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>Cancelar</button>
                <button onClick={handleSaveUser} disabled={saving} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando...' : 'Salvar Tudo'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#1e40af' }}>
        <strong>Dica:</strong> Esta página consulta o endpoint <code>/api/admin/database-map</code>.
        Atualize após cada deploy para ver o estado atual do banco.
      </div>
    </div>
  );
};

// Componentes auxiliares
const Field = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} placeholder={placeholder} />
  </div>
);

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem'
};

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
  border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit'
};

export default DatabaseMapPage;
