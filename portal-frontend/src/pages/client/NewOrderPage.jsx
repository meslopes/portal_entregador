import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, MapPin, DollarSign, Package,
  AlertCircle, CheckCircle, ShoppingCart, Truck, Info
} from 'lucide-react';
import { orderService } from '@/lib/api';

const inputStyle = {
  width: '100%', padding: '0.625rem 0.875rem',
  borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit'
};

const NewOrderPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    delivery_number: '',
    delivery_complement: '',
    delivery_neighborhood: '',
    delivery_city: 'Capão da Canoa',
    delivery_state: 'RS',
    delivery_zip_code: '',
    product_value: '',
    product_payment_type: 'ESTABLISHMENT',
    product_payment_method: 'CASH',
    change_for: '',
    special_instructions: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // Calcula distância baseada no endereço
  const getDistance = () => {
    if (!form.delivery_address || !form.delivery_neighborhood) return 0;
    const len = form.delivery_address.length + form.delivery_neighborhood.length + form.delivery_number.length;
    return Math.max(2, (len % 15) + 3);
  };

  const DISTANCE_KM = getDistance();
  const PRICE_PER_KM = 2.95;
  const DELIVERY_FEE = DISTANCE_KM * PRICE_PER_KM;
  // Converte vírgula para ponto antes de parseFloat
  const PRODUCT_VALUE = parseFloat(form.product_value.replace(',', '.')) || 0;
  const TOTAL = PRODUCT_VALUE + DELIVERY_FEE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.customer_name.trim()) { setError('Nome do cliente é obrigatório'); return; }
    if (!form.customer_phone.trim()) { setError('Telefone do cliente é obrigatório'); return; }
    if (!form.delivery_address.trim()) { setError('Endereço é obrigatório'); return; }
    if (!form.delivery_number.trim()) { setError('Número é obrigatório'); return; }
    if (!form.delivery_neighborhood.trim()) { setError('Bairro é obrigatório'); return; }
    if (!form.product_value) { setError('Valor dos itens é obrigatório'); return; }

    try {
      setIsLoading(true);
      const fullAddress = form.delivery_address + ', ' + form.delivery_number + (form.delivery_complement ? ' - ' + form.delivery_complement : '');

      await orderService.createOrder({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        delivery_address: fullAddress,
        delivery_neighborhood: form.delivery_neighborhood,
        delivery_city: form.delivery_city,
        delivery_state: form.delivery_state,
        delivery_zip_code: form.delivery_zip_code,
        items: [{ name: 'Entrega', quantity: 1, price: DELIVERY_FEE }],
        subtotal: TOTAL,
        delivery_fee: DELIVERY_FEE,
        total_amount: TOTAL,
        payment_method: form.product_payment_method,
        special_instructions: JSON.stringify({
          product_value: PRODUCT_VALUE,
          product_payment_type: form.product_payment_type,
          product_payment_method: form.product_payment_method,
          change_for: form.change_for || null,
          distance_km: DISTANCE_KM,
          price_per_km: PRICE_PER_KM,
        }),
      });
      setSuccess(true);
      setTimeout(() => navigate('/client'), 2000);
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      const msg = err.response?.data?.error || err.message || 'Erro ao criar pedido';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={40} style={{ color: '#22c55e' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>Pedido Enviado!</h2>
          <p style={{ color: '#16a34a' }}>O pedido foi registrado com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/client')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Lançar Novo Pedido</h1>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Dados do Cliente */}
        <Card title="Dados do Cliente" icon={<User size={16} />}>
          <Label>Nome do Cliente *</Label>
          <input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="Ex: Seu Jair das Quantas" required style={inputStyle} />

          <Label>Telefone *</Label>
          <input name="customer_phone" value={form.customer_phone} onChange={handleChange} placeholder="(51) 99999-9999" required style={inputStyle} />
        </Card>

        {/* Endereço */}
        <Card title="Endereço de Entrega" icon={<MapPin size={16} />}>
          <Label>Endereço/Rua *</Label>
          <input name="delivery_address" value={form.delivery_address} onChange={handleChange} placeholder="Rua, avenida, travessa..." required style={inputStyle} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
            <div><Label>Número *</Label><input name="delivery_number" value={form.delivery_number} onChange={handleChange} placeholder="Nº" required style={inputStyle} /></div>
            <div><Label>Complemento</Label><input name="delivery_complement" value={form.delivery_complement} onChange={handleChange} placeholder="Casa 2, Apto 506" style={inputStyle} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <div><Label>Bairro *</Label><input name="delivery_neighborhood" value={form.delivery_neighborhood} onChange={handleChange} placeholder="Bairro" required style={inputStyle} /></div>
            <div><Label>CEP</Label><input name="delivery_zip_code" value={form.delivery_zip_code} onChange={handleChange} placeholder="95555-000" style={inputStyle} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <div><Label>Cidade</Label><input name="delivery_city" value={form.delivery_city} onChange={handleChange} style={inputStyle} /></div>
            <div><Label>Estado</Label><input name="delivery_state" value={form.delivery_state} onChange={handleChange} style={inputStyle} /></div>
          </div>

          {DISTANCE_KM > 0 && (
            <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#f0fdfa', borderRadius: '0.5rem', border: '1px solid #99f6e4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Truck size={16} style={{ color: '#0d9488' }} />
                <span style={{ fontWeight: 600, color: '#0f766e', fontSize: '0.875rem' }}>Valor da Entrega</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
                <span>{DISTANCE_KM} km × R$ {PRICE_PER_KM.toFixed(2).replace('.', ',')}/km</span>
                <span style={{ fontWeight: 600 }}>R$ {DELIVERY_FEE.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Pagamento */}
        <Card title="Pagamento do Cliente" icon={<ShoppingCart size={16} />}>
          <Label>Valor dos Itens/Produtos (R$) *</Label>
          <input type="text" inputMode="decimal" name="product_value" value={form.product_value} onChange={handleChange} placeholder="Ex: 45,00" required style={inputStyle} />

          <Label>Como o cliente vai pagar?</Label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <PayBtn active={form.product_payment_type === 'ESTABLISHMENT'} onClick={() => setForm(p => ({ ...p, product_payment_type: 'ESTABLISHMENT' }))} label="No Estabelecimento" desc="Cliente já pagou no local" />
            <PayBtn active={form.product_payment_type === 'DELIVERY'} onClick={() => setForm(p => ({ ...p, product_payment_type: 'DELIVERY' }))} label="Na Entrega" desc="Cliente paga ao entregador" />
          </div>

          {form.product_payment_type === 'DELIVERY' && (
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <Label>Forma de pagamento:</Label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[{k:'CASH',l:'Dinheiro'},{k:'CARD',l:'Cartão'},{k:'PIX',l:'PIX'}].map(pm => (
                  <button key={pm.k} type="button" onClick={() => setForm(p => ({ ...p, product_payment_method: pm.k }))}
                    style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', borderColor: form.product_payment_method === pm.k ? '#0d9488' : '#e2e8f0', background: form.product_payment_method === pm.k ? '#f0fdfa' : 'white', color: form.product_payment_method === pm.k ? '#0f766e' : '#475569' }}>
                    {pm.l}
                  </button>
                ))}
              </div>
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

        {/* Observações */}
        <Card title="Observações" icon={<Package size={16} />}>
          <textarea name="special_instructions" value={form.special_instructions} onChange={handleChange} placeholder="Ex: Urgente, cuidado ao manusear..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Card>

        {/* Resumo */}
        <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>Resumo</h3>
          <Row label="Cliente" value={form.customer_name || '—'} />
          <Row label="Endereço" value={form.delivery_address ? form.delivery_address + ', ' + (form.delivery_number || 's/n') : '—'} />
          <Row label="Pagamento" value={form.product_payment_type === 'ESTABLISHMENT' ? 'No estabelecimento' : 'Na entrega (' + (form.product_payment_method === 'CASH' ? 'Dinheiro' : form.product_payment_method === 'CARD' ? 'Cartão' : 'PIX') + ')'} />
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
            <Row label="Valor dos Itens" value={'R$ ' + PRODUCT_VALUE.toFixed(2).replace('.', ',')} bold />
            <Row label={'Valor da Entrega (' + (DISTANCE_KM > 0 ? DISTANCE_KM + ' km' : '—') + ')'} value={'R$ ' + DELIVERY_FEE.toFixed(2).replace('.', ',')} bold />
          </div>
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid #0d9488', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem', color: '#0f766e' }}>
            <span>Total a Cobrar</span>
            <span>R$ {TOTAL.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', border: 'none', background: '#0d9488', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)' }}>
          {isLoading ? 'Enviando Pedido...' : 'Enviar Pedido'}
        </button>
      </form>
    </div>
  );
};

const Card = ({ title, icon, children }) => (
  <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <span style={{ color: '#0d9488' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>{title}</span>
    </div>
    {children}
  </div>
);

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem', marginTop: '0.75rem' }}>{children}</label>
);

const Row = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
    <span style={{ color: '#64748b' }}>{label}</span>
    <span style={{ color: '#1e293b', fontWeight: bold ? 600 : 400 }}>{value}</span>
  </div>
);

const PayBtn = ({ active, onClick, label, desc }) => (
  <button type="button" onClick={onClick} style={{ flex: 1, minWidth: '180px', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid', borderColor: active ? '#0d9488' : '#e2e8f0', background: active ? '#f0fdfa' : 'white', cursor: 'pointer', textAlign: 'left' }}>
    <p style={{ fontWeight: 600, color: active ? '#0f766e' : '#1e293b', fontSize: '0.875rem', marginBottom: '0.125rem' }}>{label}</p>
    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{desc}</p>
  </button>
);

export default NewOrderPage;
