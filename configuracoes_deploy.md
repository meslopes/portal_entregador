# Configurações de Deploy - muv.log

## 🌐 URLs de Produção

| Serviço | URL | Status |
|---------|-----|--------|
| **Frontend** | https://portal-entregador-gamma.vercel.app | ✅ Online |
| **Backend** | https://muvlog-api.onrender.com | ✅ Online |
| **Domínio** | https://muv.log.br | ✅ Configurado |

## 🚀 Vercel (Frontend)

### Configurações
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node.js Version:** 24.x
- **Package Manager:** npm (não pnpm)

### Variáveis de Ambiente
```
VITE_API_URL=https://muvlog-api.onrender.com
```

### Notas
- Usa `.npmrc` com `legacy-peer-deps=true` para resolver conflitos
- Auto-deploy a cada push no branch main
- Build inclui warning de chunk size (>500kB) - não é bloqueador

## 🖥️ Render (Backend)

### Configurações
- **Build Command:** `cd portal-backend && pip install -r requirements.txt`
- **Start Command:** `cd portal-backend && gunicorn src.main_production:app`
- **Root Directory:** `portal-backend`
- **Python Version:** 3.11
- **Plano:** Gratuito (cold start ~5-10min)

### Variáveis de Ambiente
```
FLASK_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
SECRET_KEY=...
```

### Notas
- Free tier tem cold start (5-10 min sem uso)
- Upgrade para Starter ($7/mês) remove cold start
- Build deve rodar de dentro de `portal-backend/`

## 🗄️ PostgreSQL (Render)

### Configurações
- **Plano:** Gratuito (90 dias), depois Starter ($7/mês)
- **Host:** Render Managed Database
- **Database:** muvlog

### Tabelas Principais
- users, drivers, customers, restaurants
- orders, deliveries, payments
- addresses, squares, system_config
- driver_scores, driver_bonuses, driver_achievements
- dynamic_pricing

## 🔑 Credenciais de Teste

| Usuário | Email | Senha | Tipo |
|---------|-------|-------|------|
| Admin | admin@muv.log.br | admin123 | ADMIN |
| Admin (Mauro) | enilton26011967@gmail.com | admin123 | ADMIN |
| Entregador | entregador@teste.com | 123456 | DRIVER |
| Cliente | cliente@teste.com | 123456 | CLIENT |

## 🔧 Configurações Locais

### Backend (Desenvolvimento)
```bash
cd portal-backend
pip install -r requirements.txt
set FLASK_ENV=development
python -m src.main
```

### Frontend (Desenvolvimento)
```bash
cd portal-frontend
npm install
npm run dev
```

### Variáveis de Ambiente Local
```
# portal-backend/.env
FLASK_ENV=development
DATABASE_URL=sqlite:///src/database/app.db
JWT_SECRET_KEY=dev-secret-key
SECRET_KEY=dev-secret-key
```

## 📱 WhatsApp Business API

### Configurações (via admin Settings)
```
whatsapp_api_token=...
whatsapp_phone=...
whatsapp_verify_token=...
```

### Funcionalidades
- Notificação de novos pedidos para entregador
- Resposta SIM/NÃO pelo WhatsApp
- Notificações de status para estabelecimento
- Confirmações de aceite/recusa

## 🗺️ Geocoding (Nominatim)

### Configurações
- **Serviço:** Nominatim (OpenStreetMap)
- **Custo:** Gratuito
- **Limite:** 1 requisição/segundo
- **User-Agent:** muv.log/1.0

### Uso
- Geocodificação de endereços de estabelecimentos
- Geocodificação de endereços de entrega
- Cálculo de distâncias entre pontos

## 🔄 Deploy Manual

### Frontend (Vercel)
```bash
cd portal-frontend
git push origin main
# Vercel faz auto-deploy
```

### Backend (Render)
```bash
cd portal-backend
git push origin main
# Render faz auto-deploy (pode demorar 5-10min no free tier)
```

### Forçar Deploy (Render)
1. Acesse o painel do Render
2. Clique em "Manual Deploy"
3. Selecione "Clear build cache & deploy"

## 🐛 Troubleshooting

### Backend não responde (cold start)
- Espere 5-10 minutos para o Render acordar
- Ou faça um request para forçar o wake-up

### Frontend mostra erro 403
- Verifique se o CORS está configurado no backend
- Verifique se o token JWT não expirou

### Mapa não aparece
- Verifique se o Leaflet está carregando (console: `window.L`)
- Faça Ctrl+Shift+R para limpar cache

### WhatsApp não envia mensagens
- Verifique se as credenciais estão configuradas no admin
- Teste o endpoint `/api/webhooks/whatsapp`
