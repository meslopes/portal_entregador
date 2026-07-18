import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, MapPin, DollarSign, Package,
  Plus, Trash2, AlertCircle, CheckCircle, ShoppingBag
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
    delivery_neighborhood: '',
    delivery_city: 'Porto Alegre',
    delivery_state: 'RS',
    delivery_zip_code: '',
    // Itens do pedido
    items: [{ name: '', quantity: 1, price: '' }],
    // Pagamento
    payment_method: 'CASH',
    // Instruções
    special_instructions: '',
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, price: '' }]
    }));
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return form.items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);
  };

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
    if (!form.delivery_neighborhood.trim()) {
      setError('Bairro é obrigatório');
      return;
    }

    const validItems = form.items.filter(item => item.name.trim() && item.price);
    if (validItems.length === 0) {
      setError('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      setIsLoading(true);

      const subtotal = calculateTotal();
      const deliveryFee = subtotal * 0.1; // 10% de taxa de entrega

      const orderData = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        delivery_address: form.delivery_address,
        delivery_neighborhood: form.delivery_neighborhood,
        delivery_city: form.delivery_city,
        delivery_state: form.delivery_state,
        delivery_zip_code: form.delivery_zip_code,
        items: validItems.map(item => ({
          name: item.name,
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0
        })),
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total_amount: subtotal + deliveryFee,
        payment_method: form.payment_method,
        special_instructions: form.special_instructions || null,
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
            Pedido Criado!
          </h2>
          <p style={{ color: '#16a34a', marginBottom: '0.5rem' }}>
            O pedido foi enviado para o sistema.
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
          Preencha os dados do cliente e do pedido
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
            <Field label="Nome do Cliente *" placeholder="Nome completo">
              <input name="customer_name" value={form.customer_name} onChange={handleChange}
                placeholder="Ex: Seu Jair das Quantas" required />
            </Field>
            <Field label="Telefone *" placeholder="Telefone">
              <input name="customer_phone" value={form.customer_phone} onChange={handleChange}
                placeholder="(51) 99999-9999" required />
            </Field>
          </div>
        </Section>

        {/* Endereço de Entrega */}
        <Section title="Endereço de Entrega" icon={<MapPin size={16} />}>
          <Field label="Endereço/Rua *" placeholder="Endereço completo">
            <input name="delivery_address" value={form.delivery_address} onChange={handleChange}
              placeholder="Rua, número, complemento" required />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
            <Field label="Bairro *" placeholder="Bairro">
              <input name="delivery_neighborhood" value={form.delivery_neighborhood} onChange={handleChange}
                placeholder="Bairro" required />
            </Field>
            <Field label="Cidade" placeholder="Cidade">
              <input name="delivery_city" value={form.delivery_city} onChange={handleChange}
                placeholder="Porto Alegre" />
            </Field>
            <Field label="CEP" placeholder="CEP">
              <input name="delivery_zip_code" value={form.delivery_zip_code} onChange={handleChange}
                placeholder="90000-000" />
            </Field>
          </div>
        </Section>

        {/* Itens do Pedido */}
        <Section title="Itens do Pedido" icon={<Package size={16} />}>
          {form.items.map((item, index) => (
            <div key={index} style={{
              display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto',
              gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'end'
            }}>
              <Field label={index === 0 ? 'Item' : ''} placeholder="Nome do item">
                <input value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  placeholder="Ex: Pão Frances" />
              </Field>
              <Field label={index === 0 ? 'Qtd' : ''} placeholder="Qtd">
                <input type="number" min="1" value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
              </Field>
              <Field label={index === 0 ? 'Preço (R$)' : ''} placeholder="Preço">
                <input type="number" step="0.01" min="0" value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                  placeholder="0,00" />
              </Field>
              <button type="button" onClick={() => removeItem(index)} style={{
                padding: '0.5rem', borderRadius: '0.375rem',
                border: '1px solid #fecaca', background: '#fef2f2',
                color: '#dc2626', cursor: 'pointer', marginBottom: '2px',
                opacity: form.items.length <= 1 ? 0.3 : 1
              }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addItem} style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1rem', borderRadius: '0.5rem',
            border: '1px dashed #d1d5db', background: 'transparent',
            color: '#64748b', cursor: 'pointer', fontSize: '0.875rem'
          }}>
            <Plus size={14} /> Adicionar item
          </button>

          {/* Total */}
          <div style={{
            marginTop: '1rem', padding: '0.875rem',
            background: '#f8fafc', borderRadius: '0.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 500, color: '#475569' }}>Subtotal</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
              R$ {calculateTotal().toFixed(2).replace('.', ',')}
            </span>
          </div>
        </Section>

        {/* Pagamento */}
        <Section title="Forma de Pagamento" icon={<DollarSign size={16} />}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'CASH', label: 'Dinheiro' },
              { key: 'CARD', label: 'Cartão' },
              { key: 'PIX', label: 'PIX' },
            ].map(pm => (
              <button key={pm.key} type="button"
                onClick={() => setForm(prev => ({ ...prev, payment_method: pm.key }))}
                style={{
                  padding: '0.625rem 1.25rem', borderRadius: '0.5rem',
                  border: '1.5px solid', fontSize: '0.875rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: form.payment_method === pm.key ? '#0d9488' : '#e2e8f0',
                  background: form.payment_method === pm.key ? '#f0fdfa' : 'white',
                  color: form.payment_method === pm.key ? '#0f766e' : '#475569'
                }}>
                {pm.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Instruções */}
        <Section title="Observações" icon={<ShoppingBag size={16} />}>
          <textarea
            name="special_instructions"
            value={form.special_instructions}
            onChange={handleChange}
            placeholder="Ex: Retorno com máquina de cartão, urgente, etc."
            rows={3}
            style={{
              width: '100%', padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem', border: '1.5px solid #e2e8f0',
              fontSize: '0.875rem', resize: 'vertical', outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </Section>

        {/* Botão enviar */}
        <button type="submit" disabled={isLoading} style={{
          width: '100%', padding: '1rem', borderRadius: '0.75rem',
          border: 'none', background: '#0d9488', color: 'white',
          fontSize: '1rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1, marginTop: '1rem',
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

export default NewOrderPage;
