# Roteiro de Testes - muv.log

## 🎯 Visão Geral

Este roteiro cobre todos os fluxos de teste para validação do sistema muv.log.

---

## 1. AUTENTICAÇÃO

### 1.1 Login
- [ ] Login com admin (admin@muv.log.br / admin123)
- [ ] Login com entregador (entregador@teste.com / 123456)
- [ ] Login com estabelecimento (cliente@teste.com / 123456)
- [ ] Login com credenciais inválidas → Erro 401
- [ ] Login com usuário INATIVE → Erro 403

### 1.2 Registro
- [ ] Cadastro de entregador (/register) → Status INATIVE
- [ ] Cadastro de estabelecimento (/client/register) → Status INACTIVE
- [ ] Cadastro com email já existente → Erro 400
- [ ] Cadastro com senha < 6 caracteres → Erro 400

### 1.3 Logout
- [ ] Logout redireciona para /login
- [ ] Token é removido do localStorage

---

## 2. ENTREGADOR

### 2.1 Dashboard
- [ ] Exibe saudação com nome do entregador
- [ ] Toggle online/offline funciona
- [ ] Cards de estatísticas mostram dados corretos
- [ ] Ações rápidas (Pedidos, Ganhos, Histórico) funcionam

### 2.2 Pedidos
- [ ] Aba "Disponíveis" mostra pedidos PENDING
- [ ] Aba "Em Andamento" mostra pedidos ativos
- [ ] Aceitar pedido muda status para ACCEPTED
- [ ] Recusar pedido remove da lista
- [ ] Botão "Ver Minha Rota" leva para mapa

### 2.3 Mapa de Rota
- [ ] Mapa mostra marcadores de restaurante (amarelo)
- [ ] Mapa mostra marcadores de entrega (verde)
- [ ] Botão "Coletar" abre Google Maps
- [ ] Botão "Entregar" abre Google Maps
- [ ] Botão "Acompanhar" leva para entrega

### 2.4 Entrega em Andamento
- [ ] Fluxo de status: ACCEPTED → PREPARING → READY → PICKED_UP → DELIVERED
- [ ] Botão de ação muda conforme status
- [ ] Prova de entrega (foto) funciona
- [ ] Navegação externa (Google Maps) funciona

### 2.5 Ranking e Bônus
- [ ] Ranking mostra posição do entregador
- [ ] Nível (Bronze/Prata/Ouro/Diamante) está correto
- [ ] Bônus semanal/mensal aparecem
- [ ] Conquistas desbloqueadas aparecem

### 2.6 Perfil
- [ ] Dados pessoais são exibidos
- [ ] Edição de dados funciona
- [ ] Alteração de senha funciona

---

## 3. ESTABELECIMENTO (CLIENTE)

### 3.1 Dashboard
- [ ] Stats do estabelecimento aparecem
- [ ] Pedidos recentes são exibidos
- [ ] Rastreamento de entregadores funciona

### 3.2 Criar Pedido
- [ ] Formulário completo funciona
- [ ] Cálculo de frete está correto
- [ ] Pedido é criado com status PENDING
- [ ] Entregador recebe notificação

### 3.3 Lista de Pedidos
- [ ] Pedidos do estabelecimento aparecem
- [ ] Filtros por status funcionam
- [ ] Busca por número/nome funciona
- [ ] Detalhes do pedido são exibidos

### 3.4 Financeiro
- [ ] Totais de faturamento aparecem
- [ ] Faturas são listadas
- [ ] QR Code PIX é gerado

### 3.5 Perfil
- [ ] Dados do estabelecimento são exibidos
- [ ] Edição funciona
- [ ] Geolocalização funciona

---

## 4. ADMINISTRADOR

### 4.1 Dashboard
- [ ] Stats gerais aparecem
- [ ] Mapa com entregadores online funciona
- [ ] Mapa mostra estabelecimentos com pedidos ativos
- [ ] Mapa mostra locais de entrega
- [ ] Marcadores são arrastáveis

### 4.2 Gestão de Entregadores
- [ ] Lista de entregadores aparece
- [ ] Aprovação de cadastro funciona
- [ ] Rejeição de cadastro funciona
- [ ] Edição de dados funciona
- [ ] Exclusão funciona (com confirmação)

### 4.3 Gestão de Estabelecimentos
- [ ] Lista de estabelecimentos aparece
- [ ] Criação com geolocalização funciona
- [ ] Edição com campos de endereço funciona
- [ ] Geolocalização manual funciona
- [ ] Exclusão funciona

### 4.4 Gestão de Pedidos
- [ ] Lista de pedidos aparece
- [ ] Edição de status funciona
- [ ] Edição de valores funciona
- [ ] Exclusão funciona

### 4.5 Configurações de Praça
- [ ] Criação de praça funciona
- [ ] Preço/KM é configurável
- [ ] Distância mínima (4km) é configurável
- [ ] Percentual do entregador é configurável

### 4.6 Sistema de Bônus
- [ ] Ranking de entregadores aparece
- [ ] Processamento de bônus semanal funciona
- [ ] Processamento de bônus mensal funciona
- [ ] Bônus aparecem para o entregador

---

## 5. FLUXOS INTEGRADOS

### 5.1 Pedido Completo
- [ ] Estabelecimento cria pedido
- [ ] Entregador recebe notificação WhatsApp
- [ ] Entregador responde SIM pelo WhatsApp
- [ ] Pedido é aceito automaticamente
- [ ] Entregador coleta pedido
- [ ] Entregador entrega pedido
- [ ] Estabelecimento avalia entrega
- [ ] Bônus é calculado

### 5.2 Cancelamento
- [ ] Estabelecimento cancela pedido
- [ ] Entregador é notificado
- [ ] Próximo entregador é notificado
- [ ] Valores são ajustados

---

## 6. TESTES DE API

### 6.1 Autenticação
```bash
# Login
curl -X POST https://muvlog-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@muv.log.br","password":"admin123"}'
```

### 6.2 Pedidos
```bash
# Pedidos disponíveis
curl -X GET https://muvlog-api.onrender.com/api/orders/available \
  -H "Authorization: Bearer <token>"

# Pedidos ativos
curl -X GET https://muvlog-api.onrender.com/api/orders/active \
  -H "Authorization: Bearer <token>"
```

### 6.3 Ranking
```bash
# Ranking
curl -X GET https://muvlog-api.onrender.com/api/bonus/ranking \
  -H "Authorization: Bearer <token>"
```

---

## 7. TESTES DE PERFORMANCE

- [ ] Dashboard carrega em < 3 segundos
- [ ] Pedidos atualizam a cada 60 segundos
- [ ] Mapa renderiza em < 2 segundos
- [ ] Login processa em < 2 segundos
- [ ] API responde em < 1 segundo

---

## 8. TESTES MOBILE

- [ ] Login funciona em mobile
- [ ] Dashboard é responsivo
- [ ] Pedidos são clicáveis
- [ ] Mapa é navegável
- [ ] Botões são acessíveis

---

## 📋 Checklists por Dispositivo

### Desktop
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari

### Mobile
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Samsung Internet
