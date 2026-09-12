# Roteiro de Testes Manuais — Portal Entregador (muv.log)

**Versão:** 1.0 — Setembro 2026
**Objetivo:** Validar o sistema completo antes de ir para produção
**Ambiente:** Desenvolvimento local (localhost ou IP da rede local)

---

## Como usar este checklist

Para cada item:
1. Execute o teste **correto** (caminho feliz)
2. Execute o teste de **esforço** (erro intencional)
3. Marque ✅ ou ❌ na coluna Resultado
4. Anote o que aconteceu na coluna Observação

**Legenda:**
- 🟢 = Passou
- 🔴 = Falhou
- 🟡 = Parcial / Comportamento inesperado

---

## 1. ACESSO E AUTENTICAÇÃO

### 1.1 Login — Caminho Feliz

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 1.1.1 | Login Super Admin | Acesse /login → email: meslopes@gmail.com → senha correta → Entrar | ☐ | |
| 1.1.2 | Login Admin tenant | Acesse /login → email de admin com tenant → senha correta → Entrar | ☐ | |
| 1.1.3 | Login Estabelecimento | Acesse /client/login → email/senha → Entrar | ☐ | |
| 1.1.4 | Login Entregador Plataforma | Acesse /login → email/senha do entregador → Entrar | ☐ | |
| 1.1.5 | Login Entregador Próprio | Acesse /own-driver/login → telefone + PIN → Entrar | ☐ | |

### 1.2 Login — Testes de Esforço

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 1.2.1 | Senha errada | Digite senha incorreta → Entrar | ☐ Deve mostrar "Credenciais inválidas" |
| 1.2.2 | Email inexistente | Digite email que não existe → Entrar | ☐ Deve mostrar "Credenciais inválidas" |
| 1.2.3 | Campos vazios | Deixe email e senha em branco → Entrar | ☐ Deve mostrar erro de validação |
| 1.2.4 | Email sem @ | Digite "teste" no campo email → Entrar | ☐ Deve mostrar erro |
| 1.2.5 | SQL Injection | Digite `' OR 1=1 --` no email → Entrar | ☐ NÃO deve logar, NÃO deve crashar |
| 1.2.6 | Usuário suspenso | Tente logar com conta suspensa | ☐ Deve bloquear |
| 1.2.7 | Usuário inativo (pendente) | Tente logar com conta não aprovada | ☐ Deve mostrar "pendente de aprovação" |
| 1.2.8 | Tenant inativo | Tente logar com usuário de tenant desativado | ☐ Deve bloquear |
| 1.2.9 | Rate limiting | Tente logar 6 vezes com senha errada em 1 minuto | ☐ Deve bloquear após 5ª tentativa |
| 1.2.10 | Token expiração | Faça login → aguarde 4h (ou ajuste temporário) → tente ação | ☐ Deve deslogar |
| 1.2.11 | Campos com espaços | Digite " email@test.com " (com espaços) | ☐ Deve aceitar ou rejeitar claramente |
| 1.2.12 | Caracteres especiais | Digite email com acentos: "téstê@email.com" | ☐ Deve tratar sem crashar |

### 1.3 Cadastro — Caminho Feliz

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 1.3.1 | Cadastro Entregador | Acesse /register → preencha todos os campos → Cadastrar | ☐ Deve criar conta pendente |
| 1.3.2 | Cadastro Estabelecimento | Acesse /client/register → preencha → Cadastrar | ☐ Deve criar conta pendente |
| 1.3.3 | Link com praça | Acesse link de cadastro com ?square_id=X | ☐ Deve pré-selecionar a praça |

### 1.4 Cadastro — Testes de Esforço

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 1.4.1 | Email duplicado | Cadastre com email já existente | ☐ Deve rejeitar |
| 1.4.2 | Senha curta | Digite senha com 3 caracteres | ☐ Deve rejeitar (mínimo 6) |
| 1.4.3 | Campos obrigatórios vazios | Deixe nome em branco → Cadastrar | ☐ Deve rejeitar |
| 1.4.4 | CPF inválido | Digite "123" no CPF | ☐ Deve aceitar ou rejeitar claramente |
| 1.4.5 | Telefone inválido | Digite "abc" no telefone | ☐ Deve tratar sem crashar |
| 1.4.6 | Cadastro sem internet | Desconecte Wi-Fi → tente cadastrar | ☐ Deve mostrar erro de conexão |

### 1.5 Logout e Sessão

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 1.5.1 | Logout | Clique em Sair | ☐ Deve limpar token e redirecionar para login |
| 1.5.2 | Acessar rota protegida após logout | Cole URL de rota admin no navegador | ☐ Deve redirecionar para login |
| 1.5.3 | Duas abas simultâneas | Faça logout em uma aba | ☐ Outra aba deve funcionar até refresh |
| 1.5.4 | Token inválido manualmente | Altere o token no localStorage → recarregue | ☐ Deve deslogar |

---

## 2. SUPER ADMIN

### 2.1 Dashboard Global

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 2.1.1 | Dashboard carrega | Acesse /platform → verifique métricas | ☐ Deve mostrar totais |
| 2.1.2 | Dados corretos | Compare totais com dados reais do banco | ☐ Números devem bater |
| 2.1.3 | Alternar para painel admin | Clique em "Painel Admin" | ☐ Deve mostrar dados do tenant |

### 2.2 Gerenciar Tenants

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 2.2.1 | Criar tenant | Preencha nome, slug → Salvar | ☐ Deve criar |
| 2.2.2 | Editar tenant | Mude nome/cor → Salvar | ☐ Deve atualizar |
| 2.2.3 | Desativar tenant | Clique em desativar | ☐ Deve mudar status |
| 2.2.4 | Login com tenant desativado | Tente logar com usuário desse tenant | ☐ Deve bloquear |
| 2.2.5 | Reativar tenant | Clique em ativar | ☐ Login deve funcionar novamente |
| 2.2.6 | Excluir tenant com dados | Tente excluir tenant que tem pedidos | ☐ Deve proteger ou pedir confirmação |

### 2.3 Gerenciar Admins

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 2.3.1 | Criar admin | Preencha dados → Salvar | ☐ Deve criar com senha gerada |
| 2.3.2 | Editar admin | Mude nome/email → Salvar | ☐ Deve atualizar |
| 2.3.3 | Resetar senha | Clique em resetar senha | ☐ Deve gerar nova senha |
| 2.3.4 | Excluir último admin | Tente excluir se só tem 1 admin no tenant | ☐ Deve proteger |
| 2.3.5 | Excluir admin com pedidos | Tente excluir admin que criou pedidos | ☐ Deve pedir confirmação |

### 2.4 Gerenciar Praças

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 2.4.1 | Criar praça | Nome, cidade, estado → Salvar | ☐ Deve criar |
| 2.4.2 | Editar praça | Mude preço/km → Salvar | ☐ Deve atualizar |
| 2.4.3 | Desativar praça | Desative | ☐ Entregadores da praça não devem receber pedidos |

---

## 3. ADMIN DO TENANT

### 3.1 Dashboard

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 3.1.1 | Dashboard carrega | Acesse /admin → verifique métricas | ☐ Deve mostrar dados do tenant |
| 3.1.2 | Seletor de praça | Troque de praça no seletor | ☐ Dados devem filtrar |
| 3.1.3 | Mapa ao vivo | Verifique entregadores no mapa | ☐ Marcadores devem aparecer |
| 3.1.4 | Atualização automática | Aguarde 15 segundos | ☐ Mapa deve atualizar |

### 3.2 Estabelecimentos

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 3.2.1 | Criar estabelecimento | Preencha todos os campos → Salvar | ☐ Deve criar |
| 3.2.2 | Geocodificar endereço | Clique no botão de geolocalização | ☐ Deve preencher lat/lng |
| 3.2.3 | Editar estabelecimento | Mude dados → Salvar | ☐ Deve atualizar |
| 3.2.4 | Ativar/Desativar | Alterne status | ☐ Deve mudar |
| 3.2.5 | Link de cadastro | Gere link → copie → acesse em outra aba | ☐ Formulário deve abrir |
| 3.2.6 | Excluir com pedidos | Tente excluir estabelecimento com pedidos | ☐ Deve proteger |

### 3.3 Entregadores

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 3.3.1 | Criar entregador | Preencha → Salvar | ☐ Deve criar |
| 3.3.2 | Transferir entre praças | Selecione entregador → mude praça | ☐ Deve transferir |
| 3.3.3 | Suspender entregador | Clique em suspender | ☐ Deve ficar offline automaticamente |
| 3.3.4 | Login de entregador suspenso | Tente logar com entregador suspenso | ☐ Deve bloquear |
| 3.3.5 | Reativar entregador | Clique em ativar | ☐ Deve poder logar novamente |
| 3.3.6 | Converter para próprio | Selecione entregador → converta | ☐ Deve criar EstablishmentDriver |
| 3.3.7 | Converter de volta | Converta próprio para plataforma | ☐ Deve reativar na plataforma |
| 3.3.8 | Link de cadastro de entregador | Gere link → copie → acesse | ☐ Formulário deve abrir |

### 3.4 Pedidos

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 3.4.1 | Lançar pedido manual | Preencha todos os campos → Enviar | ☐ Deve criar como PENDING |
| 3.4.2 | Editar pedido | Mude endereço/valor → Salvar | ☐ Deve atualizar |
| 3.4.3 | Atribuir entregador manual | Selecione entregador → Atribuir | ☐ Pedido deve mudar para ACCEPTED |
| 3.4.4 | Cancelar pedido | Clique em cancelar | ☐ Deve cancelar e estornar saldo |
| 3.4.5 | Chamar plataforma | Clique em "Chamar Entregadores" | ☐ Deve notificar disponíveis |
| 3.4.6 | Filtrar por status | Selecione filtro "Pendente" | ☐ Só deve mostrar pendentes |
| 3.4.7 | Filtrar por data | Selecione período | ☐ Deve filtrar corretamente |
| 3.4.8 | Exportar CSV | Clique em exportar | ☐ Deve baixar arquivo CSV |

### 3.5 Financeiro

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 3.5.1 | Dashboard financeiro | Acesse financeiro | ☐ Deve mostrar receita, custos |
| 3.5.2 | Gerar fatura | Gere fatura para estabelecimento | ☐ Deve criar com link PIX |
| 3.5.3 | Processar saque | Aprove saque de entregador | ☐ Deve mover de locked para pago |

### 3.6 Configurações

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 3.6.1 | White-label | Mude logo, cores → Salvar | ☐ Layout deve mudar |
| 3.6.2 | Tabela de preço | Crie tabela com tarifa fixa | ☐ Deve salvar |
| 3.6.3 | Preços dinâmicos | Ative taxa de chuva → Salve | ☐ Deve aplicar no frete |
| 3.6.4 | Raio GPS | Mude raio de coleta → Salve | ☐ Deve afetar validação |

### 3.7 Testes de Esforço — Admin

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 3.7.1 | Criar estabelecimento sem campos | Deixe nome em branco → Salvar | ☐ Deve rejeitar |
| 3.7.2 | Endereço sem geocodificação | Crie sem coordenadas | ☐ Deve funcionar sem mapa |
| 3.7.3 | Pedido com valor negativo | Digite -10 no valor | ☐ Deve rejeitar |
| 3.7.4 | Pedido sem itens | Envie sem itens | ☐ Deve rejeitar |
| 3.7.5 | Editar pedido já entregue | Tente editar pedido DELIVERED | ☐ Deve bloquear |
| 3.7.6 | Dois admins editando mesmo pedido | Abra em 2 abas → edite as 2 | ☐ Último deve sobrescrever (sem crash) |
| 3.7.7 | Muitos pedidos de uma vez | Crie 20 pedidos rapidamente | ☐ Sistema deve aguentar |
| 3.7.8 | Suspender entregador com pedido ativo | Suspenda entregador que está em entrega | ☐ Pedido deve continuar visível |
| 3.7.9 | Trocar de praça rapidamente | Fique trocando praça no seletor | ☐ Dados não devem misturar |
| 3.7.10 | Exportar com 0 pedidos | Exporte CSV sem pedidos | ☐ Deve gerar arquivo vazio ou cabeçalho |

---

## 4. ESTABELECIMENTO (CLIENTE)

### 4.1 Dashboard

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 4.1.1 | Dashboard carrega | Acesse /client → verifique pedidos do dia | ☐ Deve mostrar pedidos |
| 4.1.2 | Mapa com entregadores | Verifique mapa | ☐ Deve mostrar entregadores próximos |
| 4.1.3 | Rastreamento ao vivo | Acompanhe entregador em tempo real | ☐ Posição deve atualizar |

### 4.2 Criar Pedidos

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 4.2.1 | Criar pedido completo | Preencha tudo → Calcular frete → Enviar | ☐ Deve criar com frete calculado |
| 4.2.2 | Frete por KM | Verifique se o frete bate com distância × preço/km | ☐ Valor deve ser correto |
| 4.2.3 | Frete fixo | Se praça tem tarifa fixa, verifique | ☐ Deve usar valor fixo |
| 4.2.4 | Pedido agendado | Crie com data/hora futura | ☐ Deve criar como SCHEDULED |
| 4.2.5 | Acompanhar pedido | Veja status em tempo real | ☐ Status deve atualizar |
| 4.2.6 | Cancelar pedido | Cancele antes de ser aceito | ☐ Deve cancelar |
| 4.2.7 | Avaliar entregador | Após entrega, avalie com estrelas | ☐ Deve salvar avaliação |
| 4.2.8 | Link de rastreio | Copie link de rastreio → abra em aba anônima | ☐ Deve mostrar status sem login |

### 4.3 Entregadores Próprios

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 4.3.1 | Cadastrar entregador próprio | Preencha → Salvar | ☐ Deve criar |
| 4.3.2 | Definir PIN | Defina PIN de 4 dígitos | ☐ Deve salvar |
| 4.3.3 | Login com PIN | Acesse /own-driver/login → telefone + PIN | ☐ Deve logar |
| 4.3.4 | Atribuir a pedido | Atribua entregador próprio a pedido | ☐ Deve vincular |
| 4.3.5 | Ativar/Desativar | Alterne status do entregador | ☐ Deve funcionar |

### 4.4 Testes de Esforço — Estabelecimento

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 4.4.1 | Pedido sem endereço | Deixe endereço em branco | ☐ Deve rejeitar |
| 4.4.2 | Pedido sem cliente | Deixe nome do cliente em branco | ☐ Deve rejeitar |
| 4.4.3 | Valor muito alto | Digite 999999.99 | ☐ Deve aceitar (sem crash) |
| 4.4.4 | Valor zero | Digite 0 | ☐ Deve aceitar ou rejeitar claramente |
| 4.4.5 | Texto em campo numérico | Digite "abc" no valor | ☐ Deve tratar sem crash |
| 4.4.6 | Cancelar pedido já entregue | Tente cancelar DELIVERED | ☐ Deve bloquear |
| 4.4.7 | Avaliar sem ter feito entrega | Tente avaliar pedido não entregue | ☐ Deve bloquear |
| 4.4.8 | Dois pedidos ao mesmo tempo | Crie 2 pedidos em sequência rápida | ☐ Ambos devem criar |
| 4.4.9 | Endereço muito longo | Digite 500+ caracteres no endereço | ☐ Deve tratar sem crash |
| 4.4.10 | Caracteres especiais no nome | Nome: `<script>alert('xss')</script>` | ☐ Deve exibir como texto, NÃO executar |

---

## 5. ENTREGADOR PLATAFORMA

### 5.1 Dashboard

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 5.1.1 | Dashboard carrega | Acesse /dashboard → verifique stats | ☐ Deve mostrar ganhos, entregas |
| 5.1.2 | Mapa centralizado | Verifique se mapa mostra sua posição | ☐ Deve centralizar na cidade |
| 5.1.3 | MuvScore | Verifique pontos e nível | ☐ Deve mostrar nível atual |
| 5.1.4 | Ganhos estimados | Verifique se mostra % correto | ☐ Deve usar configuração do backend |

### 5.2 Status Online/Offline

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 5.2.1 | Ficar online | Clique em "Ficar Online" | ☐ Deve mudar status |
| 5.2.2 | Atualizar GPS | Ande com o celular → verifique posição | ☐ Posição deve atualizar |
| 5.2.3 | Ficar offline | Clique em "Ficar Offline" | ☐ Deve parar de receber ofertas |
| 5.2.4 | Admin vê no mapa | Admin verifique posição do entregador | ☐ Deve aparecer no mapa |

### 5.3 Receber e Aceitar Pedidos

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 5.3.1 | Receber oferta | Admin crie pedido → aguarde popup | ☐ Deve aparecer com sirene |
| 5.3.2 | Aceitar pedido | Clique em "Aceitar" | ☐ Deve mudar para ACCEPTED |
| 5.3.3 | Rejeitar pedido | Clique em "Rejeitar" | ☐ Deve repassar para próximo |
| 5.3.4 | Timeout de oferta | Aguarde tempo expirar | ☐ Deve repassar automaticamente |
| 5.3.5 | Som de sirene | Verifique se o som toca | ☐ Deve tocar alta |

### 5.4 Fluxo de Entrega

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 5.4.1 | Navegar até restaurante | Clique em "Navegar" | ☐ Deve abrir Google Maps ou Waze |
| 5.4.2 | Confirmar coleta (código) | Digite código de coleta | ☐ Deve mudar para PICKED_UP |
| 5.4.3 | Código errado | Digite código incorreto | ☐ Deve rejeitar |
| 5.4.4 | Confirmar coleta (foto) | Tire foto da embalagem | ☐ Deve salvar foto |
| 5.4.5 | Navegar até cliente | Clique em "Navegar" | ☐ Deve abrir mapa |
| 5.4.6 | Confirmar entrega (código) | Digite código de entrega | ☐ Deve mudar para DELIVERED |
| 5.4.7 | Confirmar entrega (foto) | Tire foto de prova | ☐ Deve salvar foto |
| 5.4.8 | Foto de prova visível | Estabelecimento veja foto | ☐ Deve aparecer na tela do pedido |

### 5.5 Financeiro

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 5.5.1 | Ver ganhos | Acesse carteira | ☐ Deve mostrar saldo correto |
| 5.5.2 | Solicitar saque | Digite valor → Solicitar | ☐ Deve criar solicitação |
| 5.5.3 | Saque acima do saldo | Digite valor maior que saldo | ☐ Deve rejeitar |
| 5.5.4 | Saldo atualiza após entrega | Faça entrega → veja saldo | ☐ Deve atualizar |
| 5.5.5 | Locked balance | Faça entrega → veja valor bloqueado | ☐ Deve aparecer como bloqueado |

### 5.6 Ranking e Conquistas

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 5.6.1 | Ver ranking | Acesse ranking | ☐ Deve mostrar posição |
| 5.6.2 | Ver conquistas | Acesse conquistas | ☐ Deve mostrar badges |
| 5.6.3 | Nível MuvScore | Verifique se nível está correto | ☐ Deve corresponder aos pontos |

### 5.7 Testes de Esforço — Entregador

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 5.7.1 | Aceitar sem internet | Desconecte Wi-Fi → tente aceitar | ☐ Deve salvar offline |
| 5.7.2 | Internet volta | Reconecte Wi-Fi | ☐ Deve sincronizar automaticamente |
| 5.7.3 | Dois entregadores aceitam mesmo pedido | 2 celulares → aceitem ao mesmo tempo | ☐ Só 1 deve aceitar |
| 5.7.4 | GPS desligado | Desligue GPS → tente atualizar posição | ☐ Deve tratar sem crash |
| 5.7.5 | Confirmar entrega sem estar no local | Tente confirmar de longe | ☐ Deve bloquear (se raio ativo) |
| 5.7.6 | Saque de R$0 | Tente sacar R$0 | ☐ Deve rejeitar |
| 5.7.7 | Saque negativo | Tente sacar -10 | ☐ Deve rejeitar |
| 5.7.8 | Múltiplos saques rápidos | Faça 5 saques em sequência | ☐ Só deve processar os que cabem no saldo |

---

## 6. ENTREGADOR PRÓPRIO

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 6.1 | Login com PIN | Acesse /own-driver/login → telefone + PIN | ☐ Deve logar |
| 6.2 | PIN errado | Digite PIN incorreto | ☐ Deve rejeitar |
| 6.3 | Ver pedidos atribuídos | Acesse pedidos | ☐ Deve mostrar só os seus |
| 6.4 | Confirmar coleta | Confirme coleta | ☐ Deve atualizar status |
| 6.5 | Confirmar entrega | Confirme entrega | ☐ Deve atualizar status |
| 6.6 | Ver ganhos | Acesse ganhos | ☐ Deve mostrar valores |
| 6.7 | Offline (modo avião) | Desconecte → faça ações → reconecte | ☐ Deve sincronizar |

---

## 7. NOTIFICAÇÕES

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 7.1 | Push de novo pedido | Admin crie pedido → entregador receba | ☐ Deve vibrar e mostrar |
| 7.2 | Push com app fechado | Feche app → crie pedido → veja | ☐ Deve aparecer notificação |
| 7.3 | Sino de notificações | Clique no sino | ☐ Deve mostrar lista |
| 7.4 | Marcar como lida | Clique em notificação | ☐ Deve marcar como lida |
| 7.5 | Marcar todas como lidas | Clique em "Marcar todas" | ☐ Todas devem marcar |
| 7.6 | Admin: cadastro pendente | Novo cadastro → admin receba push | ☐ Deve notificar |
| 7.7 | WhatsApp com entregador | Admin clique em WhatsApp | ☐ Deve abrir wa.me/ com mensagem |

---

## 8. RASTREAMENTO PÚBLICO

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 8.1 | Link de rastreio | Acesse /track/TOKEN | ☐ Deve mostrar status sem login |
| 8.2 | Status atualizado | Mude status do pedido → atualize link | ☐ Deve mostrar novo status |
| 8.3 | Token inválido | Acesse /track/token-invalido | ☐ Deve mostrar erro |
| 8.4 | Localização do entregador | Com entregador em movimento, veja mapa | ☐ Deve mostrar posição |

---

## 9. EXPORTAÇÃO E IMPORTAÇÃO

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 9.1 | Exportar pedidos CSV | Acesse admin → exporte pedidos | ☐ Deve baixar CSV com dados |
| 9.2 | Exportar entregadores CSV | Exporte entregadores | ☐ Deve baixar CSV |
| 9.3 | CSV abre no Excel | Abra o CSV no Excel | ☐ Colunas devem estar corretas |
| 9.4 | Importar pedidos CSV | Prepare CSV → importe | ☐ Deve criar pedidos |
| 9.5 | CSV com erro | Importe CSV com dados inválidos | ☐ Deve mostrar erros por linha |
| 9.6 | CSV vazio | Importe CSV sem dados | ☐ Deve tratar sem crash |

---

## 10. PWA E OFFLINE

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 10.1 | Instalar como app (Android) | Chrome → "Adicionar à tela inicial" | ☐ Deve instalar |
| 10.2 | Instalar como app (iPhone) | Safari → "Adicionar à Tela de Início" | ☐ Deve instalar |
| 10.3 | Instalar como app (Desktop) | Chrome → ícone de instalar na barra | ☐ Deve instalar |
| 10.4 | App abre sem barra | Abra o app instalado | ☐ Sem barra de navegação do browser |
| 10.5 | Modo avião — ver pedidos | Ative modo avião → veja pedidos | ☐ Deve mostrar pedidos já carregados |
| 10.6 | Modo avião — aceitar pedido | Aceite pedido offline | ☐ Deve salvar localmente |
| 10.7 | Internet volta — sincronize | Desative modo avião | ☐ Deve sincronizar automaticamente |

---

## 11. RESPONSIVIDADE MOBILE

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 11.1 | Login cabe na tela | Abra login no celular | ☐ Sem scroll horizontal |
| 11.2 | Dashboard admin mobile | Abra dashboard admin no celular | ☐ Sidebar deve colapsar |
| 11.3 | Toggle sidebar | Toque no botão de filtro | ☐ Sidebar deve abrir/fechar |
| 11.4 | Menu mobile | Toque no menu hamburguer | ☐ Deve mostrar todos os itens |
| 11.5 | Mapa interativo | Dê zoom/pan no mapa | ☐ Deve funcionar |
| 11.6 | Formulários | Preencha formulário no celular | ☐ Campos não devem sobrepor |
| 11.7 | Botões clicáveis | Toque em todos os botões | ☐ Devem ser grandes o suficiente |

---

## 12. MULTI-TENANT (ISOLAMENTO)

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 12.1 | Admin vê só seus dados | Faça login como admin de tenant A | ☐ Só deve ver dados do tenant A |
| 12.2 | Entregador vê pedidos do seu tenant | Entregador de tenant A | ☐ Só deve ver pedidos do tenant A |
| 12.3 | Estabelecimento vê seus pedidos | Estabelecimento de tenant B | ☐ Só deve ver pedidos do tenant B |
| 12.4 | Cross-tenant (tentar acessar) | Tente acessar pedido de outro tenant via API | ☐ Deve bloquear |
| 12.5 | Super admin vê tudo | Login como super admin | ☐ Deve ver dados de todos os tenants |

---

## 13. PERFORMANCE E ESTABILIDADE

| # | Teste | Passos | Resultado | Obs |
|---|---|---|---|---|
| 13.1 | 50 pedidos de uma vez | Crie 50 pedidos rapidamente | ☐ Sistema deve aguentar |
| 13.2 | 20 entregadores online | Coloque 20 entregadores online | ☐ Mapa deve aguentar |
| 13.3 | Navegação rápida | Fique trocando de página rapidamente | ☐ Sem crash |
| 13.4 | Refresh durante ação | Dê F5 no meio de uma ação | ☐ Deve recuperar estado |
| 13.5 | Aba aberta por 1h | Deixe aba aberta 1 hora | ☐ Deve continuar funcionando |
| 13.6 | Múltiplas abas | Abra o sistema em 3 abas | ☐ Todas devem funcionar |

---

## Resultado Geral

| Seção | Total | ✅ | ❌ | 🟡 |
|---|---|---|---|---|
| 1. Acesso e Autenticação | 21 | | | |
| 2. Super Admin | 14 | | | |
| 3. Admin do Tenant | 25 | | | |
| 4. Estabelecimento | 20 | | | |
| 5. Entregador Plataforma | 22 | | | |
| 6. Entregador Próprio | 7 | | | |
| 7. Notificações | 7 | | | |
| 8. Rastreamento Público | 4 | | | |
| 9. Exportação/Importação | 6 | | | |
| 10. PWA e Offline | 7 | | | |
| 11. Responsividade Mobile | 7 | | | |
| 12. Multi-Tenant | 5 | | | |
| 13. Performance | 6 | | | |
| **TOTAL** | **147** | | | |
