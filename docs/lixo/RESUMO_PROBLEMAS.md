# Resumo dos Problemas e Acoes

## Super Admin - Problemas de UI

### 1. Logout nao funciona
**Causa**: A rota `/platform` nao envolve `PlatformDashboardPage` com `<Layout>`.
O botao de logout so existe dentro do Layout.
**Solucao**: Envolver `PlatformDashboardPage` com `<Layout>` no `App.jsx`.

### 2. Falta barra de rolagem
**Causa**: O Layout nao tem `overflow-y: auto` no conteudo principal.
**Solucao**: Adicionar overflow ao `<main>` do Layout.

### 3. Tabs saem da tela em telas menores
**Causa**: O container de tabs nao tem `overflow-x: auto` nem `flex-wrap`.
**Solucao**: Adicionar scroll horizontal ou wrap nas tabs.

### 4. Dois botoes "Atualizar" na aba Usuarios
**Causa**: Existe um botao "Atualizar" no cabecalho (visivel em todas as abas) e outro na aba Usuarios.
**Solucao**: Ocultar o botao do cabecalho quando uma aba especifica esta ativa, ou diferenciar visualmente.

---

## Entregador - Funcionalidades Solicitadas

### 5. Abrir Google Maps automaticamente ao coletar pedido
**Status**: Nao implementado.
**Solucao**: Adicionar logica no frontend para abrir Google Maps com a URL de navegacao quando o entregador marcar pedido como "coletado".

### 6. Sair do Maps automaticamente ao chegar na entrega
**Status**: Nao implementado.
**Solucao**: Isso requer integracao com o app de navegacao ou usar deep links. O Google Maps nao tem callback automatico. Alternativas:
- Usar botao "Cheguei" no app que fecha o Maps e volta para a tela de entrega
- Integrar com Google Maps Directions API para monitorar posicao

---

## Pracas - Onde Criar?

### 7. Criacao de pracas
**Onde**: O tenant admin ja tem acesso a `/admin/squares` para criar pracas.
**Fluxo**:
1. Tenant admin faz login em `/login`
2. E redirecionado para `/admin`
3. No menu lateral, va para "Pracas" (`/admin/squares`)
4. Clique em "NOVA PRACA"
5. Preencha: nome, cidade, estado, precos
6. A praca e vinculada automaticamente ao tenant do admin

**Nao precisa criar praca pelo super admin.** Cada tenant admin cria suas proprias pracas.

---

## Acoes Imediatas

1. **Corrigir Layout do super admin** (App.jsx)
2. **Adicionar overflow no Layout** (Layout.jsx)
3. **Corrigir tabs** (PlatformDashboardPage.jsx)
4. **Remover botao duplicado** (PlatformDashboardPage.jsx)
5. **Implementar abertura do Google Maps** (driver dashboard)
6. **Adicionar botao "Cheguei"** (driver dashboard)
