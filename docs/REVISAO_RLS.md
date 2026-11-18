# Revisão de RLS — tabelas com dados pessoais (item de hardening, 2026-11-18)

## Contexto

O banco (Supabase PostgreSQL) tem **RLS desativado em todas as tabelas**.
Esta revisão documenta por que essa postura está **correta para a
arquitetura atual** e quando ela deve mudar.

## Como o sistema acessa os dados

| Camada | Acessa o banco? | Autenticação |
|---|---|---|
| Backend Flask (Cloud Run) | **SIM — única camada de acesso** | JWT de usuário + regras de tenant no código |
| Frontend (Vercel/PWA) | **NÃO** — só fala com a API | JWT |
| Supabase Realtime (GPS) | canais públicos por tenant (config do app) | publishable key |
| Supabase Storage (fotos/logos) | upload pelo backend, leitura pública por URL | service key no backend |

Conclusão: **nenhum cliente consulta o banco diretamente**. O RLS seria a
barreira de segurança se o frontend usasse o PostgREST/anon key contra as
tabelas — hoje isso não acontece.

## Por que RLS off é correto agora

1. **Superfície de ataque:** sem PostgREST exposto ao cliente, não há
   caminho de consulta às tabelas fora do backend.
2. **Autorização real está no código:** `check_user_and_tenant_status`,
   `client_or_admin_required`, `admin_required` e filtros por
   `tenant_id` em cada rota (multi-tenant no nível da aplicação).
3. **RLS mal configurado é pior que RLS off:** policy frouxa dá falsa
   sensação de segurança (o clássico "achava que estava protegido").

## Riscos que permanecem (e como mitigar)

| Risco | Mitigação atual | O que fazer |
|---|---|---|
| `DATABASE_URL` vazar (repo, logs, print) | Secret Manager no Cloud Run; `.env` fora do git | Nunca commitar `.env`; rotacionar se vazar (histórico git antigo ainda tem chaves antigas — rotacionar cobre) |
| Service key do Supabase exposta | só no backend/Secret Manager | idem |
| Publishable key no frontend | é pública por design (Realtime) | não dá acesso a tabelas sem RLS/PostgREST habilitado |
| SQL injection | SQLAlchemy ORM (parâmetros) | manter ORM; raw SQL só com `db.text` + parâmetros |

## Quando REVISAR esta decisão

Ativar RLS quando (o que vier primeiro):

1. O frontend passar a consultar o Supabase direto (PostgREST/anon key);
2. Existir outro consumidor do banco fora do backend;
3. Um auditor exigir para compliance (aí: policies por tenant em todas as
   tabelas com `tenant_id`, e policies "tudo para o service role" para o
   backend).

## Recomendação

**Manter RLS desativado** nesta arquitetura (backend único + JWT + filtros
por tenant). Registrar qualquer mudança de arquitetura que altere a
premissa "só o backend lê o banco" — esta revisão deve ser refeita naquele
momento.

_Revisão feita em 2026-11-18 — sem mudanças de configuração, apenas conclusão documentada._
