# ROTEIRO DE TESTES — Fase 2
## Estabilização antes da Fase 3

**Data**: 30/07/2026
**Objetivo**: Verificar se todas as funcionalidades da Fase 2 estão funcionando corretamente

---

## 1. ISOLAMENTO DE TENANTS ✅ (Confirmado)

- [x] Praças separadas por tenant
- [x] Estabelecimentos separados por tenant
- [x] Clientes finais separados por tenant
- [x] Entregadores separados por tenant
- [x] Ranking mostra apenas entregadores do mesmo tenant

---

## 2. GEODELOCALIZAÇÃO

### Teste 2.1: Estabelecimentos
- [ ] Criar estabelecimento no tenant 1 (Capão da Canoa)
- [ ] Criar estabelecimento no tenant 3 (Tramandaí)
- [ ] Verificar se aparecem nas cidades corretas no mapa

### Teste 2.2: Endereços de entrega
- [ ] Criar pedido com endereço em Capão da Canoa
- [ ] Criar pedido com endereço em Tramandaí
- [ ] Verificar se endereços aparecem nas cidades corretas no mapa

### Teste 2.3: Re-geocodificação
- [ ] Verificar se endereços antigos com coordenadas erradas são re-geocodificados
- [ ] Verificar se endereços sem coordenadas são geocodificados automaticamente

---

## 3. DISTRIBUIÇÃO DE PEDIDOS

### Teste 3.1: Nearest (um entregador por vez)
- [ ] Criar pedido → verificar se toca para apenas 1 entregador
- [ ] Entregador aceitar → verificar se pedido some da lista de outros entregadores
- [ ] Entregador rejeitar → verificar se toca para próximo entregador

### Teste 3.2: Timeout (60 segundos)
- [ ] Criar pedido → não aceitar → aguardar 60 segundos
- [ ] Verificar se pedido move automaticamente para próximo entregador
- [ ] Verificar se timeout conta como recusa para ranking

### Teste 3.3: Atribuição manual
- [ ] Admin atribuir pedido manualmente a um entregador
- [ ] Verificar se entregador recebe notificação
- [ ] Verificar se pedido aparece na aba "Ativos" do entregador

---

## 4. STATUS DO PEDIDO

### Teste 4.1: Mudança de status pelo admin
- [ ] Mudar de SCHEDULED → PENDING
- [ ] Mudar de PENDING → ACCEPTED
- [ ] Mudar de ACCEPTED → PICKED_UP
- [ ] Mudar de PICKED_UP → DELIVERED
- [ ] Mudar de DELIVERED → PENDING (reverso)
- [ ] Verificar se todas as mudanças funcionam

### Teste 4.2: Mudança de status pelo entregador
- [ ] Entregador aceitar pedido (PENDING → ACCEPTED)
- [ ] Entregador coletar pedido (ACCEPTED → PICKED_UP)
- [ ] Entregador entregar pedido (PICKED_UP → DELIVERED)

---

## 5. SIDEBAR DO ADMIN

### Teste 5.1: Abas
- [ ] Aba "Status" mostra pedidos por status
- [ ] Aba "Entreg." mostra entregadores online
- [ ] Aba "Estab." mostra estabelecimentos com pedidos ativos
- [ ] Aba "Praças" mostra praças configuradas

### Teste 5.2: Menu de pedidos
- [ ] Clicar nos 3 pontos → mostra opções de status
- [ ] Clicar no olho → abre detalhes do pedido
- [ ] Clicar em editar → abre modal de edição

---

## 6. PÁGINA DE DETALHES DO PEDIDO

### Teste 6.1: Informações
- [ ] Mostra número do pedido
- [ ] Mostra status atual
- [ ] Mostra timeline com todas as mudanças
- [ ] Mostra nomes dos entregadores (não IDs)

### Teste 6.2: Ações
- [ ] Botão "Tocar Agora" funciona (SCHEDULED → PENDING)
- [ ] Botão "Marcar Coletado" funciona (ACCEPTED → PICKED_UP)
- [ ] Botão "Marcar Entregue" funciona (PICKED_UP → DELIVERED)
- [ ] Botão "Cancelar Pedido" funciona

---

## 7. EDIÇÃO COMPLETA DE PEDIDOS

### Teste 7.1: Campos editáveis
- [ ] Editar nome do cliente
- [ ] Editar telefone do cliente
- [ ] Editar endereço de entrega
- [ ] Editar bairro, cidade, estado, CEP
- [ ] Editar valor da entrega
- [ ] Editar método de pagamento
- [ ] Editar método de distribuição
- [ ] Editar observações

---

## 8. CRIAÇÃO DE PEDIDOS

### Teste 8.1: Formulário
- [ ] Valor dos itens só aparece quando "Na Entrega"
- [ ] Valor dos itens não aparece quando "No Estabelecimento"
- [ ] Total mostra apenas o frete (não inclui valor dos itens)

### Teste 8.2: Tipos de pagamento
- [ ] Criar pedido com pagamento "No Estabelecimento"
- [ ] Criar pedido com pagamento "Na Entrega" (Dinheiro)
- [ ] Criar pedido com pagamento "Na Entrega" (Cartão)
- [ ] Criar pedido com pagamento "Na Entrega" (PIX)

---

## 9. PEDIDOS AGENDADOS

### Teste 9.1: Criação
- [ ] Criar pedido agendado
- [ ] Verificar se aparece na aba "Agendados" da sidebar
- [ ] Verificar se mostra countdown "Lança em X min"

### Teste 9.2: Transição automática
- [ ] Aguardar tempo de preparo
- [ ] Verificar se pedido muda automaticamente para PENDING
- [ ] Verificar se notifica entregador

---

## 10. MAPA DO ADMIN

### Teste 10.1: Marcadores
- [ ] Entregadores online aparecem como pontos verdes/azuis
- [ ] Estabelecimentos com pedidos ativos aparecem como pontos amarelos
- [ ] Endereços de entrega aparecem como pontos cinza/verde

### Teste 10.2: Popup
- [ ] Clicar em estabelecimento → mostra detalhes e pedidos ativos
- [ ] Clicar em entregador → mostra nome e status
- [ ] Clicar em endereço → mostra número do pedido e cliente

---

## 11. RANKING

### Teste 11.1: Isolamento
- [ ] Ranking do tenant 1 mostra apenas entregadores do tenant 1
- [ ] Ranking do tenant 3 mostra apenas entregadores do tenant 3

### Teste 11.2: Cálculo
- [ ] Entregador com mais entregas aparece primeiro
- [ ] Entregador que recusou aparece com penalidade

---

## 12. MULTI-TENANT

### Teste 12.1: Login
- [ ] admin@muv.log.br → acessa tenant 1
- [ ] admin2@entregas.com → acessa tenant 3
- [ ] plataform@muv.log.br → acessa platform

### Teste 12.2: Dados isolados
- [ ] Pedidos do tenant 1 não aparecem no tenant 3
- [ ] Entregadores do tenant 1 não aparecem no tenant 3
- [ ] Estabelecimentos do tenant 1 não aparecem no tenant 3

---

## CHECKLIST DE CONCLUSÃO

A Fase 2 está 100% estável quando:

- [ ] Todos os testes acima passarem
- [ ] Não houver erros no console do navegador
- [ ] Não houver erros nos logs do Render
- [ ] Geolocalização funcionar para novos pedidos/estabelecimentos
- [ ] Distribuição nearest funcionar (1 entregador por vez)
- [ ] Timeout de 60 segundos funcionar
- [ ] Rejeição mover para próximo entregador
- [ ] Admin pode mudar qualquer status
- [ ] Ranking filtra por tenant
- [ ] Sidebar mostra informações corretas

---

## PRÓXIMOS PASSOS (Fase 3)

Após concluir os testes acima:

1. Implementar tarifa fixa por praça
2. Implementar faixas de KM
3. Implementar preço por bairro
4. Configurar preços por praça

---

*Documento atualizado em 30/07/2026*
