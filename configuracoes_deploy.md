# Configurações para Deploy - PORTAL

## Arquivos de Configuração Criados

### 1. Backend (Flask)
- ✅ `src/config.py` - Configurações por ambiente
- ✅ `src/main_production.py` - Versão otimizada para produção
- ✅ `.env.production` - Variáveis de ambiente de produção
- ✅ `Procfile` - Configuração para Railway/Heroku
- ✅ `requirements.txt` - Dependências Python atualizadas

### 2. Frontend (React)
- ✅ Build de produção criado (`dist/`)
- ✅ Configurações de API prontas
- ✅ Otimizado para deploy

## Comandos Úteis

### Testar Localmente em Modo Produção

**Backend:**
```bash
cd portal-backend
source venv/bin/activate
FLASK_ENV=production python src/main_production.py
```

**Frontend:**
```bash
cd portal-frontend
pnpm run build
pnpm run preview  # Testa o build de produção
```

### Preparar para Deploy

**1. Criar repositório GitHub:**
```bash
git init
git add .
git commit -m "PORTAL - Sistema de controle de entregadores"
git remote add origin https://github.com/SEU-USUARIO/portal-delivery.git
git push -u origin main
```

**2. Deploy no Vercel (Frontend):**
- Conectar GitHub
- Configurar: `cd portal-frontend && pnpm run build`
- Output: `portal-frontend/dist`

**3. Deploy no Railway (Backend):**
- Conectar GitHub
- Configurar variáveis de ambiente
- Deploy automático

## Variáveis de Ambiente Necessárias

### Produção (Railway):
```
FLASK_ENV=production
SECRET_KEY=sua-chave-super-secreta-aqui
JWT_SECRET_KEY=sua-jwt-chave-super-secreta-aqui
DATABASE_URL=postgresql://user:pass@host:port/db
CORS_ORIGINS=https://seu-frontend.vercel.app
```

### Desenvolvimento (Local):
```
FLASK_ENV=development
SECRET_KEY=dev-secret-key
JWT_SECRET_KEY=jwt-dev-secret-key
DATABASE_URL=sqlite:///src/database/app.db
CORS_ORIGINS=*
```

## Estrutura Final do Projeto

```
portal-delivery/
├── portal-frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── lib/
│   │   └── App.jsx
│   ├── dist/              # Build de produção
│   ├── package.json
│   └── vite.config.js
├── portal-backend/
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── config.py
│   │   ├── main.py        # Desenvolvimento
│   │   └── main_production.py  # Produção
│   ├── venv/
│   ├── requirements.txt
│   ├── Procfile
│   ├── .env
│   └── .env.production
├── docs/
│   ├── guia_deploy.md
│   ├── requisitos_portal.md
│   ├── design_portal.md
│   └── arquitetura_portal.md
└── README.md
```

## Status do Projeto

✅ **Desenvolvimento Completo**
✅ **Testes Locais Aprovados**
✅ **Configurações de Produção Prontas**
✅ **Documentação Completa**
🔄 **Aguardando Deploy (quando você decidir)**

## Próximos Passos Opcionais

1. **Criar repositório GitHub privado**
2. **Fazer upload do código**
3. **Configurar deploy quando estiver pronto**
4. **Testar em produção**
5. **Configurar domínio personalizado (opcional)**

O sistema está **100% pronto** para deploy quando você decidir!

