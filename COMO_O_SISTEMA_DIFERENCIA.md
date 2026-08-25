# Como o sistema diferencia Admin de Entregador no login?

## Sua pergunta

"O admin e criado no mesmo login do entregador, entao como sabemos que ele e um admin e nao um entregador?"

## Resposta

O sistema **nao** diferencia no momento do cadastro. O campo `user_type` e definido **quando o usuario e criado**, nao quando faz login.

### O campo user_type

No banco de dados, todo usuario tem um campo `user_type` que pode ser:

| user_type | Quem e | Como e criado |
|-----------|--------|---------------|
| `DRIVER` | Entregador | Pelo formulario de registro (`/register`) |
| `ADMIN` | Administrador | Pelo endpoint protegido (`/create-admin`) ou pelo painel do super admin (`/platform`) |
| `CLIENT` | Estabelecimento | Pelo formulario de cadastro (`/client/register`) |

### O que acontece no login

Quando qualquer usuario faz login em `/login`:

1. O sistema busca o usuario pelo email no banco de dados
2. Verifica a senha
3. Retorna o `user_type` na resposta (junto com o token JWT)
4. O frontend le o `user_type` e redireciona:

```
Se user_type == "ADMIN":
    Se tenant_id == NULL → redireciona para /platform (super admin)
    Se tenant_id != NULL → redireciona para /admin (tenant admin)

Se user_type == "DRIVER":
    → redireciona para /dashboard

Se user_type == "CLIENT":
    → redireciona para /client
```

### Exemplo pratico

**Entregador se cadastra:**
1. Acessa `/register`
2. Preenche nome, email, senha, CPF, etc.
3. Sistema cria usuario com `user_type = DRIVER`
4. Faz login em `/login`
5. Sistema ve que e DRIVER → redireciona para `/dashboard`

**Voce cria um admin:**
1. Usa o endpoint `/api/auth/create-admin` (ou painel do super admin)
2. Define `user_type = ADMIN` e `tenant_id = ID_DO_TENANT`
3. O admin faz login em `/login`
4. Sistema ve que e ADMIN → redireciona para `/admin`

### Resumindo

- **Nao e o login que define o tipo** e sim o cadastro/criacao
- **O mesmo formulario de login** serve para todos
- **O sistema le o `user_type` do banco** e redireciona automaticamente
- **Um entregador nao pode se tornar admin** pelo formulario de registro
- **A criacao de admin e protegida** por token secreto ou pelo painel do super admin
