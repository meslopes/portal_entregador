import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Settings,
  Store,
  Users,
  ListChecks,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';

/**
 * Guia rápido "Primeiros Passos" — página de ajuda do admin.
 *
 * Explica a cadeia completa de configuração de uma praça nova,
 * na ordem correta, com o "porquê" de cada etapa — para que qualquer
 * pessoa consiga começar a operar sem ajuda externa.
 */
const AdminGuidePage = () => {
  const navigate = useNavigate();

  const steps = [
    {
      id: 'identity',
      icon: Settings,
      title: '1. Configurar a identidade da praça',
      href: '/admin/white-label',
      why: 'É a "casa" da sua operação: nome da empresa, cores, telefone e CNPJ. Os clientes e entregadores veem esses dados.',
      how: [
        'Acesse Configurações → Geral → cartão White-Label',
        'Preencha o nome da empresa (aparece no topo do painel e no app)',
        'Informe telefone e CNPJ',
        'Escolha as cores da sua marca e envie o logo',
        'Salve',
      ],
      warning: 'Sem telefone ou CNPJ, o checklist não considera a etapa concluída.',
    },
    {
      id: 'square',
      icon: MapPin,
      title: '2. Criar uma praça',
      href: '/admin/squares',
      why: 'A praça é a região onde você atua (ex.: "Centro", "Zona Norte"). Tudo no sistema — preços, estabelecimentos, entregadores — pertence a uma praça.',
      how: [
        'Acesse Negócios → Praças',
        'Clique em "Nova praça"',
        'Dê um nome que identifique a região (ex.: "Canoas Centro")',
        'Defina o centro no mapa (a área de atuação)',
        'Salve',
      ],
      warning: 'Sem praça, não existe onde cadastrar os próximos itens.',
    },
    {
      id: 'pricing_table',
      icon: ListChecks,
      title: '3. Criar uma tabela de preço',
      href: '/admin/pricing',
      why: 'É ela que define quanto se cobra pela entrega. Sem tabela vinculada à praça, os pedidos ficam sem valor de frete.',
      how: [
        'Acesse Configurações → Preços',
        'Clique em "Nova tabela de preço"',
        'Vincule à praça criada no passo 2',
        'Configure os valores (por km, mínimo, etc.)',
        'Salve',
      ],
      warning: 'Etapa mais esquecida — e a causa nº 1 de "meu pedido não tem frete".',
    },
    {
      id: 'establishment',
      icon: Store,
      title: '4. Cadastrar estabelecimentos',
      href: '/admin/establishments',
      why: 'São os restaurantes e lojas que recebem pedidos. Cada estabelecimento fica ligado a uma praça e a uma tabela de preço.',
      how: [
        'Acesse Negócios → Estabelecimentos',
        'Clique em "Novo estabelecimento"',
        'Preencha nome, endereço e contato',
        'Vincule à praça e à tabela de preço',
        'Salve',
      ],
      warning: null,
    },
    {
      id: 'driver',
      icon: Users,
      title: '5. Cadastrar entregadores (plataforma ou próprios)',
      href: '/admin/drivers',
      why: 'São quem fará as entregas — e existem dois caminhos, conforme o Tipo de entrega dos seus estabelecimentos (ver seção "Tipos de entrega" mais abaixo).',
      how: [
        'PLATAFORMA: acesse Negócios → Entregadores → "Novo entregador" (vinculado a uma praça)',
        'PRÓPRIOS: abra o estabelecimento e use o menu "Meus Entregadores" (cadastra e gerencia a sua equipe)',
        'Preencha nome, telefone e veículo em qualquer um dos caminhos',
        'Salve',
      ],
      warning: 'Caminhos mistos também funcionam: um estabelecimento com Próprios e outro com Plataforma na mesma operação.',
    },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#4f46e5',
            fontSize: 14,
            fontWeight: 600,
            padding: 0,
          }}
        >
          <ArrowLeft size={18} />
          Voltar ao dashboard
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <BookOpen size={26} color="#4f46e5" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
          Guia dos Primeiros Passos
        </h1>
      </div>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        Este guia mostra a ordem certa de configuração para sua praça começar a operar.
        Siga os passos <strong>nesta sequência</strong> — cada um depende do anterior.
        Depois de concluí-los, você já pode registrar pedidos normalmente.
      </p>

      {/* Visão geral da cadeia */}
      <div
        style={{
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          fontSize: 13,
          fontWeight: 600,
          color: '#3730a3',
        }}
      >
        <span>Ordem:</span>
        {['Identidade', 'Praça', 'Tabela de preço', 'Estabelecimento', 'Entregador'].map(
          (label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <ArrowRight size={14} color="#6366f1" />}
              <span>{label}</span>
            </React.Fragment>
          )
        )}
      </div>

      {/* Passos detalhados */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {steps.map((step) => (
          <div
            key={step.id}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <step.icon size={22} color="#4f46e5" />
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                {step.title}
              </h2>
            </div>

            {/* Por quê */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}
              >
                Por que existe
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                {step.why}
              </p>
            </div>

            {/* Como fazer */}
            <div style={{ marginBottom: step.warning ? 12 : 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Como fazer
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
                {step.how.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>

            {/* Aviso (se houver) */}
            {step.warning && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginTop: 12,
                }}
              >
                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                  {step.warning}
                </span>
              </div>
            )}

            {/* Botão para ir à tela */}
            <button
              onClick={() => navigate(step.href)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 14,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #c7d2fe',
                background: '#eef2ff',
                color: '#4338ca',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ir para esta configuração
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Tipos de entrega — recurso que não é óbvio de descobrir (pedido do Mauro) */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
          Tipos de entrega: Plataforma ou Próprios
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          Cada estabelecimento opera em um de dois modos — e você pode trocar quando quiser:
        </p>
        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <strong>🚲 Plataforma</strong> (padrão): as entregas são feitas pelos entregadores da
          plataforma MUV. O estabelecimento só cria os pedidos. <br />
          <strong>👥 Próprios</strong>: o estabelecimento cadastra e gerencia os seus próprios
          entregadores pelo menu <strong>Meus Entregadores</strong> — com regras de pagamento
          próprias (por entrega, por km, percentual...).
        </p>
        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <strong>Como escolher/trocar:</strong> na <strong>criação do estabelecimento</strong>, o
          formulário já tem o campo <strong>Tipo de entrega</strong> — dá para nascer como
          Plataforma ou Próprios, sem precisar trocar depois. Ao criar como <em>Próprios</em>,
          o sistema cria automaticamente uma <strong>praça e uma tabela de preços próprias</strong>{" "}
          (com o nome do estabelecimento) para ele definir seus preços. Para mudar depois: no menu{" "}
          <strong>Estabelecimentos</strong>, cada linha tem um selo com o modo atual
          (<em>Plataforma</em> ou <em>Próprios</em>); clique no ícone de troca na coluna{" "}
          <strong>Ações</strong> — ou abra os detalhes e use o botão{" "}
          <strong>"Mudar p/ Próprios / Plataforma"</strong> no card "Tipo de Entregador".
          O sistema pede confirmação antes de aplicar.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          <strong>Quando usar cada um:</strong> use <em>Plataforma</em> quando quiser cobertura sem
          equipe própria; use <em>Próprios</em> quando o estabelecimento tem seus próprios
          entregadores e quer controlar pagamentos. Dá para voltar atrás a qualquer momento.
        </p>
      </div>

      {/* Operação com Entregadores Próprios — Fase F do plano de monetização */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
          Operação com Entregadores Próprios — passo a passo
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          O caminho completo quando o estabelecimento opera com equipe própria — do cadastro à cobrança:
        </p>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20, fontSize: 14, color: '#374151', lineHeight: 1.9 }}>
          <li>
            <strong>1. Criar o estabelecimento como Próprios</strong> — em Estabelecimentos, escolha
            "Tipo de entrega: Próprios" (praça e tabela próprias nascem automaticamente)
          </li>
          <li>
            <strong>2. Estabelecimento define os preços</strong> — pelo menu <em>Meus Preços</em> dele
            (por km, tarifa fixa ou faixas; frete grátis opcional)
          </li>
          <li>
            <strong>3. Estabelecimento cadastra seus entregadores</strong> — menu <em>Meus Entregadores</em>
          </li>
          <li>
            <strong>4. Configurar o pagamento dos próprios</strong> — menu <em>Pagamentos</em> do
            estabelecimento (por entrega/km/percentual/fixo — independente do frete)
          </li>
          <li>
            <strong>5. Assinatura e cobrança</strong> — <em>Financeiro → Assinaturas</em> para cobrar o
            estabelecimento (fixo + por entregador + por pedido); a aba <em>Cobrança</em> do painel
            plataforma cuida do que a MUV cobra do admin
          </li>
        </ul>
        <p style={{ margin: 0, fontSize: 13.5, color: '#6b7280', lineHeight: 1.7 }}>
          O estabelecimento também tem o guia <strong>"Primeiros Passos"</strong> no próprio portal
          (menu dele) — cada um vê o caminho do seu lado.
        </p>
      </div>

      {/* Rodapé */}
      <div
        style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
          E depois?
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
          Com as 5 etapas concluídas, sua praça já opera: estabelecimentos recebem pedidos,
          entregadores se conectam ao app e as entregas são rastreadas em tempo real.
          Para aprofundar em cada tela, use o menu <strong>Ajuda</strong> — a
          <strong> Central de Ajuda</strong> tem FAQ e contatos, e este guia fica em
          <strong> Ajuda → Guia dos Primeiros Passos</strong>. Enquanto houver etapas
          pendentes, o checklist lateral do dashboard mostra o que falta configurar
          (ele se recolhe sozinho quando tudo estiver concluído).
        </p>
      </div>
    </div>
  );
};

export default AdminGuidePage;
