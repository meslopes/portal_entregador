# muv.log — Portal Entregador

Sistema SaaS multi-tenant de delivery e gestão de entregadores.

## Funcionalidades

- **Multi-tenant**: cada organização (tenant) tem seus dados isolados
- **6 perfis de usuário**: Super Admin, Admin, Praça, Estabelecimento, Entregador Plataforma, Entregador Próprio
- **Gestão de pedidos**: criação, distribuição automática, rastreamento em tempo real
- **Gamificação (MuvScore)**: ranking semanal, níveis (Bronze a Diamante), premiação por desempenho
- **Entregadores próprios**: estabelecimentos podem ter seus próprios entregadores
- **Prova de entrega**: foto com upload para Supabase Storage
- **Financeiro**: controle de ganhos, saques, faturas, tabelas de preço configuráveis
- **Relatórios**: pedidos, performance, financeiro, cancelamentos, horários de pico
- **PWA**: instalável como app no celular

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, Leaflet, Axios |
| Backend | Flask, SQLAlchemy, Flask-JWT-Extended |
| Banco | PostgreSQL (Supabase) |
| Storage | Supabase Storage (fotos de prova) |
| Deploy Frontend | Vercel |
| Deploy Backend | Google Cloud Run |

## Estrutura

```
portal-backend/         → API Flask
├── src/
│   ├── models/         → Modelos do banco (portal_models.py)
│   ├── routes/         → Rotas da API (auth, admin, order, driver, etc.)
│   ├── services/       → Serviços externos (geocoding, iFood, WhatsApp)
│   ├── utils/          → Utilitários (tenant, muvscore, geo, validation)
│   └── main.py         → Entry point (dev e produção)

portal-frontend/        → App React
├── src/
│   ├── pages/          → Páginas por perfil (admin, client, driver, own-driver)
│   ├── components/     → Componentes reutilizáveis (Layout, Toast, etc.)
│   ├── contexts/       → Contextos React (Auth, Square)
│   ├── lib/            → Configuração da API e utilitários
│   └── constants/      → Constantes do sistema
```

## Rodando localmente

### Requisitos
- Python 3.10+
- Node.js 18+
- Banco PostgreSQL (Supabase) ou SQLite (desenvolvimento)

### Backend
```bash
cd portal-backend
pip install -r requirements.txt
python main.py
```
Backend roda em `http://localhost:5000`

### Frontend
```bash
cd portal-frontend
npm install
npm run dev -- --host
```
Frontend roda em `http://localhost:5173`

### Iniciar tudo (Windows)
Duplo clique em `INICIAR_SISTEMA.bat` na raiz do projeto.

### Variáveis de ambiente

**Backend** (`.env` em `portal-backend/`):
```
DATABASE_URL=postgresql://...
SECRET_KEY=sua-chave-secreta
JWT_SECRET_KEY=sua-chave-jwt
FLASK_ENV=development
```

**Frontend** (`.env` em `portal-frontend/`):
```
VITE_API_URL=http://localhost:5000
```

## Deploy

- **Frontend**: Vercel (auto-deploy da branch `main`)
- **Backend**: Google Cloud Run (deploy manual via `gcloud run deploy`)
- **Banco**: Supabase (PostgreSQL)

## Documentação

- `docs/fluxograma-sistema.html` — Hierarquia de perfis e rotas da API
- `docs/Plano_MuvScore pdf.pdf` — Plano do sistema de gamificação
- `REGRAS_TRABALHO_EQUIPE.md` — Regras de trabalho da equipe
- `ROTEIRO_TESTES.md` — Roteiro de testes manuais

## Equipe

- **Mauro** (meslopes@gmail.com) — Product Owner
- **Éverton** — Desenvolvedor Jr.
