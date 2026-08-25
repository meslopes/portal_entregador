# Resumo - Super Admin: Aba Pendentes com Selecao de Tenant e Praca

## Problema

O entregador cadastrado publicamente:
1. Aparecia apenas no super admin (sem tenant)
2. Nao tinha como ser ativado
3. Nao tinha como ser atribuido a uma praca ou organizacao

## Correcoes

### Backend (`admin.py`)

1. **Endpoint `/api/admin/pending-users`**:
   - Agora mostra usuarios do mesmo tenant OU sem tenant (cadastros publicos)

2. **Endpoint `/api/admin/users/{id}/approve`**:
   - Agora aceita `tenant_id` e `square_id` no body da requisicao
   - Atribui o tenant e praca ao usuario ao aprovar

### Frontend (`PlatformDashboardPage.jsx`)

1. **Nova aba "Pendentes"** no painel do super admin:
   - Mostra todos os cadastros pendentes
   - Seletor de organizacao (tenant) para cada usuario
   - Seletor de praca para cada usuario
   - Botoes "Aprovar" e "Rejeitar"

2. **Funcoes adicionadas**:
   - `loadPendingUsers()` - carrega usuarios pendentes
   - `loadSquares()` - carrega praticas disponiveis
   - `handleApprove()` - aprova com tenant e praca
   - `handleReject()` - rejeita e exclui usuario

### Frontend (`AdminDashboardPage.jsx`)

1. **Aba "Pendentes"** atualizada:
   - Mostra cadastros publicos (sem tenant)
   - Seletor de praca para cada usuario
   - Seletor de tenant para super admins

---

## Como usar (Super Admin)

1. Acesse `/platform` como super admin
2. Va para a aba "Pendentes"
3. Para cada cadastro pendente:
   - Selecione a organizacao (tenant) no dropdown
   - Selecione a praca no dropdown
   - Clique em "Aprovar"
4. O usuario sera atribuido a organizacao e praca selecionadas

---

## Como usar (Admin)

1. Acesse `/admin` como admin
2. Va para a aba "Pendentes" (se houver cadastros pendentes)
3. Selecione a praca no dropdown
4. Clique em "Aprovar"
5. O usuario sera atribuido a organizacao do admin e a praca selecionada

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar como super admin**:
   - Acesse `/platform`
   - Va para a aba "Pendentes"
   - Aprove um cadastro selecionando tenant e praca
3. **Testar como admin**:
   - Acesse `/admin`
   - Va para a aba "Pendentes"
   - Aprove um cadastro selecionando praca
