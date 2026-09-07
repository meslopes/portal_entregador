# Opcoes para resolver o banco de dados expirado

O banco PostgreSQL gratuito do Render expirou (status: suspended).
Voce tem 14 dias antes que os dados sejam deletados permanentemente.

---

## Opcao 1 - Criar novo banco gratuito (PERDE dados antigos)

1. No Render, va em **Databases** > clique no banco **muvlog-db**
2. Clique em **"Delete Database"** no final da pagina
3. Apos deletar, clique em **"New"** > **"PostgreSQL"**
4. Nome: `muvlog-db`
5. Plano: **Free**
6. Clique em **"Create Database"**
7. Aguarde ficar **"Available"** (pode levar 1-2 minutos)
8. Clique no banco novo > aba **"Info"**
9. Copie a **"Internal Database URL"**
10. Va no servico **muvlog-api** > **"Environment"**
11. Atualize a variavel `DATABASE_URL` com a nova URL
12. Clique em **"Save Changes"**
13. O Render vai redeployar e o sistema vai recriar tudo automaticamente

**Resultado**: Login funciona, sistema volta ao normal, porem sem dados antigos.

---

## Opcao 2 - Upgrade para pago (MANTEM dados)

1. No Render, va em **Databases** > clique no banco **muvlog-db**
2. Clique em **"Update"** na secao "Postgres Instance"
3. Escolha um plano pago (a partir de $7/mes)
4. Adicione um cartao de credito se necessario
5. O banco vai reativar com todos os dados intactos
6. O login vai voltar a funcionar automaticamente

**Resultado**: Login funciona, todos os dados preservados.

---

## Opcao 3 - Banco gratuito externo

Servicos como **Neon** (neon.tech) ofereem PostgreSQL gratuito sem expirar.
E mais complexo de configurar, mas e uma opcao de longo prazo.

---

## Qual escolher?

- **Se tem dados importantes** (usuarios, pedidos reais): Opcao 2 (upgrade)
- **Se e ambiente de teste** ou pode recomecar: Opcao 1 (novo banco gratuito)
- **Se quer economizar a longo prazo**: Opcao 3 (banco externo)
