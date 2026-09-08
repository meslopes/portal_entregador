# Como corrigir o erro 500 no login

## O problema

O `DATABASE_URL` no Render aponta para um hostname que nao existe mais:
`dpg-d9clcqhkh4rs73cul440-a`

Isso causa o erro:
```
psycopg2.OperationalError: could not translate host name "dpg-d9clcqhkh4rs73cul440-a" to address
```

**Eu nao consigo corrigir isso pelo codigo. Voce precisa alterar no painel do Render.**

---

## Passo a passo

### 1. Acesse o painel do Render
- Abra: https://dashboard.render.com

### 2. Encontre o banco de dados
- No menu lateral esquerdo, clique em **"Databases"** ou **"PostgreSQL"**
- Voce vera a lista de bancos de dados disponiveis

### 3. Copie a URL do banco
- Clique no banco de dados do projeto
- Va na aba **"Info"**
- Copie a **"Internal Database URL"** (comeca com `postgres://`)

### 4. Atualize a variavel de ambiente
- Volte para o servico **muvlog-api**
- Clique em **"Environment"**
- Encontre a variavel `DATABASE_URL`
- Substitua o valor antigo pela URL que voce copiou
- Clique em **"Save Changes"**

### 5. Aguarde o redeploy
- O Render vai redeployar automaticamente
- O login voltara a funcionar

---

## Se nao encontrar o banco de dados

Se nao existir nenhum banco PostgreSQL na lista:

1. No Render, clique em **"New"** > **"PostgreSQL"**
2. Nome: `muvlog-db`
3. Plano: **Free**
4. Clique em **"Create Database"**
5. Apos criado, copie a **"Internal Database URL"**
6. Configure no servico `muvlog-api` como descrito acima

---

## Apos corrigir

Depois que o login voltar a funcionar, me avise que eu removo a mensagem de debug do codigo.
