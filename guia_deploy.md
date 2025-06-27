# Guia Completo de Deploy - PORTAL

## O que é Deploy?

Deploy é o processo de publicar sua aplicação na internet para que ela seja acessível por qualquer pessoa. É a diferença entre ter o sistema rodando apenas no seu computador (desenvolvimento) e tê-lo disponível online (produção).

## Arquitetura do PORTAL

O PORTAL é composto por:
- **Frontend React**: Interface do usuário (telas, botões, etc.)
- **Backend Flask**: Servidor com APIs e lógica de negócio
- **Banco de dados**: Armazenamento de dados (usuários, pedidos, etc.)

## Opções de Deploy

### 1. GitHub Pages ❌ (NÃO RECOMENDADO)
**Por que não serve:**
- Só hospeda sites estáticos (HTML, CSS, JS)
- Não suporta backend (Flask)
- Não suporta banco de dados
- Nosso sistema precisa de servidor

### 2. Vercel + Railway ⭐ (RECOMENDADO)
**Configuração:**
- **Vercel**: Frontend React
- **Railway**: Backend Flask + PostgreSQL
- **GitHub**: Repositório do código

**Vantagens:**
- ✅ Gratuito para começar
- ✅ Deploy automático via GitHub
- ✅ URLs profissionais
- ✅ Fácil configuração
- ✅ Escalável

**Custos:**
- Vercel: Gratuito até 100GB bandwidth
- Railway: $5/mês após trial gratuito

### 3. Heroku (ALTERNATIVA)
**Configuração:**
- Tudo em uma plataforma

**Vantagens:**
- ✅ Simples de usar
- ✅ Tudo integrado

**Desvantagens:**
- ❌ Não tem plano gratuito
- ❌ Mais caro (~$7-25/mês)

### 4. DigitalOcean/AWS (AVANÇADO)
**Configuração:**
- VPS próprio ou serviços cloud

**Vantagens:**
- ✅ Controle total
- ✅ Pode ser mais barato em escala

**Desvantagens:**
- ❌ Requer conhecimento técnico
- ❌ Mais complexo de configurar

## Fluxo Recomendado (Vercel + Railway)

### Passo 1: Preparar Repositório GitHub
```bash
# Criar repositório no GitHub
# Fazer upload do código
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/portal-delivery.git
git push -u origin main
```

### Passo 2: Deploy do Frontend (Vercel)
1. Conectar GitHub à Vercel
2. Selecionar repositório
3. Configurar build:
   - Build Command: `cd portal-frontend && pnpm run build`
   - Output Directory: `portal-frontend/dist`
4. Deploy automático

### Passo 3: Deploy do Backend (Railway)
1. Conectar GitHub à Railway
2. Selecionar repositório
3. Configurar variáveis de ambiente:
   - `FLASK_ENV=production`
   - `DATABASE_URL` (PostgreSQL automático)
   - `SECRET_KEY` (gerar nova)
4. Deploy automático

### Passo 4: Configurar Integração
1. Atualizar URL da API no frontend
2. Configurar CORS no backend
3. Testar integração

## Estrutura de Arquivos para Deploy

```
portal-delivery/
├── portal-frontend/          # Frontend React
│   ├── src/
│   ├── dist/                # Build de produção
│   ├── package.json
│   └── vercel.json          # Configuração Vercel
├── portal-backend/           # Backend Flask
│   ├── src/
│   ├── requirements.txt
│   ├── Procfile            # Configuração Railway
│   └── .env.production
├── docs/                   # Documentação
└── README.md
```

## Configurações Necessárias

### Frontend (Vercel)
**vercel.json:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Backend (Railway)
**Procfile:**
```
web: gunicorn src.main_production:app --bind 0.0.0.0:$PORT
```

**Variáveis de ambiente:**
- `FLASK_ENV=production`
- `SECRET_KEY=sua-chave-secreta-super-forte`
- `DATABASE_URL=postgresql://...` (automático)
- `CORS_ORIGINS=https://seu-frontend.vercel.app`

## URLs Finais

Após o deploy, você terá:
- **Frontend**: `https://portal-delivery.vercel.app`
- **Backend**: `https://portal-backend.railway.app`
- **Admin**: `https://portal-delivery.vercel.app/admin`

## Vantagens do GitHub

✅ **Versionamento**: Histórico completo de mudanças
✅ **Backup**: Código seguro na nuvem
✅ **Colaboração**: Facilita trabalho em equipe
✅ **Integração**: Conecta com plataformas de deploy
✅ **Deploy automático**: Atualiza site quando você faz push
✅ **Gratuito**: Para repositórios públicos e privados

## Próximos Passos

1. **Criar conta no GitHub** (se não tiver)
2. **Criar repositório privado** para o PORTAL
3. **Fazer upload do código**
4. **Configurar deploy quando estiver pronto**

## Segurança

- ✅ Repositório pode ser **privado**
- ✅ Você controla **quando fazer deploy**
- ✅ Pode **testar antes** de publicar
- ✅ **Fácil de remover** se necessário

O GitHub é **essencial** para qualquer projeto profissional, mesmo que você não faça deploy imediatamente!

