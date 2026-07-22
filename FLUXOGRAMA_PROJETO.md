# FLUXOGRAMA COMPLETO DO PROJETO muv.log

## 1. ECOSSISTEMA GERAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MUV.LOG (Plataforma)                        │
│                     SaaS de Gestao de Entregas                     │
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
│  2. Busca entregador mais proximo (online)        │
│  3. Verifica capacidade (< max_concurrent)        │
│  4. Envia notificacao ao entregador selecionado   │
│     - Sirene (se no app)                          │
│     - WhatsApp (se configurado)                   │
│     - Notificacao navegador                       │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│ ENTREGADOR       │
│ recebe pedido    │
│                  │
│ [✓ Aceitar]      │──── ACEITAR ────┐
│ [✕ Recusar]      │                 │
│                  │──── RECUSAR ────┼──► Proximo entregador
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
                          │ PAGAMENTO        │
                          │ Frete acumulado  │
                          │ semanalmente     │
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
│      ├──► Paga ENTREGADOR (% do frete, semanal)                 │
│      │                                                           │
│      └──► RETENCAO (lucro do admin)                             │
│                                                                  │
│  CALCULO:                                                       │
│  Frete = km x R$/km (configuravel por praca)                    │
│  Entregador recebe: frete x (100% - comissao%)                  │
│  Admin retem: frete x comissao%                                 │
│  Admin paga a Muv.log: por quantidade de entregas               │
└─────────────────────────────────────────────────────────────────┘
```

## 4. FLUXO DE NOTIFICACOES

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE NOTIFICACOES                       │
│                                                                  │
│  PEDIDO CRIADO                                                  │
│      │                                                           │
│      ├──► WhatsApp → Estabelecimento ("Pedido recebido")        │
│      │                                                           │
│      └──► Sirene + WhatsApp + Browser → Entregador proximo     │
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
│      └──► WhatsApp → Estabelecimento ("Pedido cancelado")       │
└─────────────────────────────────────────────────────────────────┘
```

## 5. FLUXO DE INTEGRACOES

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
│              │  (atribui entregador)     │                      │
│              └───────────────────────────┘                      │
│                                                                  │
│  ┌──────────┐                                                   │
│  │ WhatsApp │◄── Notificacoes + Pedidos via texto               │
│  └──────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 6. ARQUITETURA TECNICA

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARQUITETURA TECNICA                         │
│                                                                  │
│  FRONTEND (Vercel)              BACKEND (Render)                │
│  ┌─────────────────┐           ┌─────────────────┐             │
│  │ React + Vite    │           │ Flask (Python)  │             │
│  │ Tailwind CSS    │◄─────────►│ SQLAlchemy      │             │
│  │ Leaflet (mapa)  │   API     │ JWT Auth        │             │
│  │ Axios           │           │ Gunicorn        │             │
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
└─────────────────────────────────────────────────────────────────┘
```

## 7. MODELOS DE DADOS

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
│    │                                                            │
│  Driver ──► Payment (1:N)                                       │
│                                                                  │
│  Square ──► Restaurant (1:N)                                    │
│  Square ──► Driver (1:N)                                        │
│                                                                  │
│  SystemConfig (key-value)                                       │
│  - admin bank details                                           │
│  - commission rate                                               │
│  - delivery price per km                                        │
│  - timeout settings                                             │
│  - integration keys                                             │
└─────────────────────────────────────────────────────────────────┘
```

## 8. MAPA DE NAVEGACAO

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAPA DE NAVEGACAO                             │
│                                                                  │
│  ENTREGADOR:                                                    │
│  /dashboard ──► /orders ──► /delivery/active                    │
│       │              │                                          │
│       ├──► /earnings                                            │
│       ├──► /history                                              │
│       └──► /ranking                                             │
│                                                                  │
│  ESTABELECIMENTO:                                               │
│  /client ──► /client/new-order ──► /client/orders               │
│       │              │                      │                    │
│       ├──► /client/financial                                    │
│       └──► /client/invoices                                     │
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
