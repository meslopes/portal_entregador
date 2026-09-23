import React from 'react';

const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' };
const inputStyle = { width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box' };

const EditOrderModal = ({ order, editForm, editLoading, onClose, onSave, onFormChange }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
    <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflow: 'auto' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Editar Pedido #{order?.order_number}</h2>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Nome do Cliente</label>
          <input value={editForm.customer_name} onChange={e => onFormChange('customer_name', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Telefone</label>
          <input value={editForm.customer_phone} onChange={e => onFormChange('customer_phone', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Endereço</label>
          <input value={editForm.delivery_address} onChange={e => onFormChange('delivery_address', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Bairro</label>
            <input value={editForm.delivery_neighborhood} onChange={e => onFormChange('delivery_neighborhood', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Cidade</label>
            <input value={editForm.delivery_city} onChange={e => onFormChange('delivery_city', e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Observações</label>
          <textarea value={editForm.special_instructions} onChange={e => onFormChange('special_instructions', e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', color: '#374151', fontSize: '0.875rem', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onSave} disabled={editLoading} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: editLoading ? 'not-allowed' : 'pointer', opacity: editLoading ? 0.7 : 1 }}>
            {editLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default EditOrderModal;
