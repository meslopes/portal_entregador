# Entendendo o Tenant "muvy.log" e como criar admins

## O que e o tenant "muvy.log"?

O tenant "muvy.log" foi criado **automaticamente pelo codigo** (migration) quando o banco de dados foi recriado. Ele serve como tenant **padrao** para dados existentes.

**Nao e o super admin.** E apenas uma organizacao de exemplo/compatibilidade.

## Quem e o super admin?

**Voce** (`meslopes@gmail.com`) e o super admin porque:
- Seu `tenant_id` e `NULL` (nao pertence a nenhum tenant)
- Voce acessa `/platform` (dashboard do super admin)
- Voce ve TODOS os tenants e usuarios

## Como criar um admin de tenant?

Existem **duas formas**:

### Forma 1: Pelo painel do super admin (`/platform`)

1. Faca login como super admin (`meslopes@gmail.com`)
2. Va para `/platform`
3. Na aba **"Tenants"**, crie uma nova organizacao (ex: "Entregas Porto Alegre")
4. Na aba **"Usuarios"**, crie um novo usuario:
   - Email: joao@entregaspoa.com.br
   - Nome: João Silva
   - Tipo: ADMIN
   - Tenant: selecione "Entregas Porto Alegre"

### Forma 2: Pelo endpoint `/api/auth/create-admin`

Precisa do token `ADMIN_SETUP_TOKEN` configurado no Render.

## O campo "empresa" na tela de criacao de admin

**Sim, o campo "empresa" e o Tenant.**

Quando voce cria um admin pelo painel:
- **Empresa** = Tenant (a organizacao)
- **Nome** = Nome do admin (a pessoa)

O admin criado herda o `tenant_id` do admin que esta criando. Se voce (super admin) cria o admin, ele fica sem tenant_id (vira super admin tambem). Se um tenant admin cria, o novo admin herda o mesmo tenant.

## Fluxo correto para criar um admin de praça

```
1. Voce (super admin) acessa /platform
2. Cria o Tenant "Entregas Porto Alegre"
3. Cria o Admin "João Silva" vinculado ao Tenant
4. João faz login em /login
5. E redirecionado para /admin
6. La ele cria as praças "Centro" e "Zona Sul"
7. Cadastra estabelecimentos e entregadores
```

## Resumindo

| Item | Explicacao |
|------|------------|
| `muvy.log` | Tenant padrao criado pelo codigo, nao e o super admin |
| Super Admin | Voce (`meslopes@gmail.com`), tenant_id = NULL |
| Tenant Admin | Admin vinculado a um tenant, acessa `/admin` |
| Campo "empresa" | Sim, e o Tenant |
| Campo "nome" | Sim, e o nome do admin |

## Proximo passo

Va para `/platform` e crie:
1. Um Tenant (organizacao)
2. Um Admin vinculado ao Tenant
