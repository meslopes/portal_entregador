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
Fase 6: Atendimento automatizado (regras)          ← EST NÃO PRECISA ATENDER
Fase 7: Atendimento com IA (LLM)                   ← EXPERIÊNCIA NATURAL
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

## FASE 6 — Atendimento automatizado (regras)
**Prioridade: 🟡 ALTA · Esforço: ~2–3 dias**

> O estabelecimento NÃO precisa ficar atendendo clientes — o bot responde
> automaticamente. Sem IA — usa botões, menus e fluxos pré-definidos.

### 6.1 Menu principal interativo

| # | Tarefa | Descrição |
|---|--------|-----------|
| 6.1.1 | Boas-vindas personalizada por EST | Nome, logo, horário de funcionamento |
| 6.1.2 | Menu de botões | [Cardápio] [Fazer Pedido] [Meu Pedido] [Ajuda] [Falar com Atendente] |
| 6.1.3 | Respostas rápidas (FAQ) | Horário, endereço, taxa de entrega, formas de pagamento |

### 6.2 Fluxo de pedido automatizado

| # | Tarefa | Descrição |
|---|--------|-----------|
| 6.2.1 | Navegação por categorias | [Pizzas] [Bebidas] [Sobremesas] → produtos |
| 6.2.2 | Seleção de produtos | Botões com nome + preço |
| 6.2.3 | Carrinho | "Seu pedido: 2× Calabresa, 1× Coca. Total: R$ 80" |
| 6.2.4 | Confirmação | [Confirmar] [Editar] [Cancelar] |
| 6.2.5 | Status automático | Templates de confirmação/preparo/entrega |

### 6.3 Transferência para humano

| # | Tarefa | Descrição |
|---|--------|-----------|
| 6.3.1 | Botão "Falar com Atendente" | Transfere para fila de atendimento |
| 6.3.2 | Notificação ao EST | "Cliente precisa de atendimento humano" |
| 6.3.3 | Fora do horário | "Deixe sua mensagem que responderemos em breve" |

**Configurável (Fase 6):**
| O que | Config | Por quem |
|-------|--------|----------|
| Bot de atendimento | `whatsapp_chatbot_enabled` (toggle) | EST |
| Menu principal (itens) | `whatsapp_main_menu` (editável) | EST |
| Boas-vindas (texto) | `whatsapp_welcome_message` (editável) | EST |
| FAQ (perguntas/respostas) | `whatsapp_faq` (CRUD) | EST |
| Horário de atendimento automático | `whatsapp_bot_hours` | EST |
| Transferir para humano | `whatsapp_transfer_to_human` (toggle) | EST |
| Mensagem fora do horário | `whatsapp_off_hours_message` | EST |

**Entregável Fase 6:** bot atende clientes automaticamente — EST não precisa ficar no WhatsApp.

---

## FASE 7 — Atendimento com IA (LLM)
**Prioridade: 🟢 DIFERENCIAL · Esforço: ~3–5 dias**

> Experiência natural — cliente fala normalmente e a IA entende.
> Plano "Premium" — custo adicional por interação.

### 7.1 Integração com LLM

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| 7.1.1 | Escolher provedor (OpenAI / Claude / Gemini) | `src/services/ai_service.py` | 0,5d |
| 7.1.2 | Chave API por tenant (multi-tenant) | modelo + config | 0,5d |
| 7.1.3 | Prompt do sistema (contexto do EST) | `ai_service.py` | 0,5d |
| 7.1.4 | Memória de conversa (contexto da sessão) | `src/services/whatsapp_session.py` | 0,5d |

### 7.2 Capacidades da IA

| # | Capacidade | Exemplo |
|---|-----------|---------|
| 7.2.1 | **Entender texto livre** | "Quero uma pizza grande de calabresa" |
| 7.2.2 | **Responder perguntas** | "Vocês entregam no meu bairro?" |
| 7.2.3 | **Recomendar produtos** | "Baseado no seu pedido, quer sobremesa?" |
| 7.2.4 | **Lidar com reclamações** | "Meu pedido atrasou" |
| 7.2.5 | **Confirmar pedido** | "Será 2× Calabresa + 1× Coca. Confirma?" |
| 7.2.6 | **Extrair endereço** | "Rua das Flores, 123, Vila Mariana" |
| 7.2.7 | **Traduzir/entender erros** | "Aqulai me manda uma coca" → entende |
| 7.2.8 | **Transferir quando necessário** | Caso complexo → atendente humano |

### 7.3 Roteamento inteligente

| # | Tarefa | Descrição |
|---|--------|-----------|
| 7.3.1 | Se IA tem certeza → responde sozinha | Pedidos, FAQ, status |
| 7.3.2 | Se IA não tem certeza → transfere | Casos complexos, reclamações |
| 7.3.3 | Log de interações da IA | Auditoria + melhoria |
| 7.3.4 | Feedback do EST | "A resposta da IA foi útil?" |

### 7.4 Controle de custo

| # | Tarefa | Descrição |
|---|--------|-----------|
| 7.4.1 | Limite de tokens/mês por EST | Evitar custos surpresa |
| 7.4.2 | Cache de respostas frequentes | Reduz chamadas à IA |
| 7.4.3 | Só usar IA para texto livre | Fluxos estruturados ficam no bot |
| 7.4.4 | Relatório de uso | EST vê quantas interações da IA |

**Configurável (Fase 7):**
| O que | Config | Por quem |
|-------|--------|----------|
| Atendimento com IA | `whatsapp_ai_enabled` (toggle) | EST |
| Provedor de IA | `whatsapp_ai_provider` (OpenAI/Claude/Gemini) | EST/ADM |
| Personalidade da IA | `whatsapp_ai_personality` (tom, linguagem) | EST |
| Limite de interações/mês | `whatsapp_ai_monthly_limit` | EST |
| Limite de tokens | `whatsapp_ai_token_limit` | ADM |
| Transferir quando não souber | `whatsapp_ai_transfer_threshold` | EST |
| Base de conhecimento (produtos) | Automático do cardápio | — |
| Base de conhecimento (FAQ) | `whatsapp_ai_knowledge` (editável) | EST |
| Cache de respostas | `whatsapp_ai_cache_enabled` (toggle) | ADM |
| Relatório de uso da IA | `whatsapp_ai_report` (toggle) | EST |

**Entregável Fase 7:** IA atende clientes em linguagem natural — plano "Premium".

---

## Resumo de fases

| Fase | Nome | Prioridade | Esforço | Entregável |
|------|------|-----------|---------|------------|
| **1** | Fundação (multi-credential + webhook) | 🔴 Crítica | 3–4 dias | EST cadastra credenciais, webhook funciona |
| **2** | Notificações (status) | 🔴 Alta | 2–3 dias | Cliente recebe status pelo WhatsApp |
| **3** | Pedido por catálogo | 🟡 Alta | 3–4 dias | Cliente faz pedido pelo WhatsApp |
| **4** | Endereço + GPS | 🟡 Média | 1–2 dias | Endereço exato (GPS/texto) |
| **5** | Pagamento + polimento | 🟢 Média | 2–3 dias | PIX, pedido rápido, avaliação |
| **6** | Atendimento automatizado (regras) | 🟡 Alta | 2–3 dias | Bot atende sem humano |
| **7** | Atendimento com IA (LLM) | 🟢 Diferencial | 3–5 dias | IA entende linguagem natural |
| **TOTAL** | | | **16–25 dias** | **Sistema completo + IA** |

---

## Dependências entre fases

```
Fase 1 (fundação)
  │
  ├──► Fase 2 (notificações) ──► Fase 5.3 (avaliação)
  │
  ├──► Fase 3 (pedido catálogo) ──► Fase 4 (endereço) ──► Fase 5.1 (PIX)
  │
  ├──► Fase 5.2 (pedido rápido)
  │
  └──► Fase 6 (bot regras) ──► Fase 7 (IA) ──► Plano Premium
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

## Modelo de custos e planos de venda

### Planos por estabelecimento

| Plano | O que inclui | Preço sugerido/EST/mês |
|-------|-------------|:---:|
| **Essencial** | Cardápio, pedido por botões, status, FAQ | Incluso na assinatura |
| **Completo** | + bot de atendimento (regras), pedido rápido, avaliação | + R$ 30–50 |
| **Premium** | + IA (linguagem natural, perguntas, recomendações) | + R$ 80–150 |

### Custos operacionais (MUV)

| Plano | Custo WhatsApp/EST | Custo IA/EST | Custo total/EST | Preço venda | Margem |
|-------|:---:|:---:|:---:|:---:|:---:|
| **Essencial** | R$ 40–80 | R$ 0 | R$ 40–80 | Incluso | ~80% |
| **Completo** | R$ 40–80 | R$ 0 | R$ 40–80 | R$ 30–50 | ~50% |
| **Premium** | R$ 40–80 | R$ 50–150 | R$ 90–230 | R$ 80–150 | ~60% |

### Escala (50 estabelecimentos)

| Cenário | Custo MUV/mês | Receita/mês | Margem |
|---------|:---:|:---:|:---:|
| Todos Essencial | R$ 2.000–4.000 | R$ 10.000 (assinatura) | 60–80% |
| 30 Essencial + 20 Premium | R$ 4.000–8.600 | R$ 13.000–15.000 | 50–70% |
| Todos Premium | R$ 4.500–11.500 | R$ 16.000–20.000 | 50–70% |

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
| 6 — Bot regras | 7 | Menu principal, FAQ, boas-vindas, transferir humano |
| 7 — IA | 10 | Provedor IA, personalidade, limite tokens, base conhecimento |
| **TOTAL** | **52 configs** | |

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
