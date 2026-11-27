# TODO - muv.log - Controle de Entregadores

## ✅ Fase 1: Analise e Planejamento (CONCLUIDA)
- [x] Criar documento de requisitos
- [x] Definir tecnologias (Flask + React + PostgreSQL)
- [x] Esboçar arquitetura do sistema
- [x] Identificar modulos e interacoes

## ✅ Fase 2: Design e Referencias (CONCLUIDA)
- [x] Pesquisar tendencias de design
- [x] Definir paleta de cores
- [x] Criar documento de design visual
- [x] Analisar 24 prints da plataforma Entregas Expressas

## ✅ Fase 3: Banco de Dados e Arquitetura (CONCLUIDA)
- [x] Modelar banco de dados (10+ models)
- [x] Definir entidades e relacionamentos
- [x] Configurar SQLAlchemy + Flask-JWT

## ✅ Fase 4: Backend Flask (CONCLUIDA)
- [x] Estrutura base Flask
- [x] Sistema de autenticacao JWT
- [x] APIs de usuarios e entregadores
- [x] APIs de pedidos e entregas
- [x] APIs de localizacao e tracking
- [x] Sistema de notificacoes
- [x] APIs de pagamentos e relatorios
- [x] CORS e seguranca
- [x] Sistema de bonus e ranking

## ✅ Fase 5: Frontend React (CONCLUIDA)
- [x] Estrutura base React + Vite + Tailwind
- [x] Login/Cadastro split-screen (multi-step)
- [x] Dashboard entregador com stats
- [x] Pedidos disponiveis com sirene
- [x] Entrega em andamento com steps
- [x] Historico e ganhos
- [x] Ranking e conquistas
- [x] Portal do estabelecimento
- [x] Painel administrativo completo
- [x] Mapa de rota do entregador
- [x] Perfil do entregador e estabelecimento

## ✅ Fase 6: Integracoes e Testes (CONCLUIDA)
- [x] Backend Flask rodando
- [x] Frontend React comunicando com backend
- [x] Fluxo completo de login
- [x] Dashboard e carregamento de dados
- [x] Responsividade mobile

## ✅ Fase 7: Deploy (CONCLUIDA)
- [x] Frontend no Vercel (portal-entregador-gamma.vercel.app)
- [x] Backend no Google Cloud Run (muvlog-api-890250693883.us-central1.run.app)
- [x] Banco PostgreSQL (Supabase)
- [x] CORS configurado
- [x] Variaveis de ambiente

## ✅ Fase 8: Features Avancadas (CONCLUIDA)
- [x] Cancelamento de pedido
- [x] Relatorios expandidos (8 tipos)
- [x] Configuracoes expandidas (8 modulos)
- [x] Multi-praca
- [x] Atribuicao inteligente (entregador mais proximo)
- [x] Limite de pedidos simultaneos (max_concurrent_orders)
- [x] Aceite e recusa de pedidos
- [x] Timeout configuravel + notificacao ao admin
- [x] Prova de entrega (foto com upload para Supabase Storage)
- [x] Avaliacao do entregador (1-5 estrelas)
- [x] Gamificacao (ranking + conquistas - MuvScore)
- [x] Cadastro pelo admin (estabelecimentos + entregadores)
- [x] Financeiro do admin (comissao configuravel)
- [x] Financeiro do estabelecimento
- [x] Faturas com QR Code PIX
- [x] Sirene + Notificacoes do navegador

## ✅ Fase 9: Documentacao (CONCLUIDA)
- [x] Roteiro completo de testes
- [x] Fluxograma do projeto
- [x] TODO atualizado

## ✅ Fase 10: Melhorias UX (CONCLUIDA)
- [x] Footer com links funcionais (Suporte, Termos, Privacidade)
- [x] Paginas de Suporte, Termos e Privacidade
- [x] Botao de geolocalizacao no cadastro de estabelecimentos

## ✅ Fase 11: Sistema de Bonificacao (CONCLUIDA)
- [x] Modelo de dados (DriverScore, DriverBonus, DriverAchievement, DynamicPricing)
- [x] API de ranking e bonus
- [x] Pagina de ranking no frontend
- [x] Niveis do entregador (Bronze, Prata, Ouro, Diamante)
- [x] Bonus semanal e mensal

## ✅ Fase 12: Entregadores Proprios (CONCLUIDA)
- [x] Modelo EstablishmentDriver
- [x] Rotas admin CRUD para entregadores proprios
- [x] Interface /client/drivers com menu "Meus Entregadores"
- [x] Distribuicao hibrida + botao "Chamar Plataforma"
- [x] Controle financeiro (pagamentos, gastos, comparativo)
- [x] Fluxo completo (distribuicao, timeline, confirmacao, prova)
- [x] Avaliacao e relatorios

## ✅ Fase 13: Auditoria e Correcoes (2026-09-12) (CONCLUIDA)
### Auditoria completa do sistema (89 itens encontrados)
- **12 criticos** — TODOS CORRIGIDOS
- **22 altos** — TODOS CORRIGIDOS
- **30 medios** — CORRIGIDOS (6 de maior impacto)
- **15 baixos** — Dívida técnica (não afeta funcionamento)

### Correcoes críticas
- [x] Verificacao de tenant inativo em login, admin e pedidos
- [x] Status de usuario (suspenso/inativo) verificado em rotas criticas
- [x] customer.restaurant_id inexistente na edicao de pedido
- [x] formatDate/formatTime crashavam com data nula
- [x] Estorno de locked_balance ao cancelar pedido
- [x] Flag isRedirecting nunca era resetada
- [x] Login busca email filtrando por tenant
- [x] restaurant_ids nao definido no financeiro (NameError)
- [x] EstablishmentDriver nao tem user_id

### Correcoes altas
- [x] Token de confirmacao de email com segredo previsivel
- [x] Aceite via WhatsApp sem filtro de tenant
- [x] Dashboard global usava texto em vez de enum
- [x] Admin sem tenant via todos os dados (agora so super admin)
- [x] Cliente de outro tenant podia ser usado
- [x] Credenciais de teste visiveis em producao
- [x] XSS em popups do Leaflet (3 arquivos)
- [x] Entregador sem tenant via pedidos de todos
- [x] Nearby drivers sem filtro de tenant
- [x] "Esqueci minha senha" sem funcionalidade

### Correcoes medias
- [x] Registro usava fetch direto (agora usa axios)
- [x] XSS no popup do mapa do entregador
- [x] Praça do localStorage validada contra backend
- [x] except generico substituido por captura especifica
- [x] markAllAsRead usava Promise.all (agora allSettled)
- [x] Nav desktop overflow horizontal

### Melhorias e funcionalidades (2026-09-12)
- [x] Sidebar admin colapsavel em mobile
- [x] AbortController para thundering herd no dashboard
- [x] min_driver_rating filtra entregadores com nota baixa
- [x] Estorno de locked_balance credita no balance
- [x] datetime.utcnow() substituido por datetime.now(timezone.utc) em 167 ocorrencias
- [x] RATING_POINTS e LEVELS configuraveis via SystemConfig
- [x] Rota para converter entregador proprio de volta para plataforma
- [x] main.py unificado (faltavam route_bp e finance_bp)
- [x] Exportacao CSV de pedidos e entregadores
- [x] Webhook de teste protegido por auth
- [x] Prova de entrega com path traversal protection
- [x] Opcao de Waze na navegacao mobile
- [x] Ganhos estimados retornados pelo backend com % configuravel
- [x] useMemo em filteredOrders do HistoryPage
- [x] alert() nativo substituido por showToast
- [x] PWA configurado (manifest.json + service worker)
- [x] README.md criado

## ✅ Itens Resolvidos (19/09/2026)
- [x] Icones PWA criados a partir do logo
- [x] Importacao de pedidos em lote via CSV
- [x] Exportacao CSV de pedidos e entregadores
- [x] PWA instalavel (celular + desktop)
- [x] Sistema offline com IndexedDB
- [x] Integracao offline nos botoes de aceitar/coletar/entregar
- [x] Icone do entregador trocado para Bike
- [x] Fluxograma atualizado com novas funcionalidades
- [x] JWT expira em 4h (antes 24h)
- [x] Rate limiting (5/min no login, 300/min global)
- [x] 2FA para admins (TOTP via Google Authenticator)
- [x] White-label - logo e nome do tenant nas layouts
- [x] Botao WhatsApp para falar com entregador
- [x] Tarifa fixa como alternativa ao preco por km
- [x] Taxas dinamicas (chuva, demanda, feriado) no frete
- [x] Race condition no saque corrigida (query atomica)
- [x] Bug datetime em muvscore.py corrigido
- [x] timezone import em 11 route files
- [x] func import em platform.py
- [x] Email stub criado (src/services/email.py)
- [x] Manual PDF v2.0 gerado
- [x] Push notifications Firebase (FCM completo - frontend, backend, service worker, VAPID key, FIREBASE_SERVER_KEY)
- [x] Soft delete para protecao contra exclusoes acidentais (campo deleted_at)
- [x] TrashModal frontend - lixeira integrada em paginas de usuarios (AdminUsersPage, PlatformDashboardPage)
- [x] Deploy backend migrado para Cloud Run (muvlog-api-890250693883.us-central1.run.app)
- [x] Merge PR #16 de Éverton (feature/testes-app) - conflito em rate_limit.py resolvido
- [x] Fix edicao de admin - handleEditUser nao definido no AdminsTab
- [x] Fix edicao de admin abre modal correto e senha nao e obrigatoria
- [x] Validacao de email em tempo real no cadastro
- [x] Push notification Firebase para aprovacao/rejeicao de cadastro
- [x] PendingApprovalPage com escuta de notificacao em tempo real

## ✅ 2026-11 — Consolidacao, Monetizacao e Acesso do Entregador (CONCLUIDA)
- [x] Validacao de CNPJ/senha em tempo real + aprovacao de admin pelo super admin
- [x] Portao central de status de conta (INACTIVE/SUSPENDED bloqueia mesmo com JWT valido)
- [x] Exclusao permanente de usuario FK-safe (preserva dados compartilhados do tenant)
- [x] Consolidacao de precos: valores vivem so em PricingTable (Fases 1 e 2) + faixas de km sem volta + frete gratis
- [x] Plano de monetizacao A-F: auto-criacao praca/tabela, Meus Precos, menus de pagamentos, assinatura 3 termos, cobranca MUV-admin, guias Primeiros Passos
- [x] Distancia manual no frete (rede de seguranca) + geocodificacao no navegador
- [x] **Enviar Acesso ao entregador proprio** — modal com link do app + telefone (login) + PIN, WhatsApp/copia, selo "Sem PIN — acesso bloqueado", modal auto-abre apos cadastrar

## ✅ 2026-11-18 — Lotes autonomos (hardening + backlog EE + G-08) (CONCLUIDA)
- [x] Lote 1: PII mascarada em logs · upload de prova com limite 5MB · CORS em /uploads · remove models/user.py legado · caminho unico do banco documentado
- [x] Lote 2: CORS fonte unica · health check com dependencia de banco · deep link do app Google Maps · 7 indices + 4 listas admin sem N+1
- [x] Backlog EE 7.2: Registro de Atividades · Link de Pedido Rapido · Nomenclaturas padronizadas (GLOSSARIO.md)
- [x] G-08: evitamento com punicao silenciosa + regra da reciprocidade + controle do admin (revogavel) + selo de qualidade
- [x] G-04: pools de bonus configuraveis (SystemConfig) + campos em Configuracoes
- [x] F-23: CI real dos subprojetos (.github/workflows/ci.yml)
- [x] Revisao RLS documentada (docs/REVISAO_RLS.md) — RLS off e correto p/ backend unico
- [x] Backup/restore testado (5/5, contra copia descartavel) + docs/BACKUP_RESTORE.md
- [x] Estrategia de migracoes documentada (docs/MIGRACOES.md) + Alembic 0003 em dia
## ✅ 2026-11-20 — Motor de cobrança por componentes (CONCLUIDA)
- [x] Cobrança MUV→admin configuravel por contrato: total = FIXO + R$/estab x contagem(modo,N) + R$/pedido x max(0, pedidos - cota) — modos SNAPSHOT (legado), USO (>=N pedidos no ciclo), PRO_RATA_USO (dias com pedido); corrige contagem instantanea e periodo ignorado
- [x] Assinatura editavel (PUT) + Simular fatura (preview) + snapshot do calculo na fatura (auditoria) + UI de componentes na aba Cobrança do Painel da Plataforma
- [x] Smoke 6/6 (_tmp_smoke_billing_components.py) + UI test PASS (aba Cobrança + form de componentes)
- [x] Docs no mesmo commit: PLAN_MONETIZACAO 5.2, fluxograma (grupo Cobranca da Plataforma), este todo

## ✅ 2026-11-22 — Escalonamento por faixas no componente de pedidos (CONCLUIDA)
- [x] Faixas MARGINAIS (conta de luz) no componente de pedido: cada faixa cobra so os pedidos que entram nela — ex. 200 inclusos (R$0) -> 500 a R$0,80 -> 1.000 a R$0,70 -> infinito a R$0,60. Quem cresce paga mais no total com pedido mais barato; mes fraco = fatura menor
- [x] order_price_tiers (JSON validado) + calcular_faixas_pedidos (funcao pura) + snapshot por faixa na fatura; contratos legados (cota+preco) convertidos em 2 faixas automaticamente
- [x] UI: editor de faixas na aba Cobrança + Simular com quebra por faixa; smoke 8/8 (matematica marginal = tabela do plano); docs no mesmo commit

## ✅ 2026-11-24 — Reenviar pedido cancelado (CONCLUIDA)
- [x] POST /api/orders/:id/relaunch — SOMENTE admin/super admin (papel admin da maquina de estados; estabelecimento recebe 403). Pedido cancelado volta a PENDING limpando atribuicao (plataforma/proprios), tempos, ofertas/rejeicoes antigas + reoferece ao entregador mais proximo + Registro de Atividades + notificacoes
- [x] Botao "Reenviar Pedido" so no painel admin (OrderDetail/StatusActions) — portal do estabelecimento nao ganha nada; trava explicita "so cancelados" (maquina trata mesmo status como no-op)
- [x] Smoke 5/5 (_tmp_smoke_relaunch.py): admin 200 + limpeza / nao-cancelado 400 / estabelecimento 403 / re-relançar 200

## ✅ 2026-11-24 — Distribuição configurável + corredor angular (CONCLUIDA)
- [x] Distribuicao de pedidos a proprios CONFIGURAVEL por estabelecimento (padrao MANUAL = comportamento antigo): modo AUTO = corredor angular — oferta ao entregador cuja rota segue o rumo do pedido (bearing do estabelecimento, janela ±45 graus padrao), com limite de pedidos por rota (3) e raio de seguranca (10km, 0=off) — TUDO configuravel no perfil do estabelecimento
- [x] Prioridade: rotas compativeis (menor angulo) antes de livres; fallback fila + distribuicao manual; override manual sempre disponivel (modal mostra carga n/limite + confirma ao estourar) — "reducao temporaria do limite" = nao adicionar mais (decisao de nao criar 3 niveis de limite, ver memoria)
- [x] Log de distribuicao por oferta (M4 — angulo/distancia/carga/motivo em Order.distribution_log); relançamento respeita a politica (AUTO→oferta, MANUAL→fila); plataforma intocada
- [x] Smoke 7/7 (_tmp_smoke_distribution.py): bearing/wrap/config/corredor/cap/raio/log
- [x] COPILOTO DE ROTEIRO (2026-11-24, A+B pedido do Mauro): avisos no modal de distribuicao (nunca bloqueiam) — fora do corredor (angulo), no teto, fora do raio, colega livre com sobrecarga, pedido parado >10min; avaliar_atribuicao reusa a geometria do motor; avisos ignorados na atribuicao manual vao para o distribution_log (auditoria "quem foi avisado do quê"). FUTURO: painel de saude da distribuicao (opcao C)
- [x] REORGANIZACAO DE ROTA R1-R3 (2026-11-24, pedido do Mauro): mover pedidos entre entregadores proprios ANTES e DEPOIS do aceite ("apesar do aceite"), pelo estabelecimento, com confirmacao explicita + estouro do limite permitido (decisao do estab). Move = RE-OFERTA (novo aceita no app; 1 linha para virar aceite direto se ele preferir); PICKED_UP+ bloqueado; log M4 registra movido de/para. Secao "Trocar Entregador" agora cobre OFFERED + mostra carga n/limite. FIX LATENTE achado no caminho: accept_order nao criava o Delivery (so ganhos) — todo o fluxo oferta→aceite ficava sem registro de entrega (corrigido). Smoke 7/7 (_tmp_smoke_reassign.py)
- [x] ACERTO DE RETORNO A1-A4 (2026-11-24, aprovado com maquininha CONFIGURAVEL): entrega com pagamento no local gera pendencia (CASH/CARD/PIX, valor=total do pedido) — entregador com pendencia NAO recebe ofertas (trava no motor + copiloto avisa); maquininha por TURNO ou por ENTREGA (config no perfil — variavel conforme maquinas x entregadores); comprovante PIX por foto (reusa upload); estabelecimento confirma em "Meus Entregadores" => libera. Avisos: "Cobrar R$ X no local" na tela da entrega ativa + banner de pendencias no app do entregador (com botao enviar comprovante). Smoke 8/8 (_tmp_smoke_settlement.py: trava/copiloto/modos/liberacao/PIX)
- [x] R4 — MAPA DOS PEDIDOS (2026-11-24, "logo em seguida"): painel recolhivel "Mapa dos pedidos" na lista do estab. — pins numerados (ultimos digitos, SEM endereco), cor por entregador (cinza = sem), tooltip "#1234 · nome", clique abre o detalhe, legenda de cores, auto-zoom. OrdersMiniMap.jsx autocontido; coords ja vinham na lista (zero backend). Prova visual OK (13 pedidos, 3 cores na legenda)
- [ ] OFERTA AUTOMATICA: RAIO AVISA + RETENTATIVA + SINALIZACAO (2026-11-24, A+B+avisos do Mauro): raio nao bloqueia mais oferta (so registra aviso), retentativa ciclica para PENDING sem oferta (resgatou pilha real — #75/#76/#79 oferecidos), status OFFERED ganhou rotulo "Aguardando aceite" (mostrava "Pendente"), app do proprio ganhou beep+vibracao+banner de ofertas + botoes Aceitar/Recusar nos cards (antes so existiam no backend). Pendente futuro: push FCM para proprios (nao tem user_id — infra atual e por usuario)
- [x] ACESSO AO LOGIN DO PROPRIO NO APP (2026-11-24, relato do Mauro: PWA instalado so caia no login de plataforma): link cruzado nos dois logins ("Sou entregador proprio — telefone+PIN" na tela de plataforma; "Entrar como estabelecimento/plataforma" na do proprio) + aviso do modo de distribuicao no modal (LIGADA/DESLIGADA + onde configurar) — a config era dificil de achar
- [ ] ACHADO (nao mexido): update_profile (/api/user/profile) IGNORA silenciosamente name/address/phone do estabelecimento (apenas user/driver) — o form do perfil do cliente envia e e descartado (phone cai no user.phone!). Corrigir com cuidado do vinculo Customer.name <-> Restaurant.name (busca por nome!)

- [x] ROTA AUTOMATICA F1-F3 (2026-11-24, aprovado "ativa direto"): 2+ pedidos no entregador => rota ATIVA calculada (paradas ordenadas: em andamento primeiro, depois vizinho mais proximo) — nasce e se REFZ completa a cada mudanca (rebuild). F1a: mover pedido NAO apaga mais a rota (bug autoflush "<=1" apagava rota inteira de 2 paradas); F1b: OFFERED aparece na lista de pedidos para rota; F2: chamada em aceite/recusa/movimentacao/oferta/relancamento. Adendo do Mauro: botao "Abrir rota completa no Google Maps" no card da rota (origem=1a parada, destino=ultima, intermediarias=waypoints — mais etapas que o Waze). Smoke 6/6 (_tmp_smoke_autoroute.py)

## ✅ 2026-11-24 — Numeração dos pedidos N1-N4 (CONCLUIDA)
- [x] N1: sequencial curto #37 por estabelecimento (Order.seq_number/seq_date) — linguagem do dia a dia; numero completo do sistema (PED...) continua nos detalhes
- [x] N2: reset CONFIGURAVEL por estabelecimento (Restaurant.seq_reset_mode): DAILY zera todo dia (padrao) x CONTINUOUS nunca zera — config no perfil do estabelecimento ("Numeracao dos pedidos")
- [x] N3: embalagem 1,2,3 por rota na ordem do mapa (reusa OwnDriverStop.stop_order) — badge "Embalagem N" no StopItem + "Embalagem N" na tela de entrega do proprio
- [x] N4: exibicao sem poluir — pins do mapa e cards = #seq; visao de rota = embalagem; detalhe = seq + data. package_number no to_dict do Order (via 1a parada da rota)
- [x] Migrações nos 2 entries (main.py + migrations_tables.py); config em user.py profile + admin_establishments.py; smoke 4/4 (_tmp_smoke_seq.py: incremento / zera diario / continua / embalagens)

- [x] ACHADO E CORRIGIDO (2026-11-24, pego pelo teste de UI do F1): GET /api/admin/establishments dava 500 "name '_func' is not defined" — bloco G-08 (media de notas do entregador) copiado sem o import `from sqlalchemy import func as _func` (licao 44). Bug PRE-EXISTENTE, estava em producao. Corrigido com o import no topo do arquivo.

## ✅ 2026-11-24 — F1 Frota Compartilhada (CONCLUIDA)
- [x] Modelo loja<->entregador N:N: EstablishmentDriverStore (vinculo puro: driver, loja, active, UNIQUE par) + flag por loja Restaurant.fleet_sharing_enabled (produto vendido pela plataforma — "uma loja paga uma loja"; v1 controle manual, v2 componente de cobranca). Loja BASE = EstablishmentDriver.restaurant_id (fonte unica, sem is_base na tabela)
- [x] Endpoints: GET /establishment-drivers/fleet-stores (lojas com flag, so mesmo tenant) + GET/POST/DELETE /establishment-drivers/<id>/stores (vincular/desvincular soft active=False; so a loja base ou admin gerencia; as DUAS pontas precisam da flag; base nunca vira vinculo)
- [x] Telefone repetido vira oferta de vinculo: create devolve 409 + link_suggestion (nunca 2a pessoa com o mesmo telefone)
- [x] Exclusao de loja NUNCA apaga a pessoa que serve outra loja (trava 400 com aviso) — e a limpeza de filhos passou a rodar SEMPRE (antes so dentro de `if has_orders:` — loja sem pedidos estourava 500 no FK NOT NULL); vinculos soft-delete tambem sao apagados (nas 2 direcoes) antes de deletar pais
- [x] Gestao em "Meus Entregadores": bloco "Lojas atendidas (N)" por entregador (base + vinculos, add/remove) — so aparece se a loja tiver o produto (anti-poluicao); flag editavel no form admin (secao "Tipo de entrega" = Proprios) e visivel (so leitura) no perfil do estabelecimento
- [x] Smoke 13/13 (_tmp_smoke_fleet.py: vinculo/base-recusada/sem-flag/cross-tenant/lista/desvincular/reativar/telefone-409/trava-exclusao/liberacao) + UI test PASS (form admin mostra "Frota compartilhada (produto)") + fix _func no mesmo ciclo
- [x] Licoes 42-45 em LICOES_APRENDIDAS.md (servidor velho x PID/mtime, delete de pai x FK NOT NULL x soft-delete N:N, import local nao viaja no copy-paste, fixtures de Restaurant)

## ✅ 2026-11-24 — F2 Ofertas pela Frota (CONCLUIDA)
- [x] Candidatos de oferta = base SEMPRE + vinculo ativo (retrocompat sem backfill): helpers candidatos_da_loja / pertence_a_loja / _vinculados_da_loja em services/distribution.py (flag ligada nas DUAS pontas + mesmo tenant)
- [x] Motor de distribuicao (AUTO): selecao e sobrecarga com colega livre enxergam a frota; registro de distribuicao traz loja_origem
- [x] Atribuicao manual (assign-own) e rota (assign-driver): validam pertence_a_loja — base OU vinculo ativo; estranho = 403 com aviso claro
- [x] Copiloto: vinculo externo sinalizado ("entregador é da loja X — coleta na loja Y (loja de origem)") — avisa, nunca bloqueia; modal de distribuicao ja renderiza alerts genericos (sem mudanca de frontend)
- [x] Listas/mapa: Meus Entregadores + mapa de drivers mostram vinculados ativos (coleta na loja de origem)
- [x] Smoke 19/19 (_tmp_smoke_fleet_f2.py: candidatos/flag-off/pertence/selecao+loja_origem/copiloto/assign 200+403/retrocompat/rota 200+403/alert na lista) + licao 46 na limpeza (FK pedidos→rotas)

## ✅ 2026-11-24 — F3 Rota Multi-Loja Intercalada (CONCLUIDA)
- [x] Rota aceita pedidos de MULTIPLAS lojas (base = loja que cria a rota / base do entregador na auto-rota); entregador precisa atender TODAS as lojas (base OU vinculo ativo) em create/assign/add/move
- [x] Ordenacao INTERCALADA (services/auto_route.py): a cada passo a acao disponivel mais proxima = coleta de loja pendente OU entrega ja coletada — NUNCA "todas coletas antes/depois de todas entregas"; precedencia dura: entrega so depois da COLETA da propria loja; PICKED_UP primeiro (em andamento)
- [x] Paradas de coleta reais (stop_type=PICKUP, order_id NULL) so em rota multi-loja — rota de loja unica mantem o formato antigo (anti-poluicao); coleta orfa e removida no rebuild
- [x] Embalagem N · Loja X: stop_order = embalagem (contador so das entregas) + store_name na parada; stop_seq = ordem global (1..N com coletas); UI do app (StopItem) e do estabelecimento (RoutesList) exibem "Embalagem N · Loja X" e "Coleta — Loja X"
- [x] Google Maps waypoints: botao "Abrir rota completa" ja monta origin/waypoints/destination de todas as paradas — coletas entram como waypoints (navegacao sai da loja base)
- [x] Ganhos pela loja DO PEDIDO em rotas multi-loja (cada loja paga a sua config) — corrigido em assign-driver/add-orders
- [x] Smoke 17/17 (_tmp_smoke_f3_route.py: create multi-loja/intercalada/precedencia/embalagem/store_name/stop_seq/waypoints/assign 200+403/add-orders/loja-unica-sem-coleta/remove-limpa-coleta/auto-rota) + regressao: autoroute 6/6, reassign 7/7, fleet_f2 19/19

## ✅ 2026-11-25/26 — WhatsApp Canal de Pedidos (CONCLUIDA)
- [x] FASE 1: Fundação — WhatsAppCredential (15 configs) + WhatsAppMessage (log) + CRUD config + webhook handler multi-tenant (`e086c591`)
- [x] FASE 2: Notificações — 6 templates de status + hooks no ciclo de vida + quiet hours (`0af16b52`)
- [x] FASE 3: Pedido por catálogo — WhatsAppProduct + WhatsAppOrderSession + CRUD catálogo + fluxo pedido + Meta Catalog sync opcional (`c8499e84`)
- [x] FASE 4: Endereço + GPS — reverse geocoding (Nominatim) + geocoding + confirmação configurável + raio máximo (`d4d703ff`)
- [x] FASE 5: Pagamento + polimento — PIX/dinheiro/cartão + pedido rápido + avaliação estrelas (`e784557f`)
- [x] FASE 6: Bot de atendimento — menu interativo (7 itens) + FAQ (12 respostas) + transferir humano (`90988726`)
- [x] FASE 7: IA linguagem natural — OpenAI/Claude/Gemini multi-tenant + roteamento inteligente + limite mensal (`08949490`)
- [x] Sandbox testado: conexão ✅ envio ✅ fluxo pedido ✅ cardápio (5 produtos) ✅
- [x] TOTAL: 52 configurações (tudo configurável) — 8 modelos + 7 rotas principais
- [ ] PENDENTE: publicar app na Meta para webhook real + configurar IA (Gemini free tier)

## ✅ 2026-11-25 — Ciclo de Configurabilidade (CONCLUIDA)
- [x] FROTA F2 refinamentos: ganhos dos meus entregadores (base ve tudo, vinculada ve o que gerou) + deslocamento OSRM + UI vinculados sem gestao + fix metrics sem @jwt_required (`46e8232b`)
- [x] FORMULA UNICA ganho plataforma: `calcular_ganho_plataforma()` — 10 duplicacoes em 5 arquivos → 1 funcao; fix hardcoded 0.65 em order_lifecycle (`9f039896`)
- [x] PAGAMENTO PLATAFORMA CONFIGURAVEL: 7 modelos em PricingTable (igual proprios) via AdminPricingPage; retrocompat PERCENTAGE (`ea097dec`)
- [x] COBRANCA ADMIN→ESTAB: cota de pedidos + faixas marginais + modo de contagem (SNAPSHOT/USO/PRO_RATA) + preview/simular + UI edicao; fix to_dict (price_per_order, snapshot fixed_price) (`f12af69e`)
- [x] FAIXAS MARGINAIS no modal de assinatura (TiersEditor como conta de luz) + commission_rate REMOVIDO (§2) + faturas de assinatura no portal do estabelecimento (`150fc26a`)
- [x] PLATFORM_PRICING_TABLE_ID ativo: frete separado por modelo de entrega (proprio vs plataforma) + resolve_pricing_table(for_platform) (`416e0b52`)
- [x] platform_fee visivel no acerto semanal (margem plataforma) + orders_count na tabela de faturas (`673ef518`)
- [x] FRETE POR MODELO DE ENTREGA: toggle Proprio/Plataforma no calculo do frete + delivery_model no estimate_fee (`80c08b26`)
- [x] Tudo 0-0: branch-mauro = main = origin; www.muv.log.br + Cloud Run 00094-fkj

## ✅ 2026-11-27 — Roteirização: reanálise por evento + tempo de preparo (CONCLUIDA)
- [x] REANÁLISE POR EVENTO (pedido do Mauro): cada pedido que entra na fila (SCHEDULED→PENDING, relançamento, link rápido, WhatsApp) AGENDA uma análise — janela até rodar = `preparation_minutes` do estabelecimento (agrupa pedidos que entram juntos; bebidas × lancheria, por loja); deadline mais cedo vence quando entram vários pedidos
- [x] PISO CONFIGURÁVEL entre reanálises: `min_reroute_interval_min` (padrão 2 min, 1–60) em Config. Rotas (anti-thrash); ciclo periódico `auto_routing_interval_min` vira fallback para pedidos sem gatilho; loop do background tick de 30s com `agendamento_vencido`
- [x] TEMPO DE PREPARO: campo `preparation_minutes` já existia (cadastro + admin) — agora também editável no PERFIL do estabelecimento e usado na roteirização (estimate_delivery_time deixou de usar "+5 min fixo")
- [x] PARIDADE COM PRÓPRIOS (humano decide): proposta de rota automática continua PENDING até o entregador aceitar + NÃOVA notificação ao ESTABELECIMENTO ("Proposta de rota automática — aguardando aceite"); alterações de rota seguem só por ação manual
- [x] Confirmação técnica: auto-routing da plataforma JÁ agrupa pedidos de várias lojas e a ordenação considera coletas de outros ESTs com precedência (entrega só depois da própria coleta) — criação manual multi-loja já suportada em /api/platform-routes/create
- [x] Smoke 8/8 (_tmp_smoke_reroute.py: janela do preparo 7min/3min, deadline mais cedo vence, piso, deadline vencido, fallback periódico, consumo do gatilho, PUT do piso) + backend compila + build ✅

## ✅ 2026-11-26 — Numeração dos pedidos estendida à plataforma (CONCLUIDA)
- [x] DIAGNÓSTICO (relato do Mauro em testes): o ciclo N1–N4 (24/11) tinha ficado preso às entregas PRÓPRIAS — nº longo `PED...` continuava no app do entregador da plataforma, admin, dashboard do estab., modais de detalhe e páginas públicas; "Embalagem N" não existia nas rotas da plataforma
- [x] GERAÇÃO do #seq: helper único `atribuir_numero_curto()` (services/order_helpers.py) — create_order + Link Rápido + WhatsApp (2 fluxos) + importação CSV (coluna opcional "estabelecimento" também passa a preencher restaurant_id); pedido sem loja não ganha #seq (numeração é por estabelecimento)
- [x] EMBALAGEM NA PLATAFORMA: `PlatformDriverStop.stop_seq` (ordem global) + `stop_order` = embalagem (NULL em coleta) — mesma semântica do F3; migração nos 2 entries com conversão de dado antigo; renumber automático em remove/move-order; `package_number` no to_dict do pedido (rota própria OU plataforma)
- [x] EXIBIÇÃO (42 telas): `#seq ?? order_number` em cards/listas/pins/popups; detalhe = #seq + "Nº sistema" pequeno cinza; badges "📦 Embalagem N" / "Coleta" nas rotas da plataforma (app + admin); busca também casa #seq
- [x] Verificação: smoke 9/9 (`_tmp_smoke_seq2.py`: link→#seq · stop_seq 1..N · coleta sem embalagem · embalagem 1..2 · package_number · renumber após remove) + regressão (create_order numera · embalagem próprios 1/2) + backend compila + frontend build ✅

## ⚠️ PENDÊNCIAS MANUAIS — ANTES DE PRODUÇÃO (2026-11-26)
> **NÃO colocar em produção sem resolver.** Detalhes em MEMORY-auditoria-seguranca-2026-11.md
- [ ] **1. ROTACIONAR CHAVES** (SECRET_KEY, JWT_SECRET_KEY, Google Maps, Supabase) — Cloud Run env vars. Risco: JWT forgery
- [ ] **2. PURGAR GIT HISTORY** (.env + backup_supabase) — BFG Repo-Cleaner. Risco: senhas recuperáveis
- [ ] **3. FLASK_ENV=production** no Cloud Run. Risco: CORS wildcard
- [ ] **4. WHATSAPP_APP_SECRET** no Cloud Run. Risco: webhook aceita falso
- [ ] **5. Supabase RLS** — verificar tabelas sem Row Level Security. Risco: banco aberto
- [ ] INTEGRACAO WHATSAPP COMO CANAL DE PEDIDOS (2026-11-25, analise registrada): WhatsApp Business API (Meta) como canal de pedidos de cada EST — catalogo de produtos + localizacao GPS; MuvLog processa pedidos e gerencia entrega. 7 componentes: multi-credential, webhook handler, catalogo, parser pedido, criacao Order, notificacoes status, dashboard. Comparativo vs iFood: sem comissao, autonomia total, dados do cliente sao do EST. Chance de sucesso ALTA. Documento: docs/ANALISE_WHATSAPP_CANAL_PEDIDOS.md. NAO implementar ainda — Mauro vai iniciar depois.
- [ ] INTEGRACAO IFOOD MULTI-TENANT (2026-11-25, analise registrada): integracao e dos ESTABELECIMENTOS (merchant no iFood), NAO da plataforma. MuvLog = camada tecnologica (conecta iFood de cada loja ao sistema de entregas). 8 requisitos, 5 fases. Modelo recomendado: layer tecnico (cada EST entra com suas credenciais). Documento: docs/ANALISE_IFOOD_MULTI_TENANT.md. NAO implementar ainda.
- [ ] Integracao iFood - testar webhook com estabelecimento correto (Mauro: so quando o sistema estiver robusto)
- [ ] Integracao WhatsApp Business API (Mauro: so quando o sistema estiver robusto)
- [x] Alerta minimo de monitoramento (health/5xx) — Cloud Monitoring: uptime check + alerta 5xx + e-mail
- [x] Ledger financeiro imutavel (F-11) — financial_ledger com trigger de imutabilidade, Decimal, snapshot, idempotencia + tela Livro Financeiro
- [ ] Investigar busca AUTOMATICA do entregador proprio (relato do Mauro 2026-11-24: "temos algum problema na busca pelo entregador proprio de modo automatico" — ele ainda vai pesquisar; NAO mexer sem ele trazer detalhes)
- [x] Consolidar main.py x main_production.py (2026-11-24, lições 34/36): entry unico = src/main.py; main_production.py virou casca de compatibilidade (app + create_app p/ Alembic/Procfile/migrate_route_settings); Migrate(app,db) movido ao main.py. Fim da duplicidade que causou 2 incidentes (CORS, handlers JWT)
- [ ] Auditoria de configurabilidade das RELACOES OPERACIONAIS (pedido do Mauro 2026-11-20): todas as relacoes entre participantes (plataforma<->admin, admin<->estab, estab<->entregador, admin<->entregador, e as demais que a auditoria encontrar) — o que nao precisar de config sai marcado "nao necessario" com justificativa. Entregar docs/PLAN_CONFIGURABILIDADE.md p/ aprovacao dele. PRIMEIRO a cobranca (feito) — este e o proximo
- [ ] Extensao futura do motor de cobranca: modo PICO de ativos simultaneos (exigiria historico diario novo — nao necessario hoje)
- [ ] Enviar e-mails COMO `@muv.log.br` (remetente do dominio no Gmail) — "enviar como"/SMTP (futuro, decidido 2026-11-19: adiado). Opcoes mapeadas: Gmail "Enviar como" se aceitar sem SMTP (R$0) / Cloudflare Email Sending (Workers Paid US$5/mes, 3k e-mails, destrava email transacional do sistema) / Zoho (grátis = webmail sozinho; Lite pago = caixa real). Hoje: responder e-mails do Gmail responde do meslopes@gmail.com (ok com assinatura MuvLog)
- [ ] Renomeacao de termos configuravel por tenant (se Mauro quiser — glossario fixo hoje)
- [x] Restauracao de backup estendida (11 entidades) + fix do formato _meta/data que restaurava 0 registros
- [ ] Testes manuais do usuario nas novas telas (Registro de Atividades, Evitamentos, Link de Pedido Rapido)
- [x] E-mail proprio no dominio muv.log.br (2026-11-19): Cloudflare Email Routing ATIVO — contato@/suporte@/parcerias@/meslopes@ + catch-all encaminham para meslopes@gmail.com (MX/SPF/DKIM/DMARC live, destino verificado, teste real 2/2 prova individual). Caixa real (enviar COMO @muv.log.br) = fase futura se ele quiser
- [ ] Criar cofre Bitwarden e popular com as contas do mapa docs/CREDENCIAIS.md (decidido 2026-11-19)
- [x] Dominio muv.log.br FECHADO (2026-11-19): apex Verify passou + DNS-only (nuvem cinza) ligado nos registros A/AAAA — www.muv.log.br servindo o mesmo build do gamma (testes 7/7 em producao)

## 📊 Metricas do Projeto
- **Total de commits:** 1120+
- **Arquivos frontend:** 40+
- **Arquivos backend:** 20+
- **Endpoints API:** 60+
- **Tabelas banco:** 15+
