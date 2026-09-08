# FLUXOGRAMA COMPLETO DO PROJETO muv.log

## 1. ECOSSISTEMA GERAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MUV.LOG (Plataforma)                        │
│                     SaaS de Gestão de Entregas                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  ADMINISTRADOR  │ │  ESTABELECIMENTO│ │   ENTREGADOR    │
│  DE LOGISTICA   │ │  (Cliente do    │ │                 │
│                 │ │   Admin)        │ │                 │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         │   Gerencia        │   Cria pedidos    │   Entrega
         │   tudo            │                   │
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────┴────────┐
                    │  CLIENTE FINAL  │
                    │ (Dados no       │
                    │  pedido)        │
                    └─────────────────┘
```

## 2. FLUXO DE PEDIDO COMPLETO

```
┌──────────────────┐
│ Cliente Final    │
│ liga/WhatsApp/   │
│ iFood/etc        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ESTABELECIMENTO  │
│ cria pedido      │
│ (portal ou API)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│ SISTEMA MUV.LOG                                   │
│                                                   │
│  1. Recebe pedido (PENDING)                       │
│  2. Calcula frete: max(dist, 4km) × Preço/KM     │
│  3. Busca entregador mais proximo (online)        │
│  4. Envia WhatsApp: "🔔 Novo Pedido! SIM/NAO"    │
│  5. Notificacoes (sirene + navegador)             │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│ ENTREGADOR       │
│ recebe pedido    │
│                  │
│ [✓ Aceitar]      │──── ACEITAR ────┐
│ [✕ Recusar]      │                 │
│ [SIM pelo WA]    │──── RECUSAR ────┼──► Proximo entregador
│ [NAO pelo WA]    │                 │
└──────────────────┘                 │
                                     │
                                     ▼
                          ┌──────────────────┐
                          │ STATUS: ACCEPTED │
                          │ Entregador vai   │
                          │ ao restaurante   │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ STATUS:          │
                          │ PREPARING        │
                          │ Restaurante      │
                          │ prepara pedido   │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ STATUS: READY    │
                          │ Pedido pronto    │
                          │ para retirada    │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ STATUS:          │
                          │ PICKED_UP        │
                          │ Entregador       │
                          │ coleta pedido    │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ MAPA DE ROTA     │
                          │ Entregador ve    │
                          │ todos enderecos  │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ PROVA DE ENTREGA │
                          │ Entregador tira  │
                          │ foto (opcional)  │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ STATUS:          │
                          │ DELIVERED        │
                          │ Pedido entregue  │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ AVALIACAO        │
                          │ Estabelecimento  │
                          │ avalia (1-5)     │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ BONUS            │
                          │ Pontos calculados│
                          │ Ranking atualizado│
                          └──────────────────┘
```

## 3. FLUXO FINANCEIRO

```
┌─────────────────────────────────────────────────────────────────┐
│                      FLUXO DE CAIXA                             │
│                                                                  │
│  CLIENTE FINAL                                                   │
│      │                                                           │
│      │ Paga itens (dinheiro/cartao/PIX)                         │
│      ▼                                                           │
│  ESTABELECIMENTO                                                 │
│      │                                                           │
│      │ Paga frete ao ADMIN (semanal, por km)                    │
│      ▼                                                           │
│  ADMIN (Muv.log)                                                │
│      │                                                           │
│      ├──► Paga ENTREGADOR (65% do frete)                        │
│      │                                                           │
│      ├──► BONUS POOL (5% do frete)                              │
│      │    └──► Distribuido entre Top 5                          │
│      │                                                           │
│      └──► RETENCAO (30% do frete)                               │
│                                                                  │
│  CALCULO:                                                       │
│  Frete = max(distancia, 4km) × Preco/KM                        │
│  Entregador recebe: Frete × 65%                                 │
│  Bonus Pool: Frete × 5%                                         │
│  Admin retem: Frete × 30%                                       │
│  Admin paga a Muv.log: por quantidade de entregas               │
└─────────────────────────────────────────────────────────────────┘
```

## 4. SISTEMA DE BONIFICACAO

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE BONUS                              │
│                                                                  │
│  DISTRIBUICAO DO FRETE:                                         │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Frete Total (ex: R$ 15,00)                     │           │
│  │  ├── 65% Entregador = R$ 9,75                   │           │
│  │  ├── 5% Bonus Pool = R$ 0,75                    │           │
│  │  └── 30% Muv = R$ 4,50                          │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                  │
│  RANKING (5 criterios):                                         │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Tempo de Aceite .............. 20% (20 pts)    │           │
│  │  Velocidade de Entrega ........ 25% (25 pts)    │           │
│  │  Taxa de Aceitação ........... 20% (20 pts)    │           │
│  │  Avaliação ................... 25% (25 pts)    │           │
│  │  Tempo Online ................ 10% (10 pts)    │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                  │
│  NIVEIS:                                                        │
│  ┌─────────────────────────────────────────────────┐           │
│  │  🥉 Bronze: 0-500 pts (65% comissao)           │           │
│  │  🥈 Prata: 501-1.500 pts (65% + prioridade)    │           │
│  │  🥇 Ouro: 1.501-3.000 pts (63% + premium)      │           │
│  │  💎 Diamante: 3.001+ pts (60% + VIP)           │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                  │
│  BONUS:                                                         │
│  ┌─────────────────────────────────────────────────┐           │
│  │  Semanal: Top 3 recebem do pool semanal         │           │
│  │  Mensal: Top 5 recebem do pool mensal           │           │
│  │  Chuva: +R$ X/corrida (admin ativa)             │           │
│  │  Alta Demanda: +R$ Y/corrida (sistema detecta)  │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## 5. FLUXO DE NOTIFICACOES

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE NOTIFICACOES                       │
│                                                                  │
│  PEDIDO CRIADO                                                  │
│      │                                                           │
│      ├──► WhatsApp → Entregador ("🔔 Novo Pedido! SIM/NAO")    │
│      │                                                           │
│      ├──► WhatsApp → Estabelecimento ("Pedido recebido")        │
│      │                                                           │
│      └──► Sirene + Browser → Entregador proximo                 │
│                                                                  │
│  ENTREGADOR RESPONDE "SIM" PELO WHATSAPP                        │
│      │                                                           │
│      ├──► Sistema aceita automaticamente                         │
│      ├──► WhatsApp → Entregador ("✅ Pedido Aceito!")           │
│      └──► WhatsApp → Estabelecimento ("Pedido aceito por X")   │
│                                                                  │
│  STATUS MUDOU                                                   │
│      │                                                           │
│      ├──► WhatsApp → Estabelecimento (status atualizado)        │
│      │                                                           │
│      └──► WhatsApp → Cliente Final (se configurado)             │
│                                                                  │
│  TIMEOUT (nenhum entregador aceita)                             │
│      │                                                           │
│      └──► WhatsApp + Sistema → Admin ("Pedido sem entregador") │
│                                                                  │
│  CANCELAMENTO                                                   │
│      │                                                           │
│      ├──► WhatsApp → Estabelecimento ("Pedido cancelado")       │
│      └──► WhatsApp → Proximo entregador disponivel              │
└─────────────────────────────────────────────────────────────────┘
```

## 6. FLUXO DE INTEGRACOES

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRACOES EXTERNAS                          │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  iFood   │  │ 99Food   │  │ InstaDeli│  │ SaiPos   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       └──────────────┼──────────────┼──────────────┘             │
│                      │              │                            │
│                      ▼              ▼                            │
│              ┌───────────────────────────┐                      │
│              │  WEBHOOKS MUV.LOG         │                      │
│              │  /api/webhooks/{plataforma}│                      │
│              └────────────┬──────────────┘                      │
│                           │                                     │
│                           ▼                                     │
│              ┌───────────────────────────┐                      │
│              │  PROCESSADOR GENERICO     │                      │
│              │  - Cria restaurante       │                      │
│              │  - Cria cliente final     │                      │
│              │  - Cria endereco          │                      │
│              │  - Cria pedido (PENDING)  │                      │
│              └────────────┬──────────────┘                      │
│                           │                                     │
│                           ▼                                     │
│              ┌───────────────────────────┐                      │
│              │  SISTEMA MUV.LOG          │                      │
│              │  - Calcula frete          │                      │
│              │  - Busca entregador       │                      │
│              │  - Envia WhatsApp         │                      │
│              └───────────────────────────┘                      │
│                                                                  │
│  ┌──────────┐                                                   │
│  │ WhatsApp │◄── Notificacoes + Pedidos via texto               │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 7. ARQUITETURA TECNICA

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARQUITETURA TECNICA                         │
│                                                                  │
│  FRONTEND (Vercel)              BACKEND (Render)                │
│  ┌─────────────────┐           ┌─────────────────┐             │
│  │ React 19        │           │ Flask (Python)  │             │
│  │ Vite            │◄─────────►│ SQLAlchemy      │             │
│  │ Tailwind CSS    │   API     │ JWT Auth        │             │
│  │ Leaflet (mapa)  │           │ Gunicorn        │             │
│  │ Axios           │           │ WhatsApp API    │             │
│  └─────────────────┘           └────────┬────────┘             │
│                                         │                       │
│                              ┌──────────┴──────────┐           │
│                              │   PostgreSQL (Render)│           │
│                              └─────────────────────┘           │
│                                                                  │
│  ROTAS:                                                         │
│  /api/auth/*      - Autenticacao                                │
│  /api/driver/*    - Entregador                                  │
│  /api/orders/*    - Pedidos                                     │
│  /api/admin/*     - Administrativo                              │
│  /api/webhooks/*  - Integracoes externas                        │
│  /api/user/*      - Perfil e notificacoes                       │
│  /api/bonus/*     - Sistema de bonus e ranking                  │
└─────────────────────────────────────────────────────────────────┘
```

## 8. MAPA DE NAVEGACAO

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAPA DE NAVEGACAO                             │
│                                                                  │
│  ENTREGADOR:                                                    │
│  /dashboard ──► /orders ──► /delivery/:orderId                  │
│       │              │                                          │
│       ├──► /earnings                                            │
│       ├──► /history                                              │
│       ├──► /ranking (bonus e conquistas)                        │
│       ├──► /profile (meu perfil)                                │
│       └──► /route (mapa de rota)                                │
│                                                                  │
│  ESTABELECIMENTO:                                               │
│  /client ──► /client/new-order ──► /client/orders               │
│       │              │                      │                    │
│       ├──► /client/financial                                    │
│       ├──► /client/invoices                                     │
│       ├──► /client/integrations                                 │
│       └──► /client/profile                                      │
│                                                                  │
│  ADMIN:                                                         │
│  /admin ──► /admin/squares ──► /admin/establishments            │
│       │              │                      │                    │
│       ├──► /admin/drivers                                       │
│       ├──► /admin/orders                                        │
│       ├──► /admin/finance                                       │
│       ├──► /admin/driver-payments                               │
│       ├──► /admin/reports                                       │
│       └──► /admin/settings                                      │
└─────────────────────────────────────────────────────────────────┘
```

## 9. MODELOS DE DADOS

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODELOS DE DADOS                              │
│                                                                  │
│  User ──────► Driver (1:1)                                      │
│    │         - vehicle_type, plate, rating                      │
│    │         - max_concurrent_orders                            │
│    │         - square_id                                        │
│    │                                                            │
│    ├──► Customer (1:1)                                          │
│    │                                                            │
│    └──► Notification (1:N)                                      │
│                                                                  │
│  Restaurant ──► Order (1:N)                                     │
│    │           - square_id                                      │
│    │           - bank details                                   │
│    │                                                            │
│  Customer ──► Address (1:N)                                     │
│    │                                                            │
│  Customer ──► Order (1:N)                                       │
│                                                                  │
│  Order ──► Delivery (1:1)                                       │
│    │       - proof_of_delivery_url                              │
│    │       - customer_rating                                    │
│    │       - driver_earnings                                    │
│    │                                                            │
│  Driver ──► Payment (1:N)                                       │
│                                                                  │
│  Driver ──► DriverScore (1:N)                                   │
│  Driver ──► DriverBonus (1:N)                                   │
│  Driver ──► DriverAchievement (1:N)                             │
│                                                                  │
│  Square ──► Restaurant (1:N)                                    │
│  Square ──► Driver (1:N)                                        │
│  Square ──► DynamicPricing (1:1)                                │
│                                                                  │
│  SystemConfig (key-value)                                       │
│  - admin bank details                                           │
│  - commission rate                                               │
│  - delivery price per km                                        │
│  - timeout settings                                             │
│  - integration keys                                             │
│  - WhatsApp API config                                          │
└─────────────────────────────────────────────────────────────────┘
```

## 10. TECNOLOGIAS UTILIZADAS

```
┌─────────────────────────────────────────────────────────────────┐
│                    TECNOLOGIAS                                   │
│                                                                  │
│  FRONTEND:                                                      │
│  ├── React 19 .............. UI Framework                       │
│  ├── Vite .................. Build Tool                          │
│  ├── Tailwind CSS v4 ...... Estilizacao                         │
│  ├── Leaflet .............. Mapas (OpenStreetMap)               │
│  ├── Axios ................ HTTP Client                         │
│  └── React Router v7 ...... Roteamento                          │
│                                                                  │
│  BACKEND:                                                       │
│  ├── Flask ............... Web Framework                        │
│  ├── SQLAlchemy ......... ORM                                   │
│  ├── Flask-JWT-Extended . Autenticacao                          │
│  ├── Gunicorn ........... WSGI Server                           │
│  └── requests ........... HTTP Client (WhatsApp)                │
│                                                                  │
│  BANCO:                                                         │
│  ├── PostgreSQL ......... Producao (Render)                     │
│  └── SQLite ............. Desenvolvimento                       │
│                                                                  │
│  SERVICOS:                                                      │
│  ├── Nominatim .......... Geocoding (gratuito)                 │
│  ├── WhatsApp Business .. Notificacoes                          │
│  ├── Vercel ............. Frontend hosting                      │
│  └── Render ............. Backend hosting                       │
└─────────────────────────────────────────────────────────────────┘
```
