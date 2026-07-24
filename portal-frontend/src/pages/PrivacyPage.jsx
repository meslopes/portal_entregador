import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const PrivacyPage = () => {
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

      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={24} /> Política de Privacidade
      </h1>

      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            1. Informações Coletadas
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Coletamos as seguintes informações: dados de cadastro (nome, email, telefone, CPF); dados do veículo (tipo, placa, modelo); dados de localização (quando o entregador está online); dados de pedidos e entregas; dados de pagamento.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            2. Uso das Informações
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Utilizamos suas informações para: processar pedidos e entregas; calcular distâncias e valores de frete; enviar notificações sobre pedidos; gerar relatórios financeiros; melhorar nossos serviços.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            3. Compartilhamento de Dados
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Seus dados podem ser compartilhados com: outros usuários da plataforma (estabelecimento/entregador) para fins de entrega; autoridades legais quando exigido por lei; prestadores de serviços que auxiliam na operação ( hospedagem, processamento de pagamentos).
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            4. Localização
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Quando o entregador está online, coletamos sua localização em tempo real para fins de atribuição de pedidos por proximidade. A localização é compartilhada apenas com o estabelecimento durante a entrega.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            5. Segurança
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Implementamos medidas de segurança para proteger suas informações, incluindo criptografia de dados sensíveis, autenticação por token JWT e acesso restrito por perfil de usuário.
          </p>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            6. Seus Direitos
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Você tem direito a: acessar seus dados pessoais; solicitar correção de dados incorretos; solicitar exclusão de sua conta; revogar consentimento para uso de dados.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
            7. Contato
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            Para dúvidas sobre esta Política de Privacidade, entre em contato: suporte@muv.log.br
          </p>
        </section>
      </div>

      <p style={{ color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center', marginTop: '1.5rem' }}>
        Última atualização: Julho de 2026
      </p>
    </div>
  );
};

export default PrivacyPage;
