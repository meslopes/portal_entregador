import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
        display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.5rem',
        fontSize: '0.875rem'
      }}>
        <ArrowLeft size={16} /> Voltar
      </button>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>
        Termos de Uso
      </h1>

      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            1. Aceitação dos Termos
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Ao acessar e usar a plataforma muv.log, você concorda com estes Termos de Uso. Se não concordar com algum dos termos, não use a plataforma.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            2. Descrição do Serviço
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            A muv.log é uma plataforma de gestão de entregas que conecta estabelecimentos, entregadores e clientes finais. O serviço inclui criação de pedidos, atribuição automática de entregadores, rastreamento em tempo real e gestão financeira.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            3. Cadastro e Conta
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Para usar a plataforma, você deve criar uma conta com dados verdadeiros e completos. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua conta.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            4. Responsabilidades do Entregador
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            O entregador é responsável por: realizar as entregas com zelo e dentro do prazo; manter dados atualizados do veículo; aceitar ou recusar pedidos de forma responsável; respeitar as normas de trânsito e segurança.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            5. Responsabilidades do Estabelecimento
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            O estabelecimento é responsável por: fornecer informações corretas sobre pedidos; preparar os pedidos dentro do prazo; efetuar os pagamentos conforme acordado; responder por quaisquer reclamações sobre os produtos entregues.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            6. Pagamentos
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Os valores das entregas são calculados com base na distância (km × preço/km). Os pagamentos aos entregadores são realizados semanalmente. Os estabelecimentos devem quitar suas faturas dentro do prazo estabelecido.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            7. Cancelamento
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            O estabelecimento pode cancelar pedidos antes da coleta. Após a coleta, o cancelamento deve ser autorizado pelo administrador. Pedidos cancelados não geram cobrança de frete.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            8. Limitação de Responsabilidade
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            A muv.log atua como intermediária entre estabelecimentos e entregadores. Não nos responsabilizamos por danos diretos ou indiretos decorrentes do uso da plataforma, incluindo atrasos, extravios ou danos aos produtos.
          </p>
        </section>
      </div>

      <p style={{ color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center', marginTop: '1.5rem' }}>
        Última atualização: Julho de 2026
      </p>
    </div>
  );
};

export default TermsPage;
