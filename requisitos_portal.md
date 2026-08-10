# Requisitos do Portal muv.log

**Aperfeiçoado por:** MiMo 2.5 | **Atualizado:** 25/07/2026

---

## 1. Requisitos Funcionais

### 1.1 Autenticação
- Login com email/senha
- Registro de entregador (multi-step)
- Registro de estabelecimento (multi-step com endereço)
- Logout seguro
- Alteração de senha

### 1.2 Entregador
- Dashboard com estatísticas
- Toggle online/offline
- Pedidos disponíveis (abas: Disponíveis / Em Andamento)
- Aceitar/recusar pedidos
- Mapa de rota com endereços
- Navegação externa (Google Maps)
- Histórico de entregas
- Ranking e bônus
- Perfil editável

### 1.3 Estabelecimento
- Criar pedidos
- Acompanhar pedidos
- Financeiro com faturas
- Integrações (iFood, 99Food, etc)
- Perfil editável com geolocalização

### 1.4 Administrador
- Dashboard com mapa em tempo real
- Gestão de entregadores
- Gestão de estabelecimentos
- Gestão de pedidos
- Configurações de praça
- Relatórios financeiros
- Sistema de bônus

---

## 2. Requisitos Não-Funcionais

### 2.1 Performance
- Dashboard carrega em < 3 segundos
- API responde em < 1 segundo
- Mapa renderiza em < 2 segundos

### 2.2 Segurança
- Autenticação JWT
- Senhas com hash PBKDF2-SHA256
- CORS configurado
- Validação de dados

### 2.3 Disponibilidade
- 99.9% uptime (plano pago)
- Cold start 5-10min (plano gratuito)

---

## 3. Modelo Financeiro

```
Frete = max(distância, 4km) × Preço/KM
Entregador: 65% do frete
Bônus Pool: 5% do frete
Muv: 30% do frete
```

---

## 4. Integrações

- WhatsApp Business API
- Nominatim (geocoding)
- iFood, 99Food, InstaDelivery, SaiPos (webhooks)
