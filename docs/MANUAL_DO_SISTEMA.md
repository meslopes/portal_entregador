# muv.log — Manual do Sistema

## Guia Completo para Administradores e Estabelecimentos

---

# Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Primeiros Passos](#2-primeiros-passos)
3. [Painel do Administrador](#3-painel-do-administrador)
4. [Gerenciamento de Praças](#4-gerenciamento-de-praças)
5. [Gerenciamento de Estabelecimentos](#5-gerenciamento-de-estabelecimentos)
6. [Gerenciamento de Entregadores](#6-gerenciamento-de-entregadores)
7. [Gerenciamento de Pedidos](#7-gerenciamento-de-pedidos)
8. [Financeiro](#8-financeiro)
9. [Configurações](#9-configurações)
10. [Painel do Estabelecimento](#10-painel-do-estabelecimento)
11. [App do Entregador Próprio](#11-app-do-entregador-próprio)
12. [Rastreamento em Tempo Real](#12-rastreamento-em-tempo-real)
13. [Mapa do Banco de Dados](#13-mapa-do-banco-de-dados)
14. [Solução de Problemas](#14-solução-de-problemas)

---

# 1. Visão Geral do Sistema

## O que é o muv.log?

O muv.log é uma plataforma completa de gerenciamento de entregas que conecta **administradores**, **estabelecimentos** e **entregadores** em um único sistema. A plataforma permite:

- **Gerenciar entregadores** próprios e da plataforma
- **Receber e distribuir pedidos** automaticamente
- **Acompanhar entregas** em tempo real no mapa
- **Controlar financeiro** de entregadores e estabelecimentos
- **Configurar preços** e tabelas de entrega
- **Gerar relatórios** de desempenho e pagamentos

## Hierarquia do Sistema

```
muv.log (Plataforma)
    └── Sua Empresa (Tenant)
            ├── Praça 1 (Região)
            │   ├── Estabelecimento A
            │   │   ├── Entregadores Próprios
            │   │   └── Pedidos
            │   └── Estabelecimento B
            └── Praça 2 (Região)
                └── Estabelecimento C
```

## Tipos de Usuário

| Tipo | O que faz | Onde acessa |
|------|-----------|-------------|
| **Admin** | Gerencia tudo: praças, estabelecimentos, entregadores, pedidos, financeiro | `/admin` |
| **Estabelecimento** | Cria pedidos, gerencia seus entregadores próprios, acompanha entregas | `/client` |
| **Entregador Próprio** | Recebe pedidos, atualiza status, registra entregas | `/own-driver` |
| **Entregador Plataforma** | Recebe ofertas de pedidos, aceita/recusa, entrega | `/dashboard` |

---

# 2. Primeiros Passos

## 2.1 Acessando o Sistema

### Como Admin
1. Acesse o link: `https://seu-dominio.com/login`
2. Digite seu **email** e **senha**
3. Clique em **"Entrar"**
4. Você será redirecionado para o Painel do Admin

### Como Estabelecimento
1. Acesse: `https://seu-dominio.com/client/login`
2. Digite o **email** e **senha** cadastrados
3. Clique em **"Entrar"**
4. Você será redirecionado para o Painel do Estabelecimento

### Como Entregador Próprio
1. Acesse: `https://seu-dominio.com/own-driver/login`
2. Digite seu **telefone** e **PIN** (4 dígitos)
3. Clique em **"Entrar"**
4. Você será redirecionado para o App do Entregador

## 2.2 Configuração Inicial (Admin)

Ao acessar o sistema pela primeira vez como Admin, siga estas etapas:

### Etapa 1: Verificar Praças
1. Vá em **Praças** no menu lateral
2. Verifique se as praças da sua região estão cadastradas
3. Se não estiverem, clique em **"Nova Praça"** e preencha:
   - **Nome**: Nome da praça (ex: "Centro", "Zona Sul")
   - **Cidade**: Cidade da praça
   - **Estado**: UF (ex: RS)
   - **Preço por km**: Valor cobrado por quilômetro de entrega
   - **Distância mínima**: Distância mínima para cobrança (ex: 4 km)

### Etapa 2: Cadastrar Estabelecimentos
1. Vá em **Estabelecimentos** no menu lateral
2. Clique em **"Novo Estabelecimento"**
3. Preencha todos os dados:
   - **Nome**: Nome do estabelecimento
   - **CNPJ**: CNPJ do estabelecimento
   - **Telefone**: Telefone de contato
   - **Email**: Email de contato
   - **Senha**: Senha para acesso ao sistema
   - **Endereço**: Endereço completo (Rua, Número, Bairro, Cidade, UF, CEP)
   - **Praça**: Selecione a praça onde o estabelecimento está localizado
   - **Tabela de Preços**: Selecione a tabela de preços para cálculo do frete
   - **Tempo de Preparo**: Tempo médio de preparo dos pedidos (em minutos)
4. Clique em **"Salvar"**

### Etapa 3: Cadastrar Entregadores
1. Vá em **Entregadores** no menu lateral
2. Clique em **"Novo Entregador"**
3. Preencha os dados:
   - **Nome**: Nome do entregador
   - **Sobrenome**: Sobrenome do entregador
   - **Email**: Email para login
   - **Senha**: Senha para login
   - **Telefone**: Telefone de contato
   - **CPF**: CPF do entregador
   - **Veículo**: Tipo de veículo (Moto, Bicicleta, Carro)
   - **Placa**: Placa do veículo
   - **Modelo**: Modelo do veículo
   - **CNH**: Número da CNH
   - **Chave PIX**: Chave PIX para pagamentos
   - **Praça**: Selecione a praça onde o entregador atua
4. Clique em **"Salvar"**

---

# 3. Painel do Administrador

## 3.1 Dashboard

O Dashboard é a tela principal do Admin e mostra um resumo de todas as atividades:

### Cards de Resumo
- **Total de Pedidos**: Quantidade total de pedidos no período
- **Pedidos Ativos**: Pedidos em andamento (pendentes, aceitos, em preparo, etc.)
- **Entregadores Online**: Quantidade de entregadores disponíveis
- **Receita Total**: Valor total das entregas no período

### Gráficos
- **Pedidos por Status**: Distribuição dos pedidos por status
- **Pedidos por Período**: Evolução dos pedidos ao longo do tempo

### Ações Rápidas
- **Novo Pedido**: Criar um novo pedido manualmente
- **Ver Mapa**: Acessar o mapa de rastreamento em tempo real
- **Relatórios**: Acessar relatórios detalhados

## 3.2 Menu Lateral

O menu lateral contém todas as seções do sistema:

| Seção | O que contém |
|-------|--------------|
| **Painel** | Dashboard com resumo geral |
| **Praças** | Gerenciamento de regiões |
| **Clientes** | Lista de estabelecimentos |
| **Entregadores** | Gerenciamento de entregadores |
| **Pedidos** | Lista de todos os pedidos |
| **Financeiro** | Controle financeiro |
| **Preços** | Tabelas de preços |
| **Impostos** | Configurações de impostos |
| **Integrações** | Integrações com plataformas externas |
| **Saques** | Solicitações de saque |
| **Faturas** | Faturas de assinatura |
| **Relatórios** | Relatórios detalhados |
| **Configurações** | Configurações do sistema |

---

# 4. Gerenciamento de Praças

## 4.1 O que é uma Praça?

Uma **Praça** é uma região geográfica onde os estabelecimentos e entregadores operam. Cada praça tem:
- Preços de entrega próprios
- Entregadores dedicados
- Estabelecimentos vinculados

## 4.2 Criar uma Nova Praça

1. Vá em **Praças** no menu lateral
2. Clique em **"Nova Praça"**
3. Preencha os dados:
   - **Nome**: Nome da praça (ex: "Centro", "Zona Sul", "Bairro Novo")
   - **Cidade**: Cidade da praça
   - **Estado**: UF (ex: RS, SP, RJ)
   - **Preço por km**: Valor cobrado por quilômetro de entrega (ex: R$ 2,95/km)
   - **Distância mínima**: Distância mínima para cobrança (ex: 4 km)
   - **Preço mínimo**: Valor mínimo do frete (ex: R$ 8,00)
   - **Preço máximo**: Valor máximo do frete (opcional)
4. Clique em **"Salvar"**

## 4.3 Editar uma Praça

1. Na lista de praças, clique no ícone de edição (✏️) da praça desejada
2. Altere os campos necessários
3. Clique em **"Salvar"**

## 4.4 Excluir uma Praça

1. Na lista de praças, clique no ícone de exclusão (🗑️) da praça desejada
2. Confirme a exclusão
3. **Atenção**: Só é possível excluir praças que não possuem estabelecimentos ou entregadores vinculados

## 4.5 Configurações de Preços por Praça

Cada praça pode ter configurações de preços diferentes:

| Configuração | Descrição | Exemplo |
|--------------|-----------|---------|
| **Preço por km** | Valor cobrado por quilômetro | R$ 2,95/km |
| **Distância mínima** | Distância mínima para cobrança | 4 km |
| **Preço mínimo** | Valor mínimo do frete | R$ 8,00 |
| **Preço máximo** | Valor máximo do frete (opcional) | R$ 50,00 |

**Cálculo do Frete:**
```
Frete = max(Distância Real, Distância Mínima) × Preço por km
Frete = max(Frete Calculado, Preço Mínimo)
Frete = min(Frete, Preço Máximo)  # Se definido
```

---

# 5. Gerenciamento de Estabelecimentos

## 5.1 Cadastrar um Estabelecimento

### Via Admin (Cadastro Direto)
1. Vá em **Estabelecimentos** no menu lateral
2. Clique em **"Novo Estabelecimento"**
3. Preencha todos os campos obrigatórios:
   - **Nome do Estabelecimento**: Nome comercial
   - **CNPJ**: CNPJ do estabelecimento (opcional)
   - **Telefone**: Telefone de contato
   - **Email**: Email para login e contato
   - **Senha**: Senha de acesso ao sistema
   - **Endereço Completo**: Rua, Número, Bairro, Cidade, UF, CEP
   - **Praça**: Selecione a praça onde o estabelecimento está localizado
   - **Tabela de Preços**: Selecione a tabela de preços para cálculo do frete
   - **Tempo de Preparo**: Tempo médio de preparo (em minutos)
   - **Tipo de Confirmação de Coleta**: Como o entregador confirma a coleta (Código, Foto, Código + Foto)
   - **Tipo de Confirmação de Entrega**: Como o entregador confirma a entrega (Código, Foto, Código + Foto)
4. Clique em **"Salvar"**

### Via Link de Cadastro (Cadastro Público)
1. Vá em **Estabelecimentos** no menu lateral
2. Clique em **"Link de Cadastro"**
3. Copie o link gerado
4. Envie o link para o estabelecimento
5. O estabelecimento preenche o formulário completo:
   - Nome do Estabelecimento
   - CNPJ
   - Telefone
   - Email
   - Senha
   - Endereço Completo
   - Tempo de Preparo
   - Tipo de Confirmação de Coleta
   - Tipo de Confirmação de Entrega
6. O cadastro fica **pendente** até aprovação do Admin
7. O Admin aprova e atribui a **Praça** e **Tabela de Preços**

## 5.2 Aprovar um Estabelecimento

Quando um estabelecimento se cadastra pelo link, o Admin precisa aprovar:

1. Vá em **Estabelecimentos** no menu lateral
2. Encontre o estabelecimento com status **"Pendente"**
3. Clique em **"Aprovar"**
4. Selecione a **Praça** para o estabelecimento
5. Selecione a **Tabela de Preços** (opcional)
6. Clique em **"Confirmar"**

## 5.3 Editar um Estabelecimento

1. Na lista de estabelecimentos, clique no estabelecimento desejado
2. Clique em **"Editar"**
3. Altere os campos necessários
4. Clique em **"Salvar"**

## 5.4 Excluir um Estabelecimento

1. Na lista de estabelecimentos, clique no ícone de exclusão (🗑️)
2. Confirme a exclusão
3. **Atenção**: Estabelecimentos com pedidos vinculados não podem ser excluídos normalmente. Use a opção **"Exclusão Forçada"** se necessário (desvincula pedidos automaticamente).

## 5.5 Configurações do Estabelecimento

### Tipo de Entregador
- **Entregadores Próprios**: O estabelecimento gerencia seus próprios entregadores
- **Entregadores da Plataforma**: O estabelecimento usa entregadores da plataforma muv.log

### Roteirização Multi-Parada
- **Ativado**: Entregadores podem sair com múltiplos pedidos ao mesmo tempo
- **Desativado**: Cada pedido é entregue individualmente

### Configurações de Confirmação
- **Confirmação de Coleta**: Como o entregador confirma que coletou o pedido
  - **Código**: Entregador digita código de coleta
  - **Foto**: Entregador tira foto da coleta
  - **Código + Foto**: Ambos
  - **Nenhuma**: Sem confirmação
- **Confirmação de Entrega**: Como o entregador confirma que entregou o pedido
  - **Código**: Entregador digita código de entrega
  - **Foto**: Entregador tira foto da entrega
  - **Código + Foto**: Ambos
  - **Nenhuma**: Sem confirmação

---

# 6. Gerenciamento de Entregadores

## 6.1 Tipos de Entregadores

### Entregador da Plataforma
- Cadastrado pelo Admin
- Usa email + senha para login
- Pode receber pedidos de qualquer estabelecimento da praça
- Recebe ofertas e pode aceitar ou recusar
- Pagamento gerenciado pelo Admin

### Entregador Próprio
- Cadastrado pelo Estabelecimento
- Usa telefone + PIN para login
- Trabalha exclusivamente para um estabelecimento
- Pode ser atribuído automaticamente ou manualmente
- Pagamento gerenciado pelo Estabelecimento

## 6.2 Cadastrar Entregador da Plataforma

1. Vá em **Entregadores** no menu lateral
2. Clique em **"Novo Entregador"**
3. Preencha os dados:
   - **Nome**: Nome do entregador
   - **Sobrenome**: Sobrenome do entregador
   - **Email**: Email para login
   - **Senha**: Senha para login
   - **Telefone**: Telefone de contato
   - **CPF**: CPF do entregador
   - **Veículo**: Tipo de veículo (Moto, Bicicleta, Carro)
   - **Placa**: Placa do veículo
   - **Modelo**: Modelo do veículo
   - **CNH**: Número da CNH
   - **Chave PIX**: Chave PIX para pagamentos
   - **Praça**: Selecione a praça onde o entregador atua
   - **Máx. Pedidos Simultâneos**: Quantidade máxima de pedidos que o entregador pode ter ao mesmo tempo
4. Clique em **"Salvar"**

## 6.3 Cadastrar Entregador Próprio

1. Vá em **Meus Entregadores** no menu do Estabelecimento
2. Clique em **"Novo Entregador"**
3. Preencha os dados:
   - **Nome**: Nome do entregador
   - **Telefone**: Telefone para login
   - **Veículo**: Tipo de veículo (Moto, Bicicleta, Carro)
   - **Placa**: Placa do veículo
   - **Modelo**: Modelo do veículo
   - **PIN de Acesso**: PIN de 4 dígitos para login
   - **Frequência de Pagamento**: Como o entregador será pago
     - **Diário**: Pagamento todo dia
     - **Semanal**: Pagamento toda semana
     - **Mensal**: Pagamento todo mês
     - **Sob Demanda**: Pagamento sob demanda (ocasional)
4. Clique em **"Salvar"**

## 6.4 Configurar PIN do Entregador Próprio

O PIN é usado pelo entregador para acessar o app:

1. Ao cadastrar o entregador, preencha o campo **"PIN de Acesso"**
2. O PIN deve ter **4 dígitos** (ex: 1234)
3. O entregador usa o PIN junto com o telefone para fazer login

## 6.5 Status do Entregador

| Status | Descrição |
|--------|-----------|
| **Online** | Entregador disponível para receber pedidos |
| **Offline** | Entregador indisponível |
| **Ativo** | Entregador ativo no sistema |
| **Inativo** | Entregador desativado pelo Admin |
| **Bloqueado** | Entregador bloqueado por excesso de recusas |

## 6.6 Editar Entregador

1. Na lista de entregadores, clique no entregador desejado
2. Clique em **"Editar"**
3. Altere os campos necessários
4. Clique em **"Salvar"**

## 6.7 Excluir Entregador

1. Na lista de entregadores, clique no ícone de exclusão (🗑️)
2. Confirme a exclusão
3. **Atenção**: Entregadores com pedidos vinculados precisam de exclusão forçada

---

# 7. Gerenciamento de Pedidos

## 7.1 Criar um Pedido

### Via Estabelecimento
1. Vá em **Novo Pedido** no menu do Estabelecimento
2. Preencha os dados do cliente:
   - **Nome do Cliente**: Nome completo
   - **Telefone do Cliente**: Telefone de contato
3. Preencha o endereço de entrega:
   - **Rua/Avenida**: Endereço completo
   - **Número**: Número do endereço
   - **Complemento**: Complemento (opcional)
   - **Bairro**: Bairro
   - **Cidade**: Cidade
   - **UF**: Estado
   - **CEP**: CEP (opcional)
4. Clique em **"Calcular Frete"** para ver o valor do frete
5. Configure o pagamento:
   - **Tipo de Pagamento**: No Estabelecimento ou Na Entrega
   - **Forma de Pagamento**: Dinheiro, Cartão ou PIX
   - **Valor dos Itens**: Valor dos itens (se pagamento na entrega)
   - **Troco para**: Valor do troco (se pagamento em dinheiro)
6. Adicione observações (opcional)
7. Clique em **"Enviar Pedido"**

### Via Admin
1. Vá em **Pedidos** no menu lateral
2. Clique em **"Novo Pedido"**
3. Selecione o **Estabelecimento**
4. Preencha os dados do cliente e endereço
5. Configure o pagamento
6. Clique em **"Enviar Pedido"**

## 7.2 Status dos Pedidos

| Status | Descrição | O que fazer |
|--------|-----------|-------------|
| **Agendado** | Pedido criado, aguardando tempo de preparo | Aguardar |
| **Pendente** | Pedido pronto para distribuição | Atribuir entregador |
| **Oferecido** | Pedido oferecido a entregador próprio | Aguardar aceite/recusa |
| **Aceito** | Pedido aceito por entregador | Aguardar coleta |
| **Em Preparo** | Pedido em preparo no estabelecimento | Aguardar |
| **Pronto** | Pedido pronto para coleta | Entregador deve coletar |
| **Coletado** | Pedido coletado pelo entregador | Acompanhar entrega |
| **Entregue** | Pedido entregue ao cliente | Concluído |
| **Cancelado** | Pedido cancelado | - |

## 7.3 Distribuição de Pedidos

### Distribuição Automática
Quando um pedido fica **Pendente**, o sistema tenta distribuir automaticamente:

1. **Entregadores Próprios**: Se o estabelecimento tem entregadores próprios online, o sistema oferece o pedido ao mais próximo
2. **Entregadores da Plataforma**: Se não há entregadores próprios disponíveis, o sistema distribui para entregadores da plataforma

### Distribuição Manual
O Admin ou Estabelecimento pode distribuir manualmente:

1. No pedido, clique em **"Atribuir Entregador"**
2. Selecione o entregador desejado
3. Clique em **"Confirmar"**

### Chamar Entregador da Plataforma
Se o estabelecimento usa entregadores próprios mas precisa de reforço:

1. No pedido, clique em **"Chamar Plataforma"**
2. O sistema encontra o entregador da plataforma mais próximo
3. O entregador recebe uma notificação

## 7.4 Aceite e Recusa de Pedidos

### Entregadores Próprios
Quando um pedido é oferecido a um entregador próprio:
1. O entregador vê o pedido no app com status **"Oferecido"**
2. O entregador pode **Aceitar** ou **Rejeitar**
3. Se aceitar, o pedido muda para **"Aceito"**
4. Se rejeitar, o sistema tenta o próximo entregador disponível

### Entregadores da Plataforma
Quando um pedido é distribuído para entregadores da plataforma:
1. O entregador recebe uma notificação com os detalhes do pedido
2. O entregador pode **Aceitar** ou **Recusar**
3. Se aceitar, o pedido muda para **"Aceito"**
4. Se recusar ou não responder em tempo, o pedido vai para o próximo entregador

## 7.5 Fluxo de Entrega

### Coleta do Pedido
1. Entregador chega ao estabelecimento
2. Entregador clica em **"Iniciar Entrega"** (ou "Coletado")
3. Se configurado, o entregador digita o **código de coleta** ou tira uma **foto**
4. Pedido muda para **"Coletado"**

### Entrega ao Cliente
1. Entregador segue a rota no mapa
2. Entregador chega ao endereço de entrega
3. Entregador clica em **"Entregue"**
4. Se configurado, o entregador digita o **código de entrega** ou tira uma **foto**
5. Pedido muda para **"Entregue"**

## 7.6 Cancelamento de Pedidos

### Cancelar um Pedido
1. No pedido, clique em **"Cancelar Pedido"**
2. Informe o motivo do cancelamento (opcional)
3. Se o pedido já foi aceito por um entregador, escolha se deseja **estornar o valor** ao entregador
4. Confirme o cancelamento

### Regras de Cancelamento
- Pedidos **Pendentes** podem ser cancelados livremente
- Pedidos **Aceitos** ou em preparo podem ser cancelados com estorno opcional
- Pedidos **Coletados** não podem ser cancelados normalmente

---

# 8. Financeiro

## 8.1 Visão Geral

O módulo financeiro permite:
- Visualizar ganhos dos entregadores
- Processar pagamentos
- Gerar relatórios financeiros
- Gerenciar assinaturas de entregadores próprios

## 8.2 Financeiro de Entregadores da Plataforma

### Visualizar Ganhos
1. Vá em **Financeiro** no menu lateral
2. Selecione o período (Semana, Mês, etc.)
3. Visualize os ganhos por entregador

### Processar Pagamento
1. Na lista de entregadores, clique em **"Pagar"** ao lado do entregador
2. Confirme o pagamento
3. O valor é marcado como pago

### Solicitar Saque
Os entregadores da plataforma podem solicitar saques:
1. O entregador acessa sua carteira no app
2. Clica em **"Solicitar Saque"**
3. O Admin recebe a solicitação e processa o pagamento via PIX

## 8.3 Financeiro de Entregadores Próprios

### Configurar Pagamento
1. Vá em **Financeiro** → **Pagamentos Próprios**
2. Configure o tipo de pagamento por entregador:
   - **Por Entrega**: Valor fixo por entrega
   - **Por Km**: Valor por quilômetro rodado
   - **Percentual**: Percentual do frete
   - **Diária**: Valor fixo por dia
   - **Fixo**: Valor fixo combinado
   - **Fixo + Entrega**: Valor fixo + valor por entrega
   - **Fixo (até X) + Extra**: Valor fixo até N entregas + valor por entrega extra

### Visualizar Ganhos
1. Vá em **Financeiro** → **Pagamentos Próprios**
2. Selecione o período (Hoje, Semana, Mês)
3. Visualize os ganhos por entregador e por período

### Processar Pagamento
1. Na lista de entregadores, expanda o entregador desejado
2. Clique em **"Pagar"** ao lado do período desejado
3. Ou clique em **"Pagar Tudo"** para quitar todos os pendentes

### Solicitar Saque (Entregador Próprio)
1. O entregador acessa **"Meus Ganhos"** no app
2. Clica em **"Solicitar Saque"**
3. O estabelecimento recebe a solicitação e processa o pagamento

## 8.4 Assinaturas de Entregadores Próprios

### Criar Assinatura
1. Vá em **Assinaturas** no menu lateral
2. Clique em **"Nova Assinatura"**
3. Selecione o **Estabelecimento**
4. Configure:
   - **Ciclo de Cobrança**: Semanal ou Mensal
   - **Preço por Entregador**: Valor por entregador por ciclo
   - **Preço Fixo**: Valor fixo por estabelecimento (opcional)
5. Clique em **"Criar Assinatura"**

### Gerar Fatura
1. Na lista de assinaturas, clique em **"Gerar Fatura"**
2. O sistema calcula automaticamente:
   - Quantidade de entregadores ativos
   - Valor total = (Preço por Entregador × Quantidade) + Preço Fixo
3. A fatura é gerada com link de pagamento PIX (se Asaas configurado)

### Processar Pagamento
1. Na lista de faturas, clique em **"PIX"** para abrir o link de pagamento
2. Ou clique em **"Pagar"** para marcar como pago manualmente

## 8.5 Relatório de Inadimplência

1. Vá em **Inadimplência** no menu lateral
2. Visualize estabelecimentos com faturas vencidas
3. Clique em **"Verificar Vencimentos"** para criar notificações automáticas

## 8.6 Exportar Relatórios

1. Vá em **Financeiro** → **Pagamentos Próprios**
2. Clique em **"Exportar CSV"**
3. O arquivo CSV é baixado com todos os dados do período selecionado

---

# 9. Configurações

## 9.1 Configurações Gerais

1. Vá em **Configurações** no menu lateral
2. Configure:
   - **Nome da Empresa**: Nome da sua empresa
   - **Telefone de Contato**: Telefone principal
   - **Email de Contato**: Email principal
   - **Endereço**: Endereço da empresa

## 9.2 Configurações de Entrega

1. Vá em **Configurações** → **Entrega**
2. Configure:
   - **Raio de Coleta**: Distância máxima para confirmação de coleta (metros)
   - **Raio de Entrega**: Distância máxima para confirmação de entrega (metros)
   - **Tempo de Expiração do Pedido**: Tempo para o pedido expirar se não for aceito (segundos)

## 9.3 Configurações de Notificação

1. Vá em **Configurações** → **Notificações**
2. Configure:
   - **Notificações por WhatsApp**: Ativar/desativar notificações por WhatsApp
   - **Telefone do Admin**: Telefone para receber notificações

## 9.4 Configurações de Pagamento

1. Vá em **Configurações** → **Pagamento**
2. Configure:
   - **Chave PIX**: Chave PIX da empresa para receber pagamentos
   - **Dados Bancários**: Banco, Agência, Conta

---

# 10. Painel do Estabelecimento

## 10.1 Dashboard

O Dashboard do Estabelecimento mostra:
- **Pedidos Ativos**: Pedidos em andamento
- **Mapa**: Mapa com localização dos entregadores e pedidos
- **Resumo**: Resumo do dia

## 10.2 Criar Pedido

1. Vá em **Novo Pedido**
2. Preencha os dados do cliente e endereço
3. Clique em **"Calcular Frete"** para ver o valor
4. Configure o pagamento
5. Clique em **"Enviar Pedido"**

## 10.3 Meus Pedidos

1. Vá em **Meus Pedidos**
2. Visualize todos os pedidos do estabelecimento
3. Filtre por status, período, etc.
4. Clique em um pedido para ver detalhes

## 10.4 Meus Entregadores

1. Vá em **Meus Entregadores**
2. Visualize entregadores próprios do estabelecimento
3. Clique em **"Novo Entregador"** para cadastrar
4. Clique em um entregador para editar ou excluir

## 10.5 Financeiro

1. Vá em **Financeiro**
2. Visualize ganhos dos entregadores
3. Processe pagamentos
4. Exporte relatórios

## 10.6 Integrações

1. Vá em **Integrações**
2. Configure integrações com plataformas externas (iFood, etc.)

---

# 11. App do Entregador Próprio

## 11.1 Login

1. Acesse: `https://seu-dominio.com/own-driver/login`
2. Digite seu **telefone**
3. Digite seu **PIN** (4 dígitos)
4. Clique em **"Entrar"**

## 11.2 Dashboard

O Dashboard mostra:
- **Status**: Online/Offline
- **Pedidos Ativos**: Pedidos em andamento
- **Estatísticas**: Resumo de entregas e ganhos

## 11.3 Ficar Online/Offline

1. No Dashboard, clique no botão **"Online"** ou **"Offline"**
2. Quando online, o entregador pode receber pedidos
3. Quando offline, o entregador não recebe pedidos

## 11.4 Aceitar/Rejeitar Pedido

Quando um pedido é oferecido:
1. O entregador vê o pedido com status **"Oferecido"**
2. Clique em **"Aceitar"** para aceitar o pedido
3. Clique em **"Rejeitar"** para rejeitar o pedido
4. Se rejeitar, o sistema tenta o próximo entregador

## 11.5 Fluxo de Entrega

### Coleta
1. Entregador chega ao estabelecimento
2. Clique em **"Iniciar Entrega"**
3. Se configurado, digite o **código de coleta** ou tire uma **foto**
4. Pedido muda para **"Coletado"**

### Entrega
1. Entregador segue a rota no mapa
2. Entregador chega ao endereço de entrega
3. Clique em **"Entregue"**
4. Se configurado, digite o **código de entrega** ou tire uma **foto**
5. Pedido muda para **"Entregue"**

## 11.6 Meus Ganhos

1. Vá em **Ganhos** no menu
2. Visualize ganhos por período (Hoje, Semana, Mês)
3. Clique em **"Solicitar Saque"** para solicitar pagamento
4. Configure sua **Chave PIX** para receber pagamentos

## 11.7 Minhas Rotas

1. Vá em **Rotas** no menu
2. Visualize rotas ativas com múltiplos pedidos
3. Clique em **"Concluir"** em cada parada conforme completa

---

# 12. Rastreamento em Tempo Real

## 12.1 Mapa de Rastreamento

1. Vá em **Pedidos** → **Mapa** (ou Dashboard do Estabelecimento)
2. O mapa mostra:
   - **Estabelecimento**: Marcador do restaurante
   - **Entregadores**: Marcadores dos entregadores online
   - **Destinos**: Marcadores dos endereços de entrega
   - **Rotas**: Linhas conectando entregadores aos destinos

## 12.2 Acompanhar Pedido

1. No mapa, clique em um marcador de entregador
2. Veja os detalhes do pedido associado
3. Acompanhe a localização em tempo real

## 12.3 Rastreamento por Link

Para cada pedido, é gerado um link de rastreamento:
1. O cliente recebe o link por WhatsApp
2. O cliente acessa o link e vê a localização do entregador em tempo real
3. O link mostra o status do pedido e a rota

---

# 13. Mapa do Banco de Dados

## 13.1 Acessar o Mapa

1. Vá em **Mapa do Banco de Dados** (apenas para Admins)
2. O mapa mostra todos os dados do sistema organizados hierarquicamente

## 13.2 Funcionalidades

### Visualizar Dados
- **Tenants**: Empresas cadastradas
- **Praças**: Regiões configuradas
- **Usuários**: Todos os usuários do sistema
- **Restaurantes**: Estabelecimentos cadastrados
- **Entregadores**: Entregadores da plataforma e próprios
- **Pedidos**: Resumo dos pedidos

### Editar Dados
1. Clique em **"Editar"** em qualquer item
2. Altere os campos necessários
3. Clique em **"Salvar"**

### Excluir Dados
1. Clique em **"Excluir"** em qualquer item
2. Confirme a exclusão
3. Itens com dados vinculados precisam de exclusão forçada

### Gerar PDF
1. Clique em **"Gerar PDF"**
2. Uma nova janela abre com o relatório formatado
3. Use a função de impressão do navegador para salvar como PDF

### Exportar JSON
1. Clique em **"Copiar JSON"**
2. Os dados são copiados para a área de transferência

### Limpar Dados de Teste
1. Clique em **"🧹 Limpar Testes"**
2. Confirme a limpeza
3. Todos os dados de teste são removidos (exceto admins)

---

# 14. Solução de Problemas

## 14.1 Login não funciona

**Problema**: Não consigo fazer login

**Soluções**:
1. Verifique se o email e senha estão corretos
2. Verifique se o usuário está **ativo** (não pendente ou inativo)
3. Limpe o cache do navegador (Ctrl+Shift+R)
4. Se esqueceu a senha, peça ao Admin para resetar

## 14.2 Pedido não aparece

**Problema**: Criei um pedido mas ele não aparece

**Soluções**:
1. Verifique se o pedido foi criado com sucesso (mensagem de confirmação)
2. Atualize a página (F5)
3. Verifique o filtro de status (pode estar filtrando por status errado)
4. Verifique se o estabelecimento está correto

## 14.3 Entregador não recebe pedidos

**Problema**: Entregador online mas não recebe pedidos

**Soluções**:
1. Verifique se o entregador está **online** (status verde)
2. Verifique se o entregador está na **praça correta**
3. Verifique se o entregador não está **bloqueado**
4. Verifique se há pedidos **pendentes** para a praça

## 14.4 Frete calculado errado

**Problema**: O valor do frete está incorreto

**Soluções**:
1. Verifique a **tabela de preços** do estabelecimento
2. Verifique o **preço por km** da praça
3. Verifique a **distância mínima** configurada
4. Use o botão **"Calcular Frete"** para ver o cálculo detalhado

## 14.5 Mapa não mostra entregadores

**Problema**: O mapa não mostra a localização dos entregadores

**Soluções**:
1. Verifique se o entregador está **online**
2. Verifique se o entregador permitiu **acesso à localização** no celular
3. Aguarde alguns segundos (a localização é atualizada a cada 15 segundos)
4. Atualize a página

## 14.6 Pagamento não processado

**Problema**: Pagamento não foi processado

**Soluções**:
1. Verifique se o entregador tem **Chave PIX** cadastrada
2. Verifique se o valor do pagamento está correto
3. Tente processar o pagamento novamente
4. Se o erro persistir, verifique os logs do sistema

## 14.7 Erro ao criar pedido

**Problema**: Erro ao criar um pedido

**Soluções**:
1. Verifique se todos os campos obrigatórios estão preenchidos
2. Verifique se o endereço é válido
3. Verifique se o estabelecimento está ativo
4. Tente novamente em alguns segundos

## 14.8 Sistema lento

**Problema**: O sistema está lento

**Soluções**:
1. Verifique sua conexão com a internet
2. Limpe o cache do navegador
3. Tente acessar em outro navegador
4. Se o problema persistir, entre em contato com o suporte

---

# Glossário

| Termo | Definição |
|-------|-----------|
| **Praça** | Região geográfica onde os estabelecimentos e entregadores operam |
| **Tenant** | Empresa que usa o sistema (multi-tenant) |
| **Entregador Próprio** | Entregador que trabalha exclusivamente para um estabelecimento |
| **Entregador da Plataforma** | Entregador que recebe pedidos de qualquer estabelecimento |
| **PIN** | Código de 4 dígitos usado pelo entregador próprio para login |
| **Frete** | Valor cobrado pela entrega |
| **Tabela de Preços** | Configuração de preços para cálculo do frete |
| **Roteirização** | Agrupamento de múltiplos pedidos em uma rota |
| **Assinatura** | Cobrança recorrente pelo uso de entregadores próprios |
| **Fatura** | Documento de cobrança gerado pela assinatura |
| **PIX** | Sistema de pagamentos instantâneos do Brasil |
| **OSRM** | Serviço de cálculo de rotas (Open Source Routing Machine) |

---

# Suporte

Para dúvidas ou problemas:
1. Consulte este manual
2. Verifique a seção **Solução de Problemas**
3. Entre em contato com o suporte técnico

---

**muv.log** — Sistema de Gerenciamento de Entregas
Versão 1.0
