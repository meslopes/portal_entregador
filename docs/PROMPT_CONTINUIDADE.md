# Prompt de Continuidade — Portal Entregador (MuvLog)

## Como usar
Cole este prompt no início de uma nova sessão do MiMoCode para continuar de onde paramos.

---

## INÍCIO DO PROMPT

Você está trabalhando no projeto **Portal Entregador (MuvLog)** — um sistema de delivery SaaS multi-tenant.

### Estrutura do Projeto
- **Repositório GitHub**: https://github.com/meslopes/portal_entregador
- **Código local**: `C:\Users\Dell\portal_entregador\portal_entregador\`
- **Frontend**: `portal-frontend/` (React + Vite + Leaflet)
- **Backend**: `portal-backend/` (Flask + SQLAlchemy + PostgreSQL)
- **Deploy Frontend**: Vercel (portal-entregador-gamma.vercel.app)
- **Deploy Backend**: Render (muvlog-api.onrender.com)

### IMPORTANTE: Como Trabalhar
1. **SEMPRE** faça `git pull origin main` antes de começar a trabalhar
2. **SEMPRE** faça `git add -A && git commit -m "msg" && git push origin main` ao final de cada ajuste significativo
3. O deploy é **automático** — push no GitHub dispara deploy no Vercel e Render
4. **NÃO** crie arquivos duplicados — verifique se já existe antes de criar
5. O código no GitHub é a **fonte da verdade**, não o local

### Arquitetura
- **Multi-tenant**: Cada estabelecimento é um tenant
- **Super Admin (Platform)**: Usuário ADMIN sem `tenant_id` (ex: meslopes@gmail.com) acessa `/platform`
- **Admin**: Usuário ADMIN com `tenant_id` acessa `/admin`
- **Estabelecimento (Client)**: Usuário CLIENT acessa `/client`
- **Entregador (Driver)**: Usuário DRIVER acessa `/dashboard`
- **Entregador Próprio**: Acessa `/own-driver`

### Fluxo de Status dos Pedidos
```
PENDING → ACCEPTED → PICKED_UP → DELIVERED
```
- **PREPARING e READY foram removidos** — não usar

### Sistema de Praças
- Praças são regiões geográficas de operação
- Cada praça tem tabela de preços configurável
- 6 tipos de cobrança: por_km, fixed, percentage, daily, fixed_plus_delivery, fixed_up_to_extra

### Geocoding
- Usa Nominatim (OpenStreetMap) — gratuito, sem API key
- **NUNCA** usar coordenadas aproximadas — se não encontrar endereço exato, retornar erro
- Arquivo: `portal-backend/src/utils/geocoding.py`

### Super Admin (Platform)
- O platform **JÁ EXISTE** no deploy e está funcionando
- **NÃO** recriar o platform — ele foi feito em outra sessão
- Os ajustes no platform serão feitos **por último**
- Credenciais: meslopes@gmail.com / admin123

### Ajustes Já Concluídos
1. ✅ Geocoding estrito (sem coordenadas aproximadas)
2. ✅ Encoding corrigido (Ações, Veículo, Praça, etc.)
3. ✅ Filtro do Financeiro corrigido (removido botões duplicados)
4. ✅ Código sincronizado com GitHub

### Ajustes Pendentes (PRÓXIMOS)
1. **Pagamentos Próprios → Estabelecimento**: Mover a página `AdminDriverPaymentsPage` para o estabelecimento, integrando com a aba "Entregadores Próprios"
2. **Assinaturas → Asaas**: Verificar se a cobrança é enviada para o Asaas (API de cobranças). Se não, integrar. A palavra "pagar" induz ideia errada — quem paga é o estabelecimento para o admin
3. **Pin dragging no mapa**: Permitir arrastar pino no mapa para ajustar localização quando endereço não é encontrado (marcar para futuro quando usar API paga)

### Ajustes Pendentes no Platform (SUPER ADMIN) — FAZER POR ÚLTIMO
1. Remover Dashboard, Tenants, Usuários do cabeçalho (redundante com sidebar)
2. Botão "Atualizar" ao lado do botão do banco de dados deve funcionar
3. Top Tenants por Pedidos deve mostrar quantidade de pedidos
4. Usuários por Tenant: adicionar botões de edição e exclusão + popup de edição
5. Admins: adicionar botão de edição (exclusão já existe)
6. Na sidebar do admin, ao lado do filtro, adicionar botão "Atualizar"
7. "Ver pedido no mapa": verificar funcionalidade, mostrar mensagem se sem geolocalização
8. Praças: botão ativar/desativar funcional
9. Criação de praça: mais opções de cobrança (já feito no AdminSquaresPage)

### Estrutura de Arquivos Importantes
```
portal-backend/
├── src/
│   ├── models/
│   │   ├── portal_models.py    # User, Driver, Restaurant, Order, Square, etc.
│   │   └── platform_models.py  # Tenant, Subscription
│   ├── routes/
│   │   ├── admin.py            # Rotas admin (dashboard, drivers, orders, squares)
│   │   ├── auth.py             # Login, registro
│   │   ├── order.py            # Pedidos, geocoding
│   │   ├── platform.py         # Super admin (tenants, users, admins)
│   │   ├── finance.py          # Financeiro
│   │   └── driver.py           # Entregador
│   └── utils/
│       └── geocoding.py        # Geocoding via Nominatim

portal-frontend/
├── src/
│   ├── pages/
│   │   ├── admin/              # Páginas do admin
│   │   ├── client/             # Páginas do estabelecimento
│   │   ├── own-driver/         # Páginas do entregador próprio
│   │   └── platform/           # Páginas do super admin
│   ├── components/
│   │   ├── DeliveryMap.jsx     # Componente de mapa (Leaflet)
│   │   └── Layout.jsx          # Layout principal
│   └── lib/
│       └── api.js              # Serviços da API
```

### Comandos Úteis
```bash
# Sync com GitHub
git pull origin main

# Deploy
git add -A && git commit -m "descrição" && git push origin main

# Build frontend (verificar erros)
cd portal-frontend && npm run build

# Verificar backend
cd portal-backend && python -c "from src.main import app; print('OK')"
```

### Contexto do Usuário
- Usuário: Emmanuel (meslopes@gmail.com)
- Sistema em produção, trabalhando com deploy real
- Comunicação em português
- Prefere que eu faça ajustes e avise quando terminar para revisar

## FIM DO PROMPT
