# muv.log - Plataforma de Gestao de Entregas

## Visao Geral

O muv.log e uma plataforma completa de gestao de entregas de delivery, desenvolvida para administradores de logistica gerenciarem estabelecimentos, entregadores e pedidos. O sistema replica e aprimora funcionalidades de plataformas como Entregas Expressas, iFood e 99Food.

### Arquitetura do Ecosistema

```
Muv.log (Plataforma SaaS)
    ├── Administrador de Logistica (nosso cliente)
    │     ├── Estabelecimentos (clientes do admin)
    │     └── Entregadores (contratados pelo admin)
    └── Cliente Final (dados no pedido, sem login)
```

## URLs de Producao

| Servico | URL |
|---------|-----|
| Frontend | https://portal-entregador-gamma.vercel.app |
| Backend API | https://muvlog-api.onrender.com |

## Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@muv.log.br | admin123 |
| Entregador | entregador@teste.com | 123456 |
| Estabelecimento | cliente@teste.com | 123456 |

## Tecnologias

**Frontend:** React + Vite + Tailwind CSS + Leaflet (mapa)
**Backend:** Flask (Python) + SQLAlchemy + Flask-JWT-Extended
**Banco:** PostgreSQL (producao) / SQLite (desenvolvimento)
**Deploy:** Vercel (frontend) + Render (backend)

## Funcionalidades Implementadas

### Gestao
- Gestao completa de estabelecimentos (CRUD)
- Gestao completa de entregadores (CRUD)
- Gestao de pedidos
- Sistema de multi-praca (multi-cidade)
- Cadastro pelo admin

### Fluxo de Pedidos
- Atribuicao inteligente (entregador mais proximo)
- Limite de pedidos simultaneos por entregador
- Aceite e recusa de pedidos
- Timeout configuravel + notificacao ao admin
- Cancelamento de pedido
- Prova de entrega (foto)
- Avaliacao do entregador (1-5 estrelas)

### Financeiro
- Fluxo financeiro visual (recebido vs pago vs retencao)
- Comissao configuravel (admin)
- Faturas com QR Code PIX
- Controle de pagamentos aos entregadores
- Financeiro do estabelecimento (o que deve)

### Integracoes
- iFood (webhook)
- WhatsApp (notificacoes + pedidos)
- 99Food (webhook)
- InstaDelivery (webhook)
- SaiPos (webhook)

### Notificacoes
- Sirene automatica para novos pedidos
- Notificacoes do navegador
- Notificacoes via WhatsApp
- Alerta de timeout ao admin

### Relatorios (8 tipos)
- Financeiro, Pedidos, Entregadores, Estabelecimentos
- Cancelamentos, Avaliacoes, Horarios de Pico, Entregas Detalhadas

### Configuracoes (8 modulos)
- Empresa, Pagamento, Precos, Entregas
- Entregadores, Estabelecimentos, Notificacoes, Integracoes

### Gamificacao
- Ranking de entregadores (top 3 podium)
- Conquistas e progresso

## Estrutura do Projeto

```
portal_entregador/
├── portal-frontend/          # React + Vite
│   ├── src/
│   │   ├── pages/           # 18 paginas
│   │   │   ├── admin/       # Admin (Dashboard, Establishments, Drivers, Orders, Finance, Reports, Settings, Squares, DriverPayments)
│   │   │   ├── client/      # Estabelecimento (Dashboard, Orders, Financial, Invoices, NewOrder)
│   │   │   └── (entregador) # Dashboard, Orders, Earnings, History, Ranking, ActiveDelivery
│   │   ├── components/      # Layout, ClientLayout
│   │   ├── contexts/        # AuthContext
│   │   └── lib/             # api.js, notify.js
│   └── package.json
├── portal-backend/           # Flask
│   ├── src/
│   │   ├── models/          # 10 models (User, Driver, Restaurant, Customer, Address, Order, Delivery, Payment, Notification, Square, SystemConfig)
│   │   ├── routes/          # 5 blueprints (auth, driver, order, admin, webhooks)
│   │   ├── services/        # whatsapp.py
│   │   └── main.py
│   └── requirements.txt
├── ROTEIRO_TESTES.md        # Roteiro completo de testes
├── FLUXOGRAMA_PROJETO.md    # Fluxograma detalhado
└── todo.md                  # Status do projeto
```

## Como Rodar Localmente

**Backend:**
```bash
cd portal-backend
pip install -r requirements.txt
python src/main.py
```

**Frontend:**
```bash
cd portal-frontend
npm install
npm run dev
```

## Documentacao

- ROTEIRO_TESTES.md - Testes completos
- FLUXOGRAMA_PROJETO.md - Fluxograma detalhado
- documentacao_completa.md - Documentacao tecnica
- arquitetura_portal.md - Arquitetura do sistema
- design_portal.md - Design e UX
- guia_deploy.md - Guia de deploy
- configuracoes_deploy.md - Configuracoes de deploy
- requisitos_portal.md - Requisitos funcionais

## Status

- ✅ Backend: Funcional (Render)
- ✅ Frontend: Funcional (Vercel)
- ✅ Banco de dados: PostgreSQL (Render)
- ✅ Integracoes: iFood, WhatsApp, 99Food, InstaDelivery, SaiPos
- ✅ Deploy: Producao ativa
