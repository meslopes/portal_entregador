# Resumo - Correcao de Entregadores Cadastrados Publicamente

## Problema

Quando um entregador se cadastra pelo link publico:
1. O cadastro fica com `tenant_id = NULL` (sem organizacao)
2. O cadastro fica com `square_id = NULL` (sem praca)
3. O admin nao via o cadastro porque filtrava por `tenant_id`
4. A lista de entregadores nao mostrava porque filtrava por `square_id`

## Correcoes

### Backend

1. **Endpoint `/api/admin/pending-users`**:
   - Agora mostra usuarios do mesmo tenant OU sem tenant (cadastros publicos)

2. **Endpoint `/api/admin/users/{id}/approve`**:
   - Agora aceita `square_id` no body da requisicao
   - Atribui o `tenant_id` do admin ao usuario
   - Atribui o `square_id` ao driver (se fornecido)

3. **Endpoint `/api/admin/drivers`**:
   - Quando filtrado por `square_id`, inclui drivers sem praca definida

### Frontend

1. **Aba de Pendentes no Dashboard**:
   - Adicionado seletor de praca para cada usuario pendente
   - Ao aprovar, o admin pode escolher qual praca atribuir

2. **api.js**:
   - `approveUser()` agora aceita `squareId` como parametro

---

## Fluxo Correto

1. Entregador acessa link de cadastro e se cadastra
2. Cadastro fica com status INACTIVE, sem tenant e sem praca
3. Admin ve o cadastro na aba "Pendentes" do dashboard
4. Admin seleciona uma praca no dropdown
5. Admin clica em "Aprovar"
6. Sistema atribui o tenant e a praca ao entregador
7. Entregador aparece na lista de entregadores da praca selecionada

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Acesse o dashboard do admin
   - Va para a aba "Pendentes"
   - Selecione uma praca no dropdown
   - Aprove o cadastro
   - Va para a lista de entregadores
   - Verifique se o entregador aparece na praca selecionada
