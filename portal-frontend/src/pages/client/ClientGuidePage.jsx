import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, Users, Wallet, Receipt, CheckCircle, ArrowRight, BookOpen, Bike } from 'lucide-react';

/**
 * Primeiros Passos do Estabelecimento (entregas próprias) — Fase F do plano.
 * Guia "5/5" no espírito do Primeiros Passos do admin: por que cada passo,
 * como fazer e o caminho direto para a tela certa. Ver
 * docs/PLAN_MONETIZACAO_ENTREGAS_PROPRIAS.md.
 */
const ETAPAS = [
  {
    id: 'tipo',
    icon: Bike,
    title: '1. Seu tipo de entrega: Próprios',
    why: 'Com entregadores próprios, a operação é 100% sua: você cadastra a equipe, define preços e paga seus entregadores. A plataforma só organiza.',
    how: [
      'O tipo foi escolhido na criação do estabelecimento (ou pelo administrador)',
      'Com "Próprios", nasceram automaticamente sua praça e sua tabela de preços',
    ],
    href: null,
  },
  {
    id: 'precos',
    icon: Tag,
    title: '2. Defina seus preços de entrega',
    why: 'É quanto o SEU cliente paga pelo frete. Você escolhe: por km, tarifa fixa ou por faixa de km — e pode oferecer frete grátis acima de um valor.',
    how: [
      'Abra "Meus Preços" no menu',
      'Escolha o tipo de precificação e preencha os valores',
      'Use a prévia para conferir quanto o cliente verá (2, 5 e 10 km)',
    ],
    href: '/client/pricing',
  },
  {
    id: 'entregadores',
    icon: Users,
    title: '3. Cadastre seus entregadores',
    why: 'Sua equipe aparece aqui: cada entregador tem acesso ao app pelo telefone + PIN.',
    how: [
      'Abra "Meus Entregadores" e clique em novo',
      'Preencha nome, telefone, veículo e o PIN de acesso',
      'Ao cadastrar, o modal "Enviar Acesso" abre pronto — envie pelo WhatsApp ou copie a mensagem com o link do app, o telefone (login) e o PIN',
    ],
    href: '/client/drivers',
  },
  {
    id: 'pagamentos',
    icon: Wallet,
    title: '4. Configure o pagamento dos entregadores',
    why: 'Você decide quanto e como pagar: por entrega, por km, percentual ou valor fixo — independente do preço que cobra do cliente.',
    how: [
      'Abra "Pagamentos" → aba "Configuração e Ganhos"',
      'Escolha a regra de pagamento da sua equipe',
      'Acompanhe os ganhos de cada entregador na mesma tela',
    ],
    href: '/client/drivers/financial',
  },
  {
    id: 'relatorios',
    icon: Receipt,
    title: '5. Acompanhe relatórios, saques e assinatura',
    why: 'Aqui você fecha o ciclo: quita pagamentos, processa saques e acompanha a assinatura da plataforma.',
    how: [
      'Abra "Pagamentos" → aba "Relatórios e Saques"',
      'Gere quitações por período e processe saques via PIX',
      'A tela de "Faturas" mostra a assinatura da plataforma',
    ],
    href: '/client/payment-reports',
  },
];

const ClientGuidePage = () => (
  <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
        <BookOpen size={22} /> Primeiros Passos — Entregas Próprias
      </h1>
      <p style={{ margin: 0, fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
        O caminho completo da sua operação, do preço à assinatura. Cada passo diz o
        <strong> porquê</strong> e o <strong>como</strong> — e leva direto para a tela certa.
      </p>
    </div>

    {ETAPAS.map((etapa) => (
      <div
        key={etapa.id}
        style={{
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: 20, marginBottom: 16,
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <etapa.icon size={17} color="#2563eb" /> {etapa.title}
        </h3>
        <p style={{ margin: '0 0 10px', fontSize: 13.5, color: '#374151', lineHeight: 1.7 }}>{etapa.why}</p>
        <ul style={{ margin: '0 0 8px', paddingLeft: 20, fontSize: 13.5, color: '#374151', lineHeight: 1.8 }}>
          {etapa.how.map((passo, i) => (
            <li key={i}>{passo}</li>
          ))}
        </ul>
        {etapa.href && (
          <Link
            to={etapa.href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6,
              padding: '8px 14px', borderRadius: 8, border: '1px solid #c7d2fe',
              background: '#eef2ff', color: '#4338ca', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Ir para esta tela <ArrowRight size={14} />
          </Link>
        )}
      </div>
    ))}

    <div
      style={{
        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: 20, marginTop: 24,
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
        Como o dinheiro flui (tudo independente)
      </h3>
      <p style={{ margin: '0 0 8px', fontSize: 13.5, color: '#374151', lineHeight: 1.7 }}>
        <CheckCircle size={13} color="#16a34a" style={{ verticalAlign: 'middle' }} /> O <strong>cliente</strong> paga o frete que VOCÊ definiu em Meus Preços.
      </p>
      <p style={{ margin: '0 0 8px', fontSize: 13.5, color: '#374151', lineHeight: 1.7 }}>
        <CheckCircle size={13} color="#16a34a" style={{ verticalAlign: 'middle' }} /> Você paga seus <strong>entregadores</strong> pela regra de Pagamentos — sem relação com o frete do cliente.
      </p>
      <p style={{ margin: 0, fontSize: 13.5, color: '#374151', lineHeight: 1.7 }}>
        <CheckCircle size={13} color="#16a34a" style={{ verticalAlign: 'middle' }} /> A <strong>assinatura da plataforma</strong> é um valor próprio (por entregador/pedido/fixo), combinado com o administrador.
      </p>
    </div>
  </div>
);

export default ClientGuidePage;
