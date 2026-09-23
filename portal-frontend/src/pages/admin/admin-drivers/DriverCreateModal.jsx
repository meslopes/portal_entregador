import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { FormField } from './shared';
import { inputStyle, btnPrimary, btnSecondary } from './shared.constants';

const DriverCreateModal = ({
  formData, formError, formLoading, isSuperAdmin,
  tenants, squares, onClose, onChange, onSubmit,
}) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Novo Entregador</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} style={{ padding: '1.5rem' }}>
          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={14} /> {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Nome *">
              <input type="text" name="first_name" value={formData.first_name} onChange={onChange} style={inputStyle} placeholder="João" />
            </FormField>
            <FormField label="Sobrenome *">
              <input type="text" name="last_name" value={formData.last_name} onChange={onChange} style={inputStyle} placeholder="Silva" />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="E-mail *">
              <input type="email" name="email" value={formData.email} onChange={onChange} style={inputStyle} placeholder="entregador@email.com" />
            </FormField>
            <FormField label="Senha">
              <input type="text" name="password" value={formData.password} onChange={onChange} style={inputStyle} />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Telefone">
              <input type="text" name="phone" value={formData.phone} onChange={onChange} style={inputStyle} placeholder="(53) 99999-0000" />
            </FormField>
            <FormField label="CPF">
              <input type="text" name="cpf" value={formData.cpf} onChange={onChange} style={inputStyle} placeholder="000.000.000-00" />
            </FormField>
          </div>

          {isSuperAdmin && (
            <FormField label="Organização (Tenant)">
              <select name="tenant_id" value={formData.tenant_id} onChange={onChange} style={inputStyle}>
                <option value="">Selecione uma organização</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label="Praça">
            <select name="square_id" value={formData.square_id} onChange={onChange} style={inputStyle}>
              <option value="">Selecione uma praça</option>
              {squares.map(sq => (
                <option key={sq.id} value={sq.id}>{sq.name} - {sq.city}/{sq.state}</option>
              ))}
            </select>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Tipo de Veículo">
              <select name="vehicle_type" value={formData.vehicle_type} onChange={onChange} style={inputStyle}>
                <option value="MOTORCYCLE">Moto</option>
                <option value="CAR">Carro</option>
                <option value="BICYCLE">Bicicleta</option>
                <option value="FOOT">A pé</option>
              </select>
            </FormField>
            <FormField label="Placa">
              <input type="text" name="vehicle_plate" value={formData.vehicle_plate} onChange={onChange} style={inputStyle} placeholder="ABC1D23" />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <FormField label="Modelo">
              <input type="text" name="vehicle_model" value={formData.vehicle_model} onChange={onChange} style={inputStyle} placeholder="Honda CG 160" />
            </FormField>
            <FormField label="Ano">
              <input type="number" name="vehicle_year" value={formData.vehicle_year} onChange={onChange} style={inputStyle} placeholder="2024" />
            </FormField>
          </div>

          <FormField label="CNH">
            <input type="text" name="driver_license" value={formData.driver_license} onChange={onChange} style={inputStyle} placeholder="Número da CNH" />
          </FormField>

          <FormField label="Máximo de Pedidos Simultâneos">
            <input type="number" name="max_concurrent_orders" min="1" max="10" value={formData.max_concurrent_orders} onChange={onChange} style={inputStyle} />
            <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.25rem' }}>Quantidade máxima de pedidos que o entregador pode ter ao mesmo tempo (configurável pelo admin)</p>
          </FormField>

          <FormField label="Chave PIX">
            <input type="text" name="pix_key" value={formData.pix_key} onChange={onChange} style={inputStyle} placeholder="CPF, email ou chave aleatória" />
          </FormField>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button type="submit" disabled={formLoading} style={{ ...btnPrimary, opacity: formLoading ? 0.7 : 1 }}>
              {formLoading ? 'Criando...' : 'Criar Entregador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverCreateModal;
