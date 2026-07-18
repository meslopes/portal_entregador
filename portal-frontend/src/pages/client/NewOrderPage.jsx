import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, MapPin, DollarSign, Package,
  AlertCircle, CheckCircle, ShoppingCart, Truck, Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/lib/api';

const NewOrderPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    // Dados do cliente final
    customer_name: '',
    customer_phone: '',
    // Endereço de entrega
    delivery_address: '',
    delivery_number: '',
    delivery_complement: '',
    delivery_neighborhood: '',
    delivery_city: 'Capão da Canoa',
    delivery_state: 'RS',
    delivery_zip_code: '',
    // Pagamento do cliente (itens)
    product_value: '', // valor dos itens/produtos a cobrar do cliente
    product_payment_type: 'ESTABLISHMENT', // ESTABLISHMENT ou DELIVERY
    product_payment_method: 'CASH', // CASH, CARD, PIX (quando for na entrega)
    change_for: '', // valor para troco (se pagamento em dinheiro na entrega)
    // Observações
    special_instructions: '',
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  // Simulação de distância (km) baseada no tamanho do endereço
  // TODO: substituir por API de geolocalização
  const simulateDistance = () => {
    if (!form.delivery_address || !form.delivery_neighborhood) return 0;
    // Simulação: gera distância entre 2 e 12 km
    const hash = (form.delivery_address.length + form.delivery_neighborhood.length) % 10;
    return Math.max(2, hash + 2);
  };

  const DISTANCE_KM = simulateDistance();
  const PRICE_PER_KM = 2.95;
  const DELIVERY_FEE = DISTANCE_KM * PRICE_PER_KM;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!form.customer_name.trim()) {
      setError('Nome do cliente é obrigatório');
      return;
    }
    if (!form.customer_phone.trim()) {
      setError('Telefone do cliente é obrigatório');
      return;
    }
    if (!form.delivery_address.trim()) {
      setError('Endereço de entrega é obrigatório');
      return;
    }
    if (!form.delivery_number.trim()) {
      setError('Número do endereço é obrigatório');
      return;
    }
    if (!form.delivery_neighborhood.trim()) {
      setError('Bairro é obrigatório');
      return;
    }

    try {
      setIsLoading(true);

      const fullAddress = `${form.delivery_address}, ${form.delivery_number}${form.delivery_complement ? ' - ' + form.delivery_complement : ''}`;

      const orderData = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        delivery_address: fullAddress,
        delivery_neighborhood: form.delivery_neighborhood,
        delivery_city: form.delivery_city,
        delivery_state: form.delivery_state,
        delivery_zip_code: form.delivery_zip_code,
        delivery_latitude: null,
        delivery_longitude: null,
        items: [{ name: 'Entrega', quantity: 1, price: DELIVERY_FEE }],
        subtotal: DELIVERY_FEE,
        delivery_fee: DELIVERY_FEE,
        total_amount: DELIVERY_FEE,
        payment_method: form.product_payment_type === 'DELIVERY' ? form.product_payment_method : 'CASH',
        special_instructions: JSON.stringify({
          product_value: parseFloat(form.product_value) || 0,
          product_payment_type: form.product_payment_type,
          product_payment_method: form.product_payment_method,
          change_for: form.change_for || null,
          distance_km: DISTANCE_KM,
          price_per_km: PRICE_PER_KM,
          user_instructions: form.special_instructions || null,
        }),
      };

      await orderService.createOrder(orderData);
      setSuccess(true);

      setTimeout(() => {
        navigate('/client');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar pedido');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: 'white', borderRadius: '0.75rem',
          padding: '4rem 2rem', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '5rem', height: '5rem', borderRadius: '50%',
            background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <CheckCircle size={40} style={{ color: '#22c55e' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
            Pedido Enviado!
          </h2>
          <p style={{ color: '#16a34a', marginBottom: '0.5rem' }}>
            O pedido foi registrado com sucesso.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Um entregador será designado automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/client')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#64748b', display: 'flex', alignItems: 'center',
          gap: '0.375rem', marginBottom: '0.75rem', fontSize: '0.875rem'
        }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
          Lançar Novo Pedido
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
          Preencha os dados do cliente e do endereço de entrega
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '0.75rem 1rem',
          borderRadius: '0.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Dados do Cliente Final */}
        <Section title="Dados do Cliente" icon={<User size={16} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Nome do Cliente *">
              <input name="customer_name" value={form.customer_name} onChange={handleChange}
                placeholder="Ex: Seu Jair das Quantas" required />
            </Field>
            <Field label="Telefone *">
              <input name="customer_phone" value={form.customer_phone} onChange={handleChange}
                placeholder="(51) 99999-9999" required />
            </Field>
          </div>
        </Section>

        {/* Endereço de Entrega */}
        <Section title="Endereço de Entrega" icon={<MapPin size={16} />}>
          <Field label="Endereço/Rua *">
            <input name="delivery_address" value={form.delivery_address} onChange={handleChange}
              placeholder="Rua, avenida, travessa..." required />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <Field label="Número *">
              <input name="delivery_number" value={form.delivery_number} onChange={handleChange}
                placeholder="Nº" required />
            </Field>
            <Field label="Complemento">
              <input name="delivery_complement" value={form.delivery_complement} onChange={handleChange}
                placeholder="Ex: Casa 2, Apto 506, Bloco B" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <Field label="Bairro *">
              <input name="delivery_neighborhood" value={form.delivery_neighborhood} onChange={handleChange}
                placeholder="Bairro" required />
            </Field>
            <Field label="CEP">
              <input name="delivery_zip_code" value={form.delivery_zip_code} onChange={handleChange}
                placeholder="95555-000" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <Field label="Cidade">
              <input name="delivery_city" value={form.delivery_city} onChange={handleChange} />
            </Field>
            <Field label="Estado">
              <input name="delivery_state" value={form.delivery_state} onChange={handleChange} />
            </Field>
          </div>

          {/* Distância e valor da entrega */}
          {DISTANCE_KM > 0 && (
            <div style={{
              marginTop: '1rem', padding: '1rem',
              background: '#f0fdfa', borderRadius: '0.5rem',
              border: '1px solid #99f6e4'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Truck size={16} style={{ color: '#0d9488' }} />
                <span style={{ fontWeight: 600, color: '#0f766e', fontSize: '0.875rem' }}>Valor da Entrega</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
                <span>Distância estimada: {DISTANCE_KM} km</span>
                <span>× R$ {PRICE_PER_KM.toFixed(2).replace('.', ',')}/km</span>
              </div>
              <div style={{
                marginTop: '0.5rem', paddingTop: '0.5rem',
                borderTop: '1px solid #99f6e4',
                display: 'flex', justifyContent: 'space-between',
                fontWeight: 700, color: '#0f766e', fontSize: '1.125rem'
              }}>
                <span>Total da entrega</span>
                <span>R$ {DELIVERY_FEE.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          )}
        </Section>

        {/* Pagamento do Cliente (Itens) */}
        <Section title="Pagamento do Cliente" icon={<ShoppingCart size={16} />}>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
            Como o cliente vai pagar pelos itens/produtos?
          </p>

          {/* Valor dos itens */}
          <Field label="Valor dos Itens/Produtos (R$) *">
            <input name="product_value" value={form.product_value} onChange={handleChange}
              placeholder="Ex: 45,00" required />
          </Field>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <PaymentOption
              active={form.product_payment_type === 'ESTABLISHMENT'}
              onClick={() => setForm(prev => ({ ...prev, product_payment_type: 'ESTABLISHMENT' }))}
              label="Pago no Estabelecimento"
              description="Cliente já pagou ou vai pagar no local"
            />
            <PaymentOption
              active={form.product_payment_type === 'DELIVERY'}
              onClick={() => setForm(prev => ({ ...prev, product_payment_type: 'DELIVERY' }))}
              label="Pagamento na Entrega"
              description="Cliente vai pagar ao entregador"
            />
          </div>

          {/* Opções de pagamento na entrega */}
          {form.product_payment_type === 'DELIVERY' && (
            <div style={{
              padding: '1rem', background: '#f8fafc',
              borderRadius: '0.5rem', border: '1px solid #e2e8f0'
            }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.75rem' }}>
                Forma de pagamento do cliente:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {[
                  { key: 'CASH', label: 'Dinheiro' },
                  { key: 'CARD', label: 'Cartão' },
                  { key: 'PIX', label: 'PIX' },
                ].map(pm => (
                  <button key={pm.key} type="button"
                    onClick={() => setForm(prev => ({ ...prev, product_payment_method: pm.key }))}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '0.5rem',
                      border: '1.5px solid', fontSize: '0.8125rem', fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.15s',
                      borderColor: form.product_payment_method === pm.key ? '#0d9488' : '#e2e8f0',
                      background: form.product_payment_method === pm.key ? '#f0fdfa' : 'white',
                      color: form.product_payment_method === pm.key ? '#0f766e' : '#475569'
                    }}>
                    {pm.label}
                  </button>
                ))}
              </div>

              {/* Campo de troco (se dinheiro) */}
              {form.product_payment_method === 'CASH' && (
                <Field label="Troco para (R$)">
                  <input name="change_for" value={form.change_for} onChange={handleChange}
                    placeholder="Ex: 50,00" />
                </Field>
              )}

              {/* Aviso para cartão/PIX */}
              {form.product_payment_method !== 'CASH' && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                  padding: '0.75rem', background: '#fffbeb',
                  borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#92400e'
                }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                  <span>
                    {form.product_payment_method === 'CARD'
                      ? 'Lembre-se de fornecer a máquina de cartão ao entregador.'
                      : 'Lembre-se de enviar o código PIX para o entregador.'}
                  </span>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Observações */}
        <Section title="Observações" icon={<Package size={16} />}>
          <textarea
            name="special_instructions"
            value={form.special_instructions}
            onChange={handleChange}
            placeholder="Ex: Urgente, cuidado ao manusear, etc."
            rows={3}
            style={{
              width: '100%', padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
              fontSize: '0.875rem', resize: 'vertical', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
        </Section>

        {/* Resumo do pedido */}
        <div style={{
          background: 'white', borderRadius: '0.75rem',
          padding: '1.25rem', marginBottom: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem', fontSize: '0.9375rem' }}>
            Resumo
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b' }}>Cliente</span>
            <span style={{ color: '#1e293b' }}>{form.customer_name || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b' }}>Endereço</span>
            <span style={{ color: '#1e293b', textAlign: 'right', maxWidth: '60%' }}>
              {form.delivery_address ? `${form.delivery_address}, ${form.delivery_number || 's/n'}` : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b' }}>Pagamento</span>
            <span style={{ color: '#1e293b' }}>
              {form.product_payment_type === 'ESTABLISHMENT' ? 'No estabelecimento' : `Na entrega (${form.product_payment_method === 'CASH' ? 'Dinheiro' : form.product_payment_method === 'CARD' ? 'Cartão' : 'PIX'})`}
            </span>
          </div>

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#64748b' }}>Valor dos Itens</span>
              <span style={{ color: '#1e293b', fontWeight: 500 }}>R$ {form.product_value ? parseFloat(form.product_value).toFixed(2).replace('.', ',') : '0,00'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#64748b' }}>Valor da Entrega ({DISTANCE_KM > 0 ? `${DISTANCE_KM} km × R$ ${PRICE_PER_KM.toFixed(2).replace('.', ',')}` : '—'})</span>
              <span style={{ color: '#1e293b', fontWeight: 500 }}>R$ {DELIVERY_FEE.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div style={{
            marginTop: '0.75rem', paddingTop: '0.75rem',
            borderTop: '2px solid #0d9488',
            display: 'flex', justifyContent: 'space-between',
            fontWeight: 700, fontSize: '1.25rem', color: '#0f766e'
          }}>
            <span>Total a Cobrar do Cliente</span>
            <span>R$ {(parseFloat(form.product_value || 0) + DELIVERY_FEE).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* Botão enviar */}
        <button type="submit" disabled={isLoading} style={{
          width: '100%', padding: '1rem', borderRadius: '0.75rem',
          border: 'none', background: '#0d9488', color: 'white',
          fontSize: '1rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)'
        }}>
          {isLoading ? 'Enviando Pedido...' : 'Enviar Pedido'}
        </button>
      </form>
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <div style={{
    background: 'white', borderRadius: '0.75rem',
    padding: '1.25rem', marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <span style={{ color: '#0d9488' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>{title}</span>
    </div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: label ? '0.75rem' : 0 }}>
    {label && <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>{label}</label>}
    <div style={{
      borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
      overflow: 'hidden', transition: 'border-color 0.2s'
    }}>
      {React.cloneElement(children, {
        style: {
          width: '100%', padding: '0.625rem 0.875rem',
          border: 'none', outline: 'none', fontSize: '0.875rem',
          background: 'transparent', boxSizing: 'border-box'
        }
      })}
    </div>
  </div>
);

const PaymentOption = ({ active, onClick, label, description }) => (
  <button type="button" onClick={onClick} style={{
    flex: 1, minWidth: '200px', padding: '0.875rem',
    borderRadius: '0.5rem', border: '1.5px solid',
    borderColor: active ? '#0d9488' : '#e2e8f0',
    background: active ? '#f0fdfa' : 'white',
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
  }}>
    <p style={{ fontWeight: 600, color: active ? '#0f766e' : '#1e293b', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
      {label}
    </p>
    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{description}</p>
  </button>
);

export default NewOrderPage;
