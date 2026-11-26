# Plano de Implementação — WhatsApp como Canal de Pedidos

> Plano gerado em 2026-11-25 · Base: `docs/ANALISE_WHATSAPP_CANAL_PEDIDOS.md`
> Objetivo: usar WhatsApp Business API (Meta) como canal de pedidos de cada
> estabelecimento, com cardápio próprio, endereço por GPS, e o MuvLog
> gerenciando a entrega. Multi-tenant — cada EST com seu número/credenciais.
>
> **MANDATO "TUDO CONFIGURÁVEL"** — todo recurso do WhatsApp deve ser
> configurável pelo admin/estabelecimento (ligar/desligar, personalizar,
> ajustar ao modo de trabalho de cada cliente). Nada de funcionalidade fixa.

## Visão geral

```
Fase 1: Fundação (multi-credential + webhook)     ← SEM ISTO NADA FUNCIONA
Fase 2: Notificações (status do pedido)           ← VALOR IMEDIATO
Fase 3: Pedido por catálogo                        ← O CORAÇÃO DO NEGÓCIO
Fase 4: Endereço + GPS                             ← PRECISÃO
Fase 5: Pagamento + polimento                      ← EXPERIÊNCIA COMPLETA
```

---

## FASE 1 — Fundação (multi-credential + webhook)
**Prioridade: 🔴 CRÍTICA · Esforço: ~3–4 dias**

> Sem esta fase, nada funciona. É o "chão de fábrica" da integração.

### 1.1 Multi-credential WhatsApp (por estabelecimento)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 1.1.1 | Criar modelo `WhatsAppCredential` (phone_number_id, access_token, business_account_id, verify_token) | `src/models/ops.py` | 0,5d |
| 1.1.2 | Migração das colunas | `src/main.py` | — |
| 1.1.3 | CRUD de credenciais (estabelecimento cadastra suas) | `src/routes/whatsapp_config.py` | 0,5d |
| 1.1.4 | UI: aba "WhatsApp" no perfil do estabelecimento | `ClientProfilePage.jsx` | 0,5d |
| 1.1.5 | Validação: testar conexão com a API da Meta | `src/services/whatsapp_meta.py` | 0,5d |

### 1.2 Webhook handler (receber mensagens)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 1.2.1 | Endpoint webhook único: `POST /api/whatsapp/webhook` | `src/routes/whatsapp_webhook.py` | 0,5d |
| 1.2.2 | Verificação do webhook (GET challenge da Meta) | mesmo | — |
| 1.2.3 | Roteamento: identificar qual EST pelo número recebido | mesmo | 0,5d |
| 1.2.4 | Parse básico da mensagem (texto, mídia, localização) | `src/services/whatsapp_parser.py` | 0,5d |
| 1.2.5 | Log de mensagens recebidas (auditoria) | modelo + rota | 0,5d |

### 1.3 Serviço base WhatsApp

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 1.3.1 | Serviço de envio (templates + textos) | `src/services/whatsapp_meta.py` | 0,5d |
| 1.3.2 | Fila de mensagens (retry em caso de falha) | mesmo | — |
| 1.3.3 | Rate limiting (limite da Meta) | mesmo | — |

**Entregável Fase 1:** cada EST cadastra suas credenciais, o webhook recebe mensagens e roteia para o EST correto.

**Configurável (Fase 1):**
| O que | Config | Por quem |
|-------|--------|----------|
| Habilitar/desabilitar WhatsApp por EST | `whatsapp_enabled` (toggle) | EST |
| Número de telefone | `whatsapp_phone_number_id` | EST |
| Token de acesso | `whatsapp_access_token` | EST |
| Webhook URL | `whatsapp_webhook_url` | EST |
| Horário de atendimento (bot responde fora do horário) | `whatsapp_business_hours` | EST |

---

## FASE 2 — Notificações (status do pedido)
**Prioridade: 🔴 ALTA · Esforço: ~2–3 dias**

> Valor imediato para o cliente. Usa os dados que já temos.

### 2.1 Templates de mensagem (aprovação Meta)

| # | Template | Quando envia | Prioridade |
|---|----------|-------------|-----------|
| 2.1.1 | `pedido_confirmado` | Pedido aceito pelo EST | 🔴 |
| 2.1.2 | `pedido_em_preparo` | Status PREPARING | 🔴 |
| 2.1.3 | `saiu_para_entrega` | Status PICKED_UP | 🔴 |
| 2.1.4 | `pedido_entregue` | Status DELIVERED | 🔴 |
| 2.1.5 | `pedido_cancelado` | Status CANCELLED | 🟡 |
| 2.1.6 | `avaliar_entrega` | Pós-entrega | 🟢 |

### 2.2 Envio de notificações

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 2.2.1 | Hook no ciclo de vida do pedido (status change → WhatsApp) | `src/services/order_helpers.py` | 0,5d |
| 2.2.2 | Enviar para o cliente (telefone do Customer) | `src/services/whatsapp_meta.py` | 0,5d |
| 2.2.3 | Enviar para o EST (novo pedido, entregue) | mesmo | 0,5d |
| 2.2.4 | Evitar spam (não reenviar mesmo status) | mesmo | — |
| 2.2.5 | Log de mensagens enviadas (auditoria) | modelo | — |

### 2.3 UI de configuração

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 2.3.1 | Toggle: "Notificar cliente pelo WhatsApp" | `ClientProfilePage.jsx` | 0,5d |
| 2.3.2 | Toggle: "Notificar estabelecimento" | mesmo | — |

**Entregável Fase 2:** cliente recebe notificações de status do pedido pelo WhatsApp.

**Configurável (Fase 2):**
| O que | Config | Por quem |
|-------|--------|----------|
| Notificar cliente por WhatsApp | `whatsapp_notify_customer` (toggle) | EST |
| Notificar EST por WhatsApp | `whatsapp_notify_establishment` (toggle) | EST |
| Quais status notificar | `whatsapp_notify_statuses` (checkbox por status) | EST |
| Texto das mensagens (customizar) | `whatsapp_message_templates` (editável) | EST |
| Horário silencioso (não notificar) | `whatsapp_quiet_hours` | EST |
| Idioma | `whatsapp_language` | EST |

---

## FASE 3 — Pedido por catálogo
**Prioridade: 🟡 ALTA · Esforço: ~3–4 dias**

> O coração do negócio — cliente monta pedido pelo WhatsApp.

### 3.1 Catálogo de produtos

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 3.1.1 | Modelo `WhatsAppProduct` (nome, preço, descrição, foto, ativo) | `src/models/ops.py` | 0,5d |
| 3.1.2 | CRUD de produtos (EST gerencia cardápio) | `src/routes/whatsapp_catalog.py` | 0,5d |
| 3.1.3 | UI: gerenciar cardápio WhatsApp | `ClientWhatsAppPage.jsx` | 1d |
| 3.1.4 | Sincronizar com catálogo da Meta (ou usar mensagens interativas) | `src/services/whatsapp_meta.py` | 1d |

### 3.2 Recebimento de pedido

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 3.2.1 | Parser: extrair produtos do catálogo/mensagem | `src/services/whatsapp_parser.py` | 1d |
| 3.2.2 | Montar `Order` (itens, valores, observações) | `src/routes/whatsapp_webhook.py` | 0,5d |
| 3.2.3 | Validação (produto existe? preço mudou? EST aberto?) | mesmo | 0,5d |
| 3.2.4 | Confirmação automática para o cliente | `whatsapp_meta.py` | — |

### 3.3 Fluxo de pedido

| # | Tarefa | Descrição |
|---|--------|-----------|
| 3.3.1 | Cliente abre conversa | Boas-vindas + menu ("Como posso ajudar?") |
| 3.3.2 | Cliente navega catálogo | Lista de categorias → produtos |
| 3.3.3 | Cliente monta pedido | Adiciona itens, quantidades |
| 3.3.4 | Cliente envia endereço | GPS ou texto (Fase 4) |
| 3.3.5 | Sistema cria Order | Pedido entra no MuvLog |
| 3.3.6 | Confirmação | "Pedido #45 confirmado! Total: R$ 45,00" |

**Entregável Fase 3:** cliente faz pedido pelo WhatsApp e ele entra no MuvLog.

**Configurável (Fase 3):**
| O que | Config | Por quem |
|-------|--------|----------|
| Cardápio (produtos, preços, fotos) | CRUD completo | EST |
| Categorias do cardápio | CRUD | EST |
| Pedido mínimo | `whatsapp_min_order_value` | EST |
| Taxa de entrega (fixa ou por km) | Usa tabela de preços existente | EST |
| Formas de pagamento aceitas | `whatsapp_payment_methods` (checkbox) | EST |
| Horário de pedidos | `whatsapp_order_hours` | EST |
| Confirmação automática vs manual | `whatsapp_auto_confirm` (toggle) | EST |
| Limite de pedidos simultâneos | `whatsapp_max_pending_orders` | EST |
| Observações obrigatórias | `whatsapp_require_notes` (toggle) | EST |
| Tempo de preparo estimado | Usa `preparation_minutes` existente | EST |

---

## FASE 4 — Endereço + GPS
**Prioridade: 🟡 MÉDIA · Esforço: ~1–2 dias**

> Endereço exato = entrega certa.

### 4.1 Endereço por GPS (prioritário)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 4.1.1 | Receber localização compartilhada (WhatsApp Location) | `whatsapp_parser.py` | 0,5d |
| 4.1.2 | Usar coordenadas direto (sem geocoding) | `whatsapp_webhook.py` | — |
| 4.1.3 | Reverse geocoding (obter endereço legível) | `src/services/geocoding.py` | 0,5d |

### 4.2 Endereço por texto (fallback)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 4.2.1 | Extrair endereço do texto da mensagem | `whatsapp_parser.py` | 0,5d |
| 4.2.2 | Geocoding do endereço | `geocoding.py` | — |
| 4.2.3 | Confirmação: "Este é o endereço correto?" | `whatsapp_meta.py` | — |

**Entregável Fase 4:** endereço do pedido vem do GPS ou texto, com precisão.

**Configurável (Fase 4):**
| O que | Config | Por quem |
|-------|--------|----------|
| Aceitar endereço por GPS | `whatsapp_accept_gps` (toggle) | EST |
| Aceitar endereço por texto | `whatsapp_accept_text_address` (toggle) | EST |
| Confirmação de endereço obrigatória | `whatsapp_confirm_address` (toggle) | EST |
| Área de atendimento (raio máximo) | `whatsapp_max_delivery_km` | EST |
| Endereços salvos (cliente recorrente) | `whatsapp_save_addresses` (toggle) | EST |
| Taxa por km (fora da área) | Usa tabela de preços existente | EST |

---

## FASE 5 — Pagamento + polimento
**Prioridade: 🟢 MÉDIA · Esforço: ~2–3 dias**

> Experiência completa e retenção.

### 5.1 Pagamento PIX

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 5.1.1 | Gerar QR Code PIX do pedido | `src/services/whatsapp_meta.py` | 0,5d |
| 5.1.2 | Enviar QR Code no WhatsApp | mesmo | — |
| 5.1.3 | Confirmar pagamento (webhook Asaas) | `src/routes/webhooks.py` | 0,5d |

### 5.2 Pedido rápido (repetir)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 5.2.1 | "Repetir último pedido?" (botão) | `whatsapp_parser.py` | 0,5d |
| 5.2.2 | Criar novo Order com mesmos itens | `whatsapp_webhook.py` | — |

### 5.3 Avaliação pós-entrega

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 5.3.1 | Enviar "Avalie sua experiência ⭐⭐⭐⭐⭐" | `whatsapp_meta.py` | 0,5d |
| 5.3.2 | Registrar avaliação (link para form ou estrelas no WhatsApp) | `whatsapp_webhook.py` | — |

### 5.4 Dashboard WhatsApp

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 5.4.1 | Pedidos que chegaram pelo WhatsApp | `ClientWhatsAppPage.jsx` | 0,5d |
| 5.4.2 | Métricas (pedidos/mês, taxa de conversão) | mesmo | — |

### 5.5 Promoções (futuro)

| # | Tarefa | Descrição |
|---|--------|-----------|
| 5.5.1 | Campanhas para clientes | "Hoje: 10% no frete!" |
| 5.5.2 | Cupom de desconto | Código promocional no WhatsApp |

**Entregável Fase 5:** pagamento PIX, pedido rápido, avaliação, dashboard.

**Configurável (Fase 5):**
| O que | Config | Por quem |
|-------|--------|----------|
| Aceitar pagamento PIX | `whatsapp_accept_pix` (toggle) | EST |
| Aceitar pagamento na entrega | `whatsapp_accept_cash` (toggle) | EST |
| Aceitar cartão na entrega | `whatsapp_accept_card` (toggle) | EST |
| Pedido rápido (repetir) | `whatsapp_quick_reorder` (toggle) | EST |
| Avaliação pós-entrega | `whatsapp_post_delivery_rating` (toggle) | EST |
| Promoções/campanhas | `whatsapp_promotions` (toggle) | EST |
| Cupom de desconto | `whatsapp_coupons` (toggle) | EST |
| Dashboard WhatsApp | `whatsapp_dashboard` (toggle) | EST |

---

## Resumo de fases

| Fase | Nome | Prioridade | Esforço | Entregável |
|------|------|-----------|---------|------------|
| **1** | Fundação (multi-credential + webhook) | 🔴 Crítica | 3–4 dias | EST cadastra credenciais, webhook funciona |
| **2** | Notificações (status) | 🔴 Alta | 2–3 dias | Cliente recebe status pelo WhatsApp |
| **3** | Pedido por catálogo | 🟡 Alta | 3–4 dias | Cliente faz pedido pelo WhatsApp |
| **4** | Endereço + GPS | 🟡 Média | 1–2 dias | Endereço exato (GPS/texto) |
| **5** | Pagamento + polimento | 🟢 Média | 2–3 dias | PIX, pedido rápido, avaliação |
| **TOTAL** | | | **11–16 dias** | **Sistema completo** |

---

## Dependências entre fases

```
Fase 1 (fundação)
  │
  ├──► Fase 2 (notificações) ──► Fase 5.3 (avaliação)
  │
  ├──► Fase 3 (pedido catálogo) ──► Fase 4 (endereço) ──► Fase 5.1 (PIX)
  │
  └──► Fase 5.2 (pedido rápido)
```

**Fase 1 é obrigatória antes de qualquer outra.**
Fases 2 e 3 podem ser paralelas após a Fase 1.

---

## Requisitos externos (não são código)

| Item | Quem faz | Quando |
|------|----------|--------|
| Conta WhatsApp Business API (Meta) | Cada EST | Antes da Fase 1 |
| Aprovação de templates (Meta) | MuvLog auxilia | Antes da Fase 2 |
| Catálogo de produtos (Meta) | Cada EST | Antes da Fase 3 |
| Número de telefone dedicado | Cada EST | Antes da Fase 1 |

---

## Modelo de custos (resumo)

| Cenário (50 ESTs) | Custo MUV/mês | Receita/mês | Margem |
|-------------------|:---:|:---:|:---:|
| EST paga WhatsApp direto | R$ 300 | R$ 10.000 | 97% |
| Híbrido (MUV paga + cobra) | R$ 800 | R$ 10.000 | 92% |

---

## 🔧 Configurabilidade — Resumo (mandato "tudo configurável")

Toda funcionalidade do WhatsApp é **configurável pelo admin/estabelecimento**.
Nada é fixo — cada cliente ajusta ao seu modo de trabalho.

### Configurações por fase

| Fase | Configs | Exemplos |
|------|:---:|---------|
| 1 — Fundação | 5 | Habilitar WhatsApp, credenciais, horário de atendimento |
| 2 — Notificações | 6 | Quais status notificar, textos, horário silencioso |
| 3 — Pedido | 10 | Cardápio, pedido mínimo, pagamento, confirmação auto/manual |
| 4 — Endereço | 6 | GPS, texto, confirmação, área de atendimento |
| 5 — Pagamento | 8 | PIX, dinheiro, cartão, pedido rápido, avaliação, promoções |
| **TOTAL** | **35 configs** | |

### Quem configura o quê

| Quem | O que configura |
|------|----------------|
| **Admin (ADM)** | Credenciais globais, templates aprovados, limites da Meta |
| **Estabelecimento (EST)** | Tudo operacional: cardápio, notificações, pagamentos, horários, textos |
| **Plataforma (MUV)** | Feature flags globais (ligar/desligar WhatsApp por tenant) |

### Princípios aplicados

| Princípio | Como se aplica |
|-----------|---------------|
| **Tudo configurável** | 35 configurações em 5 fases — nada fixo |
| **Sem poluir** | Configs aparecem só quando a feature está habilitada |
| **Explicar transtornos** | Cada config tem descrição do que faz e efeito colateral |
| **Nunca % do frete** | Cobrança por acesso/uso (conversas), não por transação |
| **Isolamento multi-tenant** | Cada EST vê só suas configurações e pedidos |

---

## Critérios de sucesso

| Critério | Como medir |
|----------|-----------|
| Pedidos via WhatsApp | % de pedidos que chegam pelo WhatsApp |
| Satisfação do cliente | Avaliação média pós-entrega |
| Taxa de erro de endereço | Pedidos com endereço incorreto |
| Tempo de confirmação | Minutos entre pedido e confirmação |
| Retenção | Clientes que repetem pedido pelo WhatsApp |

---

*Plano gerado em 2026-11-25 · Para aprovação do Mauro antes de implementar*
