# Guia de Deploy - muv.log

## Arquitetura de Deploy

```
GitHub (repositorio)
    │
    ├──► Vercel (frontend) - portal-entregador-gamma.vercel.app
    │
    └──► Render (backend) - muvlog-api.onrender.com
              │
              └──► PostgreSQL (banco de dados)
```

## Deploy do Frontend (Vercel)

### Configuracao
1. Conectar repositorio GitHub ao Vercel
2. Framework: Vite
3. Root Directory: `portal-frontend`
4. Build Command: `pnpm build` ou `npm run build`
5. Output Directory: `dist`

### Variavel de Ambiente
```
VITE_API_URL=https://muvlog-api.onrender.com
```

### Notas
- Deploy automatico a cada push no GitHub
- SPA rewrite configurado no vercel.json
- Dominio: portal-entregador-gamma.vercel.app

## Deploy do Backend (Render)

### Configuracao
1. Conectar repositorio GitHub ao Render
2. Tipo: Web Service
3. Runtime: Python 3.11
4. **Root Directory: `portal-backend`** (IMPORTANTE!)
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `gunicorn src.main_production:app`

### Variaveis de Ambiente
```
FLASK_ENV=production
SECRET_KEY=<chave-secreta>
JWT_SECRET_KEY=<chave-jwt>
DATABASE_URL=<url-postgresql-render>
```

### Banco de Dados PostgreSQL
- Criado automaticamente pelo Render
- URL configurada em DATABASE_URL
- Migrations executadas automaticamente no startup

### Notas
- **CRITICO**: Root Directory deve ser `portal-backend`
- Deploy automatico a cada push no GitHub
- Health check: https://muvlog-api.onrender.com/api/health

## Deploy Local (Desenvolvimento)

### Backend
```bash
cd portal-backend
pip install -r requirements.txt
python src/main.py
# Rota em http://localhost:5000
```

### Frontend
```bash
cd portal-frontend
npm install
npm run dev
# Rota em http://localhost:5173
```

## Variaveis de Ambiente

### Backend (.env)
```
DATABASE_URL=sqlite:///instance/app.db
SECRET_KEY=dev-secret-key
JWT_SECRET_KEY=dev-jwt-secret
FLASK_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

## Pos-Deploy

### Verificacao
1. Acessar https://muvlog-api.onrender.com/api/health
2. Acessar https://portal-entregador-gamma.vercel.app
3. Testar login com credenciais de teste

### Seed de Dados
```bash
# Criar admin
POST https://muvlog-api.onrender.com/api/auth/create-admin
{"email":"admin@muv.log.br","password":"admin123"}

# Criar entregador
POST https://muvlog-api.onrender.com/api/auth/register
{"email":"entregador@teste.com","password":"123456",...}

# Criar estabelecimento
POST https://muvlog-api.onrender.com/api/auth/register-client
{"email":"cliente@teste.com","password":"123456",...}
```

## Troubleshooting

### Render: "ModuleNotFoundError: No module named 'src'"
- Verificar Root Directory = `portal-backend`

### Vercel: Build falha
- Verificar se todas as paginas estao commitadas
- Verificar imports no App.jsx

### CORS error
- Verificar se URL do Vercel esta em CORS_ORIGINS no config.py
- Verificar se VITE_API_URL esta configurado no Vercel
