# PLANO: Super Admin Dashboard - muv.log Platform

## Visão Geral

O Super Admin é o **dono da plataforma** que vende o sistema para outros admins (estabelecimentos/empresas). Ele precisa de um dashboard completo para gerenciar clientes, pagamentos, suporte e monitoramento.

---

## 1. HIERARQUIA DE USUÁRIOS

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN (Você)                        │
│                    /platform                                 │
│                    Acesso TOTAL ao sistema                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN (Cliente)                           │
│                    /admin                                    │
│                    Gerencia SEUS entregadores/estabelecimentos│
│                    Isolado por tenant_id                     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   ESTABELECIMENTO       │     │   ENTREGADOR            │
│   /client               │     │   /dashboard            │
│   Cria pedidos          │     │   Executa entregas      │
└─────────────────────────┘     └─────────────────────────┘
```

---

## 2. FUNCIONALIDADES DO SUPER ADMIN

### 2.1 Dashboard Principal (/platform)

**Cards de Resumo:**
- Total de Admins ativos
- Total de Estabelecimentos
- Total de Entregadores
- Total de Pedidos (mês)
- Receita da Plataforma (mês)
- MRR (Monthly Recurring Revenue)

**Gráficos:**
- Receita mensal (últimos 12 meses)
- Novos admins por mês
- Pedidos por dia (últimos 30 dias)
- Mapa de admins por região

### 2.2 Gestão de Admins (/platform/admins)

**Lista de Admins:**
| Coluna | Descrição |
|--------|-----------|
| Nome/Empresa | Nome do admin |
| Email | Email de login |
| Plano | Basic / Pro / Enterprise |
| Status | Ativo / Inadimplente / Suspenso |
| Estabelecimentos | Quantidade |
| Entregadores | Quantidade |
| Pedidos/mês | Volume |
| Valor Mensal | Quanto paga |
| Próximo Pagamento | Data |
| Ações | Ver / Editar / Suspender / Excluir |

**Detalhes do Admin:**
- Dados da empresa
- Configurações do plano
- Histórico de pagamentos
- Estabelecimentos vinculados
- Entregadores vinculados
- Tickets de suporte
- Logs de atividade

### 2.3 Gestão de Planos (/platform/plans)

**Planos Disponíveis:**
| Plano | Preço | Limite |
|-------|-------|--------|
| **Starter** | R$ 99/mês | 1 estabelecimento, 5 entregadores |
| **Basic** | R$ 199/mês | 3 estabelecimentos, 15 entregadores |
| **Pro** | R$ 399/mês | 10 estabelecimentos, 50 entregadores |
| **Enterprise** | R$ 799/mês | Ilimitado |

**Configurações por Plano:**
- Limite de estabelecimentos
- Limite de entregadores
- Limite de pedidos/mês
- Recursos habilitados (WhatsApp, iFood, etc.)
- Suporte (email, chat, telefone)
- SLA de suporte

### 2.4 Financeiro (/platform/finance)

**Resumo Financeiro:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn Rate (taxa de cancelamento)
- LTV (Lifetime Value por cliente)
- CAC (Customer Acquisition Cost)

**Faturas:**
| Coluna | Descrição |
|--------|-----------|
| Admin | Nome do cliente |
| Período | Mês/Ano |
| Valor | Valor da fatura |
| Status | Pago / Pendente / Atrasado |
| Método | PIX / Cartão / Boleto |
| Vencimento | Data |
| Ações | Ver / Enviar / Marcar como pago |

**Relatórios:**
- Receita por plano
- Receita por região
- Inadimplência
- Projeção de crescimento

### 2.5 Suporte (/platform/support)

**Tickets de Suporte:**
| Coluna | Descrição |
|--------|-----------|
| # | ID do ticket |
| Admin | Quem abriu |
| Assunto | Resumo |
| Prioridade | Alta / Média / Baixa |
| Status | Aberto / Em Andamento / Resolvido |
| Data | Quando abriu |
| Ações | Responder / Atribuir / Fechar |

**Sistema de Chat:**
- Chat interno com cada admin
- Histórico de conversas
- Notificações de novas mensagens

### 2.6 Monitoramento (/platform/monitoring)

**Saúde do Sistema:**
- Status da API (online/offline)
- Tempo de resposta médio
- Erros 500 (últimas 24h)
- Uso de CPU/Memória
- Espaço em disco

**Métricas por Admin:**
- Pedidos por hora
- Entregadores online
- Tempo médio de entrega
- Taxa de cancelamento

### 2.7 Configurações (/platform/settings)

**Configurações da Plataforma:**
- Nome da empresa
- Logo
- Cores do tema
- Configurações de email
- Configurações de pagamento (Stripe/Asaas)
- Webhooks

**Configurações de Segurança:**
- 2FA obrigatório
- IP whitelist
- Logs de acesso

---

## 3. MODELO DE DADOS NOVOS

### 3.1 Tabela: `platform_admins`
```sql
CREATE TABLE platform_admins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    company_name VARCHAR(200),
    cnpj VARCHAR(20),
    phone VARCHAR(20),
    address TEXT,
    plan_type VARCHAR(20) DEFAULT 'starter',
    plan_price DECIMAL(10,2),
    plan_start_date DATE,
    plan_end_date DATE,
    max_establishments INTEGER DEFAULT 1,
    max_drivers INTEGER DEFAULT 5,
    max_orders_month INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'active',
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Tabela: `platform_invoices`
```sql
CREATE TABLE platform_invoices (
    id SERIAL PRIMARY KEY,
    platform_admin_id INTEGER REFERENCES platform_admins(id),
    period_start DATE,
    period_end DATE,
    amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    payment_date TIMESTAMP,
    stripe_invoice_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 Tabela: `platform_tickets`
```sql
CREATE TABLE platform_tickets (
    id SERIAL PRIMARY KEY,
    platform_admin_id INTEGER REFERENCES platform_admins(id),
    subject VARCHAR(200),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.4 Tabela: `platform_messages`
```sql
CREATE TABLE platform_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES platform_tickets(id),
    sender_id INTEGER REFERENCES users(id),
    message TEXT,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.5 Tabela: `platform_audit_logs`
```sql
CREATE TABLE platform_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. FLUXOS DE TRABALHO

### 4.1 Onboarding de Novo Admin

```
1. Admin se cadastra (/register com tenant_slug)
   ↓
2. Sistema cria user com status INACTIVE
   ↓
3. Super Admin recebe notificação
   ↓
4. Super Admin revisa cadastro
   ↓
5. Super Admin aprova e define plano
   ↓
6. Sistema envia email de boas-vindas
   ↓
7. Admin faz login e configura sistema
```

### 4.2 Cobrança Mensal

```
1. Sistema gera fatura todo dia 1
   ↓
2. Envia email com link de pagamento
   ↓
3. Admin paga (PIX/Cartão/Boleto)
   ↓
4. Sistema confirma pagamento
   ↓
5. Status atualizado para "Pago"
   ↓
6. Se não pagar em 7 dias → aviso
   ↓
7. Se não pagar em 15 dias → suspensão
```

### 4.3 Suporte Técnico

```
1. Admin abre ticket (/support)
   ↓
2. Super Admin recebe notificação
   ↓
3. Super Admin responde/atribui
   ↓
4. Conversa via chat interno
   ↓
5. Ticket é resolvido
   ↓
6. Avaliação do atendimento
```

---

## 5. TELAS NECESSÁRIAS

### 5.1 Frontend (React)

```
/platform
├── /platform/dashboard      → Dashboard principal
├── /platform/admins         → Lista de admins
├── /platform/admins/:id     → Detalhes do admin
├── /platform/plans          → Gestão de planos
├── /platform/finance        → Financeiro
├── /platform/invoices       → Faturas
├── /platform/support        → Tickets de suporte
├── /platform/support/:id    → Ticket individual
├── /platform/monitoring     → Monitoramento
├── /platform/settings       → Configurações
└── /platform/reports        → Relatórios
```

### 5.2 Backend (Flask)

```
/api/platform/dashboard      → GET  Stats gerais
/api/platform/admins         → GET  Lista de admins
/api/platform/admins/:id     → GET/PUT/DELETE Admin específico
/api/platform/admins         → POST Criar admin
/api/platform/plans          → GET/POST Planos
/api/platform/invoices       → GET  Faturas
/api/platform/invoices/:id   → GET  Fatura específica
/api/platform/tickets        → GET/POST Tickets
/api/platform/tickets/:id    → GET/PUT Ticket específico
/api/platform/messages       → GET/POST Mensagens
/api/platform/monitoring     → GET  Métricas
/api/platform/audit-logs     → GET  Logs de auditoria
```

---

## 6. INTEGRAÇÕES NECESSÁRIAS

### 6.1 Pagamentos (Stripe ou Asaas)
- Cobrança recorrente
- Webhooks de pagamento
- Faturas automáticas
- Cancelamento/upgrade de plano

### 6.2 Email (SendGrid)
- Email de boas-vindas
- Faturas mensais
- Notificações de suporte
- Alertas de inadimplência

### 6.3 WhatsApp (Business API)
- Notificações de fatura
- Alertas de suporte
- Comunicação com admins

---

## 7. PRIORIDADES DE DESENVOLVIMENTO

### Fase 1 - Fundação (1-2 semanas)
- [ ] Criar modelo de dados (platform_admins, platform_invoices)
- [ ] Implementar criação de admin via Super Admin
- [ ] Dashboard básico com métricas
- [ ] Lista de admins

### Fase 2 - Gestão (2-3 semanas)
- [ ] Detalhes do admin (ver/editar)
- [ ] Gestão de planos
- [ ] Financeiro básico
- [ ] Faturas

### Fase 3 - Suporte (2-3 semanas)
- [ ] Sistema de tickets
- [ ] Chat interno
- [ ] Notificações

### Fase 4 - Automação (3-4 semanas)
- [ ] Cobrança recorrente (Stripe)
- [ ] Faturas automáticas
- [ ] Suspensão por inadimplência
- [ ] Relatórios avançados

### Fase 5 - Monitoramento (2-3 semanas)
- [ ] Métricas de sistema
- [ ] Logs de auditoria
- [ ] Alertas automáticos

---

## 8. CONSIDERAÇÕES IMPORTANTES

### 8.1 Isolamento de Dados
- Cada admin tem `tenant_id` isolado
- Super Admin vê tudo, mas dados ficam no mesmo banco
- Políticas de acesso baseadas em `user_type`

### 8.2 Segurança
- Super Admin precisa de 2FA
- Logs de todas as ações
- Backup automático do banco

### 8.3 Escalabilidade
- Índices em `tenant_id` em todas as tabelas
- Paginação em todas as listas
- Cache de métricas (Redis)

### 8.4 Legal
- Termos de uso para admins
- Política de privacidade (LGPD)
- Contrato de prestação de serviço

---

## 9. PRÓXIMOS PASSOS

1. **Definir modelo de negócio:**
   - Quanto cobrar por plano?
   - Quais recursos por plano?
   - Qual período de trial?

2. **Escolher gateway de pagamento:**
   - Stripe (internacional)
   - Asaas (nacional)
   - PagSeguro

3. **Implementar Fase 1:**
   - Criar tabelas no banco
   - Dashboard básico do Super Admin
   - Criação de admins

---

## 10. TELA DE CRIAÇÃO DE ADMIN (Implementação Imediata)

Enquanto o plano completo não é implementado, podemos criar uma tela simples no `/platform` para:

1. **Criar novo admin** com:
   - Nome da empresa
   - Email
   - Senha
   - Plano escolhido
   - Limite de entregadores

2. **Listar admins** existentes

3. **Editar/Suspender** admins

4. **Ver métricas** básicas de cada admin

Isso permite começar a vender o sistema imediatamente.
