# Diagrama de Casos de Uso - MuvLog (Portal Entregador)

## Atores do Sistema

| Ator | Tipo | DescriÃ§Ã£o | Herda de |
|------|------|-----------|----------|
| **Super Admin** | PrimÃ¡rio | Administrador da plataforma (sem tenant) | - |
| **Admin** | PrimÃ¡rio | Administrador do tenant/estabelecimento | Super Admin |
| **Estabelecimento** | PrimÃ¡rio | Dono do restaurante (CLIENT) | - |
| **Entregador Plataforma** | PrimÃ¡rio | Entregador que trabalha para mÃºltiplos restaurantes | - |
| **Entregador PrÃ³prio** | PrimÃ¡rio | Entregador vinculado a um restaurante | - |
| **Cliente Final** | SecundÃ¡rio | Quem faz o pedido (via WhatsApp/iFood/etc) | - |
| **Sistema** | SecundÃ¡rio | Auto-roteirizaÃ§Ã£o, notificaÃ§Ãµes, geocoding | - |

### Regra de HeranÃ§a
**Tudo que o Super Admin pode fazer, o Admin tambÃ©m pode** (dentro do seu tenant).
O Admin herda todas as permissÃµes do Super Admin, mas limitadas ao seu escopo (tenant).

---

## Diagrama de Casos de Uso (Mermaid)

```mermaid
graph TB
    subgraph "PLATAFORMA (Super Admin)"
        SA[Super Admin]
        
        SA --> UC1[Gerenciar Tenants]
        SA --> UC2[Gerenciar PraÃ§as]
        SA --> UC3[Gerenciar UsuÃ¡rios]
        SA --> UC4[Visualizar Dashboard Global]
        SA --> UC5[Gerenciar PreÃ§os e Taxas]
        SA --> UC6[Gerenciar Assinaturas]
        SA --> UC7[Visualizar RelatÃ³rios Financeiros]
        SA --> UC8[Gerenciar IntegraÃ§Ãµes]
        SA --> UC9[Configurar White-Label]
        SA --> UC10[Gerenciar Banco de Dados]
    end
    
    subgraph "ADMINISTRAÃ‡ÃƒO (Admin) - herda de Super Admin"
        AD[Admin]
        
        AD -.->|herda| SA
        AD --> UC11[Gerenciar Estabelecimentos]
        AD --> UC12[Gerenciar Entregadores]
        AD --> UC13[Gerenciar Pedidos]
        AD --> UC14[Gerenciar Rotas]
        AD --> UC15[Gerenciar Rotas da Plataforma]
        AD --> UC16[Configurar RoteirizaÃ§Ã£o]
        AD --> UC17[Visualizar Dashboard]
        AD --> UC18[Gerenciar Financeiro]
        AD --> UC19[Gerenciar Pagamentos]
        AD --> UC20[Visualizar RelatÃ³rios]
        AD --> UC21[Gerenciar Saques]
        AD --> UC22[Gerenciar Faturas]
        AD --> UC23[Atribuir Entregador a Pedido]
        AD --> UC24[Aprovar/Rejeitar UsuÃ¡rios]
        AD --> UC25[Cancelar Pedidos]
        AD --> UC26[Editar Pedidos]
    end
    
    subgraph "ESTABELECIMENTO (Client)"
        ES[Estabelecimento]
        
        ES --> UC27[Criar Pedidos]
        ES --> UC28[Gerenciar Pedidos]
        ES --> UC29[Criar Rotas de Entrega]
        ES --> UC30[Gerenciar Rotas]
        ES --> UC31[Atribuir Entregadores PrÃ³prios]
        ES --> UC32[Gerenciar Entregadores PrÃ³prios]
        ES --> UC33[Visualizar Dashboard]
        ES --> UC34[Visualizar Financeiro]
        ES --> UC35[Configurar IntegraÃ§Ãµes]
        ES --> UC36[Chamar Entregadores da Plataforma]
        ES --> UC37[Avaliar Entregadores]
        ES --> UC38[Visualizar RelatÃ³rios]
    end
    
    subgraph "ENTREGADOR PLATAFORMA"
        EP[Entregador Plataforma]
        
        EP --> UC39[Fazer Login]
        EP --> UC40[Visualizar Dashboard]
        EP --> UC41[Visualizar Pedidos DisponÃ­veis]
        EP --> UC42[Aceitar/Rejeitar Pedidos]
        EP --> UC43[Atualizar Status do Pedido]
        EP --> UC44[Visualizar Rotas AtribuÃ­das]
        EP --> UC45[Aceitar/Rejeitar Rotas]
        EP --> UC46[Concluir Paradas da Rota]
        EP --> UC47[Visualizar Ganhos]
        EP --> UC48[Visualizar HistÃ³rico]
        EP --> UC49[Atualizar LocalizaÃ§Ã£o]
        EP --> UC50[Visualizar Ranking]
        EP --> UC51[Gerenciar Carteira]
    end
    
    subgraph "ENTREGADOR PRÃ“PRIO"
        EPR[Entregador PrÃ³prio]
        
        EPR --> UC52[Fazer Login com PIN]
        EPR --> UC53[Visualizar Dashboard]
        EPR --> UC54[Visualizar Rotas Pendentes]
        EPR --> UC55[Aceitar/Rejeitar Rotas]
        EPR --> UC56[Concluir Paradas da Rota]
        EPR --> UC57[Atualizar Status do Pedido]
        EPR --> UC58[Visualizar Ganhos]
        EPR --> UC59[Visualizar HistÃ³rico]
        EPR --> UC60[Atualizar LocalizaÃ§Ã£o]
    end
    
    subgraph "CLIENTE FINAL"
        CF[Cliente Final]
        
        CF --> UC61[Rastrear Pedido]
        CF --> UC62[Avaliar Entrega]
    end
    
    subgraph "SISTEMA (AutomÃ¡tico)"
        SY[Sistema]
        
        SY --> UC63[Auto-RoteirizaÃ§Ã£o]
        SY --> UC64[Geocodificar EndereÃ§os]
        SY --> UC65[Calcular Rotas Otimizadas]
        SY --> UC66[Enviar NotificaÃ§Ãµes]
        SY --> UC67[Processar Ofertas Expiradas]
        SY --> UC68[Processar Pedidos Agendados]
        SY --> UC69[Calcular Ganhos dos Entregadores]
        SY --> UC70[Gerar RelatÃ³rios]
        SY --> UC71[Integrar com Plataformas Externas]
    end
```

---

## Detalhamento dos Casos de Uso

### 1. SUPER ADMIN

#### UC1: Gerenciar Tenants
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** Criar, editar, ativar/desativar tenants (empresas)
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Super Admin acessa painel de tenants
  2. Cria novo tenant com dados da empresa
  3. Configura limites e permissÃµes
  4. Ativa/desativa tenant
- **Fluxo alternativo:** Tenant com mesmo CNPJ jÃ¡ existe

#### UC2: Gerenciar PraÃ§as
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** Criar e gerenciar praÃ§as (regiÃµes de atendimento)
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Super Admin acessa gestÃ£o de praÃ§as
  2. Cria nova praÃ§a com cidade/estado
  3. Configura preÃ§os e taxas da praÃ§a
  4. Associa estabelecimentos Ã  praÃ§a

#### UC3: Gerenciar UsuÃ¡rios
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** Gerenciar todos os usuÃ¡rios do sistema
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Lista todos os usuÃ¡rios
  2. Aprova/rejeita cadastros pendentes
  3. Edita dados dos usuÃ¡rios
  4. Ativa/desativa usuÃ¡rios

#### UC4: Visualizar Dashboard Global
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** VisÃ£o geral de toda a plataforma
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Visualiza mÃ©tricas globais (pedidos, entregas, receita)
  2. Visualiza mapa com entregadores online
  3. Visualiza status dos tenants

#### UC5: Gerenciar PreÃ§os e Taxas
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** Configurar tabelas de preÃ§os e taxas dinÃ¢micas
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Cria/edita tabelas de preÃ§os
  2. Configura taxas por praÃ§a
  3. Configura preÃ§os dinÃ¢micos (horÃ¡rio, demanda)

#### UC6: Gerenciar Assinaturas
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** Gerenciar assinaturas dos estabelecimentos
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Visualiza assinaturas ativas
  2. Configura planos
  3. Gerencia cobranÃ§as

#### UC7: Visualizar RelatÃ³rios Financeiros
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** RelatÃ³rios financeiros da plataforma
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Visualiza receita por perÃ­odo
  2. Visualiza receita por praÃ§a
  3. Visualiza receita por estabelecimento
  4. Exporta relatÃ³rios

#### UC8: Gerenciar IntegraÃ§Ãµes
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** Configurar integraÃ§Ãµes com plataformas externas
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Configura integraÃ§Ã£o com iFood
  2. Configura integraÃ§Ã£o com WhatsApp
  3. Configura integraÃ§Ã£o com Google Maps

#### UC9: Configurar White-Label
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** Personalizar aparÃªncia da plataforma
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Configura logo e cores
  2. Configura domÃ­nio personalizado
  3. Configura textos e mensagens

#### UC10: Gerenciar Banco de Dados
- **Atores:** Super Admin
- **DescriÃ§Ã£o:** Gerenciar banco de dados da plataforma
- **PrÃ©-condiÃ§Ãµes:** Super Admin autenticado
- **Fluxo principal:**
  1. Visualiza estatÃ­sticas do banco de dados
  2. Executa migraÃ§Ãµes
  3. Limpa dados antigos
  4. Faz backup do banco de dados
  5. Monitora performance das queries

---

### 2. ADMIN (herda de Super Admin)

> **Nota:** O Admin herda todas as permissÃµes do Super Admin, mas limitadas ao seu tenant.
> Isso inclui: Gerenciar PraÃ§as, Gerenciar PreÃ§os e Taxas, Gerenciar UsuÃ¡rios, entre outros.

#### UC11: Gerenciar Estabelecimentos
- **Atores:** Admin
- **DescriÃ§Ã£o:** Criar e gerenciar estabelecimentos do tenant
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Lista estabelecimentos
  2. Cria novo estabelecimento
  3. Configura dados (endereÃ§o, horÃ¡rio, etc)
  4. Ativa/desativa estabelecimento

#### UC12: Gerenciar Entregadores
- **Atores:** Admin
- **DescriÃ§Ã£o:** Gerenciar entregadores da plataforma
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Lista entregadores
  2. Aprova/rejeita cadastros
  3. Configura status (online/offline)
  4. Visualiza desempenho

#### UC13: Gerenciar Pedidos
- **Atores:** Admin
- **DescriÃ§Ã£o:** Visualizar e gerenciar todos os pedidos
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Lista pedidos com filtros
  2. Visualiza detalhes do pedido
  3. Edita pedido
  4. Altera status do pedido
  5. Cancela pedido

#### UC14: Gerenciar Rotas (Entregadores PrÃ³prios)
- **Atores:** Admin
- **DescriÃ§Ã£o:** Criar e gerenciar rotas para entregadores prÃ³prios
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado, estabelecimento com entregadores prÃ³prios
- **Fluxo principal:**
  1. Visualiza pedidos disponÃ­veis
  2. Seleciona pedidos para rota
  3. Cria rota
  4. Atribui entregador
  5. Visualiza status da rota
  6. Remove/move pedidos entre rotas

#### UC15: Gerenciar Rotas da Plataforma
- **Atores:** Admin
- **DescriÃ§Ã£o:** Criar e gerenciar rotas para entregadores da plataforma
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Visualiza pedidos disponÃ­veis
  2. Seleciona pedidos para rota
  3. Seleciona entregador da plataforma
  4. Cria rota
  5. Visualiza status da rota
  6. Remove/move pedidos entre rotas

#### UC16: Configurar RoteirizaÃ§Ã£o
- **Atores:** Admin
- **DescriÃ§Ã£o:** Configurar parÃ¢metros de roteirizaÃ§Ã£o automÃ¡tica
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Ativa/desativa auto-roteirizaÃ§Ã£o
  2. Configura intervalo de anÃ¡lise
  3. Configura limites de pedidos
  4. Configura distÃ¢ncia mÃ¡xima
  5. Configura pesos do algoritmo
  6. Configura status de pedidos incluÃ­dos

#### UC17: Visualizar Dashboard
- **Atores:** Admin
- **DescriÃ§Ã£o:** Dashboard com visÃ£o geral do tenant
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Visualiza mapa com entregadores e pedidos
  2. Visualiza pedidos por status
  3. Visualiza rotas ativas
  4. Visualiza mÃ©tricas do dia

#### UC18: Gerenciar Financeiro
- **Atores:** Admin
- **DescriÃ§Ã£o:** GestÃ£o financeira do tenant
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Visualiza receitas e despesas
  2. Visualiza pagamentos a entregadores
  3. Configura comissÃµes

#### UC19: Gerenciar Pagamentos
- **Atores:** Admin
- **DescriÃ§Ã£o:** Gerenciar pagamentos a entregadores
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Visualiza pagamentos pendentes
  2. Processa pagamentos
  3. Visualiza histÃ³rico de pagamentos

#### UC20: Visualizar RelatÃ³rios
- **Atores:** Admin
- **DescriÃ§Ã£o:** RelatÃ³rios operacionais
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. RelatÃ³rio de entregas
  2. RelatÃ³rio de entregadores
  3. RelatÃ³rio de estabelecimentos
  4. RelatÃ³rio de cancelamentos

#### UC21: Gerenciar Saques
- **Atores:** Admin
- **DescriÃ§Ã£o:** Gerenciar solicitaÃ§Ãµes de saque
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Visualiza saques pendentes
  2. Aprova/rejeita saques
  3. Processa saques

#### UC22: Gerenciar Faturas
- **Atores:** Admin
- **DescriÃ§Ã£o:** Gerenciar faturas dos estabelecimentos
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Gera faturas
  2. Envia faturas
  3. Registra pagamentos

#### UC23: Atribuir Entregador a Pedido
- **Atores:** Admin
- **DescriÃ§Ã£o:** Atribuir manualmente um entregador a um pedido
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado, pedido pendente
- **Fluxo principal:**
  1. Seleciona pedido
  2. Seleciona entregador disponÃ­vel
  3. Confirma atribuiÃ§Ã£o
- **Fluxo alternativo:** Nenhum entregador disponÃ­vel

#### UC24: Aprovar/Rejeitar UsuÃ¡rios
- **Atores:** Admin
- **DescriÃ§Ã£o:** Aprovar ou rejeitar cadastros pendentes
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado, usuÃ¡rios pendentes
- **Fluxo principal:**
  1. Visualiza lista de pendentes
  2. Analisa dados do usuÃ¡rio
  3. Aprova ou rejeita
- **Fluxo alternativo:** Dados incompletos

#### UC25: Cancelar Pedidos
- **Atores:** Admin
- **DescriÃ§Ã£o:** Cancelar pedidos
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado, pedido nÃ£o entregue
- **Fluxo principal:**
  1. Seleciona pedido
  2. Confirma cancelamento
  3. Notifica envolvidos

#### UC26: Editar Pedidos
- **Atores:** Admin
- **DescriÃ§Ã£o:** Editar dados de pedidos
- **PrÃ©-condiÃ§Ãµes:** Admin autenticado
- **Fluxo principal:**
  1. Seleciona pedido
  2. Edita dados (endereÃ§o, valores, etc)
  3. Salva alteraÃ§Ãµes

---

### 3. ESTABELECIMENTO

#### UC27: Criar Pedidos
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Criar novos pedidos de entrega
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado
- **Fluxo principal:**
  1. Preenche dados do cliente
  2. Preenche endereÃ§o de entrega
  3. Adiciona itens do pedido
  4. Seleciona mÃ©todo de pagamento
  5. Confirma pedido
- **Fluxo alternativo:** EndereÃ§o nÃ£o encontrado (geocoding falha)

#### UC28: Gerenciar Pedidos
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Visualizar e gerenciar pedidos do estabelecimento
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado
- **Fluxo principal:**
  1. Lista pedidos com filtros
  2. Visualiza detalhes
  3. Altera status (PREPARING, READY)
  4. Cancela pedidos

#### UC29: Criar Rotas de Entrega
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Criar rotas para entregadores prÃ³prios
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado, pedidos disponÃ­veis
- **Fluxo principal:**
  1. Visualiza pedidos disponÃ­veis
  2. Seleciona pedidos
  3. Cria rota
  4. Atribui entregador

#### UC30: Gerenciar Rotas
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Gerenciar rotas criadas
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado
- **Fluxo principal:**
  1. Visualiza rotas ativas
  2. Adiciona pedidos a rotas
  3. Remove pedidos de rotas
  4. Move pedidos entre rotas
  5. Exclui rotas

#### UC31: Atribuir Entregadores PrÃ³prios
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Atribuir entregadores prÃ³prios a rotas
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado, entregadores prÃ³prios cadastrados
- **Fluxo principal:**
  1. Seleciona rota
  2. Seleciona entregador
  3. Confirma atribuiÃ§Ã£o

#### UC32: Gerenciar Entregadores PrÃ³prios
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Cadastrar e gerenciar entregadores prÃ³prios
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado
- **Fluxo principal:**
  1. Cadastra novo entregador
  2. Configura dados e veÃ­culo
  3. Configura tipo de pagamento
  4. Ativa/desativa entregador

#### UC33: Visualizar Dashboard
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Dashboard do estabelecimento
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado
- **Fluxo principal:**
  1. Visualiza pedidos ativos
  2. Visualiza entregadores online
  3. Visualiza mÃ©tricas do dia

#### UC34: Visualizar Financeiro
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Visualizar dados financeiros
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado
- **Fluxo principal:**
  1. Visualiza receitas
  2. Visualiza pagamentos a entregadores
  3. Visualiza faturas

#### UC35: Configurar IntegraÃ§Ãµes
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Configurar integraÃ§Ãµes do estabelecimento
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado
- **Fluxo principal:**
  1. Configura integraÃ§Ã£o com WhatsApp
  2. Configura integraÃ§Ã£o com iFood
  3. Configura API

#### UC36: Chamar Entregadores da Plataforma
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Solicitar entregadores da plataforma para pedidos
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado, pedidos prontos
- **Fluxo principal:**
  1. Seleciona pedido
  2. Solicita entregador da plataforma
  3. Sistema encontra entregador mais prÃ³ximo
  4. Entregador aceita/rejeita

#### UC37: Avaliar Entregadores
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** Avaliar entregadores apÃ³s entregas
- **PrÃ©-condiÃ§Ãµes:** Entrega concluÃ­da
- **Fluxo principal:**
  1. Seleciona entrega
  2. Atribui nota (1-5)
  3. Adiciona comentÃ¡rio (opcional)

#### UC38: Visualizar RelatÃ³rios
- **Atores:** Estabelecimento
- **DescriÃ§Ã£o:** RelatÃ³rios do estabelecimento
- **PrÃ©-condiÃ§Ãµes:** Estabelecimento autenticado
- **Fluxo principal:**
  1. RelatÃ³rio de entregas
  2. RelatÃ³rio de entregadores
  3. RelatÃ³rio de desempenho

---

### 4. ENTREGADOR PLATAFORMA

#### UC39: Fazer Login
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Autenticar no sistema
- **PrÃ©-condiÃ§Ãµes:** Entregador cadastrado e aprovado
- **Fluxo principal:**
  1. Informa email e senha
  2. Sistema autentica
  3. Redireciona para dashboard
- **Fluxo alternativo:** Credenciais invÃ¡lidas, conta nÃ£o aprovada

#### UC40: Visualizar Dashboard
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Dashboard pessoal do entregador
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Visualiza estatÃ­sticas (entregas, ganhos, avaliaÃ§Ã£o)
  2. Visualiza pedidos ativos
  3. Visualiza rotas atribuÃ­das
  4. Alterna status online/offline

#### UC41: Visualizar Pedidos DisponÃ­veis
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Ver pedidos disponÃ­veis para aceitar
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado e online
- **Fluxo principal:**
  1. Lista pedidos prÃ³ximos
  2. Visualiza detalhes (endereÃ§o, valor, distÃ¢ncia)
  3. Filtra por distÃ¢ncia/valor

#### UC42: Aceitar/Rejeitar Pedidos
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Aceitar ou rejeitar pedidos oferecidos
- **PrÃ©-condiÃ§Ãµes:** Pedido oferecido ao entregador
- **Fluxo principal:**
  1. Recebe notificaÃ§Ã£o de pedido
  2. Visualiza detalhes
  3. Aceita ou rejeita
- **Fluxo alternativo:** Tempo expira, pedido vai para outro entregador

#### UC43: Atualizar Status do Pedido
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Atualizar status conforme progresso da entrega
- **PrÃ©-condiÃ§Ãµes:** Entregador com pedido ativo
- **Fluxo principal:**
  1. Marca como "A Caminho" (PICKED_UP)
  2. Marca como "Entregue" (DELIVERED)
  3. Envia prova de entrega (foto)
  4. Informa cÃ³digo de entrega (se configurado)

#### UC44: Visualizar Rotas AtribuÃ­das
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Ver rotas atribuÃ­das pelo admin
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Lista rotas pendentes e ativas
  2. Visualiza paradas da rota
  3. Visualiza mapa com rota

#### UC45: Aceitar/Rejeitar Rotas
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Aceitar ou rejeitar rotas atribuÃ­das
- **PrÃ©-condiÃ§Ãµes:** Rota atribuÃ­da ao entregador
- **Fluxo principal:**
  1. Recebe notificaÃ§Ã£o de rota
  2. Visualiza detalhes (paradas, distÃ¢ncia)
  3. Aceita ou rejeita
- **Fluxo alternativo:** Rota rejeitada volta para admin

#### UC46: Concluir Paradas da Rota
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Marcar paradas como concluÃ­das
- **PrÃ©-condiÃ§Ãµes:** Rota ativa
- **Fluxo principal:**
  1. Visualiza lista de paradas
  2. Marca coleta como concluÃ­da
  3. Marca entrega como concluÃ­da
  4. Repete atÃ© todas concluÃ­das
  5. Rota Ã© marcada como concluÃ­da

#### UC47: Visualizar Ganhos
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Visualizar ganhos acumulados
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Visualiza ganhos do dia
  2. Visualiza ganhos da semana
  3. Visualiza ganhos do mÃªs
  4. Visualiza histÃ³rico de pagamentos

#### UC48: Visualizar HistÃ³rico
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** HistÃ³rico de entregas
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Lista entregas realizadas
  2. Filtra por perÃ­odo
  3. Visualiza detalhes de cada entrega

#### UC49: Atualizar LocalizaÃ§Ã£o
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Enviar localizaÃ§Ã£o atual para o sistema
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado e online
- **Fluxo principal:**
  1. App envia localizaÃ§Ã£o periodicamente
  2. Sistema atualiza posiÃ§Ã£o no mapa
  3. Sistema usa para cÃ¡lculo de rotas

#### UC50: Visualizar Ranking
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Ranking de entregadores
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Visualiza posiÃ§Ã£o no ranking
  2. Visualiza critÃ©rios (entregas, avaliaÃ§Ã£o, tempo)

#### UC51: Gerenciar Carteira
- **Atores:** Entregador Plataforma
- **DescriÃ§Ã£o:** Gerenciar carteira digital
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Visualiza saldo
  2. Solicita saque
  3. Visualiza extrato

---

### 5. ENTREGADOR PRÃ“PRIO

#### UC52: Fazer Login com PIN
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** Autenticar com PIN (sem email/senha)
- **PrÃ©-condiÃ§Ãµes:** Entregador cadastrado pelo estabelecimento
- **Fluxo principal:**
  1. Informa telefone e PIN
  2. Sistema autentica
  3. Redireciona para dashboard

#### UC53: Visualizar Dashboard
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** Dashboard do entregador prÃ³prio
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Visualiza estatÃ­sticas
  2. Visualiza rotas pendentes
  3. Visualiza rotas ativas
  4. Alterna status online/offline

#### UC54: Visualizar Rotas Pendentes
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** Ver rotas aguardando aceite
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Lista rotas pendentes
  2. Visualiza paradas
  3. Visualiza distÃ¢ncia total

#### UC55: Aceitar/Rejeitar Rotas
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** Aceitar ou rejeitar rotas do estabelecimento
- **PrÃ©-condiÃ§Ãµes:** Rota atribuÃ­da ao entregador
- **Fluxo principal:**
  1. Recebe notificaÃ§Ã£o
  2. Visualiza detalhes
  3. Aceita ou rejeita

#### UC56: Concluir Paradas da Rota
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** Marcar paradas como concluÃ­das
- **PrÃ©-condiÃ§Ãµes:** Rota ativa
- **Fluxo principal:**
  1. Visualiza paradas
  2. Marca coleta como concluÃ­da
  3. Marca entrega como concluÃ­da
  4. Rota conclui automaticamente

#### UC57: Atualizar Status do Pedido
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** Atualizar status dos pedidos
- **PrÃ©-condiÃ§Ãµes:** Entregador com pedidos ativos
- **Fluxo principal:**
  1. Marca como "A Caminho"
  2. Marca como "Entregue"
  3. Envia cÃ³digo de entrega

#### UC58: Visualizar Ganhos
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** Visualizar ganhos acumulados
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Visualiza ganhos do dia
  2. Visualiza ganhos da semana
  3. Visualiza histÃ³rico

#### UC59: Visualizar HistÃ³rico
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** HistÃ³rico de entregas
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado
- **Fluxo principal:**
  1. Lista entregas realizadas
  2. Filtra por perÃ­odo

#### UC60: Atualizar LocalizaÃ§Ã£o
- **Atores:** Entregador PrÃ³prio
- **DescriÃ§Ã£o:** Enviar localizaÃ§Ã£o atual
- **PrÃ©-condiÃ§Ãµes:** Entregador autenticado e online
- **Fluxo principal:**
  1. App envia localizaÃ§Ã£o
  2. Sistema atualiza posiÃ§Ã£o

---

### 6. CLIENTE FINAL

#### UC61: Rastrear Pedido
- **Atores:** Cliente Final
- **DescriÃ§Ã£o:** Rastrear status do pedido
- **PrÃ©-condiÃ§Ãµes:** Pedido criado, token de rastreio disponÃ­vel
- **Fluxo principal:**
  1. Acessa link de rastreio
  2. Visualiza status atual
  3. Visualiza localizaÃ§Ã£o do entregador (se disponÃ­vel)
  4. Visualiza estimativa de entrega

#### UC62: Avaliar Entrega
- **Atores:** Cliente Final
- **DescriÃ§Ã£o:** Avaliar qualidade da entrega
- **PrÃ©-condiÃ§Ãµes:** Entrega concluÃ­da
- **Fluxo principal:**
  1. Recebe link de avaliaÃ§Ã£o
  2. Atribui nota (1-5)
  3. Adiciona comentÃ¡rio (opcional)

---

### 7. SISTEMA (AutomÃ¡tico)

#### UC63: Auto-RoteirizaÃ§Ã£o
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Criar rotas automaticamente quando vantajoso
- **PrÃ©-condiÃ§Ãµes:** Auto-roteirizaÃ§Ã£o ativada, pedidos pendentes
- **Fluxo principal:**
  1. Analisa pedidos pendentes a cada 5 minutos
  2. Calcula clusterizaÃ§Ã£o dos pedidos
  3. Compara tempo individual vs roteirizado
  4. Se vantajoso, cria rota automÃ¡tica
  5. Seleciona melhor entregador
  6. Notifica entregador e admin

#### UC64: Geocodificar EndereÃ§os
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Converter endereÃ§os em coordenadas
- **PrÃ©-condiÃ§Ãµes:** EndereÃ§o informado
- **Fluxo principal:**
  1. Tenta geocodificar com Photon
  2. Se falha, tenta com Nominatim
  3. Se falha, usa coordenadas do mapa arrastÃ¡vel
  4. Retorna latitude/longitude

#### UC65: Calcular Rotas Otimizadas
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Otimizar ordem das paradas
- **PrÃ©-condiÃ§Ãµes:** Rota com mÃºltiplas paradas
- **Fluxo principal:**
  1. Calcula centroid das paradas
  2. Aplica algoritmo direÃ§Ã£o-aware
  3. Considera pickups antes de deliveries
  4. Retorna ordem otimizada

#### UC66: Enviar NotificaÃ§Ãµes
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Enviar notificaÃ§Ãµes para usuÃ¡rios
- **PrÃ©-condiÃ§Ãµes:** Evento que dispara notificaÃ§Ã£o
- **Fluxo principal:**
  1. Identifica tipo de notificaÃ§Ã£o
  2. Envia para destinatÃ¡rio correto
  3. Registra no banco de dados

#### UC67: Processar Ofertas Expiradas
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Processar ofertas de pedidos que expiraram
- **PrÃ©-condiÃ§Ãµes:** Ofertas com tempo expirado
- **Fluxo principal:**
  1. Identifica ofertas expiradas
  2. Oferece para prÃ³ximo entregador
  3. Se nenhum disponÃ­vel, notifica admin

#### UC68: Processar Pedidos Agendados
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Processar pedidos agendados para horÃ¡rio futuro
- **PrÃ©-condiÃ§Ãµes:** Pedidos com status SCHEDULED
- **Fluxo principal:**
  1. Identifica pedidos prÃ³ximos do horÃ¡rio
  2. Muda status para PENDING
  3. Oferece para entregadores

#### UC69: Calcular Ganhos dos Entregadores
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Calcular ganhos baseado no tipo de pagamento
- **PrÃ©-condiÃ§Ãµes:** Entrega concluÃ­da
- **Fluxo principal:**
  1. Identifica tipo de pagamento do entregador
  2. Calcula valor (por entrega, por km, percentual, etc)
  3. Registra ganho no banco de dados

#### UC70: Gerar RelatÃ³rios
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Gerar relatÃ³rios automÃ¡ticos
- **PrÃ©-condiÃ§Ãµes:** Dados disponÃ­veis
- **Fluxo principal:**
  1. Coleta dados do perÃ­odo
  2. Calcula mÃ©tricas
  3. Gera relatÃ³rio

#### UC71: Integrar com Plataformas Externas
- **Atores:** Sistema
- **DescriÃ§Ã£o:** Integrar com iFood, WhatsApp, etc
- **PrÃ©-condiÃ§Ãµes:** IntegraÃ§Ã£o configurada
- **Fluxo principal:**
  1. Recebe pedidos de plataformas externas
  2. Cria pedidos no sistema
  3. Sincroniza status
  4. Envia notificaÃ§Ãµes via WhatsApp

---

## Matriz de Atores x Casos de Uso

| Ator | Casos de Uso |
|------|--------------|
| **Super Admin** | UC1-UC10 |
| **Admin** | UC11-UC26 |
| **Estabelecimento** | UC27-UC38 |
| **Entregador Plataforma** | UC39-UC51 |
| **Entregador PrÃ³prio** | UC52-UC60 |
| **Cliente Final** | UC61-UC62 |
| **Sistema** | UC63-UC71 |

---

## Fluxos de ExceÃ§Ã£o Comuns

### FE1: Erro de GeocodificaÃ§Ã£o
- **Caso de uso:** UC27, UC64
- **DescriÃ§Ã£o:** EndereÃ§o nÃ£o encontrado pelos serviÃ§os de geocodificaÃ§Ã£o
- **Tratamento:** Exibe mapa com pino arrastÃ¡vel para o usuÃ¡rio marcar a localizaÃ§Ã£o

### FE2: Nenhum Entregador DisponÃ­vel
- **Caso de uso:** UC23, UC36, UC63
- **DescriÃ§Ã£o:** NÃ£o hÃ¡ entregadores online ou disponÃ­veis
- **Tratamento:** Notifica admin, mantÃ©m pedido pendente, tenta novamente periodicamente

### FE3: Entregador Rejeita Rota
- **Caso de uso:** UC45, UC55
- **DescriÃ§Ã£o:** Entregador rejeita rota atribuÃ­da
- **Tratamento:** Rota volta para admin, pode reatribuir para outro entregador

### FE4: Pedido Cancelado Durante Entrega
- **Caso de uso:** UC43, UC57
- **DescriÃ§Ã£o:** Pedido Ã© cancelado enquanto entregador estÃ¡ a caminho
- **Tratamento:** Notifica entregador, remove da rota, recalcula rota restante

### FE5: Entregador Fica Offline Durante Rota
- **Caso de uso:** UC46, UC56
- **DescriÃ§Ã£o:** Entregador perde conexÃ£o durante entrega
- **Tratamento:** MantÃ©m rota ativa, alerta admin, tenta reconexÃ£o

### FE6: Coordenadas InvÃ¡lidas
- **Caso de uso:** UC64, UC65
- **DescriÃ§Ã£o:** Coordenadas sÃ£o nulas ou invÃ¡lidas
- **Tratamento:** Usa fallback (endereÃ§o do restaurante), solicita correÃ§Ã£o manual
