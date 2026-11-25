# Análise iFood Multi-Tenant — Visão Correta

> Documento registrado em 2026-11-25 a pedido do Mauro, após correção de
> entendimento: a integração com o iFood é dos ESTABELECIMENTOS (clientes),
> não da plataforma. MuvLog é SaaS multi-tenant — NÃO é restaurante, NÃO é
> merchant no iFood.

## Princípio fundamental

```
┌─────────────────────────────────────────────────┐
│              MuvLog (plataforma SaaS)            │
│  NÃO é restaurante · NÃO é merchant no iFood    │
│  É o SISTEMA que gerencia entregas              │
└──────────────┬──────────────────┬───────────────┘
               │                  │
    ┌──────────▼──────────┐ ┌────▼──────────────┐
    │   Estabelecimento A │ │ Estabelecimento B │
    │   Merchant iFood #1 │ │ Merchant iFood #2 │
    │   Cardápio próprio  │ │ Cardápio próprio  │
    │   Pedidos próprios  │ │ Pedidos próprios  │
    └──────────┬──────────┘ └────┬──────────────┘
               │                  │
    ┌──────────▼──────────────────▼───────────────┐
    │              iFood                          │
    │   Cada loja é um merchant INDEPENDENTE      │
    └─────────────────────────────────────────────┘
```

**Cada estabelecimento é o merchant do iFood** — com seus próprios pedidos,
cardápio, credenciais. O MuvLog é a **camada tecnológica** que conecta o
iFood de cada loja ao sistema de gestão de entregas.

## As duas integrações (diferença crucial)

| | Integração EST ↔ iFood | Integração MUV ↔ iFood |
|---|---|---|
| **Quem é o merchant** | O estabelecimento | Ninguém (MuvLog não é merchant) |
| **Quem tem as credenciais** | O estabelecimento (Client ID/Secret) | Não tem (ou tem como partner) |
| **O que flui** | Pedidos do iFood → MuvLog (para entregar) | Eventos de plataforma (se aplicável) |
| **Responsabilidade** | Do estabelecimento com o iFood | MuvLog só fornece a tecnologia |
| **Cardápio** | Do estabelecimento (eles gerenciam) | MuvLog não mexe |
| **Preço/prazo** | Do estabelecimento (eles definem) | MuvLog não mexe |

## O que o MuvLog precisa construir

| # | O que é | Descrição | Prioridade |
|---|---------|-----------|-----------|
| **1** | **Multi-credential iFood** | Cada estabelecimento cadastra suas credenciais do iFood (merchant_id, client_id, client_secret) no perfil. O sistema usa CADA credencial para falar com o iFood DAQUELE estabelecimento. | 🔴 Alta |
| **2** | **iFood API Client (multi-tenant)** | Módulo que autentica e faz polling **por estabelecimento** — cada loja consulta SEUS pedidos no iFood com SUAS credenciais. | 🔴 Alta |
| **3** | **Mapeamento de pedidos iFood → MuvLog** | Pedido do iFood vira um `Order` no MuvLog vinculado ao estabelecimento correto (itens, endereço, pagamento, taxas do iFood). | 🔴 Alta |
| **4** | **Status MuvLog → iFood** | Quando o pedido muda status no MuvLog (aceito, preparando, saiu para entrega), enviar para o iFood **daquela loja**. | 🔴 Alta |
| **5** | **Webhook iFood → MuvLog** | iFood envia eventos (novo pedido, cancelamento) para uma URL. O MuvLog precisa rotear o evento para o estabelecimento correto. | 🟡 Média |
| **6** | **Cardápio** | O estabelecimento gerencia o cardápio direto no painel do iFood (simplifica). O MuvLog não precisa sincronizar. | 🟢 Simplificar |
| **7** | **Cadastro merchant** | Cada estabelecimento se registra no iFood por conta própria. O MuvLog não assume essa responsabilidade. | 🟢 Admin do EST |
| **8** | **Sandbox por estabelecimento** | Cada loja testa com suas credenciais no sandbox do iFood. | 🟢 |

## O que MuvLog NÃO faz (e não deve fazer)

| NÃO fazer | Por quê |
|-----------|---------|
| Ser merchant único do iFood | Mistura dados de todos os clientes — iFood não permitiria |
| Gerenciar cardápio das lojas | O cardápio é do estabelecimento |
| Definir preços/prazos | São do estabelecimento |
| Assumir responsabilidade com o iFood | O contrato é entre EST e iFood |
| Compartilhar pedidos entre lojas | Cada loja vê só os seus (isolamento multi-tenant) |

## Modelos possíveis para MUV ↔ iFood

| Modelo | Como seria | Probabilidade |
|--------|-----------|---------------|
| **Parceiro tecnológico** | MuvLog se registra como "integrador" no iFood e ajuda estabelecimentos a se conectarem (API de parceiros) | 🟡 Possível |
| **Marketplace de apps** | MuvLog aparece no marketplace de integrações do iFood | 🟡 Possível |
| **Só o layer técnico** | MuvLog não tem relação direta com iFood — cada estabelecimento conecta suas credenciais e o MuvLog faz o resto | ✅ Mais simples e correto |

**Recomendação:** começar pelo **modelo "só o layer técnico"** — cada
estabelecimento entra com suas credenciais do iFood, e o MuvLog faz a ponte
para gestão de entregas. Mais simples, não mistura dados, cada loja tem
autonomia.

## O que JÁ existe no sistema

| Componente | Status | Detalhe |
|-----------|--------|---------|
| `external_merchant_id` | ✅ | Campo no `Restaurant` para o ID do merchant iFood |
| Ciclo de vida do pedido | ✅ | PENDING → ACCEPTED → PREPARING → READY → PICKED_UP → DELIVERED |
| Gestão de entregadores | ✅ | Próprios + plataforma |
| Rastreamento GPS | ✅ | Localização em tempo real |
| Notificações | ✅ | Push FCM + in-app |
| Cobrança/assinatura | ✅ | Motor de componentes |
| Webhook infrastructure | ✅ | Rotas `/api/webhooks/*` existem |
| Cancelamento | ✅ | Fluxo completo com reembolso |
| Isolamento multi-tenant | ✅ | `tenant_id` em todas as tabelas |

## Requisitos do iFood (API deles)

| # | Requisito | O que é | Temos? |
|---|-----------|---------|--------|
| 1 | Cadastro de Merchant | Registrar operação no iFood como loja integrada | ❌ (cada EST faz) |
| 2 | Credenciais API | Client ID + Client Secret | ❌ (cada EST tem) |
| 3 | OAuth 2.0 | Autenticação via `client_credentials` | ❌ (construir) |
| 4 | Polling de pedidos | Consultar API periodicamente | ❌ (construir) |
| 5 | Webhook de eventos | iFood envia eventos para URL | ⚠️ (infra existe) |
| 6 | Confirmação rápida | Confirmar em até 3 minutos | ✅ (fluxo tem AUTO) |
| 7 | Status updates | Enviar status para o iFood | ⚠️ (mapear) |
| 8 | Rastreamento | Enviar localização/status | ✅ (GPS) |
| 9 | Cardápio | Sincronizado com iFood | 🟢 (manual no painel) |
| 10 | Cancelamento | Tratar cancelamentos | ⚠️ (webhook) |
| 11 | Latência | <2s; polling 30-60s | ⚠️ (infra) |
| 12 | Sandbox | Ambiente de testes | 🟢 (solicitar) |

## Caminho de implementação sugerido

| Fase | O que fazer | Esforço |
|------|------------|---------|
| **Fase 0** | Cada EST registra merchant no iFood + obtém credenciais + solicita sandbox | Administrativo (do EST) |
| **Fase 1** | Multi-credential: campos no perfil do EST para credenciais iFood | ~0,5 dia |
| **Fase 2** | API Client multi-tenant (OAuth + polling por EST) | ~2-3 dias |
| **Fase 3** | Mapeamento de pedidos (iFood → Order) + status (MuvLog → iFood) | ~1-2 dias |
| **Fase 4** | Webhook de eventos (novo pedido, cancelamento) com roteamento por EST | ~1 dia |
| **Fase 5** | Testes no sandbox → ajustes → produção | ~1 semana |

## Chance de sucesso

| Aspecto | Avaliação |
|---------|-----------|
| Núcleo do sistema (entregas, motoristas, rastreio) | ✅ Sólido |
| Isolamento multi-tenant | ✅ Já existe |
| Integração EST ↔ iFood | ❌ Precisa construir (mas por loja, não global) |
| Integração MUV ↔ iFood | 🟡 Depende do modelo (partner vs layer técnico) |
| Cardápio | 🟢 Cada loja gerencia no painel do iFood |

**Resumo:** o núcleo está pronto. O que falta é a **camada de integração
multi-tenant** (falar com a API do iFood usando as credenciais de cada loja).

---

*Documento registrado em 2026-11-25 · Referência para futura implementação*
