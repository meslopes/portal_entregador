import React from 'react';
import { Row } from './shared';

const OrderSummary = ({ form, estimatedFee, productValue }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>Resumo</h3>
    <Row label="Cliente" value={form.customer_name || '—'} />
    <Row label="Endereço" value={form.delivery_address ? form.delivery_address + ', ' + (form.delivery_number || 's/n') : '—'} />
    <Row label="Pagamento" value={form.product_payment_type === 'ESTABLISHMENT' ? 'No estabelecimento' : 'Na entrega (' + (form.product_payment_method === 'CASH' ? 'Dinheiro' : form.product_payment_method === 'CARD' ? 'Cartão' : 'PIX') + ')'} />
    {form.product_payment_type === 'DELIVERY' && productValue > 0 && (
      <Row label="Valor dos Itens (cobrar do cliente)" value={'R$ ' + productValue.toFixed(2).replace('.', ',')} />
    )}
    <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
      <Row
        label={'Frete' + (estimatedFee ? ' (' + estimatedFee.distance_km?.toFixed(1) + ' km' + (estimatedFee.duration_min ? ', ~' + Math.round(estimatedFee.duration_min) + ' min' : '') + ')' : '')}
        value={estimatedFee ? 'R$ ' + estimatedFee.delivery_fee?.toFixed(2).replace('.', ',') : 'Calcule o frete primeiro'}
        bold
      />
    </div>
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid #0d9488', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem', color: '#0f766e' }}>
      <span>Valor da Entrega</span>
      <span>R$ {(estimatedFee?.delivery_fee || 0).toFixed(2).replace('.', ',')}</span>
    </div>
  </div>
);

export default OrderSummary;
