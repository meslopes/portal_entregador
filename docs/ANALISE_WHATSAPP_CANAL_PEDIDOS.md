# Análise WhatsApp como Canal de Pedidos — Multi-Tenant

> Documento registrado em 2026-11-25 a pedido do Mauro. Conceito: usar o
> WhatsApp Business API (Meta) como canal de pedidos de cada estabelecimento,
> com cardápio próprio por loja, e o MuvLog como sistema de gestão de entregas.
> Ainda NÃO implementar — apenas análise.

## Conceito

```
Cliente (WhatsApp)          Estabelecimento           MuvLog
     │                           │                      │
     │── "Quero pedir..." ──────▶│                      │
     │                           │── Pedido chega ─────▶│
     │                           │                      │── Cria Order
     │                           │                      │── Geocodifica endereço
     │                           │                      │── Atribui entregador
     │◀── "Pedido confirmado!" ──│◀── Status ───────────│
     │◀── "Saiu para entrega" ───│◀── Status ───────────│
     │◀── "Entregue!" ───────────│◀── Status ───────────│
```

**Cada estabelecimento usa SEU WhatsApp** como canal de pedidos. O MuvLog
processa os pedidos e gerencia a entrega. O cliente interage pelo WhatsApp —
o canal que já usa todo dia.

## O que a Meta WhatsApp Business API oferece

| Recurso | O que faz | Serve para nós? |
|---------|-----------|-----------------|
| **Catálogo de produtos** | Loja monta cardápio no WhatsApp (fotos, preços, descrições) | ✅ "Cardápio de cada cliente" |
| **Mensagens interativas** | Botões, listas, produtos selecionáveis | ✅ Cliente monta pedido clicando |
| **Compartilhar localização** | Cliente envia localização pelo WhatsApp | ✅ Endereço exato sem digitar |
| **Webhook de mensagens** | Recebe mensagens automaticamente | ✅ Base da integração |
| **Templates de mensagem** | Mensagens pré-aprovadas (confirmação, status) | ✅ Notificações |
| **Multi-número** | Cada negócio tem seu próprio número | ✅ Cada EST tem o seu |
| **API de mídia** | Enviar/receber imagens | ✅ Fotos de produtos, comprovantes |

## Como funcionaria na prática

1. **Estabelecimento monta o cardápio** no WhatsApp Business Catalog (Meta)
2. **Cliente faz o pedido** pelo WhatsApp — vê catálogo, seleciona produtos
3. **Endereço**: cliente compartilha localização (GPS) OU digita endereço
4. **Sistema MuvLog processa** — extrai produtos, endereço, pagamento; cria Order
5. **Entrega gerenciada** pelo MuvLog (entregador, GPS, status)
6. **Notificações de volta** ao WhatsApp (confirmado, em preparo, saiu, entregue)

## Estratégia inteligente: Catálogo > Texto livre

| Abordagem | Como funciona | Precisão | Dificuldade |
|-----------|--------------|----------|-------------|
| Texto livre | Cliente digita "2 pizzas, rua X, 123" | ⚠️ Baixa | 🔴 Alta (NLP) |
| **Catálogo estruturado** | **Cliente clica nos produtos do catálogo WhatsApp** | **✅ Alta** | **🟡 Média** |
| **Localização GPS** | **Cliente compartilha localização** | **✅ Alta** | **🟢 Baixa** |
| **Híbrido (recomendado)** | **Catálogo para produtos + GPS para endereço** | **✅ Alta** | **🟡 Média** |

**Recomendação:** catálogo + localização GPS — produtos estruturados (sem NLP)
e endereço exato (sem geocoding de texto).

## Requisitos técnicos

| # | O que precisa | Dificuldade | Detalhe |
|---|--------------|-------------|---------|
| 1 | WhatsApp Business API (Meta Cloud API) | 🟡 Média | Cada EST precisa de conta WhatsApp Business + aprovação da Meta |
| 2 | Webhook de mensagens | 🟡 Média | Receber e processar mensagens dos clientes |
| 3 | Parser de pedido | 🟡 Média | Extrair produtos/endereço do catálogo estruturado |
| 4 | Extrator de endereço | 🟢 Baixa | Localização GPS (nativo do WhatsApp) |
| 5 | Criação de Order | 🟢 Baixa | Já temos o fluxo — adaptar origem |
| 6 | Notificações de status | 🟢 Baixa | Templates WhatsApp + envio |
| 7 | Multi-tenant | 🟡 Média | Cada EST tem seu número, catálogo, credenciais |
| 8 | Aprovação Meta | 🟡 Média | Templates precisam de aprovação |

## O que já existe no sistema

| Componente | Status | Reutilizável? |
|-----------|--------|--------------|
| `whatsapp_service.py` | ⚠️ Stub | Base para expandir |
| Webhook infrastructure | ✅ | Sim |
| Criação de Order | ✅ | Sim |
| Geocoding (GPS + texto) | ✅ | Sim |
| Notificações de status | ✅ | Adaptar para WhatsApp |
| Multi-tenant | ✅ | Sim |
| Gestão de entregadores | ✅ | Sim |
| Rastreamento GPS | ✅ | Sim |

## O que falta construir

| # | Componente | Esforço | Prioridade |
|---|-----------|---------|-----------|
| **1** | Multi-credential WhatsApp | ~0,5 dia | 🔴 Cada EST cadastra seu número + token |
| **2** | Webhook handler | ~1-2 dias | 🔴 Receber mensagens e rotear por EST |
| **3** | Catálogo de produtos | ~1 dia | 🟡 Gerenciar cardápio por EST (ou usar catálogo da Meta) |
| **4** | Parser de pedido | ~1-2 dias | 🟡 Extrair produtos + endereço da mensagem |
| **5** | Criação de Order via WhatsApp | ~0,5 dia | 🟢 Adaptar fluxo existente |
| **6** | Notificações de status | ~1 dia | 🟢 Templates + envio |
| **7** | Dashboard de pedidos WhatsApp | ~1 dia | 🟢 Ver pedidos que chegaram pelo WhatsApp |

## Comparativo: WhatsApp vs iFood

| Aspecto | WhatsApp | iFood |
|---------|----------|-------|
| **Custo para o EST** | Baixo (API da Meta) | Alto (comissão do iFood) |
| **Autonomia do EST** | Total (preço, cardápio, prazo) | Limitada (regras do iFood) |
| **Alcance** | Base de clientes do EST | Marketplace do iFood |
| **Complexidade técnica** | Média | Alta |
| **Aprovação** | Rápida | Processo longo |
| **Dados do cliente** | São do EST | São do iFood |
| **Margem** | Melhor (sem comissão) | Pior (comissão) |

## Chance de sucesso

| Aspecto | Avaliação |
|---------|-----------|
| Núcleo do sistema (entregas) | ✅ Pronto |
| WhatsApp Business API | ✅ Documentação da Meta é boa |
| Catálogo de produtos | ✅ Recurso nativo da Meta |
| Localização GPS | ✅ Recurso nativo do WhatsApp |
| Parser de pedido (catálogo) | ✅ Estruturado = fácil |
| Multi-tenant | ✅ Já existe |
| **Combinado** | **✅ Alta chance de sucesso** |

## Vantagem competitiva

O WhatsApp é **mais simples e mais lucrativo** que o iFood:
- Sem comissão por pedido
- O EST tem autonomia total
- O cliente já usa WhatsApp todo dia
- A integração é mais direta
- Dados do cliente são do EST (não do iFood)

---

*Documento registrado em 2026-11-25 · Ainda NÃO implementar — análise*
