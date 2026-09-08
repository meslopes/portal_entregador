# Resumo - Correcao de Pedidos Nao Aparecendo para Entregador

## Problema

O pedido era oferecido ao entregador via notificacao, mas nao aparecia na lista de "Pedidos Disponiveis".

## Causa

O padrao de busca estava incorreto:

**Tag criado** (em `process_expired_offers`):
```
OFFERED_TO_{driver_id}_{timestamp}
Exemplo: OFFERED_TO_5_1234567890
```

**Padrao buscado** (em `get_available_orders`):
```
|OFFERED_TO_{driver_id}|
Exemplo: |OFFERED_TO_5|
```

O padrao nao encontrava porque:
1. O tag tem timestamp no final
2. O padrao exigia pipes `|` no inicio e fim

## Correcao

Alterado o padrao de busca para usar `LIKE` com `%`:
```python
# Antes
offer_pattern = f"|OFFERED_TO_{driver.id}|"
query.filter(Order.special_instructions.contains(offer_pattern))

# Depois
offer_pattern = f"OFFERED_TO_{driver.id}"
query.filter(Order.special_instructions.like(f'%{offer_pattern}%'))
```

Agora encontra `OFFERED_TO_5` independente do timestamp ou pipes.

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Faca login como entregador
   - Fique online
   - Crie um pedido para o estabelecimento
   - O pedido deve aparecer na lista de "Pedidos Disponiveis"
   - O popup de oferta deve aparecer
   - Entregador pode aceitar o pedido
