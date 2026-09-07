# Resumo - Mapa do Estabelecimento com Entregador e Cliente

## Implementado

### Backend (`order.py`)

Endpoint `/api/orders/my/tracking` agora retorna:

1. **`restaurant`** - Dados do estabelecimento:
   - id, name, latitude, longitude, address

2. **`delivery_addresses`** - Enderecos de entrega dos pedidos ativos:
   - order_id, order_number, order_status
   - latitude, longitude
   - street, neighborhood
   - customer_name

3. **`drivers`** - Entregadores com pedidos ativos (ja existia)

### Frontend (`ClientDashboardPage.jsx`)

Mapa do estabelecimento agora mostra 3 tipos de marcadores:

| Marcador | Icone | Cor | Descricao |
|----------|-------|-----|-----------|
| Estabelecimento | 🏪 | Amarelo | Posicao fixa do restaurante |
| Entrega | 📍 | Por status | Endereco de entrega do pedido |
| Entregador | 🚚 | Por status | Posicao atual do entregador |

### Cores por status do pedido

| Status | Cor |
|--------|-----|
| ACCEPTED | Amarelo (#f59e0b) |
| PREPARING | Roxo (#8b5cf6) |
| READY | Ciano (#06b6d4) |
| PICKED_UP | Azul (#2563eb) |
| DELIVERED | Verde (#22c55e) |

---

## Como funciona

1. Estabelecimento abre o dashboard
2. Mapa mostra:
   - Seu estabelecimento (marcador fixo)
   - Entregadores que aceitaram pedidos (em tempo real)
   - Enderecos de entrega dos pedidos ativos
3. Atualizacao automatica a cada 10 segundos
4. Mapa ajusta zoom para mostrar todos os marcadores

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Faca login como estabelecimento
   - Crie um pedido e atribua a um entregador
   - O mapa deve mostrar:
     - O estabelecimento (🏪)
     - O endereco de entrega (📍)
     - O entregador (🚚) quando estiver online
