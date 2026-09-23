import React from 'react';
import { X } from 'lucide-react';

const fieldStyle = { width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' };
const sectionBg = { marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' };
const sectionTitle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' };

const EditOrderModal = ({ editingOrder, editData, setEditData, onClose, onSubmit, statusFilters }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
    <div style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Editar Pedido #{editingOrder.order_number}</h2>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
      </div>
      <form onSubmit={onSubmit} style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Status */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Status</label>
          <select value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none' }}>
            {statusFilters.filter(f => f.key).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>

        {/* Dados do Cliente */}
        <div style={sectionBg}>
          <p style={sectionTitle}>Dados do Cliente</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Nome</label>
              <input value={editData.customer_name} onChange={e => setEditData(p => ({ ...p, customer_name: e.target.value }))} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input value={editData.customer_phone} onChange={e => setEditData(p => ({ ...p, customer_phone: e.target.value }))} style={fieldStyle} />
            </div>
          </div>
        </div>

        {/* Endereço de Entrega */}
        <div style={sectionBg}>
          <p style={sectionTitle}>Endereço de Entrega</p>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={labelStyle}>Endereço</label>
            <input value={editData.delivery_address} onChange={e => setEditData(p => ({ ...p, delivery_address: e.target.value }))} style={fieldStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Bairro</label>
              <input value={editData.delivery_neighborhood} onChange={e => setEditData(p => ({ ...p, delivery_neighborhood: e.target.value }))} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cidade</label>
              <input value={editData.delivery_city} onChange={e => setEditData(p => ({ ...p, delivery_city: e.target.value }))} style={fieldStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div>
              <label style={labelStyle}>Estado</label>
              <input value={editData.delivery_state} onChange={e => setEditData(p => ({ ...p, delivery_state: e.target.value }))} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>CEP</label>
              <input value={editData.delivery_zip_code} onChange={e => setEditData(p => ({ ...p, delivery_zip_code: e.target.value }))} style={fieldStyle} />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <label style={labelStyle}>Complemento</label>
            <input value={editData.delivery_complement} onChange={e => setEditData(p => ({ ...p, delivery_complement: e.target.value }))} style={fieldStyle} />
          </div>
        </div>

        {/* Valores */}
        <div style={sectionBg}>
          <p style={sectionTitle}>Valores</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Taxa de Entrega (R$)</label>
              <input type="number" step="0.01" value={editData.delivery_fee} onChange={e => setEditData(p => ({ ...p, delivery_fee: parseFloat(e.target.value) }))} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Valor Total (R$)</label>
              <input type="number" step="0.01" value={editData.total_amount} onChange={e => setEditData(p => ({ ...p, total_amount: parseFloat(e.target.value) }))} style={fieldStyle} />
            </div>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <label style={labelStyle}>Método de Pagamento</label>
            <select value={editData.payment_method} onChange={e => setEditData(p => ({ ...p, payment_method: e.target.value }))} style={fieldStyle}>
              <option value="CASH">Dinheiro</option>
              <option value="CARD">Cartão</option>
              <option value="PIX">PIX</option>
            </select>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <label style={labelStyle}>Método de Distribuição</label>
            <select value={editData.distribution_method} onChange={e => setEditData(p => ({ ...p, distribution_method: e.target.value }))} style={fieldStyle}>
              <option value="nearest">Mais Próximo</option>
              <option value="broadcast">Broadcast</option>
              <option value="queue">Fila</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        {/* Observações */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Observações</label>
          <textarea value={editData.special_instructions} onChange={e => setEditData(p => ({ ...p, special_instructions: e.target.value }))} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: '#2563eb', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
        </div>
      </form>
    </div>
  </div>
);

export default EditOrderModal;
