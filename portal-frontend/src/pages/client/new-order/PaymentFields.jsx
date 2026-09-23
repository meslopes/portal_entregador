import React from 'react';
import { ShoppingCart, Info } from 'lucide-react';
import { Card, Label, PayBtn } from './shared';
import { inputStyle } from './shared.constants';

const PaymentFields = ({ form, setForm, handleChange }) => (
  <Card title="Pagamento do Cliente" icon={<ShoppingCart size={16} />}>
    <Label>Como o cliente vai pagar?</Label>
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <PayBtn active={form.product_payment_type === 'ESTABLISHMENT'} onClick={() => setForm(p => ({ ...p, product_payment_type: 'ESTABLISHMENT', product_value: '' }))} label="No Estabelecimento" desc="Cliente já pagou no local" />
      <PayBtn active={form.product_payment_type === 'DELIVERY'} onClick={() => setForm(p => ({ ...p, product_payment_type: 'DELIVERY' }))} label="Na Entrega" desc="Cliente paga ao entregador" />
    </div>

    <Label>Forma de pagamento:</Label>
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
      {[{k:'CASH',l:'Dinheiro'},{k:'CARD',l:'Cartão'},{k:'PIX',l:'PIX'}].map(pm => (
        <button key={pm.k} type="button" onClick={() => setForm(p => ({ ...p, product_payment_method: pm.k }))}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', borderColor: form.product_payment_method === pm.k ? '#0d9488' : '#e2e8f0', background: form.product_payment_method === pm.k ? '#f0fdfa' : 'white', color: form.product_payment_method === pm.k ? '#0f766e' : '#475569' }}>
          {pm.l}
        </button>
      ))}
    </div>

    {form.product_payment_type === 'DELIVERY' && (
      <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <Label>Valor dos Itens/Produtos (R$) *</Label>
        <input type="text" inputMode="decimal" name="product_value" value={form.product_value} onChange={handleChange} placeholder="Ex: 45,00" required style={inputStyle} />

        {form.product_payment_method === 'CASH' && (<div><Label>Troco para (R$)</Label><input name="change_for" value={form.change_for} onChange={handleChange} placeholder="Ex: 50,00" style={inputStyle} /></div>)}
        {form.product_payment_method !== 'CASH' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', background: '#fffbeb', borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#92400e' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            <span>{form.product_payment_method === 'CARD' ? 'Fornecer a máquina de cartão ao entregador.' : 'Enviar o código PIX para o entregador.'}</span>
          </div>
        )}
      </div>
    )}
  </Card>
);

export default PaymentFields;
