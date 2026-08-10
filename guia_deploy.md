# Guia de Deploy - muv.log

**Aperfeiçoado por:** MiMo 2.5 | **Atualizado:** 25/07/2026

---

## URLs de Produção

| Serviço | URL |
|---------|-----|
| Frontend | https://portal-entregador-gamma.vercel.app |
| Backend | https://muvlog-api.onrender.com |
| Domínio | https://muv.log.br |

---

## Deploy Frontend (Vercel)

### Configuração
- **Build Command:** `npm run build`
- **Output:** `dist`
- **Package Manager:** npm (não pnpm)
- **Node.js:** 24.x

### Variável de Ambiente
```
VITE_API_URL=https://muvlog-api.onrender.com
```

### Notas
- Auto-deploy a cada push no branch main
- Usa `.npmrc` com `legacy-peer-deps=true`

---

## Deploy Backend (Render)

### Configuração
- **Build:** `cd portal-backend && pip install -r requirements.txt`
- **Start:** `cd portal-backend && gunicorn src.main_production:app`
- **Root Directory:** `portal-backend`
- **Python:** 3.11

### Variáveis de Ambiente
```
FLASK_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
SECRET_KEY=...
```

### Notas
- Free tier: cold start 5-10min
- Upgrade Starter ($7/mês) remove cold start

---

## Deploy Manual

### Frontend
```bash
git push origin main  # Auto-deploy Vercel
```

### Backend
```bash
git push origin main  # Auto-deploy Render
# Ou: Manual Deploy → Clear build cache & deploy
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Backend não responde | Espere 5-10min (cold start) |
| Erro 403 no frontend | Verificar CORS no backend |
| Mapa não aparece | Ctrl+Shift+R para limpar cache |
| WhatsApp não envia | Verificar credenciais no admin |
