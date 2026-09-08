# ESCOPO FINAL — muv.log SaaS Platform
## Plataforma White-Label de Gestão de Entregas

**Versão**: 2.0
**Data**: 27/07/2026
**Autor**: MiMo 2.5 (baseado em Entregas Expressas)

---

## 1. VISÃO DO NEGÓCIO

### 1.1 O que é o muv.log

O muv.log é uma **plataforma SaaS white-label** para gestão de entregas rápidas. Assim como o Entregas Expressas, o muv.log permite que:

- **Administradores de Logística** (empresas de entrega) gerenciem equipes de entregadores
- **Estabelecimentos** (restaurantes, farmácias, etc.) criem e acompanhem pedidos
- **Entregadores** recebam, aceitem e completem entregas
- **Clientes finais** acompanhem suas entregas em tempo real

### 1.2 Modelo de Negócio

```
┌─────────────────────────────────────────────────────────────┐
│                    muv.log (Plataforma)                      │
│         Vende white-label para Administradores               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Administrador de Logística (ex: muvy)           │
│    Paga mensalidade por entregas. Gerencia entregadores.     │
│    Oferece serviço para estabelecimentos.                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Estabelecimento (ex: Farmácia, Restaurante)     │
│    Cria pedidos. Acompanha entregas. Paga frete.             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Entregador (ex: Motoboy)                  │
│    Recebe pedidos. Coleta. Entrega. Recebe pagamento.        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cliente Final (sem login)                 │
│    Acompanha entrega via link público.                       │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Fluxo de Receita

```
Cliente Final → Estabelecimento: Paga itens (dinheiro/cartão/PIX)
Estabelecimento → Admin: Frete acumulado semanalmente (fatura)
Admin → Entregador: Percentual do frete (configurável)
Admin → muv.log: Mensalidade por entregas (plano SaaS)
```

### 1.4 Usos do Sistema

| Papel | Descrição | Exemplo |
|-------|-----------|---------|
| **Dono da plataforma** | Vende acesso white-label | muv.log (você) |
| **Administrador** | Gerencia entregadores e estabelecimentos | muvy (sua empresa) |
| **Estabelecimento** | Cria pedidos, acompanha entregas | Sua lancheria |
| **Entregador** | Recebe e completa entregas | Motoboy da muvy |
| **Cliente Final** | Acompanha entrega (sem login) | Cliente da lancheria |

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Admin     │  │  Estab.     │  │  Entregador │        │
│  │  Dashboard  │  │   Portal    │  │    App      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  React 19 + Vite + Tailwind CSS + Leaflet Maps              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Render)                          │
│                                                             │
│  Flask (Python 3) + SQLAlchemy + JWT Auth                   │
│  Módulos: Auth, Orders, Drivers, Admin, Webhooks, Billing   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                     │
│                                                             │
│  Tabelas: users, drivers, restaurants, customers, orders,   │
│           deliveries, payments, notifications, wallets,      │
│           invoices, squares, integrations, settings          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Estrutura de Diretórios

```
portal_entregador/
├── portal-frontend/           # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/         # Painel do Administrador
│   │   │   ├── client/        # Portal do Estabelecimento
│   │   │   ├── driver/        # App do Entregador (PWA)
│   │   │   └── public/        # Páginas públicas
│   │   ├── components/
│   │   │   ├── ui/            # Componentes shadcn/ui
│   │   │   ├── layout/        # Layouts (Admin, Client, Driver)
│   │   │   └── shared/        # Componentes compartilhados
│   │   ├── contexts/          # React Contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # API, utils, constants
│   │   └── styles/            # CSS global
│   └── public/
│       └── logo-*.png         # Logos por marca
│
├── portal-backend/            # Backend Flask
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.py        # Autenticação
│   │   │   ├── admin.py       # Rotas administrativas
│   │   │   ├── driver.py      # Rotas do entregador
│   │   │   ├── order.py       # Pedidos
│   │   │   ├── webhook.py     # Webhooks (iFood, etc.)
│   │   │   ├── billing.py     # Faturamento e carteiras
│   │   │   └── api.py         # API pública para desenvolvedores
│   │   ├── models/
│   │   │   ├── portal_models.py  # Modelos principais
│   │   │   └── billing_models.py # Modelos financeiros
│   │   ├── services/
│   │   │   ├── geocoding.py   # Geocodificação
│   │   │   ├── whatsapp.py    # WhatsApp API
│   │   │   ├── payment.py     # Gateways de pagamento
│   │   │   └── notification.py # Notificações push
│   │   └── config.py          # Configurações
│   └── requirements.txt
│
└── instance/                  # Banco SQLite local (dev)
```

### 2.3 Modelos de Dados (Entidades Principais)

#### Usuários e Autenticação
- **User**: id, email, password_hash, name, phone, cpf, user_type, status, tenant_id
- **Tenant**: id, name, slug, logo_url, primary_color, domain, plan, settings

#### Entregadores
- **Driver**: id, user_id, tenant_id, vehicle_type, plate, is_online, current_lat, current_lng, max_concurrent_orders
- **DriverScore**: id, driver_id, period, score, ranking
- **DriverBonus**: id, driver_id, amount, type, status

#### Estabelecimentos
- **Restaurant**: id, tenant_id, name, address, lat, lng, phone, preparation_minutes, square_id
- **Customer**: id, name, phone, email

#### Pedidos
- **Order**: id, tenant_id, restaurant_id, customer_id, driver_id, status, scheduled_at, delivery_fee, total_amount, payment_method
- **Address**: id, customer_id, street, number, neighborhood, city, lat, lng
- **Delivery**: id, order_id, driver_id, distance_km, proof_url, rating

#### Financeiro
- **Wallet**: id, user_id, tenant_id, balance, locked_balance
- **Transaction**: id, wallet_id, order_id, amount, type, status, release_at
- **Invoice**: id, tenant_id, restaurant_id, period_start, period_end, total, status

#### Praças e Configurações
- **Square**: id, tenant_id, name, city, state, price_per_km, min_distance_km, max_delivery_fee
- **TenantSetting**: id, tenant_id, key, value
- **Integration**: id, tenant_id, platform, credentials, active

---

## 3. MÓDULOS DO SISTEMA

### 3.1 MÓDULO: Multi-Tenant (White-Label)

**Objetivo**: Cada administrador tem sua própria instância personalizável.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Tenant (Organização) | Cada admin é um "tenant" isolado | Crítica |
| Logo e cores customizáveis | Upload de logo, definição de cores | Alta |
| Subdomínio próprio | empresa.muv.log.br | Alta |
| Domínio próprio | app.empresa.com.br | Média |
| Nomenclaturas customizáveis | Renomear "Pedido" para "Entrega", etc. | Baixa |
| App do entregador com marca | PWA com logo do admin | Alta |
| Portal do estabelecimento com marca | White-label completo | Alta |

**Dados do Tenant**:
```json
{
  "id": 1,
  "name": "muvy",
  "slug": "muvy",
  "logo_url": "/uploads/logos/muvy.png",
  "primary_color": "#6366f1",
  "secondary_color": "#ffffff",
  "domain": "app.muvy.com.br",
  "plan": "premium",
  "settings": {
    "currency": "BRL",
    "timezone": "America/Sao_Paulo",
    "language": "pt-BR"
  }
}
```

### 3.2 MÓDULO: Painel do Administrador

**Objetivo**: Dashboard completo para gerenciar toda a operação.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Dashboard em tempo real | Mapa, stats, pedidos ativos | Crítica |
| Mapa ao vivo | Entregadores, estabelecimentos, entregas | Crítica |
| Gestão de entregadores | Cadastro, aprovação, bloqueio | Crítica |
| Gestão de estabelecimentos | Cadastro, configuração | Crítica |
| Gestão de pedidos | Criar, editar, cancelar, atribuir | Crítica |
| Gestão de praças | Múltiplas cidades/regiões | Alta |
| Relatórios financeiros | Receita, custos, lucro | Alta |
| Relatórios operacionais | Entregas, entregadores, ranking | Alta |
| Configurações do sistema | Tarifas, regras, integrações | Alta |
| Gestão de usuários | Sub-usuários com permissões | Média |

**Layout do Dashboard** (baseado no Entregas Expressas):
- **Header**: Logo, menu (Dashboard, Clientes, Entregadores, Pedidos, Financeiro, Relatórios, Configurações), botão "Lançar Pedido"
- **Sidebar**: Filtros + Status dos pedidos (accordion)
- **Mapa**: Central, com marcadores de entregadores, estabelecimentos e entregas
- **Footer**: Informações, links, seletor de praça

### 3.3 MÓDULO: Portal do Estabelecimento

**Objetivo**: Interface para estabelecimentos criarem e acompanharem pedidos.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Login/cadastro | Autenticação do estabelecimento | Crítica |
| Criar pedido | Formulário completo com mapa | Crítica |
| Acompanhar pedidos | Lista com filtros e status | Crítica |
| Rastreamento ao vivo | Mapa com entregador | Alta |
| Histórico de pedidos | Busca por período | Alta |
| Financeiro | Faturas, extratos | Alta |
| Perfil | Editar dados do estabelecimento | Média |
| Sub-usuários | Equipe do estabelecimento | Média |
| Chat com entregador | Mensagens em tempo real | Média |
| Link de rastreio público | Para cliente final | Alta |

**Campos do formulário de pedido**:
- Remetente/Destinatário: Nome, Telefone
- Pedido: Valor, Número, Forma de Pagamento
- Endereço: Rua, Número, Bairro, Cidade, Estado, CEP, Complemento
- Mapa: Seleção visual do endereço
- Favoritar: Salvar endereços frequentes

### 3.4 MÓDULO: App do Entregador

**Objetivo**: Aplicativo para entregadores receberem e completarem entregas.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Login/cadastro | Autenticação do entregador | Crítica |
| Dashboard com mapa | Localização + pedidos | Crítica |
| Toggle online/offline | Controlar disponibilidade | Crítica |
| Pedidos em andamento | Aba "Em Andamento" | Crítica |
| Pedidos pendentes | Aba "Pendentes" | Crítica |
| Aceitar/rejeitar pedido | Botões de ação | Crítica |
| Navegação externa | Abrir Google Maps/Waze | Crítica |
| Prova de entrega | Foto + assinatura | Alta |
| Carteira | Saldo disponível + bloqueado | Alta |
| Histórico | Entregas por período | Alta |
| Pedidos agendados | Pendentes + Já aceitos | Alta |
| Perfil | Editar dados | Média |
| Configurações | Mapa, som, sobreposição | Média |
| Suporte | Chat com admin | Média |
| Notificações push | Alertas de novos pedidos | Alta |

**Fluxo do entregador**:
1. Abre app → vê mapa + lista vazia
2. Liga toggle "Ativo" → sistema começa a enviar pedidos
3. Novo pedido chega → notificação sonora + widget pisca
4. Vê pedido → na aba "Pendentes"
5. Aceita pedido → move para "Em Andamento"
6. Navega até coleta → abre Google Maps/Waze
7. Confirma coleta → status muda para "Coletado"
8. Navega até entrega → abre Google Maps/Waze
9. Confirma entrega → foto + assinatura
10. Ganho é creditado → bloqueado até quarta

### 3.5 MÓDULO: Pedidos

**Objetivo**: Ciclo de vida completo dos pedidos.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Criação manual | Pelo admin ou estabelecimento | Crítica |
| Agendamento | Pedido para horário futuro | Crítica |
| Multi-parada | Várias entregas em uma rota | Alta |
| Agrupamento | Combinar pedidos próximos | Alta |
| Otimização de rotas | Melhor sequência | Alta |
| Edição pós-aceite | Alterar valores, endereço | Alta |
| Cancelamento | Com reenvio à fila | Alta |
| Troca de entregador | Sem recriar pedido | Alta |
| Link de rastreio | Público, compartilhável | Alta |
| Notificações push | Status atualizado | Alta |

**Status do pedido**:
```
SCHEDULED → PENDING → ACCEPTED → PREPARING → READY → PICKED_UP → DELIVERED
    │           │         │          │          │         │
    │           │         │          │          │         └─→ CANCELLED
    │           │         │          │          └─→ CANCELLED
    │           │         │          └─→ CANCELLED
    │           │         └─→ CANCELLED
    │           └─→ CANCELLED
    └─→ CANCELLED
```

### 3.6 MÓDULO: Distribuição de Pedidos

**Objetivo**: Como os pedidos são oferecidos aos entregadores.

| Método | Descrição | Prioridade |
|--------|-----------|------------|
| Mais próximo (1:1) | Oferece ao mais próximo, depois ao próximo | Crítica |
| Broadcast | Oferece a todos simultaneamente | Alta |
| Fila ordenada | Fila única, próximo da fila recebe | Alta |
| Manual | Admin atribui diretamente | Crítica |
| Fila por estabelecimento | Fila separada por loja | Média |
| Entregadores priorizados | Fixos por estabelecimento | Média |

**Configurações de distribuição**:
- Distância máxima para ofertas (km)
- Tempo de aceite configurável (segundos)
- Máximo de pedidos simultâneos por entregador
- Sistema de penalidades por rejeição

### 3.7 MÓDULO: Tarifas e Precificação

**Objetivo**: Como o frete é calculado.

| Método | Descrição | Prioridade |
|--------|-----------|------------|
| Por quilômetro (KM) | Preço × distância | Crítica |
| Tarifa fixa | Valor fixo por entrega | Alta |
| Por faixas de KM | 0-3km: R$8, 3-5km: R$12, etc. | Alta |
| Por bairro/região | Preço por bairro | Alta |
| Por área desenhada | Polígonos no mapa | Média |
| Método combinado | Misturar métodos | Média |

**Configurações adicionais**:
- Múltiplas tabelas de preço (por cliente, serviço, veículo)
- Taxa de chuva automática
- Taxa de cancelamento
- Taxa de retorno ao ponto de coleta
- Tarifa dinâmica por demanda (multiplicador por horário/região)
- Raio mínimo e máximo de entrega

### 3.8 MÓDULO: Financeiro e Carteiras

**Objetivo**: Gestão financeira completa.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Carteira do entregador | Saldo disponível + bloqueado | Crítica |
| Carteira do cliente | Crédito pré-pago | Alta |
| Repasse automático | Regras configuráveis | Alta |
| Saque via PIX | Direto do app | Alta |
| Pagamento faturado | Crédito para estabelecimentos | Alta |
| Geração de faturas | Automática, mensal | Alta |
| Bônus por metas | Manual ou automático | Média |
| Desafios e gamificação | Engajamento de entregadores | Média |

**Fluxo financeiro**:
```
Entrega concluída
    ↓
Ganho creditado (bloqueado)
    ↓
Delay de 2-4 dias
    ↓
Saldo desbloqueado (disponível)
    ↓
Entregador solicita saque (PIX)
    ↓
Transferência processada
```

### 3.9 MÓDULO: Integrações

**Objetivo**: Conectar com plataformas externas.

| Plataforma | Tipo | Prioridade |
|------------|------|------------|
| iFood | Recebimento de pedidos | Alta |
| 99Food | Recebimento de pedidos | Alta |
| AiqFome | Recebimento de pedidos | Média |
| Anota AI | Recebimento de pedidos | Média |
| WhatsApp | Notificações + pedidos | Alta |
| Asaas | Gateway de pagamento | Alta |
| Mercado Pago | Gateway de pagamento | Média |
| Open Delivery | Padrão aberto | Média |
| Webhooks genéricos | Para qualquer sistema | Alta |

### 3.10 MÓDULO: Mapa e Geolocalização

**Objetivo**: Mapa profissional incluso em todos os planos.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Mapa em tempo real | Entregadores, pedidos, entregas | Crítica |
| Roteirização otimizada | Melhor sequência de entregas | Alta |
| Geocoding ilimitado | Endereços → coordenadas | Crítica |
| Cálculo de distância | Por estrada (não linha reta) | Alta |
| ETA em tempo real | Tempo estimado de chegada | Alta |
| Áreas e polígonos | Cobertura, tarifa dinâmica | Média |
| Histórico de trajeto | Rota percorrida | Média |
| Abrir rota externa | Google Maps, Waze | Crítica |

### 3.11 MÓDULO: Segurança

**Objetivo**: Proteção ponta a ponta.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Raio de validação GPS | Coleta e entrega | Alta |
| Código de coleta | Anti-fraude | Alta |
| Código de entrega | Anti-fraude | Alta |
| Prova com foto | Comprovante de entrega | Crítica |
| Prova com assinatura | Digital | Média |
| Bloqueio por rejeições | Automático | Alta |
| Cadastros sob aprovação | Admin aprova | Crítica |
| Documentação obrigatória | CNH, foto | Alta |
| Log de auditoria | Compliance | Média |
| Proteção anti-bot | Cadastros e logins | Média |
| Conformidade LGPD | Dados protegidos | Alta |

### 3.12 MÓDULO: Relatórios e Analytics

**Objetivo**: Inteligência de negócio.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Dashboard em tempo real | Stats ao vivo | Crítica |
| Ranking de entregadores | Por entregas, avaliação | Alta |
| Ranking de clientes | Por volume, faturamento | Alta |
| Relatórios financeiros | Receita, custos, lucro | Alta |
| Filtros avançados | Data, status, cliente, entregador | Alta |
| Exportação Excel/CSV | Todos os dados | Alta |
| Relatório diário por e-mail | Automático | Média |

### 3.13 MÓDULO: WhatsApp e Atendimento

**Objetivo**: Comunicação integrada.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Envio automático de status | A cada mudança | Crítica |
| Recebimento de pedidos | Via WhatsApp | Alta |
| Chat com entregador | Dentro do app | Alta |
| Chat com suporte | Dentro do app | Alta |
| Avisos da plataforma | Comunicados do admin | Média |

### 3.14 MÓDULO: Marketing e Crescimento

**Objetivo**: Ferramentas de crescimento.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Google Analytics | GA4 | Baixa |
| Google Tag Manager | Tags | Baixa |
| Meta/Facebook Pixel | Remarketing | Baixa |
| TikTok Pixel | Anúncios | Baixa |
| Posts diários | Redes sociais | Baixa |

### 3.15 MÓDULO: API para Desenvolvedores

**Objetivo**: Integração externa.

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| API REST completa | Documentada | Alta |
| Webhooks em tempo real | Eventos do pedido | Alta |
| Múltiplas chaves | Por cliente | Média |
| Open Delivery | Padrão aberto | Média |
| Mapas e rotas via API | Cálculo de distância | Média |

---

## 4. PLANOS E PREÇOS (Sugestão)

### 4.1 Planos para Administradores

| Plano | Entregas/mês | Preço | Entregadores | Clientes |
|-------|-------------|-------|--------------|----------|
| **Gratuito** | 100 | R$ 0 | 2 | 20 |
| **Básico** | 500 | R$ 199 | Ilimitado | Ilimitado |
| **Premium** | 2.000 | R$ 579 | Ilimitado | Ilimitado |
| **Platina** | 10.000 | R$ 1.999 | Ilimitado | Ilimitado |
| **Customizado** | Ilimitado | Sob consulta | Ilimitado | Ilimitado |

### 4.2 Entregas Adicionais

| Plano | Preço por entrega adicional |
|-------|----------------------------|
| Gratuito | Não permite |
| Básico | R$ 0,35 |
| Premium | R$ 0,25 |
| Platina | R$ 0,15 |

### 4.3 Add-ons

| Add-on | Preço |
|--------|-------|
| App do Entregador com marca | R$ 999/ano |
| App do Cliente com marca | R$ 699/ano |
| Domínio próprio | R$ 199/ano |
| WhatsApp prioritário | Incluso no Premium+ |
| Gerente de conta dedicado | Incluso no Platina |

---

## 5. PLANO DE DESENVOLVIMENTO

### 5.1 FASE 1: Fundação Multi-Tenant (4-6 semanas)

**Objetivo**: Transformar o muv.log atual em uma plataforma multi-tenant.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Modelo Tenant | Criar tabela de organizações | Crítica |
| Isolamento de dados | Cada tenant só vê seus dados | Crítica |
| Login por tenant | Autenticação isolada | Crítica |
| Configurações por tenant | Logo, cores, nome | Alta |
| Subdomínio por tenant | empresa.muv.log.br | Alta |
| Planos e limites | Controle de entregas/mês | Alta |

### 5.2 FASE 2: Pedidos e Distribuição (4-6 semanas)

**Objetivo**: Sistema completo de pedidos com múltiplos métodos de distribuição.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Multi-parada | Várias entregas em uma rota | Crítica |
| Agrupamento | Combinar pedidos próximos | Alta |
| Otimização de rotas | Melhor sequência | Alta |
| Broadcast | Toque para todos | Alta |
| Fila ordenada | Fila única de entregadores | Alta |
| Link de rastreio | Público, compartilhável | Alta |
| Edição completa | Todos os campos do pedido | Alta |

### 5.3 FASE 3: Tarifas e Precificação (3-4 semanas)

**Objetivo**: Múltiplos métodos de cálculo de frete.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Tarifa por KM | Já existe | Crítica |
| Tarifa fixa | Valor fixo por entrega | Alta |
| Por faixas de KM | 0-3km, 3-5km, etc. | Alta |
| Por bairro/região | Preço por bairro | Alta |
| Múltiplas tabelas | Por cliente, serviço | Alta |
| Taxa de chuva | Automática | Média |
| Taxa de cancelamento | Cobrar do cliente | Média |
| Taxa de retorno | Cobrar volta | Média |
| Tarifa dinâmica | Por demanda/horário | Média |

### 5.4 FASE 4: Financeiro e Carteiras (4-5 semanas)

**Objetivo**: Sistema financeiro completo.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Carteira do entregador | Saldo disponível + bloqueado | Crítica |
| Repasse automático | Regras configuráveis | Alta |
| Saque via PIX | Direto do app | Alta |
| Carteira do cliente | Crédito pré-pago | Alta |
| Pagamento faturado | Crédito para estabelecimentos | Alta |
| Geração de faturas | Automática, mensal | Alta |
| Bônus por metas | Manual ou automático | Média |

### 5.5 FASE 5: App do Entregador (6-8 semanas)

**Objetivo**: PWA completo para entregadores.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Dashboard com mapa | Localização + pedidos | Crítica |
| Toggle online/offline | Controlar disponibilidade | Crítica |
| Abas Em Andamento/Pendentes | Gestão de pedidos | Crítica |
| Aceitar/rejeitar | Botões de ação | Crítica |
| Navegação externa | Google Maps/Waze | Crítica |
| Prova de entrega | Foto + assinatura | Alta |
| Carteira | Saldo + histórico | Alta |
| Pedidos agendados | Pendentes + Aceitos | Alta |
| Configurações | Mapa, som, sobreposição | Alta |
| Suporte | Chat com admin | Média |
| Notificações push | Alertas | Alta |

### 5.6 FASE 6: Portal do Estabelecimento (4-5 semanas)

**Objetivo**: Interface white-label para estabelecimentos.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Login/cadastro | Autenticação | Crítica |
| Criar pedido | Formulário com mapa | Crítica |
| Acompanhar pedidos | Lista com filtros | Crítica |
| Rastreamento ao vivo | Mapa com entregador | Alta |
| Histórico | Busca por período | Alta |
| Financeiro | Faturas, extratos | Alta |
| Perfil | Editar dados | Média |
| White-label | Logo, cores, nome | Alta |
| Link de rastreio | Público | Alta |

### 5.7 FASE 7: Integrações (4-6 semanas)

**Objetivo**: Conectar com plataformas externas.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| WhatsApp API | Notificações + pedidos | Crítica |
| iFood | Recebimento de pedidos | Alta |
| 99Food | Recebimento de pedidos | Alta |
| Asaas | Gateway de pagamento | Alta |
| Webhooks genéricos | Para qualquer sistema | Alta |
| Open Delivery | Padrão aberto | Média |

### 5.8 FASE 8: Segurança e Compliance (2-3 semanas)

**Objetivo**: Proteção e conformidade.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Raio de validação GPS | Coleta e entrega | Alta |
| Código de coleta/entrega | Anti-fraude | Alta |
| Bloqueio por rejeições | Automático | Alta |
| Documentação obrigatória | CNH, foto | Alta |
| Log de auditoria | Compliance | Média |
| Conformidade LGPD | Dados protegidos | Alta |

### 5.9 FASE 9: Relatórios e Analytics (2-3 semanas)

**Objetivo**: Inteligência de negócio.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Dashboard em tempo real | Stats ao vivo | Crítica |
| Ranking de entregadores | Por entregas, avaliação | Alta |
| Ranking de clientes | Por volume, faturamento | Alta |
| Relatórios financeiros | Receita, custos, lucro | Alta |
| Exportação Excel/CSV | Todos os dados | Alta |
| Relatório diário por e-mail | Automático | Média |

### 5.10 FASE 10: API para Desenvolvedores (2-3 semanas)

**Objetivo**: Integração externa.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| API REST completa | Documentada | Alta |
| Webhooks em tempo real | Eventos do pedido | Alta |
| Múltiplas chaves | Por cliente | Média |
| Open Delivery | Padrão aberto | Média |

### 5.11 FASE 11: Marketing e Crescimento (1-2 semanas)

**Objetivo**: Ferramentas de crescimento.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Google Analytics | GA4 | Baixa |
| Google Tag Manager | Tags | Baixa |
| Meta/Facebook Pixel | Remarketing | Baixa |
| TikTok Pixel | Anúncios | Baixa |

### 5.12 FASE 12: IAGo - Operador Digital (4-6 semanas)

**Objetivo**: Bot de IA para atendimento.

| Tarefa | Descrição | Prioridade |
|--------|-----------|------------|
| Bot WhatsApp | Atendimento 24h | Média |
| Consulta de pedidos | Status automático | Média |
| Lançamento de solicitações | Via chat | Média |
| Redução de mensagens | Automação | Média |

---

## 6. CRONOGRAMA ESTIMADO

| Fase | Duração | Dependências |
|------|---------|--------------|
| 1. Fundação Multi-Tenant | 4-6 semanas | — |
| 2. Pedidos e Distribuição | 4-6 semanas | Fase 1 |
| 3. Tarifas e Precificação | 3-4 semanas | Fase 2 |
| 4. Financeiro e Carteiras | 4-5 semanas | Fase 3 |
| 5. App do Entregador | 6-8 semanas | Fase 4 |
| 6. Portal do Estabelecimento | 4-5 semanas | Fase 4 |
| 7. Integrações | 4-6 semanas | Fase 5 |
| 8. Segurança e Compliance | 2-3 semanas | Fase 5 |
| 9. Relatórios e Analytics | 2-3 semanas | Fase 4 |
| 10. API para Desenvolvedores | 2-3 semanas | Fase 7 |
| 11. Marketing e Crescimento | 1-2 semanas | Fase 6 |
| 12. IAGo - Operador Digital | 4-6 semanas | Fase 7 |

**Total estimado**: 40-57 semanas (10-14 meses)

---

## 7. TECNOLOGIAS

### 7.1 Frontend
- **Framework**: React 19 + Vite
- **Estilo**: Tailwind CSS v4 + shadcn/ui
- **Mapas**: Leaflet (OpenStreetMap)
- **HTTP**: Axios
- **Roteamento**: React Router v7
- **Estado**: React Context API
- **PWA**: Service Worker + Manifest

### 7.2 Backend
- **Framework**: Flask (Python 3)
- **ORM**: SQLAlchemy
- **Auth**: Flask-JWT-Extended
- **Banco**: PostgreSQL (produção) / SQLite (desenvolvimento)
- **Geocoding**: Nominatim (OpenStreetMap)
- **WhatsApp**: WhatsApp Business API
- **Pagamentos**: Asaas, Mercado Pago

### 7.3 Infraestrutura
- **Frontend**: Vercel
- **Backend**: Render
- **Banco**: Render PostgreSQL
- **CDN**: Cloudflare
- **Monitoramento**: Sentry, UptimeRobot

### 7.4 Apps Mobile
- **Entregador**: PWA (Progressive Web App)
- **Cliente**: PWA (Progressive Web App)
- **Futuro**: React Native (apps nativos)

---

## 8. MÉTRICAS DE SUCESSO

### 8.1 Técnicas
- Uptime: 99.9%
- Tempo de resposta API: < 200ms
- Tempo de carga do mapa: < 2s
- Notificação push: < 5s

### 8.2 Negócio
- Administradores ativos: 10+ no primeiro ano
- Entregas processadas: 10.000+/mês
- Receita mensal: R$ 10.000+
- Churn mensal: < 5%

---

## 9. RISCOS E MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Complexidade multi-tenant | Alto | Começar simples, evoluir |
| Concorrência (Entregas Expressas) | Alto | Foco em preço e suporte |
| Escalabilidade | Médio | Arquitetura modular |
| Integrações externas | Médio | Webhooks genéricos |
| Segurança de dados | Alto | LGPD, auditoria |

---

## 10. PRÓXIMOS PASSOS IMEDIATOS

1. **Revisar este escopo** — Confirmar prioridades e ajustar
2. **Definir MVP** — O que é essencial para o primeiro cliente?
3. **Começar pela Fase 1** — Fundação multi-tenant
4. **Testar cada fase** — Antes de avançar
5. **Documentar decisões** — Para manter consistência

---

**Este documento é a base para o redesenho completo do muv.log como plataforma SaaS white-label de gestão de entregas.**
