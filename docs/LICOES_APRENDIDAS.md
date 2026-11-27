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
    (`--scope muvy`) se frontend mudou → `vercel inspect` **do domínio
    oficial `www.muv.log.br`** confirmando apontamento (gamma = só debug;
    `vercel alias set` ABOLIDO desde 2026-11-14 — o alias fixo do gamma
    causava o bug "versão antiga") → Cloud Run se backend mudou →
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
33. **Filtro de segurança do provedor RETÉM a resposta quando a automação
    de navegador traz credencial no texto** (erro "high risk / response
    withheld"). Padrão validado: login via API por **script de arquivo**
    → token+user em `%TEMP%` → `playwright-cli run-code --filename`
    injeta via `page.evaluate` (user em base64; `AuthContext` exige token
    E user no localStorage; `open` recria o browser e perde o storage —
    navegar com `page.goto` dentro do run-code). Automação sempre em
    arquivo, nunca inline na conversa. Após bloqueio, "continue de onde
    parou" = recontar executado vs pendente ANTES de seguir (nunca
    assumir que a etapa rodou).

34. **Config/handler registrado só no entry secundário não vale em produção** —
    `main_production.py` NÃO era o entry real (Dockerfile roda `src.main:app`).
    2º incidente da classe (1º: CORS via `app.config`): os handlers JWT
    personalizados viviam só no secundário, e o Flask-JWT-Extended padrão
    devolve `msg` (não `error`) e **422** para token malformado — o frontend,
    que lê só `data.error`, mascarava tudo como erro de negócio ("Erro ao
    calcular frete", console limpo). Fix: loaders JWT 401/`error` no
    `src/main.py` + `api.js` trata 422 com `msg` de token como falha de auth.
35. **Variável fora de escopo dentro de `try/catch` vira erro SILENCIOSO** —
    `calculateFee` usava `orderItems` (local do `handleSubmit`) →
    ReferenceError engolida pelo catch → "Erro ao calcular frete" sem
    requisição sair (logs do Cloud Run SEM entrada = o erro é no JS antes do
    fetch) e console limpo. Diagnóstico: 0 requisições nos logs + fallback de
    mensagem = caçar escopo no JS. Ferramenta: `eslint` (`no-undef`) pega na
    hora; e SEMPRE exercitar a tela de verdade (lição 8 de novo) — build e
    testes de API não pegam erro de escopo de frontend.
36. **Consolidação entry único (2026-11-24):** `main_production.py` virou
    casca de compatibilidade (`from src.main import app` + `create_app`
    legado p/ Alembic/Procfile); `Migrate(app, db)` passou a viver no
    `main.py` (o `migrations/env.py` lê `extensions['migrate']`). Toda
    configuração nova nasce em `src/main.py` — nunca mais duplicar entry.

37. **Mapa Leaflet pinta por cima de modais** — os panes internos do Leaflet
    usam z-index 400–700 e, sem contexto de empilhamento no
    `.leaflet-container`, escapam por cima de QUALQUER camada (modal com
    z-index 100): tiles e o popup do entregador cobriam o modal do pedido.
    Fix único e global: `.leaflet-container { position: relative; z-index: 0 }`
    no `src/index.css` — cria o contexto de empilhamento e prende panes e
    popups dentro do mapa (vale para todos os mapas do app).

38. **autoflush do SQLAlchemy + funções de consulta que materializam** —
    query depois de `session.delete()` JÁ reflete o delete (o `remaining_stops
    <= 1` apagava a rota inteira ao tirar 1 pedido de rota com 2 — corrigido
    para `== 0`); e funções utilitárias devolvem QUERY (não `.all()`) — o
    consumidor escolhe `.count()/.all()`; materializar na função quebra em
    silêncio nos consumidores (`.count()` em lista vira TypeError engolido).
39. **Limpeza de fixtures de teste e ordem de FK** — filhos antes dos pais:
    `own_driver_stops` → `deliveries`/`own_driver_earnings` → UPDATE
    `orders.own_driver_route_id=NULL` → `own_driver_routes` → `orders` →
    `addresses` → `customers`/`establishment_drivers`. Resíduos de execuções
    anteriores (runs que abortaram) exigem filtro por `name LIKE` (não só ids
    da execução atual); fixtures com phone/nome único por execução (pid);
    `Address` exige `customer_id`/`zip_code` (não tem `number`).
40. **Segredos e ambiente são POR SERVIDOR** — `OWN_DRIVER_SECRET` difere
    entre local e produção: smoke do fluxo do entregador próprio deve fazer
    LOGIN real (`register-pin` + `POST /api/own-driver/login`) para o próprio
    servidor cunhar o token — mintar localmente falha em prod. E env vars do
    shell (ex.: `MUV_API`) NÃO persistem entre chamadas de bash: setar no
    MESMO comando que usa.
41. **`gcloud logging read` × PowerShell e esperas de UI** — sem `~` (regex),
    filtros de timestamp/aspas quebram no PS e `[ ]` são curinga no `-like`
    (usar `.Contains()`); trazer `--format=json` e filtrar no PowerShell.
    Em testes de UI, a página some durante o carregamento — asserções devem
    usar `waitForFunction`/`waitForSelector` em vez de `waitForTimeout` curto.

42. **"Servidor velho" disfarçado de bug de rota (caiu 2x no F1, 2026-11-24)**
    — após editar backend, o restart pode AINDA estar rodando o código
    antigo (edição feita depois do start, ou outro processo segurou a
    porta). Sintomas enganosos: 405 em rota que o mapa de rotas mostra
    registrada, 500 de FK que o `test_client` não reproduz. **Protocolo:**
    (a) comparar `LastWriteTime` do arquivo editado com o `StartTime` do
    processo que segura a porta (`Get-NetTCPConnection -LocalPort 5000`) —
    arquivo MAIS NOVO que o processo = servidor defasado, reiniciar e
    confirmar o NOVO pid; (b) para isolar código × servidor, reproduzir
    com `app.test_client()` in-process: test_client passa + HTTP falha ⇒
    servidor velho; os dois falham ⇒ bug real no código. Nunca "consertar"
    rota que o `url_map` já mostra certa.

43. **`db.session.delete(pai)` × FK NOT NULL nos filhos + soft-delete em N:N**
    — o SQLAlchemy emite `UPDATE filho SET fk=NULL` ao deletar o pai; se a
    coluna for NOT NULL ⇒ 500 NotNullViolation. Ex.: deletar `Restaurant`
    exige deletar `EstablishmentDriver` antes (o delete em cascata tenta
    anular `restaurant_id`). **Duas armadilhas no mesmo fix (F1):** (a) a
    limpeza de filhos estava DENTRO de `if has_orders:` — loja sem pedidos
    pulava a limpeza e estourava; limpeza de filhos roda SEMPRE, fora de
    condicionais; (b) vínculo N:N com desvincular = `active=False` (soft)
    continua existindo como linha — ao deletar os pais, apagar as linhas de
    vínculo nas DUAS direções (por driver E por loja), inclusive inativas,
    senão o delete do driver estoura o FK.

44. **Import local não viaja no copy-paste de bloco** — `from sqlalchemy
    import func as _func` existe como import LOCAL em alguns módulos; ao
    copiar o bloco de query para outro arquivo, o import não vem junto e o
    `NameError: name '_func' is not defined` só aparece em RUNTIME (build
    compila). Achado em `admin_establishments.py:139` (lista de
    estabelecimentos dava 500 — bloco G-08 copiado sem o import; pego pelo
    teste de UI, não pelo smoke de API). Padrão: ao copiar bloco com
    `_func`/`func`, levar o import ou usar o import no topo do arquivo.

45. **Fixtures de `Restaurant`** (complemento das lições 13/39) — NOT NULL
    sem default: `name`, `address`, `latitude`, `longitude`. Faltou
    `address` → NotNullViolation; corrigi, faltou `latitude` → de novo.
    Antes de criar fixture de tabela nova/estranha, listar os NOT NULLs
    reais: `for c in Model.__table__.columns: if not c.nullable and
    c.default is None and c.server_default is None: print(c.name)`.

46. **Ordem de FK em limpeza: pedidos antes de rotas** (complemento da lição
    43) — `orders.own_driver_route_id` referencia `own_driver_routes`;
    apagar a rota antes do pedido estoura `ForeignKeyViolation` mesmo com
    paradas/entregas/ganhos já removidos. Ordem completa de limpeza:
    paradas → entregas → ganhos → **PEDIDOS** → rotas → endereços → vínculos
    → entregadores → lojas. Achado no smoke do F2 (`_tmp_smoke_fleet_f2.py`
    e varredura `_tmp_sweep_fleet_f2.py`).

47. **Rota multi-loja: rebuild completo vence incremento** (F3) — manter
    paradas de coleta (PICKUP) por mutação incremental (add/remove/move)
    deixa coleta órfã quando sai o último pedido da loja. Padrão: qualquer
    mutação de rota refaz TODAS as paradas a partir dos pedidos
    (`reconstruir_paradas_rota`), preservando status de paradas concluídas
    por match (tipo, pedido/loja). Complemento: rota manual nasce SEM
    entregador — a limpeza de fixtures não pode filtrar rotas só por
    `establishment_driver_id` (varrer por `restaurant_id`/ids também).

48. **Smoke via HTTP × fixtures só com `flush`** — o servidor (processo
    separado) só enxerga dados COMMITADOS; `flush` libera ids só na sessão
    do script. Sintoma enganoso: 401 "token inválido" em endpoint que usa
    o usuário recém-criado (o JWT assina, mas o lookup do usuário no banco
    falha → loader JWT devolve 401). Regra: `db.session.commit()` das
    fixtures ANTES da primeira chamada HTTP. Complemento: fixture hardcoded
    por id (ex.: `Restaurant.query.get(75)`) apodrece com o tempo — smoke
    deve criar as próprias fixtures (com nome único por pid).

49. **Replace em massa × aspas de chaves** — a varredura `localStorage →
    sessionStorage` (proteção A, 2026-11-26) engoliu os NOMES das chaves em
    53 chamadas (`getItem('token')` → `getItem('')`): token, user JSON e
    token do próprio colidiram na chave vazia ("token cruzado" real).
    Sintoma sutil: fluxo funciona por acaso (grava e lê na mesma chave
    quebrada) até dois dados colidirem. Regras: (a) troca de storage se faz
    por ARQUIVO com mapa de chaves explícito, nunca replace global; (b)
    após qualquer sweep de storage, rodar varredura por `Item('')` (script
    `_tmp_scan_storage_keys.py`) e exigir ZERO. PWA com start_url fixo no
    manifest SEMPRE abre naquela tela — instalar de outra rota não muda
    nada (manifest separado por área é a solução).

---

_Atualizado em 2026-11-27 — 49 lições. Próxima sessão: adicionar novas
lições aqui no mesmo commit da correção que as gerou._
