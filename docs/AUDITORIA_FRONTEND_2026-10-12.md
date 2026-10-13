# Auditoria Completa do Frontend — Portal Entregador (MuvLog)
**Data:** 2026-10-12  
**Escopo:** 100% dos arquivos `portal-frontend/src` + `index.html` + `public/sw.js`  
**Analista:** Assistente sênior de segurança  
**Base:** Auditoria backend (2026-10-06) + auditoria frontend complementar  

---

## Resumo Executivo

| Severidade | Quantidade | Ação |
|------------|------------|------|
| **CRÍTICO** | 8 | Corrigir imediatamente (antes de qualquer deploy) |
| **ALTO** | 9 | Corrigir nesta sprint |
| **MÉDIO** | 7 | Corrigir em até 2 semanas |
| **BAIXO** | 3 | Backlog |
| **TOTAL** | **27** | |

---

## CRÍTICOS (ação imediata)

### F-01 — Sem Content-Security-Policy (CSP)
- **Arquivo:** `index.html`
- **Problema:** Nenhum header/meta CSP. Aplicação vulnerável a XSS, clickjacking, MIME sniffing, injeção de scripts de terceiros.
- **Exploração:** Script malicioso injetado via XSS roda com acesso total a `localStorage` (token JWT + dados do usuário).
- **Correção:** Adicionar meta CSP em `index.html` e headers no `vercel.json`:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://www.gstatic.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com https://cdnjs.cloudflare.com; connect-src 'self' https://muvlog-api-*.run.app https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'
```

### F-02 — Objeto user completo (CPF, telefone) no localStorage
- **Arquivos:** `AuthContext.jsx:133,174,204`, `RegisterPage.jsx:221`, `ClientRegisterPage.jsx:93`, `OwnDriverLoginPage.jsx:25-26`
- **Problema:** `localStorage.setItem('user', JSON.stringify(response.user))` persiste o objeto inteiro — incluindo `cpf`, `phone`, `email`, `first_name`, `last_name`.
- **Exploração:** Qualquer XSS rouba token + PII completa. Shared computers (lan houses, celulares emprestados) expõem PII.
- **Correção:** Guardar apenas `{ id, user_type, is_super_admin, tenant_id, status }` no localStorage. Buscar o resto via `getProfile()` (já é feito no load). Nunca persistir `cpf`/`phone`.

### F-03 — Firebase API Key + VAPID Key hardcoded
- **Arquivo:** `firebase.js:9,43`
- **Problema:** `apiKey: "AIzaSyCaPgR3xg-Fkeu3go9W4tOsb2Y3MBYYq5A"` e `vapidKey: 'BFxG3Cc9dr1bbuMbmTsYI3kI7UUb7-_e_xVvojCfRjGggZ5gHkJHuvgguj0SFTvtipaMQL2sru7LkdSXmlxfPho'` no código-fonte.
- **Exploração:** Chave FCM abusa de cota de push; VAPID key permite enviar notificações para tokens roubados. (API key do Firebase Web é "pública por design", mas restrições de referrer no Console são obrigatórias.)
- **Correção:** Mover para `import.meta.env.VITE_FIREBASE_*`. Configurar restrições de referrer/domínio no Firebase Console. Rotacionar as chaves atuais.

### F-04 — Rotas de entregador SEM requiredRole
- **Arquivo:** `driverRoutes.jsx:27-51` (todas as rotas)
- **Problema:** `<ProtectedRoute>` sem `requiredRole="DRIVER"`. Qualquer usuário autenticado (ADMIN, CLIENT) que navegue para `/dashboard`, `/orders`, `/wallet`, `/delivery/:id` acessa as telas de entregador.
- **Exploração:** Admin/CLIENT digita `/wallet` → vê carteira de entregador (se a API não filtrar). Violação de separação de perfis.
- **Correção:** `driverRoutes.jsx` → `<ProtectedRoute requiredRole="DRIVER">`. Idem para `clientRoutes.jsx` (`requiredRole="CLIENT"`).

### F-05 — /platform sem verificação de is_super_admin na rota
- **Arquivo:** `platformRoutes.jsx:14`
- **Problema:** `<ProtectedRoute requiredRole="ADMIN">` — qualquer ADMIN acessa `/platform` (dashboard super admin). A checagem `is_super_admin` só existe em `PlatformLoginPage.jsx:40` e em telas internas.
- **Exploração:** ADMIN normal digita `/platform` → acessa painel de multi-tenant. Defesa depende só do backend.
- **Correção:** Adicionar prop `requireSuperAdmin` no `ProtectedRoute` e usar em `platformRoutes.jsx`. Verificar `user.is_super_admin` antes de renderizar.

### F-06 — Export de backup JSON com todos os dados PII
- **Arquivo:** `DatabaseMapPage.jsx:69-91`
- **Problema:** `handleDownloadBackup()` baixa **todo** o `/api/admin/database-map` como JSON: usuários (CPF, telefone), pedidos, entregadores, restaurantes (dados bancários).
- **Exploração:** Admin comprometido ou sessão roubada exporta o banco inteiro com 1 clique. Arquivo fica em `Downloads/`.
- **Correção:** Exigir `is_super_admin` + senha/suplemento de confirmação. Ofuscar CPF/telefone no export (ex: `***.***.***-**`). Logar a ação.

### F-07 — Offline queue perde dados de pedidos após 5 falhas
- **Arquivo:** `offline.js:161-164`
- **Problema:** Quando `action.retries >= 5`, a ação é `markSynced()` (removida da fila). Além disso, `retries` **nunca é incrementado** — bug de lógica. Se fosse, ACCEPT_ORDER/CONFIRM_DELIVERY seriam perdidos permanentemente.
- **Exploração:** Entregador aceita pedido offline → 5 falhas de rede → pedido some da fila → pedido nunca é aceito no backend.
- **Correção:** Incrementar `retries` no catch. Nunca marcar como synced em erro — usar status `failed` com retry manual. Nunca dropar ACCEPT_ORDER/CONFIRM_DELIVERY.

---

## ALTOS (corrigir nesta sprint)

### F-08 — GPS a cada 2s com enableHighAccuracy
- **Arquivos:** `Layout.jsx:63`, `OwnDriverProtectedRoute.jsx:62`
- **Problema:** `setInterval(broadcast, 2000)` + `getCurrentPosition` com `enableHighAccuracy: true` — drena bateria do celular do entregador. Desrespeita regra "pensar em escala" e boa prática mobile.
- **Correção:** Usar `watchPosition` com `enableHighAccuracy` só durante entrega ativa. Fora de entrega: a cada 30-60s. Throttle no broadcast (min 10s entre updates se posição não mudou >50m).

### F-09 — OwnDriverProtectedRoute só verifica existência do token
- **Arquivo:** `OwnDriverProtectedRoute.jsx:5,72-74`
- **Problema:** `if (!token) return <Navigate />` — token inválido/expirado passa. Verificação de perfil só dentro do `useEffect` (`init()`), sem bloquear render.
- **Correção:** Validar token no backend antes de renderizar (chamar `/api/own-driver/profile` e bloquear se 401). Ou usar JWT decode client-side para expiração.

### F-10 — ErrorBoundary expõe mensagem de erro em produção
- **Arquivo:** `ErrorBoundary.jsx:40-42`
- **Problema:** `{this.state.error?.message}` renderizado visível — vaza stack/internals (nomes de tabela, SQL, paths).
- **Correção:** Em produção, mostrar apenas "Erro inesperado" + código de referência. Logar o erro para serviço externo (Sentry).

### F-11 — Senhas padrão hardcoded nos formulários admin
- **Arquivos:** `AdminUsersPage.jsx:32` (`password: 'admin123'`), `AdminDriversPage.jsx:13` (`password: '123456'`), `EstablishmentForm.jsx:11,170` (`password: '123456'`)
- **Problema:** Formulários pré-preenchidos com senhas fracas. Usuários criados ficam com senha previsível se o admin não alterar.
- **Correção:** Gerar senha aleatória forte no backend ao criar. Ou exigir senha forte no formulário (mín. 8, maiúscula, número). Nunca pré-preencher.

### F-12 — Ações destrutivas críticas só com window.confirm
- **Arquivos:** `DatabaseMapPage.jsx:256,272` (cleanup-test-data, database-restore), `TrashModal.jsx:56,89` (delete permanente)
- **Problema:** `window.confirm` é ignorável via DevTools; não há 2FA/senha. `database-restore` e `cleanup-test-data` são operações destrutivas em massa.
- **Correção:** Modal customizado com digitação de "CONFIRMAR" + senha do admin. Backend deve exigir confirmação forte (já parcialmente feito nos commits C5/C6).

### F-13 — DELETE ?force=true em usuários
- **Arquivo:** `DatabaseMapPage.jsx:98`
- **Problema:** `api.delete('/api/admin/users/${user.id}?force=true')` — força remoção mesmo com dados vinculados.
- **Correção:** Remover `force=true` do frontend. Permitir apenas soft-delete. Hard delete só via TrashModal com confirmação explícita.

### F-14 — API URL de produção hardcoded como fallback em 8 arquivos
- **Arquivos:** `api.js:2`, `notify.js:188`, `ClientRegisterPage.jsx:63`, `ClientIntegrationsPage.jsx:7`, `IntegrationSettings.jsx:6`, `OwnDriverOrders.jsx:62`
- **Problema:** `|| 'https://muvlog-api-890250693883.us-central1.run.app'` — se `VITE_API_URL` não estiver setada, tráfego vai para produção mesmo em dev.
- **Correção:** Remover fallback de produção. Em dev, falhar explicitamente se env ausente. Em produção, build deve ter a env injetada.

### F-15 — AdminUsersPage consome /api/platform/tenants
- **Arquivo:** `AdminUsersPage.jsx:56`
- **Problema:** Página de admin comum chama endpoint de super admin (`/api/platform/tenants`). Se o backend não filtrar, é vazamento cross-tenant.
- **Correção:** Usar endpoint `/api/admin/tenants` filtrado por tenant. Backend deve bloquear `/api/platform/*` para não-super-admin.

### F-16 — Supabase Realtime Broadcast sem autenticação de canal
- **Arquivo:** `realtime.js:31-32,48,95`
- **Problema:** Canal `gps:tenant_{id}` usa `VITE_SUPABASE_KEY` (chave pública/anon). Qualquer um com a chave pode enviar/receber GPS de qualquer entregador do tenant. Sem RLS em Broadcast.
- **Exploração:** Atacante com chave pública inscreve no canal e rastreia localização em tempo real de todos os entregadores.
- **Correção:** Usar Supabase Realtime com Authorization JWT do usuário. Configurar RLS/policies nos canais. Ou usar WebSocket próprio autenticado.

---

## MÉDIOS

### F-17 — Leaflet via CDN sem Subresource Integrity (SRI)
- **Arquivos:** `DashboardPage.jsx:147-150`, `ClientDashboardPage.jsx:101-105`, `DriverRouteMap.jsx:101-105`, `MapSection.jsx:66-69`, `NewOrderPage.jsx:70-75`
- **Problema:** `<script src="https://unpkg.com/leaflet@1.9.4/...">` sem `integrity=` — CDN comprometida injeta script.
- **Correção:** Adicionar hash SRI + `crossorigin`. Ou usar npm import (mas memória diz que quebra em produção — testar com Vite plugin).

### F-18 — console.log com dados sensíveis
- **Arquivos:** `firebase.js:47` (token FCM truncado), `AuthContext` via DevTools
- **Problema:** Logs em produção podem vazar via console compartilhado/screenshots.
- **Correção:** Wrap `console.log` em helper que só loga em `import.meta.env.DEV`.

### F-19 — chart.jsx usa dangerouslySetInnerHTML
- **Arquivo:** `chart.jsx:65`
- **Problema:** Injeta CSS dinâmico via `dangerouslySetInnerHTML`. Risco baixo (valores de cor), mas quebra a defesa em profundidade.
- **Correção:** Usar `<style>{cssString}</style>` como children do React (React escapa). Ou CSS modules.

### F-20 — Service Worker cacheia qualquer resposta 200
- **Arquivo:** `sw.js:32-36`
- **Problema:** Cacheia HTML/JSON de páginas autenticadas se a resposta for 200 e não for `/api/`. Pode cachear dados de dashboard.
- **Correção:** Whitelist apenas assets estáticos (`.js`, `.css`, `.png`, `.woff2`). Nunca cachear HTML de rotas autenticadas.

### F-21 — PII de clientes e telefones visíveis em múltiplas telas
- **Arquivos:** `OrderInfoSection.jsx:56-59`, `OrderDetailsModal.jsx:138-141`, `OwnDriverOrders.jsx:40`, `MapFilters.jsx:50`, `DriversTable.jsx`, etc.
- **Problema:** Telefone completo + nome do cliente + CPF em listagens. Mesmo com acesso legítimo, exibição em tela de estabelecimento/driver expõe PII desnecessária (LGPD).
- **Correção:** Mascarar telefone (`(51) 9****-9999`). CPF nunca em listagem (só no perfil admin com permissão). Botão "mostrar" para revelar.

### F-22 — Google Maps/Waze abrem sem rel="noopener" controlado
- **Arquivos:** `useDelivery.js:39-52`, `OwnDriverDeliveryPage.jsx:131-140`, `DriverMap.jsx:25-30`
- **Problema:** `window.open(url, '_blank')` sem `'noopener,noreferrer'` — reverse tabnapping em browsers antigos.
- **Correção:** `window.open(url, '_blank', 'noopener,noreferrer')`.

### F-23 — localStorage de own_driver com dados do restaurante
- **Arquivo:** `OwnDriverLoginPage.jsx:24-26`
- **Problema:** `own_driver_restaurant` e `own_driver_data` completos em localStorage — dados do estabelecimento (telefone, endereço, possivelmente dados bancários do `restaurant`).
- **Correção:** Persistir apenas `id` e `tenant_id`. Carregar o resto via API.

---

## BAIXOS

### F-24 — window.confirm como única confirmação destrutiva
- **Arquivos:** ~20 ocorrências (`window.confirm`)
- **Problema:** UX inconsistente; não aceita "digitar para confirmar". Não é falha de segurança direta com backend correto.
- **Correção:** Componente `ConfirmDialog` já existe — padronizar.

### F-25 — AdminUsersPage lê user do localStorage diretamente
- **Arquivo:** `AdminUsersPage.jsx:25`
- **Problema:** `JSON.parse(localStorage.getItem('user'))` em vez de `useAuth()`. Se o contexto divergir, autorização client-side falha.
- **Correção:** Usar `useAuth()`.

### F-26 — Leaflet icons via CDN legado (1.7.1)
- **Arquivo:** `ActiveDeliveryPage.jsx:18-20`
- **Problema:** Versão 1.7.1 dos ícones enquanto o resto usa 1.9.4. Inconsistência + CDN antigo.
- **Correção:** Padronizar 1.9.4 ou embutir assets localmente.

### F-27 — Instalação PWA sem verificação de origem
- **Arquivo:** `InstallPwaBanner.jsx`
- **Problema:** Banner genérico; sem risco direto.
- **Correção:** Melhoria de UX apenas.

---

## Tabela de Cobertura da Auditoria

| Área | Arquivos | Status |
|------|----------|--------|
| Auth/Context/Routes | AuthContext, ProtectedRoute, OwnDriverProtectedRoute, 7 arquivos de rotas, App.jsx | ✅ Completo |
| Lib/Services | api.js, notify.js, offline.js, realtime.js, firebase.js, utils.js, 6 services | ✅ Completo |
| Admin (telas) | DatabaseMapPage, AdminUsersPage, AdminDriversPage, AdminDashboardPage, PlatformDashboardPage, Finance, Settings, establish. | ✅ Completo |
| Driver/Own-driver | Dashboard, Delivery, Orders, Routes, Earnings, Profile, RouteMap, Layout GPS | ✅ Completo |
| Client | Register, Login, Dashboard, Orders, NewOrder, Profile, Financial | ✅ Completo |
| Components/Config | index.html, sw.js, ErrorBoundary, chart.jsx, TrashModal, ProofCapture, Toast, Layout* | ✅ Completo |
| UI shadcn (ui/*) | 40+ componentes genéricos | ⚪ Fora de escopo (biblioteca) |

---

## Priorização de Correção (recomendada)

| Fase | Itens | Esforço |
|------|-------|---------|
| **Fase 1 — Hoje** | F-02 (localStorage PII), F-04/F-05 (requiredRole), F-07 (offline data loss), F-10 (ErrorBoundary) | ~4h |
| **Fase 2 — Esta semana** | F-01 (CSP), F-03 (Firebase keys), F-06 (backup), F-11 (senhas), F-12/F-13 (destructive) | ~8h |
| **Fase 3 — Próxima** | F-08 (GPS), F-09 (token validation), F-14 (API URL), F-15/F-16 (Supabase/tenants) | ~12h |
| **Fase 4 — Backlog** | F-17 a F-27 | ~8h |

---

## Notas de Contexto (equipe)

- **VS Code:** 1.140.0
- **Branch:** `branch-mauro` (7 commits não pushados — auditoria backend C4-C9, A13)
- **Ambiente local:** Backend :5000 ✅ · Frontend :5173 ✅
- **Arquivo `admin.py` corrigido hoje:** removida definição duplicada de `soft_delete_user` (IndentationError impedia boot do backend)
