# Como funcionam os niveis de admin no sistema

## Hierarquia atual

```
Platform (muv.log - super admin)
  ├── Super Admin (tenant_id = NULL)
  │     - Acessa /platform
  │     - Ve TODOS os tenants, usuarios, dados
  │     - Gerencia a plataforma como um todo
  │
  └── Tenant A (ex: "Entregas Porto Alegre")
       ├── Tenant Admin (user.tenant_id = A)
       │     - Acessa /admin
       │     - Ve dados do Tenant A (todas as suas praças)
       │     - Gerencia praças, estabelecimentos, entregadores
       │
       ├── Praça 1: "Porto Alegre Centro"
       │     ├── Estabelecimentos (CLIENT)
       │     └── Entregadores (DRIVER)
       │
       └── Praça 2: "Porto Alegre Zona Sul"
             ├── Estabelecimentos (CLIENT)
             └── Entregadores (DRIVER)
```

## Resposta para a sua duvida

### 1. Como o admin faz login?

O admin usa a **mesma tela de login** em `/login` (a mesma que entregadores usam).
O sistema identifica automaticamente o tipo de usuario e redireciona:
- ADMIN → `/admin` (dashboard do admin)
- DRIVER → `/dashboard` (dashboard do entregador)
- CLIENT → `/client` (dashboard do estabelecimento)

### 2. Qualquer pessoa pode criar uma conta de admin?

**Nao.** O endpoint de registro (`/api/auth/register`) so cria usuarios DRIVER.
Para criar um admin, e necessario usar o endpoint `/api/auth/create-admin` que exige um token secreto (`ADMIN_SETUP_TOKEN`).

### 3. Como criar um admin de praça?

No modelo atual, nao existe "admin de praça" como role separada.
O que existe e:

- **Tenant Admin**: um usuario ADMIN vinculado a um Tenant (organizacao)
- Esse admin gerencia **TODAS as praças** do seu Tenant

Para criar um admin de praça, voce precisa:

1. **Criar um Tenant** (organizacao) - ex: "Entregas Porto Alegre"
2. **Criar um usuario ADMIN** com `tenant_id` desse Tenant
3. **Criar as Praças** (squares) vinculadas ao Tenant
4. O admin faz login em `/login` e e redirecionado para `/admin`

### 4. Como fazer isso na pratica?

**Opcao A: Pela tela de admin (voce como super admin)**

1. Faca login como super admin (`meslopes@gmail.com`)
2. Va para `/platform` (dashboard do super admin)
3. Na aba "Tenants", crie uma nova organizacao
4. Na aba "Users", crie um usuario ADMIN vinculado ao Tenant

**Opcao B: Pelo endpoint de setup (precisa do token)**

Use o endpoint `/api/auth/create-admin` com o `ADMIN_SETUP_TOKEN`.

### 5. Seguranca

- Ninguem pode se cadastrar como admin pelo formulario de registro
- A criacao de admin exige um token secreto
- O super admin controla quem pode ser admin

## Fluxo de venda da plataforma

Quando voce vender o uso da plataforma para um cliente:

1. Voce (super admin) cria um Tenant no `/platform`
2. Voce cria um usuario ADMIN para esse Tenant
3. Voce envia um link de acesso + credenciais para o cliente
4. O cliente faz login em `/login` com as credenciais
5. O cliente e redirecionado para `/admin` onde pode:
   - Criar praças
   - Cadastrar estabelecimentos
   - Cadastrar entregadores
   - Definir tabelas de preco por praça/estabelecimento

## Observacao importante

O endpoint de criacao de admin (`/api/auth/create-admin`) exige uma variavel de ambiente `ADMIN_SETUP_TOKEN` que provavelmente nao esta configurada no Render. Se voce quiser criar admins por esse endpoint, precisa definir essa variavel.

Alternativamente, voce pode criar admins diretamente pelo painel do super admin em `/platform`.
