# Resumo - Correcao do Isolamento por Praca

## Problema Encontrado

O frontend nao estava passando `squareId` para os endpoints de:
- Entregadores (AdminDriversPage)
- Estabelecimentos (AdminEstablishmentsPage)
- Pedidos (AdminOrdersPage)

Os endpoints de backend ja suportavam `square_id`, mas o frontend nao estava enviando o parametro.

## Correcoes Feitas

### 1. AdminDriversPage.jsx
- **Antes**: `adminService.getDrivers(page, 20, search, statusFilter)`
- **Depois**: `adminService.getDrivers(page, 20, search, statusFilter, squareId)`

### 2. AdminEstablishmentsPage.jsx
- **Antes**: Cria `params` com `square_id` mas nao usa
- **Depois**: `adminService.getEstablishments(page, 20, search, squareId)`

### 3. AdminOrdersPage.jsx
- **Antes**: Cria `params` com `square_id` mas nao usa
- **Depois**: `adminService.getAllOrders(page, 20, statusFilter, dateRange?.startDate, dateRange?.endDate, squareId)`

### 4. api.js
- **getAllOrders**: Adicionado parametro `squareId`

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar o isolamento**:
   - Selecione uma praca no seletor
   - Va para Entregadores - deve mostrar apenas entregadores da praca
   - Va para Estabelecimentos - deve mostrar apenas estabelecimentos da praca
   - Va para Pedidos - deve mostrar apenas pedidos da praca
   - Troque de praca e verifique se os dados mudam
3. **Criar novos dados de teste**:
   - Crie um entregador na Praca A
   - Crie um estabelecimento na Praca A
   - Mude para Praca B
   - O entregador e estabelecimento nao devem aparecer na Praca B
