import React from 'react';

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem'
};

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
  border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit'
};

const Field = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} placeholder={placeholder} />
  </div>
);

const EditUserModal = ({ editingUser, editForm, setEditForm, saving, tenants, squares, onClose, onSave }) => {
  if (!editingUser) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '0.75rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', zIndex: 100000, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
            Editar Usuário ID:{editingUser.id} — {editingUser.first_name} {editingUser.last_name}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#64748b' }}>✕</button>
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
              <label style={labelStyle}>Tenant</label>
              <select value={editForm.tenant_id} onChange={e => setEditForm(p => ({ ...p, tenant_id: e.target.value }))} style={inputStyle}>
                <option value="">Nenhum (Super Admin)</option>
                {(tenants || []).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Praça</label>
              <select value={editForm.square_id} onChange={e => setEditForm(p => ({ ...p, square_id: e.target.value }))} style={inputStyle}>
                <option value="">Nenhuma</option>
                {squares.map(s => <option key={s.id} value={s.id}>{s.name} - {s.city}/{s.state}</option>)}
              </select>
            </div>
            {editingUser.user_type === 'CLIENT' && editingUser.restaurant_id && (
              <div>
                <label style={labelStyle}>Restaurante Vinculado</label>
                <input value={`${editingUser.restaurant_name} (ID:${editingUser.restaurant_id})`} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }} />
              </div>
            )}
          </div>

          {/* SEÇÃO: DADOS DO ENTREGADOR (DRIVER) */}
          {editForm.user_type === 'DRIVER' && (
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
          {editForm.user_type === 'CLIENT' && (
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
            <button onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>Cancelar</button>
            <button onClick={onSave} disabled={saving} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : 'Salvar Tudo'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditUserModal;
