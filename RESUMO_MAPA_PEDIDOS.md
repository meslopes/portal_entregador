# Resumo - Correcao do Mapa e Pedidos por Praca

## Problemas Corrigidos

### 1. Mapa em tela branca ao trocar de praca
**Causa**: O mapa Leaflet nao era atualizado corretamente ao trocar de praca.

**Solucao**: Agora o mapa e **destruido e recriado** ao trocar de praca:
- Remove o mapa existente
- Limpa o container
- Recria o mapa apos 200ms
- Isso garante que o mapa seja renderizado corretamente

### 2. Pedidos na aba lateral nao filtrados por praca
**Causa**: `loadOrders()` nao passava `squareId` para a API.

**Solucao**:
- Atualizado `getOrders()` em `api.js` para aceitar `squareId`
- Atualizado `loadOrders()` no dashboard para passar `squareId`
- Adicionado `loadOrders()` ao useEffect que recarrega ao trocar de praca

---

## Alteracoes Feitas

### api.js
- `getOrders()` agora aceita parametro `squareId`

### AdminDashboardPage.jsx
- Inicializacao do mapa movida para `useEffect` (nao mais `useCallback`)
- Mapa e destruido e recriado ao trocar de praca
- `loadOrders()` agora passa `squareId`
- Todos os dados sao recarregados ao trocar de praca:
  - Dashboard, Tracking, Pedidos, Pendentes, Entregadores

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Va para o dashboard do admin
   - Troque de praca no seletor
   - O mapa deve carregar sem tela branca
   - Os pedidos na aba lateral devem ser da praca selecionada
3. **Me avise** se funcionar ou se houver algum erro
