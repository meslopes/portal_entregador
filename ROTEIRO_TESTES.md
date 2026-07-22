# ROTEIRO COMPLETO DE TESTES - muv.log

## Visao Geral
Este documento lista todos os testes que devem ser realizados para validar o sistema muv.log antes de colocar em producao completa.

---

## 1. AUTENTICACAO E ACESSO

### 1.1 Login do Entregador
- [ ] Acessar https://portal-entregador-gamma.vercel.app/login
- [ ] Logar com entregador@teste.com / 123456
- [ ] Verificar redirecionamento para /dashboard
- [ ] Testar com senha incorreta (deve mostrar erro)
- [ ] Testar com email inexistente (deve mostrar erro)

### 1.2 Login do Estabelecimento
- [ ] Acessar https://portal-entregador-gamma.vercel.app/client/login
- [ ] Logar com cliente@teste.com / 123456
- [ ] Verificar redirecionamento para /client
- [ ] Testar com credenciais invalidas

### 1.3 Login do Admin
- [ ] Logar com admin@muv.log.br / admin123
- [ ] Verificar redirecionamento para /admin
- [ ] Verificar que todas as opcoes de nav aparecem

### 1.4 Cadastro de Entregador
- [ ] Acessar /register
- [ ] Preencher formulario multi-step (3 etapas)
- [ ] Criar conta e verificar login automatico

### 1.5 Cadastro de Estabelecimento
- [ ] Acessar /client/register
- [ ] Preencher formulario
- [ ] Criar conta e verificar login automatico

---

## 2. DASHBOARD DO ENTREGADOR

### 2.1 Dashboard Principal
- [ ] Verificar cards de estatisticas (Ganhos Hoje, Semana, Total Entregas, Avaliacao)
- [ ] Verificar toggle Online/Offline
- [ ] Verificar botao de acoes rapidas (Pedidos, Ganhos, Historico)
- [ ] Verificar exibicao da localizacao atual

### 2.2 Toggle Online/Offline
- [ ] Ficar Online (deve solicitar localizacao)
- [ ] Ficar Offline
- [ ] Verificar que pedidos so aparecem quando online

---

## 3. PEDIDOS DO ENTREGADOR

### 3.1 Pedidos Disponiveis
- [ ] Acessar /orders
- [ ] Verificar lista de pedidos disponiveis
- [ ] Verificar sirene ao receber novo pedido
- [ ] Verificar aviso de volume
- [ ] Testar botao "Aceitar Pedido"
- [ ] Testar botao "Recusar Pedido"
- [ ] Verificar que pedido recusado vai para proximo entregador

### 3.2 Aceite de Pedido
- [ ] Aceitar um pedido
- [ ] Verificar redirecionamento para /dashboard
- [ ] Verificar que pedido aparece como "em andamento"

### 3.3 Entrega em Andamento
- [ ] Acessar /delivery/active
- [ ] Verificar steps visuais (Aceito → Preparando → Pronto → Coletado → Entregue)
- [ ] Avancar status: "Cheguei ao Restaurante"
- [ ] Avancar status: "Pedido Pronto"
- [ ] Avancar status: "Coletar Pedido"
- [ ] Avancar status: "Entregar Pedido"
- [ ] Testar captura de foto (prova de entrega)
- [ ] Testar opcao "Pular foto"

---

## 4. GANHOS E HISTORICO DO ENTREGADOR

### 4.1 Ganhos
- [ ] Acessar /earnings
- [ ] Verificar historico de pagamentos
- [ ] Verificar filtros por periodo

### 4.2 Historico
- [ ] Acessar /history
- [ ] Verificar lista de entregas realizadas
- [ ] Verificar detalhes de cada entrega

### 4.3 Ranking
- [ ] Acessar /ranking
- [ ] Verificar podio (top 3)
- [ ] Verificar lista completa de ranking
- [ ] Verificar conquistas desbloqueadas
- [ ] Verificar barras de progresso

---

## 5. PORTAL DO ESTABELECIMENTO

### 5.1 Dashboard
- [ ] Verificar mapa de rastreamento (entregadores ativos)
- [ ] Verificar cards de estatisticas
- [ ] Verificar lista de pedidos recentes
- [ ] Verificar filtros por status

### 5.2 Criacao de Pedido
- [ ] Acessar /client/new-order
- [ ] Preencher dados do cliente final
- [ ] Preencher endereco de entrega
- [ ] Adicionar itens
- [ ] Verificar calculo automatico do frete
- [ ] Criar pedido

### 5.3 Historico de Pedidos
- [ ] Acessar /client/orders
- [ ] Verificar lista de pedidos
- [ ] Testar busca por numero/cliente/endereco
- [ ] Testar filtros (Todos, Pendentes, Em Andamento, Entregues, Cancelados)
- [ ] Verificar detalhes do pedido
- [ ] Testar cancelamento de pedido

### 5.4 Financeiro
- [ ] Acessar /client/financial
- [ ] Verificar total a pagar
- [ ] Verificar historico semanal
- [ ] Verificar aviso de cobranca

### 5.5 Faturas
- [ ] Acessar /client/invoices
- [ ] Gerar fatura semanal
- [ ] Verificar QR Code PIX
- [ ] Verificar dados de pagamento
- [ ] Verificar copia da chave PIX
- [ ] Verificar detalhes dos pedidos

### 5.6 Avaliacao
- [ ] Avaliar entregador (1-5 estrelas)
- [ ] Adicionar comentario
- [ ] Verificar que avaliacao aparece no pedido

---

## 6. PAINEL ADMINISTRATIVO

### 6.1 Dashboard
- [ ] Verificar mapa tempo real (Leaflet/OpenStreetMap)
- [ ] Verificar marcadores de entregadores online
- [ ] Verificar cards de estatisticas
- [ ] Verificar ranking de entregadores
- [ ] Verificar pedidos por status
- [ ] Verificar auto-refresh (15s)

### 6.2 Gestao de Pracas
- [ ] Acessar /admin/squares
- [ ] Criar nova praca
- [ ] Editar praca
- [ ] Excluir praca (sem dados)
- [ ] Verificar stats (estabelecimentos, entregadores, pedidos)

### 6.3 Gestao de Estabelecimentos
- [ ] Acessar /admin/establishments
- [ ] Criar estabelecimento (com usuario de login)
- [ ] Editar estabelecimento
- [ ] Excluir estabelecimento (sem pedidos)
- [ ] Ativar/Desativar estabelecimento
- [ ] Verificar detalhes e historico

### 6.4 Gestao de Entregadores
- [ ] Acessar /admin/drivers
- [ ] Criar entregador (com perfil completo)
- [ ] Verificar credenciais apos criacao
- [ ] Editar entregador
- [ ] Ativar/Desativar entregador
- [ ] Verificar detalhes e stats

### 6.5 Gestao de Pedidos
- [ ] Acessar /admin/orders
- [ ] Verificar lista de todos os pedidos
- [ ] Atribuir pedido manualmente a entregador
- [ ] Verificar detalhes do pedido

### 6.6 Financeiro
- [ ] Acessar /admin/finance
- [ ] Verificar fluxo financeiro (Recebido vs Pago vs Retencao)
- [ ] Ajustar taxa de comissao (slider)
- [ ] Verificar recebimentos por estabelecimento
- [ ] Verificar pagamentos pendentes aos entregadores
- [ ] Processar pagamento a entregador

### 6.7 Pagamentos
- [ ] Acessar /admin/driver-payments
- [ ] Verificar lista de entregadores com pendencias
- [ ] Processar pagamento (marcar como pago)
- [ ] Verificar que pagamentos pendentes somem

### 6.8 Relatorios
- [ ] Acessar /admin/reports
- [ ] Testar todos os 8 tipos de relatorios:
  - [ ] Financeiro
  - [ ] Pedidos por Dia
  - [ ] Entregadores
  - [ ] Estabelecimentos
  - [ ] Cancelamentos
  - [ ] Avaliacoes
  - [ ] Horarios de Pico
  - [ ] Entregas Detalhadas
- [ ] Testar selecao de periodo (7, 15, 30, 90 dias)

### 6.9 Configuracoes
- [ ] Acessar /admin/settings
- [ ] Modulo Empresa: alterar dados e salvar
- [ ] Modulo Pagamento: alterar dados bancarios
- [ ] Modulo Precos: alterar preco/km, comissao
- [ ] Modulo Entregas: alterar raio, timeout
- [ ] Modulo Entregadores: alterar aprovacao, avaliacao minima
- [ ] Modulo Estabelecimentos: alterar cobranca semanal
- [ ] Modulo Notificacoes: ativar/desativar
- [ ] Modulo Integracoes: configurar iFood, WhatsApp, etc.

---

## 7. INTEGRACOES

### 7.1 iFood
- [ ] Testar webhook POST /api/webhooks/ifood
- [ ] Enviar pedido de teste via webhook
- [ ] Verificar que pedido aparece no sistema
- [ ] Testar cancelamento via webhook

### 7.2 WhatsApp
- [ ] Testar webhook POST /api/webhooks/whatsapp
- [ ] Enviar comando "ajuda" via WhatsApp
- [ ] Enviar comando "pedido" via WhatsApp
- [ ] Enviar comando "status" via WhatsApp
- [ ] Verificar notificacoes WhatsApp ao mudar status

### 7.3 99Food
- [ ] Testar webhook POST /api/webhooks/99food
- [ ] Enviar pedido de teste

### 7.4 InstaDelivery
- [ ] Testar webhook POST /api/webhooks/instadelivery
- [ ] Enviar pedido de teste

### 7.5 SaiPos
- [ ] Testar webhook POST /api/webhooks/saipos
- [ ] Enviar pedido de teste

---

## 8. SISTEMA DE ATRIBUICAO INTELIGENTE

### 8.1 Atribuicao por Proximidade
- [ ] Criar pedido e verificar que vai para entregador mais proximo
- [ ] Verificar que entregador mais proximo recebe notificacao
- [ ] Verificar que outros entregadores NAO recebem

### 8.2 Limite de Pedidos Simultaneos
- [ ] Configurar max_concurrent_orders pelo admin
- [ ] Verificar que entregador com pedidos maximos nao recebe novos
- [ ] Verificar que pedido vai para proximo disponivel

### 8.3 Aceite e Recusa
- [ ] Entregador aceitar pedido → status muda para ACCEPTED
- [ ] Entregador recusar pedido → vai para proximo
- [ ] Verificar log de recusas no pedido

### 8.4 Timeout
- [ ] Deixar pedido sem resposta por X segundos
- [ ] Verificar que admin e notificado apos timeout
- [ ] Verificar notificacao via WhatsApp ao admin

---

## 9. NOTIFICACOES E SIRENE

### 9.1 Sirene
- [ ] Verificar que sirene toca quando novo pedido chega
- [ ] Verificar que sirene para ao aceitar pedido
- [ ] Verificar que sirene para ao recusar pedido
- [ ] Verificar botao de ligar/desligar som

### 9.2 Notificacoes do Navegador
- [ ] Ativar notificacoes no navegador
- [ ] Verificar que notificacao aparece com pedido novo
- [ ] Verificar que notificacao funciona em segundo plano

### 9.3 Notificacoes WhatsApp
- [ ] Verificar notificacao ao criar pedido
- [ ] Verificar notificacao ao mudar status
- [ ] Verificar notificacao ao entregar

---

## 10. PROVA DE ENTREGA

### 10.1 Captura de Foto
- [ ] Ao entregar pedido, verificar que camera abre
- [ ] Tirar foto via camera traseira
- [ ] Verificar preview da foto
- [ ] Confirmar foto
- [ ] Verificar que foto e salva

### 10.2 Galeria
- [ ] Ao entregar, escolher foto da galeria
- [ ] Verificar preview
- [ ] Confirmar

### 10.3 Pular Foto
- [ ] Opcao de pular foto
- [ ] Verificar que entrega e confirmada sem foto

---

## 11. AVALIACAO DO ENTREGADOR

### 11.1 Avaliacao pelo Estabelecimento
- [ ] No pedido entregue, verificar botao "Avaliar Entrega"
- [ ] Selecionar 1-5 estrelas
- [ ] Adicionar comentario (opcional)
- [ ] Enviar avaliacao
- [ ] Verificar que avaliacao aparece no pedido

### 11.2 Media de Avaliacao
- [ ] Verificar que media do entregador e atualizada
- [ ] Verificar que entrega aparece no ranking

---

## 12. CANCELAMENTO DE PEDIDO

### 12.1 Pelo Estabelecimento
- [ ] No pedido pendente/aceito/preparando/pronto, clicar "Cancelar"
- [ ] Confirmar cancelamento
- [ ] Verificar que pedido muda para CANCELLED
- [ ] Verificar que entregador e liberado (se atribuido)

### 12.2 Pelo Admin
- [ ] No admin, cancelar pedido
- [ ] Verificar que pedido e cancelado

---

## 13. GAMIFICACAO

### 13.1 Ranking
- [ ] Acessar /ranking
- [ ] Verificar podio visual (top 3)
- [ ] Verificar posicao propria destacada
- [ ] Verificar lista completa

### 13.2 Conquistas
- [ ] Verificar conquistas desbloqueadas
- [ ] Verificar conquistas pendentes com progresso
- [ ] Verificar icones e descricoes

---

## 14. RESPONSIVIDADE

### 14.1 Desktop
- [ ] Testar em 1920x1080
- [ ] Testar em 1366x768

### 14.2 Tablet
- [ ] Testar em 768x1024

### 14.3 Mobile
- [ ] Testar em 375x667 (iPhone SE)
- [ ] Testar em 414x896 (iPhone XR)
- [ ] Verificar menu mobile
- [ ] Verificar formularios

---

## 15. PERFORMANCE

### 15.1 Velocidade
- [ ] Verificar tempo de carregamento do dashboard (< 3s)
- [ ] Verificar tempo de carregamento de pedidos (< 2s)
- [ ] Verificar responsividade do mapa

### 15.2 Concorrencia
- [ ] Simular varios pedidos ao mesmo tempo
- [ ] Verificar que sistema nao trava

---

## 16. SEGURANCA

### 16.1 Autenticacao
- [ ] Verificar que rotas protegidas redirecionam para login
- [ ] Verificar que token expirado redireciona para login
- [ ] Verificar que admin nao acessa rotas de entregador

### 16.2 Dados
- [ ] Verificar que senhas sao criptografadas
- [ ] Verificar que dados sensiveis nao aparecem em logs

---

## 17. DEPLOY E PRODUCAO

### 17.1 Vercel (Frontend)
- [ ] Verificar build passa sem erros
- [ ] Verificar deploy automatico ao push
- [ ] Verificar que variavel VITE_API_URL esta configurada
- [ ] Verificar dominio portal-entregador-gamma.vercel.app

### 17.2 Render (Backend)
- [ ] Verificar build passa sem erros
- [ ] Verificar deploy automatico ao push
- [ ] Verificar endpoint /api/health
- [ ] Verificar banco PostgreSQL conectado
- [ ] Verificar migrations rodando

---

## ORDEM RECOMENDADA DE TESTE

1. **Autenticacao** (1.1 a 1.5)
2. **Dashboard Admin** (6.1)
3. **Gestao de Pracas** (6.2)
4. **Gestao de Estabelecimentos** (6.3)
5. **Gestao de Entregadores** (6.4)
6. **Portal do Estabelecimento** (5.1 a 5.6)
7. **Dashboard Entregador** (2.1 a 2.2)
8. **Pedidos** (3.1 a 3.3)
9. **Atribuicao Inteligente** (8.1 a 8.4)
10. **Sirene e Notificacoes** (9.1 a 9.3)
11. **Prova de Entrega** (10.1 a 10.3)
12. **Avaliacao** (11.1 a 11.2)
13. **Cancelamento** (12.1 a 12.2)
14. **Financeiro** (6.6 a 6.7)
15. **Relatorios** (6.8)
16. **Configuracoes** (6.9)
17. **Integracoes** (7.1 a 7.5)
18. **Gamificacao** (13.1 a 13.2)
19. **Responsividade** (14.1 a 14.3)
20. **Performance** (15.1 a 15.2)
21. **Seguranca** (16.1 a 16.2)
22. **Deploy** (17.1 a 17.2)
