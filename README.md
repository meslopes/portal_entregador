# muv.log — Portal Entregador

Sistema SaaS multi-tenant de delivery e gestão de entregadores.

## Funcionalidades

- **Multi-tenant**: cada organização (tenant) tem seus dados isolados
- **6 perfis de usuário**: Super Admin, Admin, Praça, Estabelecimento, Entregador Plataforma, Entregador Próprio
- **Gestão de pedidos**: criação, distribuição automática, rastreamento em tempo real
- **Gamificação (MuvScore)**: ranking semanal, níveis (Bronze a Diamante), premiação por desempenho
- **Entregadores próprios**: estabelecimentos podem ter seus próprios entregadores (login por telefone + PIN) — com botão **Enviar Acesso** que manda o link do app + PIN por WhatsApp/cópia
- **Prova de entrega**: foto com upload para Supabase Storage
- **Financeiro**: controle de ganhos, saques, faturas, tabelas de preço configuráveis
- **Relatórios**: pedidos, performance, financeiro, cancelamentos, horários de pico
- **Operação**: Link de Pedido Rápido (cliente pede pelo link), Registro de Atividades (auditoria), Evitamentos com punição silenciosa (G-08)
- **Integrações**: iFood (webhooks), WhatsApp (robô de atendimento), Asaas (pagamentos)
- **Notificações push**: Firebase Cloud Messaging para todos os perfis
- **GPS em tempo real**: posição dos entregadores via Supabase Realtime
- **PWA**: instalável como app no celular, com suporte offline (IndexedDB)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, Tailwind v4, shadcn/ui, Leaflet, Axios |
| Backend | Flask, SQLAlchemy, Flask-JWT-Extended |
| Banco | PostgreSQL (Supabase) |
| Tempo real | Supabase Realtime (GPS dos entregadores) |
| Storage | Supabase Storage (fotos de prova de entrega) |
| Notificações | Firebase Cloud Messaging (FCM HTTP v1) |
| Pagamentos | Asaas (faturas, saques) |
| Integrações | iFood (webhooks), WhatsApp (robô) |
| Deploy Frontend | Vercel (executado pela IA quando autorizado) |
| Deploy Backend | Google Cloud Run (executado pela IA quando autorizado) |

## Estrutura

```
portal-backend/              → API Flask
├── main.py                  → Re-exporta src/main.py (conveniência local)
├── Dockerfile               → Produção: gunicorn "src.main:app" (Cloud Run)
└── src/
    ├── models/              → Modelos do banco (pacote)
    │   ├── base.py          → db, enums (UserType, OrderStatus, ...)
    │   ├── users.py         → User, Driver, EstablishmentDriver, ...
    │   ├── orders.py        → Order, Route, ...
    │   ├── finance.py       → Invoice, Payment, ...
    │   ├── ops.py           → Notification, Settings, ...
    │   └── portal_models.py → Fachada (reexporta tudo — usar este nos imports)
    ├── routes/              → ~50 blueprints agrupados por domínio:
    │   ├── auth.py, user.py, driver.py, own_driver.py
    │   ├── order_*.py       → Pedidos (lifecycle, my, acceptance, queries, delivery_routes)
    │   ├── admin_*.py       → Painel admin (users, finance, reports, invoices, ...)
    │   ├── route_*.py       → Rotas de entrega (management, driver, platform)
    │   ├── finance_*.py     → Financeiro (billing, payments)
    │   ├── webhooks*.py     → iFood, WhatsApp, Asaas, parceiros
    │   └── platform*.py     → Super admin / plataforma
    ├── services/            → Serviços (geocoding, auto_routing, order_helpers, ...)
    ├── utils/               → Utilitários (tenant, auth, driver_type, geo, rate_limit, ...)
    ├── migrations_inline.py → Migrações SQL inline (produção)
    ├── migrations_tables.py → Migrações de tabelas
    ├── main.py              → Entry point de DESENVOLVIMENTO (SQLite fallback)
    └── main_production.py   → Entry point de PRODUÇÃO (exige DATABASE_URL PostgreSQL)

portal-frontend/             → App React (PWA)
└── src/
    ├── pages/               → Páginas por perfil (admin, client, driver, own-driver, platform, ...)
    ├── components/          → Componentes reutilizáveis (Layout, Toast, ui/ shadcn, ...)
    ├── contexts/            → Contextos React (Auth, Square)
    ├── routes/              → Definição de rotas do React Router
    ├── hooks/               → Custom hooks
    ├── lib/                 → Configuração da API e utilitários
    ├── utils/               → Funções auxiliares
    └── constants/           → Constantes do sistema (status, etc.)
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
FLASK_ENV=development
DATABASE_URL=postgresql://...        # SQLite é usado se ausente (dev)
SECRET_KEY=sua-chave-secreta
JWT_SECRET_KEY=sua-chave-jwt
GOOGLE_MAPS_API_KEY=...              # Geocoding/rotas
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

Opcionais (integrações — ver `src/config.py`):
`WHATSAPP_TOKEN`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `OWN_DRIVER_SECRET`,
`FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_SETUP_TOKEN`

Em produção os segredos ficam no Secret Manager do GCP — nunca commitar `.env`.

### Caminho único do banco (F-16)

A **única fonte de verdade do banco** é a `DATABASE_URL` do `.env` do backend
(Supabase PostgreSQL — pooler `aws-0-sa-east-1.pooler.supabase.com:6543`).
O SQLite (`portal-backend/instance/app.db`) é apenas **fallback de emergência**
quando não há `DATABASE_URL` — nunca use para testes com dados reais e nunca
confie nele para decisões de schema (as migrações rodam no PostgreSQL).

**Frontend** (`.env` em `portal-frontend/`):
```
VITE_API_URL=http://localhost:5000
```

## Deploy

> **IMPORTANTE:** o git integration do Vercel está quebrado (cria deploys no projeto
> errado `portal-entregador` e eles ficam *Canceled*). Git sincronizado **NÃO**
> significa site atualizado.
>
> Os deploys são **executados pela IA quando o Mauro autoriza** — ver
> `docs/REGRAS_TRABALHO_EQUIPE.md` (Regra 1 e Procedimento de Deploy).
> Nunca deployar sem autorização explícita.

### Frontend (Vercel)
O site oficial é: **https://portal-entregador-gamma.vercel.app**

O domínio gamma é **domínio do projeto `portal-frontend`** e aponta
automaticamente para o deploy de produção mais recente (configuração de
2026-11-14 — antes era um alias fixo que exigia `vercel alias set` a cada deploy
e causava o bug "usuário vendo versão antiga").

```bash
cd portal-frontend
npx vercel --prod
# Verificar (obrigatório) que o gamma acompanhou o novo deploy:
npx vercel inspect portal-entregador-gamma.vercel.app
```

Se o `inspect` mostrar um deployment anterior ao novo, reportar o problema
(não reportar "no ar" antes disso).

### Backend (Cloud Run) — só se o backend mudou
```bash
gcloud run deploy muvlog-api --source portal-backend --region us-central1 --project project-0799c4fd-82a2-49a0-b7d
```
Health check: `GET https://muvlog-api-890250693883.us-central1.run.app/api/health` → deve retornar `200`.

### Banco
Supabase (PostgreSQL) — pooler `aws-0-sa-east-1.pooler.supabase.com`

## Documentação

- `docs/fluxograma-sistema.html` — Hierarquia de perfis e rotas da API
- `docs/Plano_MuvScore pdf.pdf` — Plano do sistema de gamificação
- `docs/REGRAS_TRABALHO_EQUIPE.md` — Regras de trabalho da equipe
- `docs/GLOSSARIO.md` — Termos oficiais da interface (Estabelecimento, Praça, Entregador...)
- `docs/MIGRACOES.md` — Onde colocar migrações de schema (inline + Alembic)
- `docs/BACKUP_RESTORE.md` — Procedimento de backup/restore e limites
- `docs/REVISAO_RLS.md` — Conclusão da revisão de RLS do banco
- `docs/PLAN_MONETIZACAO_ENTREGAS_PROPRIAS.md` — Plano de monetização (entregas próprias)
- `docs/PLAN_MONETIZACAO_ENTREGAS_PROPRIAS.md` — Plano de monetização (entregas próprias)
- `docs/ROTEIRO_TESTES_MANUAIS.md` — Roteiro de testes manuais
- `docs/mapa-muvlog-2026-11-01-final.html` — Mapa do código-fonte (floorplan)

## Equipe

- **Mauro** (meslopes@gmail.com) — Product Owner
- **Éverton** — Desenvolvedor Jr.
