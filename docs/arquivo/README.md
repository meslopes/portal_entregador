# muv.log - Plataforma de Gestão de Entregas

SaaS completo para gestão de entregadores, estabelecimentos e pedidos.

## 🌐 URLs de Acesso

| Serviço | URL |
|---------|-----|
| **Frontend** | https://portal-entregador-gamma.vercel.app |
| **Backend** | https://muvlog-api.onrender.com |
| **Domínio** | https://muv.log.br |

## 👥 Tipos de Usuário

| Tipo | Descrição | Acesso |
|------|-----------|--------|
| **ADMIN** | Administrador de Logística | /admin |
| **CLIENT** | Estabelecimento (Farmácia, Lanchonete, etc) | /client |
| **DRIVER** | Entregador | /dashboard |

## 📋 Credenciais de Teste

| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@muv.log.br | admin123 |
| Admin (Mauro) | enilton26011967@gmail.com | admin123 |
| Entregador | entregador@teste.com | 123456 |
| Cliente | cliente@teste.com | 123456 |

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                 │
│  React 19 + Vite + Tailwind CSS + Leaflet Maps      │
│  URL: portal-entregador-gamma.vercel.app            │
└─────────────────────────────────────────────────────┘
                          │
                          │ API REST
                          ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND (Render)                  │
│  Flask (Python 3) + SQLAlchemy + JWT Auth           │
│  URL: muvlog-api.onrender.com                       │
└─────────────────────────────────────────────────────┘
                          │
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)               │
│  Render Managed Database                            │
└─────────────────────────────────────────────────────┘
```

## 🛠️ Stack Tecnológica

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Estilo:** Tailwind CSS v4 + shadcn/ui
- **Mapas:** Leaflet (OpenStreetMap)
- **HTTP Client:** Axios
- **Roteamento:** React Router v7

### Backend
- **Framework:** Flask (Python 3)
- **ORM:** SQLAlchemy
- **Autenticação:** Flask-JWT-Extended
- **Banco:** PostgreSQL (produção) / SQLite (desenvolvimento)
- **Geocoding:** Nominatim (OpenStreetMap)
- **WhatsApp:** WhatsApp Business API

## 📁 Estrutura do Projeto

```
portal_entregador/
├── portal-frontend/           # Frontend React
│   ├── src/
│   │   ├── pages/            # Páginas principais
│   │   │   ├── admin/        # Páginas do administrador
│   │   │   └── client/       # Páginas do estabelecimento
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── contexts/         # Contextos React (Auth)
│   │   └── lib/              # Serviços API e utilitários
│   └── public/               # Assets estáticos
├── portal-backend/            # Backend Flask
│   ├── src/
│   │   ├── routes/           # Rotas da API
│   │   ├── models/           # Modelos do banco
│   │   └── services/         # Serviços (WhatsApp, Geocoding)
│   └── requirements.txt      # Dependências Python
└── instance/                  # Banco SQLite local
```

## 🚀 Funcionalidades

### Entregador
- Dashboard com estatísticas
- Pedidos disponíveis com sirene
- Aceitar/recusar pedidos
- Acompanhar entrega em tempo real
- Mapa de rota com endereços
- Histórico de entregas
- Ranking e bônus
- Perfil editável

### Estabelecimento (Cliente)
- Criar pedidos
- Acompanhar pedidos
- Financeiro com faturas
- Integrações (iFood, 99Food, etc)
- Perfil editável

### Administrador
- Dashboard com mapa em tempo real
- Gestão de entregadores
- Gestão de estabelecimentos
- Gestão de pedidos
- Configurações de praça
- Relatórios financeiros
- Processamento de bônus

## 💰 Modelo Financeiro

```
Frete = max(distância_real, 4km) × Preço/KM
Ganhos do entregador = Frete × Percentual (65%)
Bônus Pool = Frete × 5% (distribuído entre top 5)
Receita Muv = Frete × 30%
```

### Tabela de Preços (Praça)
- **Preço/KM:** R$ 2,95 (padrão)
- **Distância Mínima:** 4 km (sempre cobra mínimo 4km)
- **Frete Máximo:** R$ 50,00
- **Entregador recebe:** 65% do frete

## 🏆 Sistema de Bonificação

### Ranking Multi-Critérios
| Critério | Peso | Máximo |
|----------|------|--------|
| Tempo de Aceite | 20% | 20 pts |
| Velocidade de Entrega | 25% | 25 pts |
| Taxa de Aceitação | 20% | 20 pts |
| Avaliação | 25% | 25 pts |
| Tempo Online | 10% | 10 pts |

### Níveis do Entregador
- 🥉 **Bronze:** 0-500 pts (65% comissão)
- 🥈 **Prata:** 501-1.500 pts (65% + prioridade)
- 🥇 **Ouro:** 1.501-3.000 pts (63% + premium)
- 💎 **Diamante:** 3.001+ pts (60% + VIP)

### Bônus
- **Semanal:** Top 3 recebem bônus
- **Mensal:** Top 5 recebem bônus
- **Dias Chuvosos:** Adicional por corrida
- **Alta Demanda:** Adicional por corrida

## 📱 Notificações

### WhatsApp
- Entregador recebe notificação quando pedido chega
- Resposta SIM/NÃO pelo WhatsApp para aceitar/recusar
- Confirmações de aceite e recusa

### Push Notifications
- Disponível quando o navegador está aberto
- Notificações de novos pedidos

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend (Render)
```
FLASK_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
SECRET_KEY=...
```

#### Frontend (Vercel)
```
VITE_API_URL=https://muvlog-api.onrender.com
```

### WhatsApp Business API
```
whatsapp_api_token=...
whatsapp_phone=...
```

## 📊 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro entregador
- `POST /api/auth/register-client` - Registro estabelecimento
- `POST /api/auth/change-password` - Alterar senha

### Entregador
- `GET /api/driver/stats` - Estatísticas
- `PUT /api/driver/location` - Atualizar localização
- `GET /api/driver/earnings` - Histórico de ganhos

### Pedidos
- `GET /api/orders/available` - Pedidos disponíveis
- `GET /api/orders/active` - Pedidos ativos do entregador
- `POST /api/orders/:id/accept` - Aceitar pedido
- `POST /api/orders/:id/reject` - Recusar pedido
- `PUT /api/orders/:id/status` - Atualizar status

### Administrador
- `GET /api/admin/dashboard` - Dashboard
- `GET /api/admin/drivers` - Lista entregadores
- `GET /api/admin/establishments` - Lista estabelecimentos
- `GET /api/admin/live-tracking` - Tracking em tempo real
- `POST /api/admin/bonus/process-weekly` - Processar bônus semanal

### Bônus
- `GET /api/bonus/ranking` - Ranking entregadores
- `GET /api/bonus/bonuses` - Lista bônus
- `POST /api/bonus/process-weekly` - Processar bônus semanal
- `POST /api/bonus/process-monthly` - Processar bônus mensal

## 🚀 Deploy

### Frontend (Vercel)
```bash
cd portal-frontend
npm install
npm run build
```

### Backend (Render)
```bash
cd portal-backend
pip install -r requirements.txt
gunicorn src.main_production:app
```

## 📝 Licença

Projeto proprietário - muv.log
