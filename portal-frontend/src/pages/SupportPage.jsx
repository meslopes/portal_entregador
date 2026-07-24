import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MessageCircle, HelpCircle } from 'lucide-react';

const SupportPage = () => {
  const navigate = useNavigate();

  const faqItems = [
    {
      question: 'Como faço para me cadastrar como entregador?',
      answer: 'Acesse a página de cadastro em /register, preencha seus dados pessoais, dados de acesso e informações do veículo. Após o cadastro, aguarde a aprovação do administrador.'
    },
    {
      question: 'Como aceitar um pedido?',
      answer: 'Quando um pedido estiver disponível, você receberá uma notificação. Acesse a página "Pedidos" e clique em "Aceitar Pedido". Você também pode recusar o pedido.'
    },
    {
      question: 'Como alterar minha senha?',
      answer: 'Acesse "Meu Perfil" pelo menu do usuário, vá na aba "Senha" e preencha os campos solicitados.'
    },
    {
      question: 'Como funciona o pagamento?',
      answer: 'Os pagamentos são realizados toda quarta-feira. O valor é calculado com base no frete (km × preço/km) multiplicado pela sua porcentagem de ganho.'
    },
    {
      question: 'Como visualizar meu histórico de entregas?',
      answer: 'Acesse "Histórico" no menu lateral para ver todas as suas entregas anteriores com detalhes.'
    },
    {
      question: 'Sou estabelecimento, como criar pedidos?',
      answer: 'Acesse o portal do estabelecimento em /client/login. Após login, clique em "Novo Pedido" e preencha os dados do cliente e do pedido.'
    }
  ];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
        display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.5rem',
        fontSize: '0.875rem'
      }}>
        <ArrowLeft size={16} /> Voltar
      </button>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
        Central de Ajuda
      </h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Encontre respostas para suas dúvidas ou entre em contato conosco.
      </p>

      {/* Contato */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem', marginBottom: '2rem'
      }}>
        <div style={{
          background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center'
        }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <Mail size={20} style={{ color: '#2563eb' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Email</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>suporte@muv.log.br</p>
        </div>

        <div style={{
          background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center'
        }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <Phone size={20} style={{ color: '#22c55e' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>Telefone</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>(51) 99999-9999</p>
        </div>

        <div style={{
          background: 'white', borderRadius: '0.75rem', padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center'
        }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
            <MessageCircle size={20} style={{ color: '#d97706' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>WhatsApp</p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>(51) 99999-9999</p>
        </div>
      </div>

      {/* FAQ */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <HelpCircle size={20} /> Perguntas Frequentes
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {faqItems.map((item, index) => (
          <details key={index} style={{
            background: 'white', borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            <summary style={{
              padding: '1rem 1.25rem', cursor: 'pointer',
              fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem',
              listStyle: 'none', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {item.question}
              <span style={{ color: '#94a3b8', fontSize: '1.25rem' }}>+</span>
            </summary>
            <div style={{ padding: '0 1.25rem 1rem', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default SupportPage;
