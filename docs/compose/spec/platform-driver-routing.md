---
feature: platform-driver-routing
status: designed
updated: 2026-08-30
branch: feature/platform-driver-routing
commits: TBD
---

# Roteirização para Entregadores da Plataforma

## Report

(Em branco - aguardando implementação)

## [S1] Problema

Entregadores da plataforma atualmente recebem pedidos individuais, sem otimização de rota. Quando um entregador tem múltiplos pedidos, ele precisa decidir manualmente a ordem de entrega, o que:

1. Aumenta tempo de entrega desnecessariamente
2. Não considera proximidade entre pedidos
3. Não permite agrupar pedidos do mesmo restaurante ou região
4. Gera mais deslocamento e custo operacional

Diferente dos entregadores próprios (que servem um único restaurante), entregadores da plataforma atendem múltiplos restaurantes simultaneamente, exigindo uma lógica de roteirização mais complexa.

## [S2] Design

### 2.1 Conceito de Rota da Plataforma

Uma **PlatformDriverRoute** agrupa múltiplos pedidos de um ou mais restaurantes para um entregador da plataforma. A rota é criada pelo admin/sistema e oferecida ao entregador, que pode aceitar ou rejeitar.

**Diferenças chave em relação a rotas de entregador próprio:**

| Aspecto | Entregador Próprio | Entregador Plataforma |
|---------|-------------------|----------------------|
| Restaurantes | 1 restaurante fixo | Múltiplos restaurantes |
| Criação da rota | Estabelecimento cria | Admin cria ou sistema auto-atribui |
| Coletas | 1 ponto (restaurante) | Múltiplos pontos (restaurantes diferentes) |
| Otimização | Vizinho mais próximo simples | Múltiplos depósitos + entregas |
| Vinculação | Fixo a um restaurante | Livre, aceita pedidos de qualquer restaurante |

### 2.2 Modelo de Dados

**PlatformDriverRoute** (nova tabela):
```
- id: INTEGER (PK)
- driver_id: INTEGER (FK → drivers.id)
- status: VARCHAR(20) — CREATED, PENDING, ACTIVE, COMPLETED, CANCELLED
- total_distance_km: DECIMAL(10,2)
- total_duration_min: DECIMAL(10,2)
- started_at: DATETIME
- completed_at: DATETIME
- created_at: DATETIME
- updated_at: DATETIME
```

**PlatformDriverStop** (nova tabela):
```
- id: INTEGER (PK)
- route_id: INTEGER (FK → platform_driver_routes.id)
- order_id: INTEGER (FK → orders.id)
- restaurant_id: INTEGER (FK → restaurants.id) — ponto de coleta
- stop_order: INTEGER
- stop_type: VARCHAR(20) — PICKUP, DELIVERY
- latitude: DECIMAL(10,8)
- longitude: DECIMAL(11,8)
- address: VARCHAR(500)
- status: VARCHAR(20) — PENDING, COMPLETED, SKIPPED
- arrived_at: DATETIME
- completed_at: DATETIME
- created_at: DATETIME
```

**Nota:** Cada pedido gera DUAS paradas: uma PICKUP (no restaurante) e uma DELIVERY (no cliente). Isso permite otimizar a ordem considerando coletas e entregas.

### 2.3 Algoritmo de Otimização

Para múltiplos restaurantes, o algoritmo precisa ser mais sofisticado:

1. **Agrupar por restaurante:** Pedidos do mesmo restaurante têm a mesma PICKUP
2. **Ordenar restaurantes:** Usar vizinho mais próximo entre os pontos de coleta
3. **Para cada restaurante:** Ordenar entregas por proximidade entre si
4. **Intercalar:** Coletar do restaurante A → entregar pedidos de A → coletar do restaurante B → entregar pedidos de B (quando mais eficiente)

**Algoritmo proposto (Nearest Neighbor Multi-Depot):**
```
1. Calcular centroid de todas as entregas
2. Encontrar restaurante mais próximo do centroid → primeiro pickup
3. Coletar todos os pedidos desse restaurante
4. Entregar pedidos usando vizinho mais próximo
5. Ir para o próximo restaurante mais próximo da última entrega
6. Repetir até todos os pedidos serem entregues
```

### 2.4 Fluxo de Trabalho

```
1. Admin seleciona pedidos pendentes (de um ou mais restaurantes)
2. Admin cria rota para entregador específico
3. Sistema calcula rota otimizada (pickups + deliveries)
4. Rota é oferecida ao entregador (status PENDING)
5. Entregador aceita → status ACTIVE
6. Entregador segue rota: coleta → entrega → coleta → entrega...
7. Ao concluir todas as paradas → status COMPLETED
```

### 2.5 Endpoints da API

**Criar rota:**
```
POST /api/platform-routes/create
Body: { driver_id, order_ids: [...] }
Response: { route: PlatformDriverRoute }
```

**Listar rotas do entregador:**
```
GET /api/platform-routes/driver/active
Response: { routes: [PlatformDriverRoute] }
```

**Aceitar rota:**
```
POST /api/platform-routes/:id/accept
Response: { route: PlatformDriverRoute }
```

**Rejeitar rota:**
```
POST /api/platform-routes/:id/reject
Response: { message: string }
```

**Concluir parada:**
```
POST /api/platform-routes/:id/complete-stop
Body: { stop_id }
Response: { stop, route_completed: boolean }
```

**Remover pedido da rota:**
```
POST /api/platform-routes/:id/remove-order
Body: { order_id }
Response: { route }
```

**Mover pedido entre rotas:**
```
POST /api/platform-routes/:id/move-order
Body: { order_id, target_route_id }
Response: { source_route, target_route }
```

### 2.6 Frontend

**Admin - Gestão de Rotas (PlatformRoutesPage.jsx):**
- Lista de pedidos disponíveis (agrupados por restaurante)
- Seleção de entregador da plataforma
- Criação de rota com pedidos selecionados
- Visualização de rotas ativas com paradas
- Botões para remover/mover pedidos (similar a rotas próprias)

**Entregador - Dashboard (PlatformDriverDashboardPage.jsx):**
- Pedidos ativos com status real
- Indicação de rota e paradas
- Botão para concluir parada
- Histórico de entregas

**Entregador - Rotas (PlatformDriverRoutesPage.jsx):**
- Lista de rotas pendentes (aceitar/rejeitar)
- Rotas ativas com paradas detalhadas
- Mapa com rota (futuro)

### 2.7 Validações

1. **Mesmo restaurante:** Pedidos de restaurantes diferentes podem coexistir na mesma rota
2. **Pedido já em rota:** Não permitir adicionar pedido que já está em outra rota ativa
3. **Entregador offline:** Não oferecer rotas para entregadores offline
4. **Limite de pedidos:** Considerar capacidade do entregador (moto: max 3-4 pedidos)
5. **Distância máxima:** Alertar se rota excede distância/tempo razoável

### 2.8 Tratamento de Exceções

1. **Entregador rejeita rota:** Rota volta para admin, pode reatribuir
2. **Pedido cancelado durante rota:** Remover parada, re-otimizar restante
3. **Entregador fica offline durante rota:** Manter rota ativa, alertar admin
4. **Novo pedido surge durante rota:** Admin pode adicionar à rota existente (se compatível)

## [S3] Fora do Escopo

1. **Auto-atribuição automática:** Sistema não cria rotas automaticamente (futuro)
2. **Mapa interativo com rota:** Visualização no mapa (futuro)
3. **Notificações push:** Alertas para entregadores (futuro)
4. **Integração com GPS em tempo real:** Tracking de posição (futuro)
5. **Otimização com trânsito:** Usar dados de trânsito em tempo real (futuro)

## Tasks

- [ ] T1: Criar modelos PlatformDriverRoute e PlatformDriverStop — acceptance: tabelas criadas no banco (covers: S2.2)
- [ ] T2: Implementar algoritmo de otimização multi-depósito — acceptance: rota com 3+ restaurantes é otimizada corretamente (covers: S2.3)
- [ ] T3: Criar endpoints da API para rotas da plataforma — acceptance: CRUD completo de rotas funciona (covers: S2.5)
- [ ] T4: Implementar página de gestão de rotas no admin — acceptance: admin pode criar/gerenciar rotas de plataforma (covers: S2.6)
- [ ] T5: Implementar dashboard do entregador da plataforma — acceptance: entregador vê rotas ativas e pode concluir paradas (covers: S2.6)
- [ ] T6: Implementar página de rotas do entregador — acceptance: entregador pode aceitar/rejeitar rotas (covers: S2.6)
- [ ] T7: Adicionar validações e tratamento de exceções — acceptance: todas as validações de S2.7 funcionam (covers: S2.7)
- [ ] T8: Testes end-to-end — acceptance: fluxo completo de criação a conclusão funciona (covers: S2.4)
