# RELATÓRIO DE TESTES — Portal Entregador (MuvLog)
Data: 20/09/2026
Ambiente: Local (localhost:5000/5173)
Branch: branch-mauro

## SEÇÃO 1 — ACESSO E AUTENTICAÇÃO

### Login (Caminho Feliz)

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 1.1.1 | Login Super Admin | ✅ | POST /api/auth/login com email meslopes@gmail.com — retorna token JWT e user.is_super_admin=true |
| 1.1.2 | Login Admin tenant | ✅ | POST /api/auth/login com email emmanuelboeslopes@outlook.com — redireciona para /admin |
| 1.1.3 | Login Estabelecimento | ✅ | POST /api/auth/login com email agropet@canoas — redireciona para /client |
| 1.1.4 | Login Entregador Plataforma | ✅ | POST /api/auth/login com email entreg1@plataforma — redireciona para /dashboard |
| 1.1.5 | Login Entregador Próprio | ✅ | Página /own-driver/login carrega com campos Telefone + PIN |

### Login (Testes de Esforço)

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 1.2.1 | Senha errada | ✅ | POST com senha incorreta — retorna 401 "Credenciais inválidas" |
| 1.2.2 | Email inexistente | ✅ | POST com email fake — retorna 401 "Credenciais inválidas" |
| 1.2.3 | Campos vazios | ✅ | POST sem dados — retorna 400 "Campo 'email' é obrigatório" |
| 1.2.4 | Email sem @ | ✅ | POST com "test" como email — retorna 401 (não crasha) |
| 1.2.5 | SQL Injection | ✅ | POST com "' OR 1=1 --" — retorna 401 (não crasha) |
| 1.2.7 | Usuário pendente | ✅ | Login com conta INACTIVE — retorna 403 "pendente de aprovação" |
| 1.2.11 | Espaços no email | ✅ | POST com " email@test.com " — aceita normalmente |
| 1.2.12 | Acentos no email | ✅ | CORRIGIDO — hook before_request converte Latin-1→UTF-8 |

### Cadastro

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 1.3.1 | Cadastro Entregador | ✅ | POST /api/auth/register — cria com status INACTIVE, retorna access_token |
| 1.3.2 | Cadastro Estabelecimento | ✅ | POST /api/auth/register-client — CORRIGIDO, valida address como obrigatório |
| 1.4.1 | Email duplicado | ✅ | POST com email existente — retorna 400 "Email já cadastrado" |
| 1.4.2 | Senha curta | ✅ | POST com senha de 3 chars — retorna 400 "6 caracteres" |
| 1.4.3 | Campos vazios | ✅ | POST sem nome — retorna 400 "obrigatório" |

### Logout e Sessão

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 1.5.1 | Logout | ✅ | Clique em Sair — limpa token, redireciona para /login |
| 1.5.4 | Token inválido | ✅ | GET /api/user/profile com token inválido — retorna 422 |

---

## SEÇÃO 2 — SUPER ADMIN

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 2.1.1 | Dashboard carrega | ✅ | GET /api/platform/dashboard — retorna stats: 5 tenants, 35 users, 16 drivers, R.96 |
| 2.2 | Listar tenants | ✅ | GET /api/platform/tenants — retorna 6 tenants com dados completos |
| 2.3 | Listar admins | ✅ | GET /api/platform/admins — retorna 4 admins com empresas e pedidos |
| 2.4 | Listar praças | ✅ | GET /api/platform/squares — retorna 4 praças com pricing tables |

---

## SEÇÃO 3 — ADMIN DO TENANT

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 3.1.1 | Dashboard carrega | ✅ | GET /api/admin/dashboard — retorna orders_by_status, top_drivers |
| 3.1.3 | Mapa ao vivo | ✅ | Frontend /admin — mostra 7 entregadores e 3 estabelecimentos no mapa Leaflet |
| 3.2 | Listar estabelecimentos | ✅ | GET /api/admin/establishments — paginação OK, 6+ estabelecimentos |
| 3.3 | Listar entregadores | ✅ | GET /api/admin/drivers — 12 entregadores listados com veículos e status |
| 3.4 | Listar pedidos | ✅ | GET /api/admin/orders — 10 pedidos com filtros de período e status |
| 3.5 | Financeiro | ✅ | GET /api/admin/finance — retorna avg_order_value, daily_revenue |
| 3.6 | Configurações | ✅ | GET /api/admin/settings — retorna configurações completas do tenant |
| 3.6 (UI) | Página Configurações | ✅ | /admin/settings — abas Preços, Entregas, White-Label |
| - | Reports orders-by-date | ✅ | GET /api/admin/reports/orders-by-date — dados por data |
| - | Reports drivers-performance | ✅ | GET /api/admin/reports/drivers-performance — 15 drivers listados |
| - | Export pedidos CSV | ✅ | GET /api/admin/export/orders — CSV com cabeçalho correto |
| - | Export entregadores CSV | ✅ | GET /api/admin/export/drivers — 15 linhas |
| - | Driver-payments | ✅ | GET /api/admin/driver-payments — retorna pagamentos pendentes |
| - | Invoices | ✅ | GET /api/admin/invoices — endpoint funcional |
| - | Withdrawals | ✅ | GET /api/admin/withdrawals — endpoint funcional |

---

## SEÇÃO 4 — ESTABELECIMENTO

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 4.1.1 | Dashboard carrega | ✅ | /client — "Olá, agropet canoas", 0 pedidos hoje |
| 4.2.1 | Novo Pedido | ✅ | /client/new-order — formulário completo (Cliente, Endereço, Frete, Pagamento, Resumo) |
| 4.4.10 | XSS no nome | ✅ | Script tag em customer_name não é executado |

---

## SEÇÃO 5 — ENTREGADOR PLATAFORMA

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 5.1.1 | Dashboard carrega | ✅ | GET /api/driver/stats — rating, earnings, deliveries |
| 5.2 | Toggle online | ✅ | POST /api/driver/status — bloqueado para conta pendente (correto) |
| 5.3 | Pedidos disponíveis | ✅ | Popup "Novo Pedido Disponível!" aparece no frontend |
| 5.5 | Earnings | ✅ | GET /api/driver/earnings — paginação OK |
| 5.5.2 | Wallet | ✅ | GET /api/driver/wallet — balance=0, locked_balance=0 |
| 5.6 | Ranking | ✅ | GET /api/driver/ranking — 15 drivers, posição do entregador |
| 5.6.2 | Conquistas | ✅ | GET /api/driver/achievements — 5 badges retornadas |
| - | Delivery history | ✅ | GET /api/driver/delivery-history — endpoint funcional |

---

## SEÇÃO 6 — ENTREGADOR PRÓPRIO

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 6.1 | Login página | ✅ | /own-driver/login — campos Telefone + PIN funcionais |
| 6.1 (API) | Login API (tel não cadastrado) | ✅ | POST /api/own-driver/login — retorna 404 "não cadastrado como próprio" |

---

## SEÇÃO 7 — NOTIFICAÇÕES

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 7.3 | Sino de notificações | ✅ | Botão "Notificações (50 não lidas)" expande lista |
| 7.5 | Marcar todas como lidas | ✅ | Botão "Marcar todas como lidas" zera contagem |

---

## SEÇÃO 8 — RASTREAMENTO PÚBLICO

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 8.1 | Link de rastreio | ✅ | GET /api/orders/track/{token} — retorna status, timeline, restaurante |
| 8.3 | Token inválido | ✅ | GET /api/orders/track/token-invalido — retorna 404 "Pedido não encontrado" |

---

## SEÇÃO 9 — EXPORTAÇÃO

| # | Teste | Resultado | Comando/Verificação |
|---|---|---|---|
| 9.1 | Exportar pedidos CSV | ✅ | GET /api/admin/export/orders — CSV com cabeçalho: Numero,Status,Restaurante... |
| 9.2 | Exportar entregadores CSV | ✅ | GET /api/admin/export/drivers — 15 linhas, colunas corretas |

---

## ENDPOINTS AUXILIARES

| Endpoint | Resultado | Verificação |
|---|---|---|
| GET /api/health | ✅ | "Portal API is running" |
| GET /api/auth/check-email?email=existente | ✅ | {available: false} |
| GET /api/auth/check-email?email=novo | ✅ | {available: true} |
| GET /api/user/profile | ✅ | Dados completos do usuário |
| GET /api/user/notifications | ✅ | Lista de notificações + unread_count |

---

## BUGS CORRIGIDOS NESTA SESSÃO

| Bug | Arquivo | Correção |
|---|---|---|
| B-01: Email acentos causa 500 | main.py | Hook before_request converte Latin-1→UTF-8 + handler 400 |
| B-02: Cadastro sem address causa 500 | auth.py | Validação de address como obrigatório no register-client |

## COMMITS REALIZADOS

| Commit | Descrição |
|---|---|
| 7d4b0260 | fix: corrige crash com acentos no email e validacao de endereco |
| 4cc26a93 | feat: suporte iFood sandbox com geracao de pedidos de teste |
| c9dfd35c | feat: atualiza logo de muvy para muv.log |
| c469c404 | feat: prepara sistema para homologacao iFood |

## DEPENDÊNCIAS

- Backend: Flask + SQLAlchemy + Supabase PostgreSQL
- Frontend: React 19 + Vite + Tailwind v4
- Deploy Backend: Google Cloud Run
- Deploy Frontend: Vercel
