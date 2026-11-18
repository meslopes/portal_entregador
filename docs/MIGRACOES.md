# Estratégia de migrações de schema (hardening — documentado em 2026-11-18)

## Fonte de verdade

**As migrações inline em `src/main.py` são a fonte de verdade de runtime.**
Elas rodam em TODO boot (dev e produção), são idempotentes
(`IF NOT EXISTS`) e cobrem colunas/tabelas novas.

O **Alembic** (`migrations/`) existe como espelho versionado:
`0001_baseline` (marcador) → `0002_admin_invites` → `0003_schema_2026_11`.
Útil para rastreabilidade e para ambientes que prefiram `alembic upgrade`.

## Onde colocar uma migração nova (REGRA)

Sempre nos DOIS lugares:

1. **`src/main.py`** — bloco inline logo após os demais (padrão do arquivo:
   `DO $$ BEGIN IF NOT EXISTS ... END $$` + `print` + rollback no except);
2. **`src/migrations_tables.py`** — mesmo bloco (paridade para quem usa
   `main_production`/esse entry);
3. **`migrations/versions/000X_*.py`** — versão Alembic equivalente
   (idempotente, `op.execute` com IF NOT EXISTS).

### ⚠️ Armadilhas conhecidas (já aconteceram)

- **Só em `migrations_tables.py` NÃO roda em produção** — o entry real é
  `src/main.py` (`src.main:app` no Dockerfile);
- **Coluna nova NÃO é criada pelo `db.create_all()`** — só tabela nova é;
  coluna exige migração explicita;
- **Timestamps são naive** no banco — comparar com `utcnow()` aware
  explode; usar `.replace(tzinfo=None)` (ver `AdminInvite.now_naive`).

## Comandos

```powershell
# Alembic (quando usado)
cd portal-backend
venv\Scripts\python.exe -m flask --app src.main db upgrade

# Gerar versão nova (autogenerate) — revisar SEMPRE o SQL gerado
venv\Scripts\python.exe -m flask --app src.main db migrate -m "descricao"
```

## Por que não "só Alembic"

O sistema já nasceu com migrações inline idempotentes que rodam em todo
boot (data-fix inclusos). Trocar para Alembic puro mudaria o comportamento
de produção sem ganho real — a abordagem híbrida mantém o runtime seguro e
o histórico versionado.
