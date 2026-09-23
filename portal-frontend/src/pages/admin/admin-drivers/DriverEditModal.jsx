import React from 'react';
import { X } from 'lucide-react';
import { FormField, inputStyle, btnPrimary, btnSecondary } from './shared';

const DriverEditModal = ({
  editing, editData, formError, formLoading, isSuperAdmin,
  tenants, squares, establishments,
  onClose, onChange, onSubmit, onConvertToOwn,
}) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Editar Entregador</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} style={{ padding: '1.5rem' }}>
          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Nome"><input type="text" value={editData.first_name} onChange={e => onChange('first_name', e.target.value)} style={inputStyle} /></FormField>
            <FormField label="Sobrenome"><input type="text" value={editData.last_name} onChange={e => onChange('last_name', e.target.value)} style={inputStyle} /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Telefone"><input type="text" value={editData.phone} onChange={e => onChange('phone', e.target.value)} style={inputStyle} /></FormField>
            <FormField label="CPF"><input type="text" value={editData.cpf} onChange={e => onChange('cpf', e.target.value)} style={inputStyle} placeholder="000.000.000-00" /></FormField>
          </div>
          <FormField label="Email"><input type="email" value={editData.email} onChange={e => onChange('email', e.target.value)} style={inputStyle} /></FormField>

          {isSuperAdmin && (
            <FormField label="Organização (Tenant)">
              <select value={editData.tenant_id || ''} onChange={e => onChange('tenant_id', e.target.value)} style={inputStyle}>
                <option value="">Selecione uma organização</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label="Praça de Atuação">
            {editing?.square_name && (
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.375rem' }}>
                Atual: <strong>{editing.square_name}</strong>{editing.square_city ? ` - ${editing.square_city}` : ''}
              </p>
            )}
            <select value={editData.square_id} onChange={e => onChange('square_id', e.target.value)} style={inputStyle}>
              <option value="">Selecione uma praça</option>
              {squares.map(sq => (
                <option key={sq.id} value={sq.id}>{sq.name} - {sq.city}/{sq.state}</option>
              ))}
            </select>
            {editData.square_id && editing?.square_id && String(editData.square_id) !== String(editing.square_id) && (
              <p style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem', fontWeight: 500 }}>
                Transferência: o entregador será movido para a nova praça
              </p>
            )}
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Tipo de Veículo">
              <select value={editData.vehicle_type} onChange={e => onChange('vehicle_type', e.target.value)} style={inputStyle}>
                <option value="MOTORCYCLE">Moto</option>
                <option value="CAR">Carro</option>
                <option value="BICYCLE">Bicicleta</option>
                <option value="FOOT">A pé</option>
              </select>
            </FormField>
            <FormField label="Placa"><input type="text" value={editData.vehicle_plate} onChange={e => onChange('vehicle_plate', e.target.value)} style={inputStyle} /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Modelo"><input type="text" value={editData.vehicle_model} onChange={e => onChange('vehicle_model', e.target.value)} style={inputStyle} placeholder="Ex: Honda CG 160" /></FormField>
            <FormField label="Ano"><input type="number" value={editData.vehicle_year} onChange={e => onChange('vehicle_year', e.target.value)} style={inputStyle} placeholder="2020" /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="CNH"><input type="text" value={editData.driver_license} onChange={e => onChange('driver_license', e.target.value)} style={inputStyle} /></FormField>
            <FormField label="Chave PIX"><input type="text" value={editData.pix_key} onChange={e => onChange('pix_key', e.target.value)} style={inputStyle} /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Conta Bancária"><input type="text" value={editData.bank_account} onChange={e => onChange('bank_account', e.target.value)} style={inputStyle} /></FormField>
            <FormField label="Máx. Pedidos Simultâneos"><input type="number" min="1" max="10" value={editData.max_concurrent_orders} onChange={e => onChange('max_concurrent_orders', e.target.value)} style={inputStyle} /></FormField>
          </div>
          {/* Botão para converter em entregador próprio */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', color: '#166534', marginBottom: '0.5rem', fontWeight: 500 }}>
              Converter para Entregador Próprio
            </p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Selecione um estabelecimento para vincular este entregador como próprio.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select id="convert-restaurant" style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
                <option value="">Selecione um estabelecimento</option>
                {establishments.map(est => (
                  <option key={est.id} value={est.id}>{est.name}</option>
                ))}
              </select>
              <button type="button" onClick={onConvertToOwn} style={{
                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                background: '#16a34a', color: 'white', fontSize: '0.8125rem',
                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}>Converter</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button type="submit" disabled={formLoading} style={{ ...btnPrimary, opacity: formLoading ? 0.7 : 1 }}>{formLoading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverEditModal;
