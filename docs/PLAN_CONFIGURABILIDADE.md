# Plano de Configurabilidade — Relações Operacionais

> Auditoria pedido pelo Mauro (2026-11-20): mapear TODAS as relações operacionais
> entre participantes e marcar o que NÃO precisa de configuração como
> "não necessário" com justificativa. Princípio: configurável é a **relação
> operacional** (regras do dia a dia de quem faz negócio com quem) — NÃO a
> estrutura do código/banco/arquitetura.
>
> Regra: **"tudo que pudermos deixar configurável, assim deve ser"** — mas
> **"sem poluir e criar coisas que não sejam tão úteis"** (régua 2026-11-24).

## Participantes

| # | Sigla | Quem é |
|---|-------|--------|
| 1 | **MUV** | Plataforma (SaaS provider) |
| 2 | **ADM** | Admin / tenant (empresa de delivery) |
| 3 | **EST** | Estabelecimento (loja, restaurante, farmácia) |
| 4 | **EP** | Entregador Próprio (funcionário do EST) |
| 5 | **MP** | Motorista Plataforma (independente) |
| 6 | **CLI** | Cliente Final (quem faz o pedido) |

---

## 1. MUV ↔ ADM (Plataforma → Admin)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Cobrança pelo uso do software | Motor de componentes: FIXO + R$/estab × modo + R$/pedido × faixas | ✅ Completo | — |
| Ciclo de cobrança | WEEKLY / MONTHLY | ✅ | — |
| Modo de contagem de estabs | SNAPSHOT / USO / PRO_RATA_USO | ✅ | — |
| Faixas marginais de pedidos | `order_price_tiers` (JSON) | ✅ | — |
| Cota de pedidos inclusa | `orders_included` | ✅ | — |
| Simular fatura | `GET /billing/subscriptions/:id/preview` | ✅ | — |
| Criar/editar assinatura | UI `PlatformBillingTab` (CRUD completo) | ✅ | — |
| Pagamento (Asaas) | PIX + cartão | ✅ | Conta única (não por tenant) — futuro |
| Status do admin | Aprovado / Pendente / Rejeitado / Suspenso | ✅ | — |
| Escopo de dados do admin | Filtrado por `tenant_id` | ✅ | — |
| **NÃO NECESSÁRIO:** arquitetura multi-tenant | Estrutura do banco | ❌ | Não é relação operacional |

**Resumo MUV↔ADM:** ✅ **Completo** — o motor de cobrança por componentes é o mais configurável do sistema.

---

## 2. ADM ↔ EST (Admin → Estabelecimento)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Cobrança (assinatura) | FIXO + R$/entregador (modo) + R$/pedido (cota/faixas) | ✅ Completo | — |
| Ciclo de cobrança | WEEKLY / MONTHLY | ✅ | — |
| Modo de contagem | SNAPSHOT / USO / PRO_RATA_USO | ✅ | — |
| Faixas marginais | `order_price_tiers` | ✅ | — |
| Simular fatura | `GET /subscriptions/:id/preview` | ✅ | — |
| Editar assinatura | UI (modal editar) | ✅ | — |
| Aprovação do estabelecimento | Criar → Ativo / Pendente | ✅ | — |
| Tabela de preços (frete) | `pricing_table_id` (próprio) + `platform_pricing_table_id` (plataforma) | ✅ | — |
| Frete por modelo de entrega | Toggle Próprio/Plataforma no cálculo | ✅ | — |
| Frota compartilhada (produto) | `fleet_sharing_enabled` (flag por loja) | ✅ | — |
| Modo de distribuição | MANUAL / AUTO (corredor angular) | ✅ | — |
| Parâmetros de distribuição | `route_angle_tolerance`, `route_max_orders`, `route_max_distance_km` | ✅ | — |
| Numeração de pedidos | `seq_reset_mode` (DAILY / CONTINUOUS) | ✅ | — |
| Confirmação de coleta | `pickup_confirmation_type` (code / photo / none) | ✅ | — |
| Confirmação de entrega | `delivery_confirmation_type` (code / photo / none) | ✅ | — |
| Tempo de preparo | `preparation_minutes` | ✅ | — |
| Modo da maquininha | `machine_settlement_mode` (PER_SHIFT / PER_DELIVERY) | ✅ | — |
| Dados bancários / PIX | `bank_name`, `bank_agency`, `bank_account`, `bank_pix_key` | ✅ | — |
| **NÃO NECESSÁRIO:** endereço, CNPJ, telefone | Dados cadastrais | ❌ | São identidade, não regra operacional |

**Resumo ADM↔EST:** ✅ **Muito completo** — seguindo o mandato "tudo configurável".

---

## 3. EST ↔ EP (Estabelecimento → Entregador Próprio)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Modelo de pagamento (7 modelos) | PER_DELIVERY, PER_KM, PERCENTAGE, DAILY, FIXED, FIXED_PLUS_DELIVERY, FIXED_UP_TO_PLUS_DELIVERY | ✅ | — |
| Valor do pagamento | `own_driver_fixed_value`, `_km_value`, `_percentage`, `_delivery_value`, `_max_deliveries` | ✅ | — |
| Frequência de pagamento | DAILY / WEEKLY / MONTHLY / ON_DEMAND (por entregador) | ✅ | — |
| Acerto de retorno | CASH / CARD / PIX + maquininha (PER_SHIFT / PER_DELIVERY) | ✅ | — |
| PIN de acesso | 4 dígitos, resetável | ✅ | — |
| Link de ativação | Token único com expiração | ✅ | — |
| Online / Offline | Controle do entregador | ✅ | — |
| Veículo | Tipo, placa, modelo | ✅ | — |
| Atribuição a pedido | Manual (modal) ou AUTO (corredor angular) | ✅ | — |
| Ofertas (aceitar/recusar) | OFFERED status + push FCM + beep/banner | ✅ | — |
| Rotas | Automática (2+ pedidos) + reorganizar + Google Maps | ✅ | — |
| Frota compartilhada | Vínculo N:N loja↔entregador | ✅ | — |
| Notificações | Push FCM (ofertas) + in-app | ✅ | — |
| **NÃO NECESSÁRIO:** horário de trabalho | Entregador define quando fica online | ❌ | É o próprio quem controla |
| **NÃO NECESSÁRIO:** rota específica por entregador | Sistema calcula otimizada | ❌ | Algoritmo, não regra operacional |

**Resumo EST↔EP:** ✅ **Completo** — 7 modelos de pagamento + frequência + acerto configuráveis.

---

## 4. ADM ↔ EP (Admin → Entregador)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Acesso ao painel do entregador | PIN + link de ativação | ✅ | — |
| Conversão plataforma→próprio | `convert-to-own` (desativa da plataforma) | ✅ | — |
| Pagamento (config global) | Via `Restaurant.own_driver_*` (ADM configura pelo EST) | ✅ | — |
| Suspensão / penalidade | `DriverPenalty`, `is_blocked` | ✅ | — |
| **NÃO NECESSÁRIO:** gestão direta ADM↔EP | ADM não gerencia EP diretamente — o EST gerencia | ❌ | Quem paga e gerencia é o EST |

**Resumo ADM↔EP:** ✅ **Adequado** — o ADM não precisa gerenciar EP diretamente.

---

## 5. EST ↔ MP (Estabelecimento → Motorista Plataforma)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Método de distribuição | nearest / broadcast / queue / manual | ✅ (por pedido) | — |
| Chamar plataforma | `call-platform` (notifica disponíveis) | ✅ | — |
| Frete (tabela) | `platform_pricing_table_id` (separado do próprio) | ✅ | — |
| Confirmação de coleta/entrega | code / photo / none | ✅ | — |
| **NÃO NECESSÁRIO:** escolher MP específico | Sistema atribui (mais próximo / fila) | ❌ | É a lógica da plataforma |
| **NÃO NECESSÁRIO:** definir pagamento do MP | Quem paga é a MUV, não o EST | ❌ | Relação MUV↔MP |

**Resumo EST↔MP:** ✅ **Adequado** — o EST escolhe o método, o sistema atribui.

---

## 6. MUV ↔ MP (Plataforma → Motorista Plataforma)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Modelo de pagamento (7 modelos) | PERCENTAGE (padrão), PER_DELIVERY, PER_KM, DAILY, FIXED, FIXED_PLUS_DELIVERY, FIXED_UP_TO_PLUS_DELIVERY | ✅ (novo!) | — |
| Valor do pagamento | `platform_fixed_value`, `_km_value`, `_delivery_value`, `_max_deliveries` | ✅ (novo!) | — |
| Percentual do frete | `driver_percentage` (fallback 65%) | ✅ | — |
| Carteira digital | `balance` / `locked_balance` | ✅ | — |
| Saque (PIX) | Solicitação → processamento admin / Asaas | ✅ | — |
| Ranking / gamificação | MuvScore semanal, bônus, conquistas | ✅ | — |
| Penalidades | Rejeições, bloqueio temporário | ✅ | — |
| Avaliações | `customer_rating`, `rating` | ✅ | — |
| Evitamentos | Pares motorista↔loja (G-08) | ✅ | — |
| **NÃO NECESSÁRIO:** horário de trabalho | Motorista define quando fica online | ❌ | É o próprio quem controla |
| **NÃO NECESSÁRIO:** veículo fixo | Motorista atualiza | ❌ | Dado pessoal |

**Resumo MUV↔MP:** ✅ **Completo** — 7 modelos de pagamento configuráveis (novo nesta sessão).

---

## 7. EST ↔ CLI (Estabelecimento → Cliente Final)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Preço do frete | Tabela de preços (faixas, fixo, por km, frete grátis, teto/piso) | ✅ | — |
| Frete por modelo de entrega | Tabelas separadas (próprio vs plataforma) | ✅ (novo!) | — |
| Multiplicador por veículo | bike / moto / carro | ✅ | — |
| Volta (ida + volta) | `round_trip` + `round_trip_rate_per_km` | ✅ | — |
| Deslocamento até a coleta | `pickup_rate_per_km` (só plataforma) | ✅ | — |
| Frete grátis | `free_delivery_min_order` | ✅ | — |
| Valor mínimo | `min_delivery_fee` | ✅ | — |
| Valor máximo | `max_delivery_fee` | ✅ | — |
| Distância mínima | `min_distance_km` | ✅ | — |
| Faixas de km (TIERS) | `tier_bands` (JSON) | ✅ | — |
| Modo de preço | PER_KM / TIERS | ✅ | — |
| Confirmação de entrega | code / photo / none | ✅ | — |
| Rastreio público | Link com token UUID | ✅ | — |
| Notificações | Status do pedido (in-app + WhatsApp) | ✅ | — |
| **NÃO NECESSÁRIO:** formas de pagamento | PIX / Dinheiro / Cartão (definido pelo EST) | ❌ | É o EST que aceita |
| **NÃO NECESSÁRIO:** endereço do CLI | Cadastro do cliente | ❌ | Dado pessoal |

**Resumo EST↔CLI:** ✅ **Muito completo** — a tabela de preços é a mais detalhada do sistema.

---

## 8. MUV ↔ EST (Plataforma → Estabelecimento)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Integração iFood | `external_merchant_id`, webhook (FORA por enquanto) | ⏸️ Adiado | Decisão do Mauro: só quando robusto |
| WhatsApp (notificações) | `whatsapp_service` (stub) | ⏸️ Adiado | Decisão do Mauro |
| Domínio próprio | `muv.log.br` (por tenant, futuro) | 🟡 | Hoje domínio único |
| Push notifications | FCM (in-app + push) | ✅ | — |
| E-mail | `@muv.log.br` (Cloudflare Email Routing) | ✅ | Envio como = adiado |
| **NÃO NECESSÁRIO:** interface personalizada | White label = futuro | ❌ | Não é relação operacional |

**Resumo MUV↔EST:** ⚠️ **Parcial** — iFood e WhatsApp adiados por decisão.

---

## 9. MUV ↔ CLI (Plataforma → Cliente Final)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Rastreio público | Link `/track/:token` | ✅ | — |
| Notificações de status | In-app + WhatsApp (stub) | ✅ | — |
| **NÃO NECESSÁRIO:** cadastro do cliente | CLI cria conta ou pede sem conta | ❌ | É o CLI quem escolhe |
| **NÃO NECESSÁRIO:** pagamento ao CLI | CLI paga ao EST/entregador | ❌ | Não é relação MUV↔CLI |

**Resumo MUV↔CLI:** ✅ **Mínimo adequado** — MUV não interage financeiramente com CLI.

---

## 10. EP ↔ CLI e MP ↔ CLI (Entregador → Cliente)

| Relação operacional | Hoje | Configurável? | Lacuna / Ação |
|---|---|---|---|
| Confirmação de entrega | code / photo / none | ✅ (config pelo EST) | — |
| Prova de entrega | Foto / código | ✅ | — |
| Avaliação do cliente | `customer_rating` (1-5 estrelas) | ✅ | — |
| Comprovante PIX | Upload de foto | ✅ | — |
| **NÃO NECESSÁRIO:** contato direto | Telefone do CLI é mascarado (LGPD) | ❌ | Questão de privacidade |

**Resumo EP↔CLI / MP↔CLI:** ✅ **Adequado** — confirmação configurável, LGPD respeitada.

---

## Resumo Geral

| Relação | Status | Itens configuráveis | Não necessários |
|---------|--------|-------------------|-----------------|
| MUV ↔ ADM | ✅ Completo | 10 | 1 |
| ADM ↔ EST | ✅ Muito completo | 16 | 1 |
| EST ↔ EP | ✅ Completo | 14 | 2 |
| ADM ↔ EP | ✅ Adequado | 4 | 1 |
| EST ↔ MP | ✅ Adequado | 4 | 2 |
| MUV ↔ MP | ✅ Completo | 10 | 2 |
| EST ↔ CLI | ✅ Muito completo | 15 | 2 |
| MUV ↔ EST | ⚠️ Parcial | 5 | 1 |
| MUV ↔ CLI | ✅ Mínimo adequado | 2 | 2 |
| EP/MP ↔ CLI | ✅ Adequado | 4 | 1 |
| **TOTAL** | | **84 configuráveis** | **15 não necessários** |

---

## Pendências identificadas (lacunas reais)

| # | Lacuna | Relação | Prioridade | Descrição |
|---|--------|---------|-----------|-----------|
| 1 | **Pagamento por conta Asaas por tenant** | MUV↔ADM | 🟡 | Hoje conta única — SaaS multi-tenant precisaria de credencial por tenant |
| 2 | **Domínio próprio por tenant** | MUV↔EST | 🟢 | Hoje `muv.log.br` é único — futuro white label |
| 3 | **Envio de e-mail como `@muv.log.br`** | MUV↔EST | 🟢 | Adiado — opções mapeadas |
| 4 | **iFood / WhatsApp** | MUV↔EST | 🟢 | Adiados — decisão do Mauro |
| 5 | **Modo PICO de ativos simultâneos** | MUV↔ADM | 🟢 | Exigiria histórico diário — não necessário hoje |

---

## Conclusão

O sistema já atende ao mandato **"tudo configurável"** de forma ampla:
- **84 relações operacionais configuráveis** em todas as 10 relações entre participantes
- **15 relações marcadas como "não necessário"** com justificativa (identidade, privacidade, algoritmo)
- As 5 lacunas reais são de infraestrutura (Asaas multi-tenant, domínio, e-mail) ou adiadas por decisão — nenhuma é de regra operacional

**Próximo passo:** aprovação do Mauro. Se ele identificar relações que faltam, adicionar ao documento.

---

*Documento gerado em 2026-11-25 · Para aprovação do Mauro*
