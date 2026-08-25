# Guia: Criar novo banco PostgreSQL gratuito no Render

## Passo 1 - Deletar o banco antigo

1. Abra https://dashboard.render.com
2. No menu lateral esquerdo, clique em **"Databases"**
3. Clique no banco **"muvlog-db"**
4. Role a pagina ate o final
5. Clique em **"Delete Database"**
6. Confirme a delecao digitando o nome do banco

## Passo 2 - Criar o novo banco

1. Apos deletar, clique no botao **"New +"** (canto superior direito)
2. Selecione **"PostgreSQL"**
3. Preencha:
   - **Name**: `muvlog-db`
   - **Database**: `muvlog`
   - **User**: `muvlog_user`
   - **Region**: escolha a mais proxima (ou deixe padrao)
   - **PostgreSQL Version**: deixe o padrao (18)
   - **Instance Type**: **Free** (256 MB RAM, 0.1 CPU, 1 GB Storage)
4. Clique em **"Create Database"**

## Passo 3 - Aguardar o banco ficar pronto

- O status vai mudar de **"Creating"** para **"Available"**
- Isso leva de 1 a 3 minutos
- Nao feche a pagina

## Passo 4 - Copiar a URL do banco

1. Quando o status for **"Available"**, clique no banco **"muvlog-db"**
2. Va na aba **"Info"**
3. Na secao **"Connections"**, encontre **"Internal Database URL"**
4. Clique no icone de copiar ao lado da URL
5. A URL comeca com `postgres://muvlog_user:...@dpg-...`

## Passo 5 - Atualizar no servico muvlog-api

1. No menu lateral, clique em **"Web Services"**
2. Clique no servico **"muvlog-api"**
3. Va na aba **"Environment"**
4. Encontre a variavel **`DATABASE_URL`**
5. Clique no valor atual para editar
6. Cole a nova URL que voce copiou
7. Clique em **"Save Changes"**

## Passo 6 - Aguardar o redeploy

- O Render vai iniciar um redeploy automatico
- Aguarde o status mudar para **"Live"** (pode levar 2-5 minutos)
- Acompanhe na aba **"Events"**

## Passo 7 - Testar o login

1. Acesse https://muvlog.vercel.app
2. Tente fazer login
3. Se funcionar, o sistema esta restaurado

## Passo 8 - Criar usuario admin (se necessario)

Como o banco e novo, nao existem usuarios. Voce precisa criar um admin:

1. No Render, va na aba **"Shell"** do servico muvlog-api
2. Execute o comando (ou me avise que eu faco um endpoint para criar)

**Ou** use o endpoint de criacao de admin que ja existe no codigo (se tiver o token de setup).

---

## Se algo der errado

- Se o deploy falhar: verifique os logs na aba **"Logs"**
- Se o login nao funcionar: me avise que investigo
- Se precisar de ajuda: me mande uma captura de tela do erro
