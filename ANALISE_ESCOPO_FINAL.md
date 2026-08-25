# Análise Completa: muv.log vs Entregas Expressas
## Escopo Final do Projeto

**Data**: 27/07/2026
**Referência**: https://entregasexpressas.com.br/
**Objetivo**: Construir plataforma SaaS completa para empresas de entrega

---

## 1. VISÃO GERAL DO NEGÓCIO

### Modelo de negócio (Entregas Expressas)
- **Tipo**: SaaS B2B para empresas de entrega
- **Pricing**: Por quantidade de entregas/mês (não por usuário)
- **Planos**: Gratuito (100), Básico R$199 (500), Premium R$579 (2.000), Platina R$1.999 (10.000)
- **White-label**: App do entregador e painel do cliente com marca do cliente
- **Base**: +2.000 empresas, +30.000 entregadores, +10M pedidos processados

### Seu modelo (muv.log)
- **Uso 1**: Plataforma própria (sua lancheria como CLIENT)
- **Uso 2**: Administrador de logística (suas 2 praças como ADMIN)
- **Uso 3**: Venda para outros administradores (SaaS)

---

## 2. COMPARAÇÃO DE MÓDULOS

### 2.1 OPERAÇÃO (Painel Administrativo)

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Painel operacional em tempo real | ✅ | ✅ | ✅ Temos |
| Mapa ao vivo com entregadores e pedidos | ✅ | ✅ | ✅ Temos |
| Rastreamento GPS contínuo | ✅ | ✅ | ✅ Temos |
| Central de pedidos com alerta sonoro | ✅ | ✅ | ✅ Temos |
| Confirmação de chegada na coleta | ✅ | ❌ | ❌ Falta |
| Agendamento de entregas | ✅ | ✅ (recém-implantado) | ✅ Temos |
| Múltiplos locais de coleta | ✅ | ❌ | ❌ Falta |
| Áreas de cobertura por bairro/polígono | ✅ | ❌ | ❌ Falta |
| Histórico completo (auditoria) | ✅ | ❌ | ❌ Falta |
| Busca e filtros avançados | ✅ | ⚠️ Básico | ⚠️ Parcial |

### 2.2 PEDIDOS

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Criação manual de pedidos | ✅ | ✅ | ✅ Temos |
| Botão "Chamar entregador" sob demanda | ✅ | ❌ | ❌ Falta |
| Pedidos multi-parada | ✅ | ❌ | ❌ Falta |
| Otimização automática de rotas | ✅ | ❌ | ❌ Falta |
| Agrupamento manual e automático | ✅ | ❌ | ❌ Falta |
| Edição de valor pós-aceite | ✅ | ⚠️ Parcial | ⚠️ Parcial |
| Cancelamento e reenvio à fila | ✅ | ⚠️ Parcial | ⚠️ Parcial |
| Troca rápida de entregador | ✅ | ✅ | ✅ Temos |
| Entrega parcial em multi-parada | ✅ | ❌ | ❌ Falta |
| Link público de rastreio | ✅ | ❌ | ❌ Falta |
| Notificações push de status | ✅ | ⚠️ WhatsApp | ⚠️ Parcial |

### 2.3 DISTRIBUIÇÃO INTELIGENTE

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Mais próximo (1 a 1) | ✅ | ✅ | ✅ Temos |
| Toque para todos (broadcast) | ✅ | ❌ | ❌ Falta |
| Por fila ordenada | ✅ | ❌ | ❌ Falta |
| Atribuição manual | ✅ | ✅ | ✅ Temos |
| Fila por estabelecimento | ✅ | ❌ | ❌ Falta |
| Entregadores priorizados/fixos | ✅ | ❌ | ❌ Falta |
| Distância máxima pra ofertas | ✅ | ✅ | ✅ Temos |
| Tempo de aceite configurável | ✅ | ✅ | ✅ Temos |
| Máximo de pedidos simultâneos | ✅ | ✅ | ✅ Temos |
| Sistema de penalidades automáticas | ✅ | ❌ | ❌ Falta |

### 2.4 PAINEL DO CLIENTE (White-label)

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Subdomínio personalizado | ✅ | ❌ | ❌ Falta |
| Domínio próprio customizado | ✅ | ❌ | ❌ Falta |
| Logo, cores e nome próprios | ✅ | ❌ | ❌ Falta |
| Termos e privacidade customizáveis | ✅ | ❌ | ❌ Falta |
| Níveis de acesso e permissões | ✅ | ❌ | ❌ Falta |
| Sub-usuários por cliente | ✅ | ❌ | ❌ Falta |
| Criação e agendamento de pedidos | ✅ | ✅ | ✅ Temos |
| Rastreamento ao vivo no mapa | ✅ | ✅ | ✅ Temos |
| Chat com entregador | ✅ | ❌ | ❌ Falta |
| App Android e iOS com marca | ✅ | ❌ | ❌ Falta |

### 2.5 GESTÃO DE ENTREGADORES

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Cadastro, aprovação e perfil completo | ✅ | ✅ | ✅ Temos |
| Tipos de veículos (moto, bike, carro) | ✅ | ✅ | ✅ Temos |
| Escalas, turnos e ofertas de jornada | ✅ | ❌ | ❌ Falta |
| Bloqueio geral ou por cliente | ✅ | ❌ | ❌ Falta |
| Disponibilidade online/offline | ✅ | ✅ | ✅ Temos |
| Sobreposição (app sempre aberto) | ✅ | ❌ | ❌ Falta |
| Chat com suporte e cliente | ✅ | ❌ | ❌ Falta |
| Seguro opcional | ✅ | ❌ | ❌ Falta |

### 2.6 TARIFAS E PRECIFICAÇÃO

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Tarifa fixa | ✅ | ❌ | ❌ Falta |
| Por quilômetro (KM) | ✅ | ✅ | ✅ Temos |
| Por faixas de KM | ✅ | ❌ | ❌ Falta |
| Por bairro/região | ✅ | ❌ | ❌ Falta |
| Por área desenhada no mapa | ✅ | ❌ | ❌ Falta |
| Método combinado | ✅ | ❌ | ❌ Falta |
| Múltiplas tabelas de preço | ✅ | ❌ | ❌ Falta |
| Taxa de chuva, cancelamento e retorno | ✅ | ❌ | ❌ Falta |
| Tarifa dinâmica por demanda | ✅ | ❌ | ❌ Falta |
| Áreas hexagonais customizáveis | ✅ | ❌ | ❌ Falta |

### 2.7 INTEGRAÇÕES

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| iFood, 99Food, AiqFome | ✅ | ⚠️ Webhook básico | ⚠️ Parcial |
| Anota AI, Cardápio Web, Cardápio.ai | ✅ | ❌ | ❌ Falta |
| Zé Delivery, Mais Delivery, Uai Rango | ✅ | ❌ | ❌ Falta |
| OpenDelivery (padrão aberto) | ✅ | ❌ | ❌ Falta |
| Multi-pedidos no mesmo painel | ✅ | ❌ | ❌ Falta |
| Aceite/rejeição dinâmica do iFood | ✅ | ❌ | ❌ Falta |
| Asaas, Mercado Pago, Sicoob, Banco Inter | ✅ | ❌ | ❌ Falta |
| Webhooks pra qualquer sistema | ✅ | ✅ | ✅ Temos |
| Integrações ativas ilimitadas | ✅ | ❌ | ❌ Falta |

### 2.8 WHITE-LABEL

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Logo, cores e nome customizáveis | ✅ | ❌ | ❌ Falta |
| Subdomínio próprio | ✅ | ❌ | ❌ Falta |
| Domínio próprio customizado | ✅ | ❌ | ❌ Falta |
| App do Entregador com marca | ✅ | ❌ | ❌ Falta |
| App do Cliente com marca | ✅ | ❌ | ❌ Falta |
| Nomenclaturas customizáveis | ✅ | ❌ | ❌ Falta |

### 2.9 MULTI-OPERAÇÃO

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Perfis de acesso e permissões | ✅ | ⚠️ Básico | ⚠️ Parcial |
| Múltiplas praças/cidades | ✅ | ✅ | ✅ Temos |
| Central multi-praça consolidada | ✅ | ⚠️ Parcial | ⚠️ Parcial |
| Sub-usuários por cliente | ✅ | ❌ | ❌ Falta |
| Bloqueios e permissões avançadas | ✅ | ❌ | ❌ Falta |

### 2.10 FINANCEIRO

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Carteira do cliente (crédito pré-pago) | ✅ | ❌ | ❌ Falta |
| Carteira do entregador (saldo a receber) | ✅ | ❌ | ❌ Falta |
| Extrato detalhado | ✅ | ⚠️ Básico | ⚠️ Parcial |
| Saque via PIX direto do app | ✅ | ❌ | ❌ Falta |
| Repasse manual ou automático | ✅ | ❌ | ❌ Falta |
| Pagamento faturado mensal | ✅ | ❌ | ❌ Falta |
| Geração automática de faturas | ✅ | ⚠️ Manual | ⚠️ Parcial |
| Bônus manual ou automático por meta | ✅ | ⚠️ Implementado | ⚠️ Parcial |
| Desafios e gamificação | ✅ | ⚠️ Implementado | ⚠️ Parcial |

### 2.11 PAGAMENTOS

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| PIX integrado | ✅ | ⚠️ QR Code manual | ⚠️ Parcial |
| Cartão de crédito | ✅ | ❌ | ❌ Falta |
| Pagamento offline (dinheiro/maquininha) | ✅ | ✅ | ✅ Temos |
| Métodos customizáveis no portal | ✅ | ❌ | ❌ Falta |
| Escolha de método por endereço | ✅ | ❌ | ❌ Falta |
| Detalhamento de taxas no pedido | ✅ | ❌ | ❌ Falta |

### 2.12 WHATSAPP

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Recebimento de pedidos via WhatsApp | ✅ | ❌ | ❌ Falta |
| Envio automático de status | ✅ | ✅ | ✅ Temos |

### 2.13 MAPA & ROTAS

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Mapa em tempo real | ✅ | ✅ | ✅ Temos |
| Roteirização otimizada | ✅ | ❌ | ❌ Falta |
| Geocoding ilimitado | ✅ | ✅ (Nominatim) | ✅ Temos |
| Cálculo de distância por estrada | ✅ | ⚠️ Haversine (linha reta) | ⚠️ Parcial |
| ETA em tempo real | ✅ | ❌ | ❌ Falta |
| Áreas e polígonos no mapa | ✅ | ❌ | ❌ Falta |
| Histórico de trajeto | ✅ | ❌ | ❌ Falta |
| Abrir rota em app externo | ✅ | ✅ | ✅ Temos |

### 2.14 SEGURANÇA

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Raio de validação no GPS (coleta/entrega) | ✅ | ❌ | ❌ Falta |
| Código de coleta e entrega | ✅ | ❌ | ❌ Falta |
| Prova com foto e assinatura | ✅ | ⚠️ Só foto | ⚠️ Parcial |
| Bloqueio automático por rejeições | ✅ | ❌ | ❌ Falta |
| Cobrança de retorno automática | ✅ | ❌ | ❌ Falta |
| Cadastros sob aprovação | ✅ | ✅ | ✅ Temos |
| Documentação obrigatória | ✅ | ❌ | ❌ Falta |
| Log completo de auditoria | ✅ | ❌ | ❌ Falta |
| Proteção anti-bot | ✅ | ❌ | ❌ Falta |
| Conformidade LGPD | ✅ | ❌ | ❌ Falta |

### 2.15 RELATÓRIOS

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Dashboard de pedidos em tempo real | ✅ | ✅ | ✅ Temos |
| Estatísticas por entregador ou cliente | ✅ | ⚠️ Básico | ⚠️ Parcial |
| Ranking de entregadores | ✅ | ✅ | ✅ Temos |
| Ranking de clientes | ✅ | ❌ | ❌ Falta |
| Filtros por data, status, cliente, entregador | ✅ | ⚠️ Básico | ⚠️ Parcial |
| Relatórios financeiros detalhados | ✅ | ⚠️ Básico | ⚠️ Parcial |
| Exportação pra Excel e CSV | ✅ | ❌ | ❌ Falta |
| Relatório diário automático por e-mail | ✅ | ❌ | ❌ Falta |

### 2.16 MARKETING

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Posts diários pras redes sociais | ✅ | ❌ | ❌ Falta |
| Google Analytics (GA4) | ✅ | ❌ | ❌ Falta |
| Google Tag Manager | ✅ | ❌ | ❌ Falta |
| Google Ads — tag de conversão | ✅ | ❌ | ❌ Falta |
| Meta/Facebook Pixel | ✅ | ❌ | ❌ Falta |
| TikTok Pixel | ✅ | ❌ | ❌ Falta |
| Jivochat (chat ao vivo) | ✅ | ❌ | ❌ Falta |

### 2.17 API E DESENVOLVEDORES

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| API REST completa | ✅ | ⚠️ Básica | ⚠️ Parcial |
| Webhooks em tempo real | ✅ | ✅ | ✅ Temos |
| Documentação online | ✅ | ❌ | ❌ Falta |
| Múltiplas chaves de API | ✅ | ❌ | ❌ Falta |
| Open Delivery | ✅ | ❌ | ❌ Falta |
| Mapas, rotas e cálculo de distância via API | ✅ | ❌ | ❌ Falta |

### 2.18 IAGO (OPERADOR DIGITAL - IA)

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Atende clientes no WhatsApp 24h | ✅ | ❌ | ❌ Falta |
| Consulta pedidos | ✅ | ❌ | ❌ Falta |
| Lança solicitações | ✅ | ❌ | ❌ Falta |
| Reduz mensagens repetitivas | ✅ | ❌ | ❌ Falta |

### 2.19 MERCADO DE ENTREGAS

| Recurso | Entregas Expressas | muv.log atual | Status |
|---------|-------------------|---------------|--------|
| Estabelecimentos procurando entregas | ✅ | ❌ | ❌ Falta |
| Entregadores querendo trabalhar | ✅ | ❌ | ❌ Falta |
| Casamento automático pelo raio | ✅ | ❌ | ❌ Falta |
| Conversão em 1 clique | ✅ | ❌ | ❌ Falta |

---

## 3. RESUMO ESTATÍSTICO

| Categoria | Total Entregas Expressas | muv.log tem | % Completo |
|-----------|-------------------------|-------------|------------|
| Operação | 10 | 6 | 60% |
| Pedidos | 11 | 4 | 36% |
| Distribuição | 10 | 5 | 50% |
| Painel do Cliente | 10 | 2 | 20% |
| Entregadores | 8 | 3 | 38% |
| Tarifas | 10 | 1 | 10% |
| Integrações | 9 | 2 | 22% |
| White-label | 6 | 0 | 0% |
| Multi-operação | 5 | 2 | 40% |
| Financeiro | 9 | 3 | 33% |
| Pagamentos | 6 | 1 | 17% |
| WhatsApp | 2 | 1 | 50% |
| Mapa & Rotas | 8 | 4 | 50% |
| Segurança | 10 | 2 | 20% |
| Relatórios | 8 | 3 | 38% |
| Marketing | 7 | 0 | 0% |
| API | 6 | 2 | 33% |
| IAGo | 4 | 0 | 0% |
| Mercado | 4 | 0 | 0% |
| **TOTAL** | **143** | **41** | **29%** |

---

## 4. PRIORIZAÇÃO DE DESENVOLVIMENTO

### FASE 1 — CORE (Essencial para funcionar)
**Tempo estimado: 4-6 semanas**

1. **Pedidos multi-parada** — Várias entregas em uma rota
2. **Agrupamento inteligente** — Combinar pedidos próximos
3. **Otimização de rotas** — Melhor sequência de entregas
4. **Link público de rastreio** — Cliente final acompanha
5. **Confirmação de chegada na coleta** — Entregador marca "cheguei"
6. **Áreas de cobertura** — Definir bairros atendidos
7. **Histórico completo (auditoria)** — Log de todas as ações
8. **Busca e filtros avançados** — Por ID, cliente, tempo

### FASE 2 — TARIFAS (Diferencial competitivo)
**Tempo estimado: 3-4 semanas**

1. **Múltiplos métodos de tarifa** — Fixa, KM, faixas, bairro, área
2. **Múltiplas tabelas de preço** — Por cliente, serviço, veículo
3. **Taxa de chuva automática** — Adicional em dias chuvosos
4. **Taxa de cancelamento** — Cobrar do cliente
5. **Taxa de retorno** — Cobrar volta ao ponto de coleta
6. **Tarifa dinâmica** — Preço por demanda/horário

### FASE 3 — FINANCEIRO (Monetização)
**Tempo estimado: 4-5 semanas**

1. **Carteira digital do entregador** — Saldo a receber
2. **Carteira digital do cliente** — Crédito pré-pago
3. **Repasse automático** — Regras de pagamento
4. **Pagamento faturado** — Crédito para clientes
5. **Geração automática de faturas** — Fechamento mensal
6. **Saque via PIX** — Direto do app

### FASE 4 — DISTRIBUIÇÃO (Eficiência operacional)
**Tempo estimado: 2-3 semanas**

1. **Broadcast** — Toque para todos simultaneamente
2. **Fila ordenada** — Fila única de entregadores
3. **Fila por estabelecimento** — Fila separada por loja
4. **Entregadores priorizados/fixos** — Vinculação por cliente
5. **Sistema de penalidades** — Bloqueio por rejeições

### FASE 5 — WHITE-LABEL (Venda como SaaS)
**Tempo estimado: 6-8 semanas**

1. **Configuração de marca** — Logo, cores, nome
2. **Subdomínio personalizado** — empresa.muv.log.br
3. **Domínio próprio** — app.empresa.com.br
4. **Painel do cliente com marca** — White-label completo
5. **App do entregador com marca** — PWA ou React Native
6. **Nomenclaturas customizáveis** — Renomear campos

### FASE 6 — INTEGRAÇÕES (Ecossistema)
**Tempo estimado: 4-6 semanas**

1. **Integração iFood completa** — Aceite/rejeição dinâmica
2. **Integração 99Food** — Webhook nativo
3. **Integração AiqFome** — API nativa
4. **Open Delivery** — Padrão aberto
5. **Gateway de pagamento** — Asaas, Mercado Pago
6. **WhatsApp Business API** — Chat nativo

### FASE 7 — SEGURANÇA (Confiabilidade)
**Tempo estimado: 2-3 semanas**

1. **Raio de validação GPS** — Coleta e entrega
2. **Código de coleta/entrega** — Anti-fraude
3. **Prova com assinatura** — Digital
4. **Bloqueio automático** — Por rejeições
5. **Documentação obrigatória** — CNH, foto
6. **Log de auditoria** — Compliance

### FASE 8 — RELATÓRIOS (Inteligência)
**Tempo estimado: 2-3 semanas**

1. **Ranking de clientes** — Top clientes
2. **Exportação Excel/CSV** — Todos os dados
3. **Relatório diário por e-mail** — Automático
4. **Relatórios financeiros detalhados** — Breakdown completo

### FASE 9 — MARKETING (Crescimento)
**Tempo estimado: 1-2 semanas**

1. **Google Analytics** — GA4
2. **Google Tag Manager** — Tags
3. **Meta/Facebook Pixel** — Remarketing
4. **TikTok Pixel** — Anúncios
5. **Posts diários** — Redes sociais

### FASE 10 — API (Desenvolvedores)
**Tempo estimado: 2-3 semanas**

1. **API REST completa** — Documentada
2. **Múltiplas chaves** — Por cliente
3. **Open Delivery** — Padrão aberto
4. **Webhooks em tempo real** — Eventos

### FASE 11 — IAGO (IA)
**Tempo estimado: 4-6 semanas**

1. **Bot WhatsApp** — Atendimento 24h
2. **Consulta de pedidos** — Status automático
3. **Lançamento de solicitações** — Via chat
4. **Redução de mensagens** — Automação

### FASE 12 — MERCADO (Crescimento)
**Tempo estimado: 3-4 semanas**

1. **Portal de oportunidades** — Estabelecimentos e entregadores
2. **Matching automático** — Por raio de atuação
3. **Conversão em 1 clique** — Cadastro simplificado

---

## 5. ARQUITETURA NECESSÁRIA

### Backend (atual → necessário)
- **Atual**: Flask monolítico
- **Necessário**: Flask com módulos separados, possível migração para FastAPI

### Frontend (atual → necessário)
- **Atual**: React SPA único
- **Necessário**: React com code splitting, possível PWA

### Banco de dados (atual → necessário)
- **Atual**: PostgreSQL básico
- **Necessário**: PostgreSQL com particionamento, Redis para cache

### Infraestrutura (atual → necessário)
- **Atual**: Render free tier
- **Necessário**: Render pago ou AWS/GCP

### Apps nativos (atual → necessário)
- **Atual**: Nenhum
- **Necessário**: React Native ou PWA para entregador e cliente

---

## 6. INVESTIMENTO ESTIMADO

### Desenvolvimento (tempo)
- **Fases 1-4**: ~15-18 semanas (core + financeiro)
- **Fases 5-8**: ~14-20 semanas (white-label + integrações)
- **Fases 9-12**: ~10-15 semanas (marketing + API + IA)
- **Total**: ~39-53 semanas (9-12 meses)

### Infraestrutura (custo mensal)
- **Render Starter**: $7/mês
- **PostgreSQL Starter**: $7/mês
- **Domínio**: ~R$40/ano
- **WhatsApp Business**: Variável
- **Total mínimo**: ~R$100/mês

### Ferramentas
- **MiMo Code**: Seu plano atual
- **GitHub**: Gratuito
- **Vercel**: Gratuito (frontend)
- **Render**: Gratuito → Pago

---

## 7. PRÓXIMOS PASSOS RECOMENDADOS

1. **Revisar esta análise** — Confirmar prioridades
2. **Ajustar fases** — Baseado na sua necessidade real
3. **Começar pela Fase 1** — Core para funcionar
4. **Testar cada fase** — Antes de avançar
5. **Documentar decisões** — Para manter consistência

---

**Observação**: Esta análise é baseada no site da Entregas Expressas e no estado atual do muv.log. Ajustes podem ser feitos conforme sua necessidade específica.
