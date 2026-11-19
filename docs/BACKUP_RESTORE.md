# Backup e Restore — procedimento e limites (hardening, testado em 2026-11-18)

## O que existe hoje

| Peça | Onde | O que faz |
|---|---|---|
| **Backup** | `portal-backend/scripts/_tmp_backup_before_reset.py` (e botão "Baixar Backup" no DatabaseMapPage) | exporta as tabelas para JSON — **somente leitura** |
| **Restore** | `POST /api/admin/database-restore` (super admin) | recria **entidades centrais**: tenants, squares, users, restaurants |

### Cobertura do restore (2026-11-18 — estendido)

O restore cobre **11 entidades em ordem de FK**:
tenants → squares → pricing_tables → users → customers → restaurants →
addresses → drivers → establishment_drivers → orders → deliveries.

Ainda **fora**: payments, notifications, gamificação (MuvScore),
push_tokens, activity_logs — dados recriáveis/regeneráveis.

### Compatibilidade de formato (bug corrigido em 2026-11-18)

O backup grava `{"_meta":…, "data":{…}}`; o restore original lia chaves
no topo — ou seja, **restaurar um backup real sempre retornava
"concluída" com 0 registros**. O endpoint agora aceita os DOIS formatos
(embrulhado e direto).

O restore de usuários gera **senha aleatória** (segurança) — o usuário
precisa redefinir.

## Procedimento de backup (seguro, fazer sempre antes de mexer em dados)

```powershell
cd portal-backend
venv\Scripts\python.exe scripts\_tmp_backup_before_reset.py
# → gera backups/backup_supabase_<timestamp>.json
```

Ou pelo sistema: **DatabaseMapPage → Baixar Backup**.

## Procedimento de restore — REGRAS DE SEGURANÇA

1. **NUNCA restaurar sobre um banco com dados vivos.** O endpoint
   cria/atualiza por id/email — não é um "reset", é uma sobreposição.
2. Restauração de teste = banco **descartável** (SQLite local, banco de
   homologação). Nunca o de produção.
3. Exige **super admin** (regra no endpoint).
4. Depois do restore real: os usuários criados têm senha aleatória —
   comunicar os envolvidos.

```powershell
# Exemplo de restore (apenas em ambiente descartável!)
# curl -X POST .../api/admin/database-restore -H "Authorization: Bearer <token super admin>" -d @backup.json
```

## Teste executado (2026-11-18)

`scripts/_tmp_test_backup_restore.py` — 5/5 PASS:

1. Backup real gerado (somente leitura) — 11 entidades exportadas;
2. Restore em **SQLite descartável** via endpoint real;
3. Contagens conferidas (tenants/praças/restaurantes batem; users = backup + 1 do super admin do teste);
4. Scratch removido ao final.

**O banco de produção não foi tocado.**

## Recomendações

- Agendar backup periódico (o script é barato — rodar antes de cada
  migração grande);
- Se precisar de restauração COMPLETA (pedidos/pagamentos), estender o
  `database_restore` com as demais tabelas em ordem de FK — hoje não existe.
- Manter o teste `scripts/_tmp_test_backup_restore.py` como verificação
  de sanidade do caminho de restore.
