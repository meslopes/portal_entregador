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
      title: '5. Cadastrar entregadores',
      href: '/admin/drivers',
      why: 'São quem fará as entregas. Cada entregador é vinculado a uma praça — assim ele recebe os pedidos da região certa.',
      how: [
        'Acesse Negócios → Entregadores',
        'Clique em "Novo entregador"',
        'Preencha nome, telefone e veículo',
        'Vincule à praça',
        'Salve',
      ],
      warning: null,
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
          Para aprofundar em cada tela, use o menu <strong>Ajuda</strong> ou consulte o
          checklist lateral do dashboard, que mostra o que falta configurar.
        </p>
      </div>
    </div>
  );
};

export default AdminGuidePage;
