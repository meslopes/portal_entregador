# Prompt de Retomada — cole este texto na nova janela do MiMoCode

---

restore history — retomando o projeto muv.log (Portal Entregador). Você é o
mesmo assistente de sempre, com o MESMO estilo de trabalho da última sessão.
Siga exatamente esta rotina:

**1. LEITURA OBRIGATÓRIA antes de qualquer ação:**
- `docs/REGRAS_TRABALHO_EQUIPE.md` (regras da equipe — fonte de verdade)
- `MEMORY.md` completo (memória do projeto — contexto e decisões)
- `todo.md` (pendências atualizadas)
- `docs/CREDENCIAIS.md` (mapa de serviços/credenciais — sem senhas)
- `docs/LICOES_APRENDIDAS.md` (TODAS as armadilhas e aprendizados — obrigatório)
- `docs/fluxograma-sistema.html` (mapa dos fluxos/permissões — atualizado a cada feature)

**2. AMBIENTE SEMPRE ATIVO (regra 5):** suba o backend
(`start-backend.bat` → localhost:5000) e o frontend (`npm run dev` →
localhost:5173) e mantenha os terminais abertos. IMPORTANTE: após qualquer
mudança de backend, REINICIE o backend local antes de testar por HTTP
(o servidor não tem hot-reload — testes contra código velho enganam).

**3. ESTILO DE TRABALHO (o que funcionou muito bem — não mude):**
a) Diagnóstico ANTES de propor: investigar o código real, montar tabelas
   comparativas (o que existe / o que falta), citar arquivos:linhas.
b) Mostrar ANTES/DEPOIS da solução e AGUARDAR autorização do Mauro antes de
   implementar (exceto se ele der autorização ampla explícita — aí registre
   a autorização na memória e execute o fluxo completo).
c) Fluxo de entrega: implementar → testar (smoke de API via script Python em
   `portal-backend/scripts/_tmp_smoke_*.py` + teste de UI com playwright-cli)
   → checklist (build + compilação + diff + teste) → commit → push → deploy
   (Vercel SE frontend mudou; Cloud Run SE backend mudou) → VERIFICAR EM
   PRODUÇÃO (nunca só o build!) → merge em main → push. Regra: documentação
   (fluxograma, todo.md, README, memória) sobe NO MESMO COMMIT do código.
d) Deploy: `npx vercel --prod --yes --scope muvy` em portal-frontend +
   `npx vercel inspect portal-entregador-gamma.vercel.app --scope muvy`
   (confirmar apontamento); backend:
   `gcloud run deploy muvlog-api --source portal-backend --region us-central1 --project project-0799c4fd-82a2-49a0-b7d`.
   Health: `GET https://muvlog-api-890250693883.us-central1.run.app/api/health` = 200.
e) Depois de cada entrega: atualizar MEMORY.md imediatamente.
f) EXPLICAR OS TRANSTORNOS das escolhas do Mauro (ele pede os riscos/efeitos
   colaterais de cada decisão — valoriza análise crítica e "corrija-me se
   estiver errado"). Responder em português, com tabelas, direto ao ponto.

**4. AUTORIZAÇÕES:** fluxo normal — sugerir commit e AGUARDAR o Mauro
autorizar (o mandato autônomo venceu). Quando ele diz "mãos à obra"/"publica",
executar o fluxo de ponta a ponta.

**5. ESTADO ATUAL (2026-11-24, fim da sessão):**
- **⚠️ PONTO ONDE A SESSÃO FOI INTERROMPIDA (retomar exatamente daqui):**
  o Mauro acabou de dizer "Aprovado. Sim, minha loja é a base da rota.
  Publica o N1-N4 e inicia o F1" — ou seja: (1) PUBLICAR o N1–N4 pronto
  (commit → push → deploy → verificação → merge); (2) iniciar o F1 da FROTA
  COMPARTILHADA. Nada disso começou ainda — retomar sem perguntar de novo.
- TUDO publicado até o commit `9c97c260` (rota automática + fix mover-pedido
  + botão Google Maps). Git: branch-mauro = main = origin 0-0.
- **⚠️ N1–N4 (NUMERAÇÃO) IMPLEMENTADO E TESTADO (smoke 4/4) MAS AINDA NÃO
  COMMITADO** — working tree com os arquivos prontos: `orders.py`
  (seq_number/seq_date + package_number no to_dict + seq_reset_mode no
  Restaurant), `order_lifecycle.py` (contador na criação), `user.py` e
  `admin_establishments.py` (config seq_reset_mode), migrações nos 2 entries,
  exibição (`ClientOrdersList`, `OwnDriverOrdersPage`, `OwnDriverDeliveryPage`,
  `OrdersMiniMap`, `StopItem` badge "Embalagem N"), `ClientEstablishmentForm`
  + `ClientProfilePage` (config "Numeração dos pedidos"). Smoke:
  `scripts/_tmp_smoke_seq.py` 4/4 (incremento · zera diário · contínua ·
  embalagens). PRÓXIMO PASSO = commit + push + deploy + verificação.
- **Decisões do Mauro TRANCADAS (não renegociar):**
  · tenant ÚNICO com vários admins (já funciona no sistema) — controle
    individual por loja = ajuste FUTURO;
  · lojas no mesmo prédio tratam-se como DUAS LOJAS normais (modelo genérico
    loja/filial — sem caso especial);
  · acerto entre lojas = "acertar A pela B" configurável, com CONFIRMAÇÃO da
    loja ORIGEM + registro (quem autorizou, com quem, quando) + liberação da
    origem após confirmação documentada;
  · rota multi-loja INTERCALADA (geográfica, com precedência: entrega só
    depois da própria coleta) — NUNCA "todas as coletas e depois entregas"
    (o Mauro reprovou: rota longa, ninguém seguiria);
  · frota entre TENANTS diferentes = futuro; numeração: #seq por
    estabelecimento (zera diário DAILY=padrão ou CONTINUOUS — configurável).
- **APROVADO para começar: F1 — FROTA COMPARTILHADA** (entregador próprio
  serve N lojas). Plano aprovado: F1 modelo loja↔entregador + tela de gestão
  + flag de produto vendida pela plataforma (uma loja paga uma loja) →
  F2 ofertas pela frota (corredor angular com loja de origem no copiloto) →
  F3 rota multi-loja intercalada + "Embalagem N · Loja X" + Google Maps
  waypoints → F4 acerto por loja + transferência auditada → F5 smoke/docs/
  deploy. O caso do Mauro: loja dele como BASE da rota (sai da loja dele).

**6. DETALHES OPERACIONAIS desta sessão — JÁ REGISTRADOS NAS LIÇÕES 38–41
de `docs/LICOES_APRENDIDAS.md` (autoflush/Query, fixtures-FK, segredos por
servidor/env vars, gcloud-PS/esperas de UI). Resumo rápido abaixo:**
- Limpeza de fixtures de smoke (FK!): filhos antes dos pais —
  `own_driver_stops` → `deliveries`/`own_driver_earnings` → limpar
  `orders.own_driver_route_id` (UPDATE para None) → `own_driver_routes` →
  `orders` → `addresses` → `customers`/`establishment_drivers`. Resíduos de
  execões anteriores exigem filtro por `name LIKE 'SmokeX %'` (não só os ids).
- **autoflush do SQLAlchemy**: uma query depois de `session.delete()` já
  contém o delete aplicado — códigos de "contar o que resta" devem assumir
  isso (bug `remaining_stops <= 1` apagava rota inteira — corrigido p/ `== 0`).
- Funções utilitárias de consulta devem devolver QUERY (não `.all()`) —
  consumidores usam `.count()/.all()`; materializar na função quebra em silêncio.
- **`OWN_DRIVER_SECRET` difere entre local e produção** — smoke de fluxo
  do entregador próprio deve fazer LOGIN real (`register-pin` +
  `POST /api/own-driver/login`), nunca mintar token local com
  `create_own_driver_token` (falha em prod com 403/401).
- Variáveis de ambiente do bash NÃO persistem entre chamadas — setar
  `MUV_API`/`MUV_UI` no MESMO comando que usa (`$env:X = ...; script`).
- Playwright: o browser fecha entre turnos — reabrir com
  `Start-Process npx.cmd ... playwright-cli open <url> -WindowStyle Hidden`
  + `Start-Sleep 22` + `run-code --filename`. Asserções de UI devem esperar
  com `waitForFunction` (o body some durante carregamento).
- `gcloud logging read` no PowerShell: sem `~` (regex) nem filtros de
  timestamp/aspas — trazer JSON (`--format=json`) e filtrar no PowerShell;
  colchetes são curinga no `-like` (usar `.Contains()`).
- Smoke de fixtures: `Address` exige `customer_id`/`zip_code` (NÃO tem
  `number`); phones/nomes únicos por execução (usar pid); JWT precisa de
  `app_context` para `create_access_token`/`create_own_driver_token`.
- ACHADO ABERTO (todo.md): `update_profile` (`PUT /api/user/profile`)
  IGNORA em silêncio name/address/phone do estabelecimento (phone cai no
  user!) — corrigir com cuidado do vínculo Customer.name↔Restaurant.name
  (busca por nome!). Pendência conhecida: allowlist Firebase (403 do
  installations no console — ruído, não bug).

**7. ARMAIDILHAS CANÔNICAS:** `docs/LICOES_APRENDIDAS.md` (41 lições —
ler TODAS). Destaques: Python 3.11 no Cloud Run (sem aspas aninhadas em
f-strings); BOM do PowerShell em .py; reiniciar backend após mudanças;
build verde não prova funcionamento (testar a tela!); migrações em
`src/main.py` + `migrations_tables.py`; exportar modelos novos na fachada
`portal_models.py`; timestamps naive (`now_naive`); `git status` para
arquivos novos (git diff NÃO mostra); CORS nunca com lista vazia; entry real
da produção é `src.main` (main_production.py é casca de compatibilidade).

**8. PERGUNTE AO MAURO o que ele quiser priorizar e siga o fluxo acima.**

---
_Fim do prompt — o restante do contexto vive em MEMORY.md e REGRAS_TRABALHO_EQUIPE.md._
