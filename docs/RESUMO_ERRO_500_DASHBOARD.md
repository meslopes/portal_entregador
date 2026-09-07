# Resumo - Correcao do Erro 500 no Dashboard e Orders

## Causa do Problema

Os endpoints `/api/admin/dashboard` e `/api/admin/orders` estavam chamando `process_expired_offers()` e `process_scheduled_orders()` no inicio de cada requisicao.

Essas funcoes:
1. Fazem queries pesadas no banco de dados
2. Processam todos os pedidos pendentes
3. No Render free tier, causam timeout (o servidor nao responde dentro do limite)

Isso causava:
- Erro 500 (timeout)
- Erro CORS (servidor nao responde)
- Looping no frontend

## Correcao

Removidas as chamadas de `process_expired_offers` e `process_scheduled_orders` dos endpoints:
- `GET /api/admin/dashboard`
- `GET /api/admin/orders`

Essas funcoes devem ser chamadas apenas por:
- Cron job
- Scheduled task
- Endpoint separado (se necessario)

## Endpoints que continuam funcionando

- `GET /api/admin/drivers` - OK
- `GET /api/admin/establishments` - OK
- `GET /api/admin/squares` - OK
- `GET /api/admin/pending-users` - OK

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Acesse o admin no notebook
   - Verifique se o dashboard carrega
   - Verifique se os pedidos carregam
   - Troque de praca e verifique se funciona
3. **Me avise** se funcionar
