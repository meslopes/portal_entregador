# PLANO: Controle de Entregadores Próprios pelo Estabelecimento

## Problema Atual (Bug)

O botão "Chamar Plataforma" não aparece após criar um novo pedido porque:
- O backend cria pedidos como `SCHEDULED` (não `PENDING`)
- O modal de distribuição só mostra para pedidos `PENDING`
- Existe um gap temporal: o pedido fica SCHEDULED até `scheduled_at` chegar

**Correção necessária:** Mudar o fluxo para criar como PENDING quando o estabelecimento tem entregadores próprios.

---

## O que JÁ EXISTE (implementado)

### Gestão de Entregadores (CRUD)
- Cadastrar entregadores com nome, telefone, veículo, placa, modelo
- Editar e remover (soft delete)
- Toggle online/offline
- Página `/client/drivers` com lista e formulário

### Distribuição de Pedidos
- Atribuir a entregador próprio (dropdown + botão "Atribuir"), utilizar lista de entregadores, cada um por vez, ou atribuido pelo estabelecimento. levar em consideração que os entregadores da casa normalmente saem com mais de um pedido em mesma rota. 
- criar opção de o proprio sistema verificar o roteiro dos pedidos e roteirizar as entregas com um maximo de pedidos por entregador definivel pelo estabelecimento.
- Chamar entregador da plataforma (botão "Chamar Plataforma")
- Badge "Próprio" na lista de pedidos
- Indicação de distribuição no modal de detalhes

### Dashboard do Estabelecimento
- 4 cards: Pedidos Hoje, Em Andamento, Esta Semana, Total Receita
- Mapa de rastreamento (apenas entregadores da plataforma)
- Lista de pedidos com filtros
- Modal de detalhes com ações (cancelar, avaliar)

### Financeiro
- Total a pagar, semana, mês, total entregas
- Histórico semanal (4 semanas)
- opção de pagamento diario
- opção de pagamento do que normalmente é chamado de "encoste", quando o entregador ganha de arrancada um valor fixo além dos valores de entrega
- opção de definição de valores de entrega variaveis como os que são disponibilizados pros entregadores da plataforma
- controle financeiro sobre oque é pago a cada entregador cfe cada opção de pagamento escolhido pelo estabelecimento


---

## FUNCIONALIDADES PROPOSTAS

### 1. PAINEL DE CONTROLE DO ENTREGADOR PRÓPRIO (Prioridade: ALTA)

**O que o estabelecimento precisa ver sobre cada entregador:**

#### 1.1 Dashboard do Entregador (individual)
- [ ] Foto/avatar do entregador
- [ ] Status atual (online/offline/em entrega)
- [ ] Localização em tempo real no mapa
- [ ] Pedidos ativos (quantos está carregando agora)
- [ ] Tempo médio de entrega
- [ ] Avaliação média (1-5 estrelas)
- [ ] Total de entregas hoje/semana/mês
- [ ] Ganhos do entregador hoje/semana/mês

#### 1.2 Rastreamento no Mapa
- [ ] Mostrar entregadores próprios no mapa do dashboard (junto com os da plataforma que estiverem em atividade pro estabelecimento)
- [ ] Ícone diferenciado (ex: azul para próprio, verde para plataforma)
- [ ] Atualização de localização a cada 10-30 segundos
- [ ] Rota em tempo real durante entrega

#### 1.3 Status Online/Offline com Localização
- [ ] Entregador atualiza posição via link WhatsApp ou PWA simples
- [ ] Ou app mobile leve (PWA) para entregadores próprios
- [ ] Geofencing: auto-offline se sair da região

---

### 2. CONTROLE FINANCEIRO DO ENTREGADOR PRÓPRIO (Prioridade: ALTA)

**O estabelecimento paga ao entregador por entrega. Precisa controlar:**

#### 2.1 Tipos de Pagamento (opções para o estabelecimento configurar)
- [ ] **Por entrega fixa** — valor fixo por entrega (ex: R$5,00/entrega)
- [ ] **Por km rodado** — valor por km (ex: R$1,50/km)
- [ ] **Misto** — fixo + por km
- [ ] **Misto2** -- fixo + por entrega
- [ ] **Percentual do frete** — % do delivery_fee (ex: 70%)
- [ ] **Diária** — valor fixo por dia trabalhado
- [ ] **Semanal/Mensal** — salário fixo (para contratados)

#### 2.2 Controle de Ganhos
- [ ] Registro de cada entrega com valor calculado
- [ ] Acumulado por entregador (dia/semana/mês)
- [ ] Relatório de gastos com entregadores próprios
- [ ] Comparativo: custo próprio vs custo plataforma

#### 2.3 Pagamento ao Entregador
- [ ] Registrar pagamentos feitos (manual)
- [ ] Saldo devedor por entregador
- [ ] Comprovante de pagamento
- [ ] Relatório mensal para folha de pagamento

---

### 3. NOTIFICAÇÕES E COMUNICAÇÃO (Prioridade: ALTA)

#### 3.1 Notificação de Novo Pedido
- [ ] WhatsApp automático quando novo pedido chega (com dados completos)
- [ ] Link para aceitar/recusar (ou aceite automático se atribuído)
- [ ] Sirene/alerta sonoro no painel do estabelecimento

#### 3.2 Status do Pedido
- [ ] Notificação quando entregador aceita
- [ ] Notificação quando saiu para entrega
- [ ] Notificação quando entregou
- [ ] Notificação de atraso (tempo excedido)

---

### 4. FLUXO COMPLETO DO PEDIDO (Prioridade: ALTA)

#### 4.1 Criação → Distribuição
- [ ] opção de distribuição automática (regra pré-configurada)
- [ ] Mostrar entregadores próprios online disponíveis no momento

#### 4.2 Acompanhamento
- [ ] Timeline do pedido (criado → aceito → saiu → entregue)
- [ ] Tempo estimado de entrega
- [ ] Mapa com rota do entregador em tempo real
- [ ] Botão "Ligar para entregador" no modal

#### 4.3 Confirmação de Entrega
- [ ] Código de confirmação (anti-fraude)
- [ ] Foto da entrega (prova)
- [ ] Assinatura digital (opcional)
- [ ] Confirmação automática por tempo (se não confirmar em X min)

---

### 5. AVALIAÇÃO E DESEMPENHO (Prioridade: MÉDIA)

#### 5.1 Avaliação do Entregador
- [ ] Avaliação por pedido (1-5 estrelas)
- [ ] Feedback textual
- [ ] Média acumulada visível no perfil
- [ ] Ranking de entregadores próprios

#### 5.2 Métricas de Desempenho
- [ ] Taxa de aceitação (aceitos / ofertados)
- [ ] Tempo médio de entrega
- [ ] Taxa de cancelamento
- [ ] Distância média percorrida
- [ ] Satisfação do cliente final (avaliação da entrega)

#### 5.3 Gamificação
- [ ] Metas diárias/semanais/mensais de entregas
- [ ] Bônus por performance
- [ ] Ranking interno entre entregadores próprios

---

### 6. RELATÓRIOS E ANÁLISES (Prioridade: MÉDIA)

#### 6.1 Relatório de Entregas
- [ ] Entregas por período (dia/semana/mês)
- [ ] Entregas por entregador
- [ ] Entregas por tipo (próprio vs plataforma)
- [ ] Horários de pico
- [ ] utilizar essas informações para prever dias que tem que chamar entregadores da plataforma, baseado em historico( essas informações devem ser passadas para admin da plataforma para se preparar para possiveis pedidos durante determinados dias)

#### 6.2 Relatório Financeiro
- [ ] Custo total com entregadores próprios
- [ ] Custo médio por entrega (próprio vs plataforma)
- [ ] Economia gerada por usar entregadores próprios ou inverso, economia usando entregadores da plataforma
- [ ] Projeção de custos mensais, baseado em historico e custos fixos

#### 6.3 Relatório Operacional
- [ ] Mapa de calor das entregas (zonas mais atendidas)
- [ ] Tempo médio de preparo vs entrega
- [ ] Taxa de sucesso das entregas

---

### 7. CONFIGURAÇÕES DO ESTABELECIMENTO (Prioridade: MÉDIA)

#### 7.1 Regras de Distribuição
- [ ] **Automática**: distribuir automaticamente para entregador mais próxima**
- [ ] **Automatica2**: distribuir automaticamente para entregador da vez disponivel
- [ ] **Manual**: sempre pedir confirmação do estabelecimento
- [ ] **Híbrida**: usar próprio se disponível, senão chamar plataforma
- [ ] **Fila**: distribuir em ordem de chegada (round-robin)
- [ ] **Prioridade**: definir entregadores prioritários para certos pedidos

#### 7.2 Configurações de Entrega
- [ ] Raio máximo de entrega (km)
- [ ] Tempo máximo de espera antes de chamar plataforma
- [ ] Número máximo de pedidos simultâneos por entregador
- [ ] Valor mínimo do pedido para entrega própria

#### 7.3 Horários de Funcionamento
- [ ] Definir horários de cada entregador
- [ ] Escala de trabalho (dias da semana)
- [ ] Folgas e férias

---

### 8. APP MOBILE PARA ENTREGADOR PRÓPRIO (Prioridade: BAIXA — futuro)

#### 8.1 PWA (Progressive Web App)
- [ ] Login com código SMS (sem cadastro complexo)
- [ ] Ver pedidos atribuídos
- [ ] Aceitar/recusar pedidos
- [ ] Navegação com mapa (Google Maps/Waze)
- [ ] Atualização de localização automática
- [ ] Confirmar coleta e entrega com código
- [ ] Upload de foto da entrega

#### 8.2 Ou: Integração via WhatsApp
- [ ] Receber pedidos via WhatsApp Business API
- [ ] Responder SIM/NÃO para aceitar
- [ ] Enviar localização via WhatsApp
- [ ] Confirmar entrega com código via WhatsApp

---

## IMPLEMENTAÇÃO SUGERIDA (Fases)

### Fase 1 — Correções e Base (1-2 dias)
- [ ] FIX: Mostrar distribuição para pedidos SCHEDULED
- [ ] FIX: Redirecionar para /client/orders após criar pedido (não dashboard)
- [ ] FIX: Incluir entregadores próprios no mapa de rastreamento
- [ ] FIX: Notificação WhatsApp ao atribuir entregador próprio

### Fase 2 — Controle Financeiro (3-5 dias)
- [ ] Modelo de pagamento configurável por estabelecimento
- [ ] Registro de ganhos por entregador próprio
- [ ] Relatório de gastos (semana/mês)
- [ ] Comparativo custo próprio vs plataforma

### Fase 3 — Fluxo Completo (3-5 dias)
- [ ] Tela de distribuição após criar pedido
- [ ] Timeline do pedido com status em tempo real
- [ ] Confirmação de entrega com código
- [ ] Prova de entrega (foto)

### Fase 4 — Avaliação e Relatórios (2-3 dias)
- [ ] Avaliação do entregador próprio por pedido
- [ ] Métricas de desempenho
- [ ] Relatórios gerenciais

### Fase 5 — App Mobile / WhatsApp (5-7 dias)
- [ ] PWA para entregadores próprios
- [ ] Ou integração WhatsApp Business API
