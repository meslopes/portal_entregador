# AGENTS.md

## Project

muv.log — SaaS delivery management platform for delivery drivers, establishments, and admins (Brazilian Portuguese UI/UX). Two separate apps in one repo. All 12 development phases completed; system is in active production.

## Architecture

```
portal-frontend/   → React 19 SPA (Vercel)
portal-backend/    → Flask API (Render + PostgreSQL)
```

No monorepo tooling. Each app has its own dependencies and runs independently.

## Commands

### Frontend (portal-frontend/)

```bash
npm run dev        # Vite dev server (default port 5173)
npm run build      # Production build
npm run lint       # ESLint
```

No test script defined. No TypeScript — all `.jsx`. Uses `.npmrc` with `legacy-peer-deps=true` for Vercel builds.

### Backend (portal-backend/)

```bash
python main.py                          # Local dev (uses src/main.py, SQLite by default)
FLASK_ENV=production python -m src.main_production  # Production entrypoint
gunicorn src.main_production:app        # Production server (what Render runs)
```

No pytest or test runner configured. `test_*.py` files are ad-hoc scripts that hit a running server via `urllib`. A manual test roteiro exists at `ROTEIRO_TESTES.md`.

## Critical details

### Two backend entry points

- `src/main.py` — development. Loads `.env`, uses SQLite fallback, serves static files.
- `src/main_production.py` — production. Uses `config.py` classes, requires `DATABASE_URL` with PostgreSQL, runs inline SQL migrations on startup via `db.create_all()` + raw `DO $$` blocks.
- `main.py` at root just re-exports `src/main.py`.

### Migrations are inline, not Alembic

Despite `alembic` and `Flask-Migrate` in requirements, schema changes are applied as raw SQL in `main_production.py`'s `create_app()`. New columns/tables must be added there. Alembic is not configured or used.

### Frontend API URL

`src/lib/api.js` defaults to `https://muvlog-api.onrender.com`. For local backend, set `VITE_API_URL=http://localhost:5000` in a `.env` file in `portal-frontend/`.

### Path alias

`@/` → `src/` (configured in `vite.config.js` and `jsconfig.json`). Use `@/components/...`, `@/lib/...`, etc.

### shadcn/ui

Components live in `src/components/ui/`. Style is `new-york`, JSX (not TSX), `neutral` base color, CSS variables enabled. Add new components with:

```bash
npx shadcn@latest add <component>
```

Config is in `components.json`.

### Tailwind v4

Uses `@tailwindcss/vite` plugin (not PostCSS). CSS in `src/App.css` and `src/index.css`.

### Three user types and route structure

| Type   | Login route      | App prefix | Layout        |
|--------|------------------|------------|---------------|
| DRIVER | `/login`         | `/`        | `Layout`      |
| CLIENT | `/client/login`  | `/client/` | `ClientLayout`|
| ADMIN  | `/login`         | `/admin/`  | `Layout`      |

`SmartRedirect` in `App.jsx` sends users to the right section based on `user.user_type`.

### Auth flow

JWT tokens stored in `localStorage`. Axios interceptor in `src/lib/api.js` adds `Authorization: Bearer <token>` automatically. 401 responses clear token and redirect to `/login`.

### CORS

Origins are whitelisted in `src/config.py` (`CORS_ORIGINS`). Add new origins there for production. Dev origins include `localhost:5173`, `5174`, `3000`.

### Database models

All models are in `src/models/portal_models.py` (single file, ~600 lines). Enums: `UserType`, `UserStatus`, `VehicleType`, `OrderStatus`, `PaymentMethod`, `PaymentType`, `PaymentStatus`, `NotificationType`.

### Backend blueprints

Registered in both entry points with prefixes:
- `/api/auth` — `src/routes/auth.py`
- `/api/driver` — `src/routes/driver.py`
- `/api/orders` — `src/routes/order.py`
- `/api/admin` — `src/routes/admin.py`
- `/api/webhooks` — `src/routes/webhooks.py`
- `/api/user` — `src/routes/user.py`
- `/api/bonus` — `src/routes/bonus.py`

### Environment variables

**Backend**: `FLASK_ENV`, `DATABASE_URL`, `JWT_SECRET_KEY`, `SECRET_KEY`
**Frontend**: `VITE_API_URL`

### Deploy

- Frontend: Vercel (auto-deploy from main). SPA rewrite configured in `vercel.json`.
- Backend: Render. Config in `render.yaml`. Health check at `/api/health`.
- Render free tier has cold start (5-10 min without traffic).

### Known bugs

- Footer "Privacidade" may appear truncated on mobile.
- Driver dashboard may show zeros right after login (browser cache issue).

### Documentation files

The repo has several planning/reference docs (in Portuguese):
- `todo.md` — project phases and pending items
- `PLANO_MUV_LOG.md` — action plan and status
- `ROTEIRO_TESTES.md` — manual test roteiro
- `FLUXOGRAMA_PROJETO.md` — flowcharts
- `documentacao_completa.md` — full technical documentation
- `arquitetura_portal.md` — architecture diagrams
- `configuracoes_deploy.md` / `guia_deploy.md` — deploy guides

### Language

Code comments, UI strings, commit messages, and documentation are in Brazilian Portuguese. Keep it that way.
