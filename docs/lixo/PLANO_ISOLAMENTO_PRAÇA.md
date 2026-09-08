# Plano: Isolamento de Dados por Praca

## Resumo

Atualmente, o sistema filtra dados por `tenant_id` (organizacao). 
O objetivo e adicionar filtragem por `square_id` (praca) para que cada praca tenha dados isolados.

---

## 1. Modelos que JA POSSUEM `square_id`

Estes modelos ja estao preparados:

| Modelo | Tabela | Observacao |
|--------|--------|------------|
| `Driver` | drivers | Entregadores vinculados a praca |
| `Restaurant` | restaurants | Estabelecimentos vinculados a praca |
| `Order` | orders | Pedidos vinculados a praca (via restaurante) |
| `PricingTable` | pricing_tables | Tabelas de preco por praca |
| `DynamicPricing` | dynamic_pricing | Precos dinamicos por praca |

**Nao precisa de migracao** - todas as colunas ja existem no banco.

---

## 2. Endpoints Backend que JA FILTRAM por `square_id`

Estes ja funcionam corretamente:

- `GET /api/admin/drivers` - filtra por `Driver.square_id`
- `GET /api/admin/orders` - filtra por `Order.square_id`
- `GET /api/admin/establishments` - filtra por `Restaurant.square_id`
- `GET /api/admin/live-tracking` - filtra por `Driver.square_id` + `Restaurant.square_id`
- `GET /api/admin/pricing-tables` - filtra por `PricingTable.square_id`

---

## 3. Endpoints Backend que PRECISAM de `square_id`

Estes endpoints precisam ser modificados para aceitar o parametro `square_id`:

### Dashboard
- `GET /api/admin/dashboard` - Estatisticas gerais do dashboard

### Financeiro
- `GET /api/admin/finance` - Dados financeiros
- `GET /api/admin/finance/establishments` - Financeiro por estabelecimento
- `GET /api/admin/driver-payments` - Pagamentos de entregadores
- `GET /api/admin/withdrawals` - Saques
- `GET /api/admin/invoices` - Faturas

### Relatorios
- `GET /api/admin/reports/orders-by-date` - Pedidos por data
- `GET /api/admin/reports/drivers-performance` - Performance de entregadores
- `GET /api/admin/reports/establishments-ranking` - Ranking de estabelecimentos
- `GET /api/admin/reports/financial-summary` - Resumo financeiro
- `GET /api/admin/reports/cancellations` - Cancelamentos
- `GET /api/admin/reports/ratings` - Avaliacoes
- `GET /api/admin/reports/peak-hours` - Horarios de pico
- `GET /api/admin/reports/deliveries-by-driver` - Entregas por entregador

### Outros
- `GET /api/admin/dynamic-pricing` - Precos dinamicos
- `GET /api/admin/driver-assignments` - Atribuicoes de entregadores
- `GET /api/admin/pending-users` - Usuarios pendentes
- `GET /api/admin/users` - Usuarios (precisa de `tenant_id` tambem)

---

## 4. Frontend - Metodos em `api.js` que PRECISAM de `squareId`

Estes metodos precisam aceitar e passar o parametro `squareId`:

- `getDashboard()`
- `getFinanceDashboard()`
- `getFinanceByEstablishment()`
- `getDynamicPricing()`
- `getOrdersByDate()`
- `getDriversPerformance()`
- `getEstablishmentsRanking()`
- `getFinancialSummary()`
- `getCancellations()`
- `getRatings()`
- `getPeakHours()`
- `getDeliveriesByDriver()`

---

## 5. Frontend - Paginas que PRECISAM passar `squareId`

Estas paginas precisam ler `squareId` do contexto e passar para as chamadas API:

- `AdminDashboardPage.jsx` - Dashboard principal
- `AdminFinancePage.jsx` - Pagina financeira
- `AdminReportsPage.jsx` - Pagina de relatorios
- `AdminDynamicPricingPage.jsx` - Precos dinamicos
- `AdminDriverPaymentsPage.jsx` - Pagamentos de entregadores
- `AdminWithdrawalsPage.jsx` - Saques
- `AdminInvoicesPage.jsx` - Faturas

---

## 6. Padrao de Implementacao

### Backend - Padrao para adicionar `square_id`:

```python
# No inicio do endpoint
square_id = request.args.get('square_id', type=int)

# Na query
query = Order.query
if tenant_id:
    query = query.filter(Order.tenant_id == tenant_id)
if square_id:
    query = query.filter(Order.square_id == square_id)
```

### Frontend - Padrao para passar `squareId`:

```javascript
// No componente
const { squareId } = useSquare();

// Na chamada API
const data = await adminService.getDashboard(squareId);

// No api.js
getDashboard: (squareId = null) => {
  const params = {};
  if (squareId) params.square_id = squareId;
  return api.get('/api/admin/dashboard', { params });
},
```

---

## 7. Ordem de Implementacao Recomendada

### Fase 1 - Backend (Endpoints criticos)
1. `GET /api/admin/dashboard` - Dashboard principal
2. `GET /api/admin/finance` - Financeiro
3. `GET /api/admin/dynamic-pricing` - Precos dinamicos

### Fase 2 - Frontend (api.js + paginas)
1. Atualizar `api.js` com os metodos que aceitam `squareId`
2. Atualizar `AdminDashboardPage.jsx` para passar `squareId`
3. Atualizar `AdminFinancePage.jsx` para passar `squareId`

### Fase 3 - Backend (Relatorios)
1. Todos os endpoints de relatorios

### Fase 4 - Frontend (Relatorios)
1. Atualizar paginas de relatorios para passar `squareId`

---

## 8. Impacto

- **Nao requer migracao** - todas as colunas ja existem
- **Nao quebra funcionalidade existente** - se `square_id` nao for passado, retorna todos os dados do tenant
- **Melhora a experiencia do usuario** - cada praca mostra apenas seus dados
- **Mapa centra na praca** - quando troca de praca, o mapa centra nos estabelecimentos daquela praca

---

## 9. Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Dados existentes sem `square_id` | Filtrar apenas quando `square_id` for fornecido |
| Performance com muitas queries | Usar indices em `square_id` (ja existem via FK) |
| Confusao do usuario | Mostrar claramente qual praca esta selecionada |
