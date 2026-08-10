# Arquitetura do Portal muv.log

## 🏗️ Visão Geral

A arquitura do muv.log segue o padrão **MVC (Model-View-Controller)** com separação clara entre frontend e backend, comunicando-se via API REST.

## 📐 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES                                  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Desktop  │  │ Mobile   │  │ Tablet   │  │ API Ext. │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       └──────────────┼──────────────┼──────────────┘             │
│                      │              │                            │
│                      ▼              ▼                            │
│              ┌───────────────────────────┐                      │
│              │  CDN / LOAD BALANCER      │                      │
│              └────────────┬──────────────┘                      │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React 19 + Vite                       │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │  Pages   │  │Components│  │ Contexts │              │   │
│  │  │ (Rotas)  │  │ (UI)     │  │ (Auth)   │              │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘              │   │
│  │       │              │              │                     │   │
│  │       └──────────────┼──────────────┘                     │   │
│  │                      │                                    │   │
│  │                      ▼                                    │   │
│  │              ┌─────────────────┐                          │   │
│  │              │   lib/api.js    │                          │   │
│  │              │  (Axios + Auth) │                          │   │
│  │              └────────┬────────┘                          │   │
│  └───────────────────────┼───────────────────────────────────┘   │
│                          │                                        │
│  URL: portal-entregador-gamma.vercel.app                         │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           │ HTTPS (REST API)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Render)                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Flask (Python 3)                        │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │  Routes  │  │  Models  │  │ Services │              │   │
│  │  │ (API)    │  │ (DB)     │  │ (Logic)  │              │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘              │   │
│  │       │              │              │                     │   │
│  │       └──────────────┼──────────────┘                     │   │
│  │                      │                                    │   │
│  │                      ▼                                    │   │
│  │              ┌─────────────────┐                          │   │
│  │              │  SQLAlchemy ORM │                          │   │
│  │              └────────┬────────┘                          │   │
│  └───────────────────────┼───────────────────────────────────┘   │
│                          │                                        │
│  URL: muvlog-api.onrender.com                                    │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           │ SQL (ORM)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Render Managed DB                     │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │  Users   │  │  Orders  │  │ Payments │              │   │
│  │  │ Drivers  │  │ Deliveries│  │  Bonus   │              │   │
│  │  │Customers │  │ Addresses│  │  Scores  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Requisição

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────►│   Backend    │────►│   Database   │
│   (React)    │◄────│   (Flask)    │◄────│ (PostgreSQL) │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │  1. HTTP Request   │                    │
       │───────────────────►│                    │
       │                    │  2. Query SQL      │
       │                    │───────────────────►│
       │                    │                    │
       │                    │  3. Resultado      │
       │                    │◄───────────────────│
       │  4. JSON Response  │                    │
       │◄───────────────────│                    │
```

## 📁 Estrutura de Pastas

```
portal_entregador/
│
├── portal-frontend/                    # Frontend React
│   ├── src/
│   │   ├── pages/                     # Páginas (Screens)
│   │   │   ├── admin/                 # Admin pages
│   │   │   │   ├── AdminDashboardPage.jsx
│   │   │   │   ├── AdminEstablishmentsPage.jsx
│   │   │   │   ├── AdminDriversPage.jsx
│   │   │   │   ├── AdminOrdersPage.jsx
│   │   │   │   ├── AdminFinancePage.jsx
│   │   │   │   ├── AdminReportsPage.jsx
│   │   │   │   ├── AdminSettingsPage.jsx
│   │   │   │   ├── AdminSquaresPage.jsx
│   │   │   │   └── AdminUsersPage.jsx
│   │   │   ├── client/               # Client pages
│   │   │   │   ├── ClientDashboardPage.jsx
│   │   │   │   ├── ClientLoginPage.jsx
│   │   │   │   ├── ClientRegisterPage.jsx
│   │   │   │   ├── ClientOrdersPage.jsx
│   │   │   │   ├── ClientFinancialPage.jsx
│   │   │   │   ├── ClientInvoicePage.jsx
│   │   │   │   ├── ClientIntegrationsPage.jsx
│   │   │   │   ├── ClientProfilePage.jsx
│   │   │   │   └── NewOrderPage.jsx
│   │   │   └── (driver pages)
│   │   │       ├── DashboardPage.jsx
│   │   │       ├── OrdersPage.jsx
│   │   │       ├── EarningsPage.jsx
│   │   │       ├── HistoryPage.jsx
│   │   │       ├── ActiveDeliveryPage.jsx
│   │   │       ├── DriverRankingPage.jsx
│   │   │       ├── DriverProfilePage.jsx
│   │   │       └── DriverRouteMap.jsx
│   │   ├── components/               # Reusable components
│   │   │   ├── Layout.jsx
│   │   │   ├── ClientLayout.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   └── ui/ (shadcn components)
│   │   ├── contexts/                 # React contexts
│   │   │   └── AuthContext.jsx
│   │   └── lib/                      # Services & utils
│   │       ├── api.js
│   │       └── notify.js
│   ├── public/                       # Static assets
│   │   └── logo-muvy.jpg
│   └── package.json
│
├── portal-backend/                     # Backend Flask
│   ├── src/
│   │   ├── routes/                   # API routes
│   │   │   ├── auth.py
│   │   │   ├── driver.py
│   │   │   ├── order.py
│   │   │   ├── admin.py
│   │   │   ├── webhooks.py
│   │   │   ├── user.py
│   │   │   └── bonus.py
│   │   ├── models/                   # Database models
│   │   │   └── portal_models.py
│   │   ├── services/                 # Business logic
│   │   │   ├── geocoding.py
│   │   │   └── whatsapp.py
│   │   ├── main.py                   # Dev server
│   │   └── main_production.py        # Production server
│   ├── requirements.txt
│   └── Procfile
│
└── instance/                          # SQLite database (local)
```

## 🔐 Segurança

### Autenticação
- **JWT (JSON Web Tokens)** para autenticação
- Tokens armazenados no localStorage do frontend
- Tokens incluem user_id e tipo de usuário

### CORS
- Domínios permitidos configurados no backend
- Produção: portal-entregador-gamma.vercel.app

### Senhas
- Hash com Werkzeug (PBKDF2-SHA256)
- Nunca armazenadas em texto puro

## 📡 Endpoints Principais

### Autenticação (`/api/auth`)
- POST `/login` - Login
- POST `/register` - Registro entregador
- POST `/register-client` - Registro estabelecimento
- POST `/change-password` - Alterar senha

### Entregador (`/api/driver`)
- GET `/stats` - Estatísticas
- PUT `/location` - Atualizar localização
- GET `/earnings` - Histórico de ganhos

### Pedidos (`/api/orders`)
- GET `/available` - Pedidos disponíveis
- GET `/active` - Pedidos ativos
- POST `/:id/accept` - Aceitar
- POST `/:id/reject` - Recusar
- PUT `/:id/status` - Atualizar status

### Administrador (`/api/admin`)
- GET `/dashboard` - Dashboard
- GET `/drivers` - Lista entregadores
- GET `/establishments` - Lista estabelecimentos
- GET `/live-tracking` - Tracking em tempo real
- GET `/squares` - Lista praças

### Bônus (`/api/bonus`)
- GET `/ranking` - Ranking
- GET `/bonuses` - Lista bônus
- POST `/process-weekly` - Processar semanal
- POST `/process-monthly` - Processar mensal

## 🗄️ Banco de Dados

### Tabelas Principais
| Tabela | Descrição |
|--------|-----------|
| users | Usuários do sistema |
| drivers | Dados dos entregadores |
| customers | Clientes/Estabelecimentos |
| restaurants | Estabelecimentos |
| orders | Pedidos |
| deliveries | Entregas |
| payments | Pagamentos |
| addresses | Endereços |
| squares | Praças |
| driver_scores | Pontuação ranking |
| driver_bonuses | Bônus distribuídos |
| driver_achievements | Conquistas |
| dynamic_pricing | Preço dinâmico |
| system_config | Configurações |

## 🔄 Integrações

### WhatsApp Business API
- Notificações de pedidos
- Resposta SIM/NÃO para aceitar/recusar
- Confirmações de status

### Nominatim (OpenStreetMap)
- Geocodificação de endereços
- Cálculo de distâncias
- Gratuito, sem API key

### Plataformas Externas
- iFood (webhook)
- 99Food (webhook)
- InstaDelivery (webhook)
- SaiPos (webhook)
