# Lições Aprendidas — muv.log (documento canônico e cumulativo)

> **Mecanismo de retenção (não pule):** este documento é citado em
> `REGRAS_TRABALHO_EQUIPE.md` (regra 12) e no `PROMPT_NOVA_JANELA.md`.
> Toda sessão que começa lê as REGRAS → cai aqui → nenhuma lição se perde.
> **Nova lição?** Adicionar aqui na sessão em que foi aprendida (mesmo
> commit da correção, sempre).

---

## A. Infra e ferramentas (armadilhas que derrubam produção)

1. **Cloud Run roda Python 3.11** — aspas aninhadas em f-string
   (`f'...{x == 'y'}...'`) só existem desde o 3.12: compila no local
   (3.14) e **derruba o boot em produção** (503). Use `"` fora e `'` dentro.
2. **Escrever `.py` via PowerShell `Set-Content -Encoding UTF8` grava BOM** —
   BOM no meio do arquivo quebra o parse. Preferir scripts Python para
   editar `.py`; ou varrer BOM depois (`b'\xef\xbb\xbf'`).
3. **PowerShell come crase e `${}`** em strings duplas (quebra literais JS
   com template literals). Usar here-strings `@'...'@` para qualquer
   conteúdo com crase/interpolação.
4. **`String.Replace` casa substring parcial** — "resta" de "restaurante"
   deixou lixo na linha. Ancorar em LINHA INTEIRA (com comentário/contexto).
5. **`str.format` em templates com `{}`** (f-strings no texto) explode
   (`KeyError`). Usar `.replace('{indent}', ...)` literal.
6. **Inserir código via script precisa de indentação detectada da linha-alvo**
   — indentação fixa já partiu `try/except` (SyntaxError "expected except")
   e colou `return` na linha errada. E cuidado: inserir ANTES de um
   import multilinha (parênteses abertos) quebra o arquivo (logger dentro
   do `from x import (`).
7. **Guard `if arquivo notmatch "X"` é enganada** se "X" já aparece em
   outro lugar (ex.: o nome do ícone no JSX) — o import NÃO foi adicionado e
   o build passou. Verificar a LINHA DE IMPORT especificamente.

## B. Testes e verificação (não confiar no build)

8. **Build verde ≠ funcionando** — `Link2` sem import passou no `vite build`
   e derrubou todas as telas do cliente em produção (ErrorBoundary).
   SEMPRE exercitar a tela no navegador/produção depois da feature.
9. **Servidor local (python main.py) não tem hot-reload** — testes HTTP
   contra processo velho retornam 405/404/200 enganosos. REINICIAR o
   backend após qualquer mudança de backend (caiu 3x nesta sessão).
10. **Smoke via `test_client` (in-process) evita a armadilha 9** — ou
    reiniciar antes; os dois valem.
11. **Playwright `run-code`**: o arquivo é uma função `async (page) => {...}`
    SEM `;` final (o runner embrulha em expressão). Abrir browser com
    `Start-Process npx ... playwright-cli open ...` (o `open` direto
    trava o terminal). Testes que caem em timeout do `open` matam a sessão.
12. **Asserções de UI devem casar o texto REAL** — toast era "Preços
    atualizados" e o teste procurava "Preços salvos" (falso negativo);
    caixas de erro mostram a mensagem da validação, não "Erro ao salvar".
    Checar toast E caixa de erro E persistência (reload).
13. **Fixtures de Order exigem** customer + address + items +
    payment_method (NOT NULLs). `Driver` não tem `is_active` (é
    `is_blocked`). `Square` exige city/state. `Customer` exige phone.
14. **Limpeza de fixtures**: delete via ORM estoura em cascata/FK — usar
    SQL direto na ordem filhos → pais (orders → addresses → customers → …).
15. **Smoke de produção**: sempre testar com o ORIGEM correto (CORS por
    origem) — `Origin: https://www.muv.log.br` etc.

## C. Git e entrega

16. **`git diff` não lista arquivos NOVOS** — checar `git status` antes do
    commit (já esqueci `main_production.py` numa leva; commit extra corrigiu).
17. **Fluxo de deploy oficial** (REGRAS, procedimento): push → Vercel
    (`--scope muvy`) se frontend mudou → `vercel inspect` do gamma (ou do
    domínio oficial) confirmando apontamento → Cloud Run se backend mudou →
    health 200 → teste em produção → merge em `main` → push.
18. **Documentação sobe NO MESMO COMMIT do código** (regra do Mauro):
    fluxograma + todo.md + README + MEMORY.md.
19. **Vercel git integration está quebrado** (deploys git vão para o
    projeto errado e ficam Canceled) — deploy SEMPRE manual via CLI.

## D. Backend / dados

20. **Migração de coluna nova = `src/main.py` + `src/migrations_tables.py`**
    (+ versão Alembic) — `db.create_all()` só cria TABELAS, não colunas.
21. **Modelo novo = exportar na fachada `portal_models.py`** (import +
    `__all__`) — senão `ImportError` no boot.
22. **Timestamps do banco são naive** — comparar com datetime aware explode;
    usar `now_naive()` (`.replace(tzinfo=None)`) — padrão em
    `AdminInvite`/`EstablishmentDriver`.
23. **CORS vazio bloqueia tudo** — `CORS(origins=[])` nega qualquer origem
    (derrubou o login em produção). Origens nunca podem virar lista vazia;
    e não confiar em `app.config.get` de chave que o entry point não carrega.
24. **Dinheiro = Decimal** (`Numeric(12,2)`), nunca float — e ledger
    imutável usa trigger no banco bloqueando UPDATE/DELETE (correção =
    estorno).

## E. Domínios / infra externa

25. **DNS: `_vercel` exige o sublinhado** — gravar `vercel` cria
    `vercel.dominio` e a verificação nunca passa.
26. **Verificação Vercel pode falhar por cache negativo** — se o TXT foi
    criado depois da primeira consulta, aguardar/reatualizar o Verify.
27. **Cloudflare na frente do Vercel** ("Proxy detectado") impede as
    proteções do Vercel — decisão: DNS-only (nuvem cinza) nos registros
    A/AAAA apontando ao Vercel.
28. **Registro.br = registrar; Cloudflare = DNS** (NS delegados) —
    registros novos vão no Cloudflare, não no Registro.br.

## F. Segurança e credenciais

29. **Nunca digitar credencial em comando de automação** (filtro de
    segurança retém resposta) — credencial em arquivo script, não em CLI.
30. **Segredo do aplicativo** = Secret Manager do GCP / `.env` local
    (não commitado). **Login de painel** = Bitwarden (cofre muv.log) —
    mapa sem senhas em `docs/CREDENCIAIS.md`.
31. **Vazou = rotacionar** (histórico git antigo ainda tem chaves antigas).

32. **Cloudflare Email Routing só *encaminha* e-mail autenticado** — probe
    SMTP sintético (remetente spoofado) tem RCPT aceito mas morre em
    `5.7.26 Cannot forward emails that are not authenticated`; teste real
    só com envio de caixa autêntica (Gmail etc.). O wizard também cria
    DKIM (`cf2024-1._domainkey`) além de MX+SPF; destino precisa de
    verificação por link antes das regras funcionarem.

---

_Atualizado em 2026-11-19 — 32 lições. Próxima sessão: adicionar novas
lições aqui no mesmo commit da correção que as gerou._
