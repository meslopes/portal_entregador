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

## 📋 Pendencias Futuras
- [ ] Testes manuais completos
- [ ] Integracao iFood - testar webhook com estabelecimento correto
- [ ] Integracao WhatsApp Business API (depende de custos)
- [ ] Migrações versionadas (Alembic)
- [ ] Máquina de estados central para pedidos
- [ ] Ledger financeiro imutável
- [ ] Merge main no branch-mauro (sincronizar commit Cloud Run)

## 📊 Metricas do Projeto
- **Total de commits:** 100+
- **Arquivos frontend:** 40+
- **Arquivos backend:** 20+
- **Endpoints API:** 60+
- **Tabelas banco:** 15+
