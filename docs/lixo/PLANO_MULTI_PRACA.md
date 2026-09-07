# PLANO: Sistema Multi-Praça

## Hierarquia Atualizada

```
ADMIN (dono da empresa de delivery)
    │
    ├── PRAÇA 1: Capão da Canoa
    │   ├── Estabelecimentos (restaurantes, farmácias, etc.)
    │   ├── Entregadores vinculados à praça
    │   ├── Pedidos da praça
    │   └── Tabela de Preços (configurável por estabelecimento)
    │
    └── PRAÇA 2: Imbé
        ├── Estabelecimentos
        ├── Entregadores vinculados à praça
        ├── Pedidos da praça
        └── Tabela de Preços
```

## Mudanças no Modelo de Dados

### 1. Adicionar `square_id` nas tabelas:

| Tabela | Coluna | Descrição |
|--------|--------|-----------|
| `orders` | `square_id` | Pedido vinculado à praça |
| `drivers` | `square_id` | Entregador vinculado à praça |
| `customers` | `square_id` | Cliente vinculado à praça |
| `restaurants` | `square_id` | Estabelecimento vinculado à praça |

### 2. Tabela `square_configs` (nova)

Configurações específicas por praça:
```sql
CREATE TABLE square_configs (
    id SERIAL PRIMARY KEY,
    square_id INTEGER REFERENCES squares(id),
    pricing_table_id INTEGER REFERENCES pricing_tables(id),
    max_drivers INTEGER DEFAULT 50,
    max_orders_day INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Funcionalidades

### 1. Seletor de Praça (Header)
- Dropdown no header do admin mostra todas as praças
- Ao trocar, todos os dados são filtrados pela praça
- Salva seleção no localStorage

### 2. Cadastro de Estabelecimento
- Ao criar, admin seleciona a praça
- Define qual tabela de preços usar

### 3. Cadastro de Entregador
- Ao criar, admin seleciona a praça
- Entregador só vê pedidos da sua praça

### 4. Pedidos
- Pedido é criado na praça do estabelecimento
- Entregador é buscado na mesma praça

### 5. Financeiro
- Relatórios separados por praça
- Consolidado do admin (todas as praças)

## Implementação

### Fase 1: Banco de Dados (1 dia)
- [ ] Adicionar `square_id` em orders, drivers, customers, restaurants
- [ ] Criar tabela square_configs
- [ ] Migrar dados existentes

### Fase 2: Backend (2 dias)
- [ ] Filtrar queries por square_id
- [ ] Endpoints para CRUD de praças
- [ ] Configurações por praça

### Fase 3: Frontend (2 dias)
- [ ] Seletor de praça no header
- [ ] Filtrar dados por praça selecionada
- [ ] Cadastro com seleção de praça

### Fase 4: Testes (1 dia)
- [ ] Testar isolamento por praça
- [ ] Testar troca de praça
- [ ] Testar relatórios

## Tabelas de Preços (Futuro)

Opções de cobrança a implementar:
1. **Por KM** - Preço por quilômetro rodado
2. **Preço Fixo** - Valor fixo por entrega
3. **Por Área** - Preço por região/zona
4. **Misto** - Fixo + por KM
5. **Percentual** - % do valor do pedido
6. **Diária** - Valor fixo por dia
7. **Por Hora** - Valor por hora trabalhada
