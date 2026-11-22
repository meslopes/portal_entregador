# Plano — Monetização e Autonomia de Estabelecimentos com Entregadores Próprios

> Referência da equipe (regra do projeto auto-explicitivo). Criado em 2026-11-16 pelo Mauro + IA.
> Neste documento: o modelo de negócio das entregas próprias, o fluxo de dinheiro entre as camadas,
> o que já existe no sistema e o plano de implementação em fases (A–E).

---

## 1. Contexto real (valida o modelo)

O Mauro atua em todas as pontas da cadeia — é por isso que o processo vive na cabeça dele, e também
por isso que óbvios passam batido:

```
FORA DE HORA (Mauro) + BASTA DRINKS (Emmanuel)     ← estabelecimentos com entregadores próprios
        │ pagam ao admin pelo uso da plataforma
        ▼
ADMIN MUVY (Mauro + Emmanuel + Claudete)            ← tenant (operador/admin do sistema)
        │ paga à plataforma pelo uso do software
        ▼
ENTREGAS EXPRESSAS (hoje) / MUV (futuro)            ← plataforma SaaS que estamos construindo
```

No sistema: estabelecimento = `Restaurant` (tenant do admin) · admin = `User` ADMIN do tenant ·
plataforma = MUV (super admin). O banco de testes já espelha isso ("Fora de Hora", "Basta Drinks").

## 2. Princípio da independência (decisão fundamental)

> **Cada camada precifica o que é dela, livremente. Ninguém lê a tabela do outro.**

Motivação real: uma conhecida do Mauro embutia o custo da entrega nos preços dos lanches — o frete
fica invisível. Logo: **qualquer cobrança em % do valor do frete é burlável e não serve de base.**

| Camada | Preço de quem | Vinculado a quê |
|--------|---------------|-----------------|
| Entrega ao cliente | do estabelecimento | **Nada** — pode embutir no produto e cobrar frete zero |
| Pagamento ao entregador | do estabelecimento | Só a regra dele (por entrega/km/%/fixo) |
| Uso da plataforma (estab → admin) | do admin | **Só o acesso/uso do software** |
| Uso da plataforma (admin → MUV) | da MUV | **Só o acesso/uso do software** |

Regras derivadas:
- Nunca % do valor do frete em nenhuma cobrança.
- Termo "por pedido" = por **pedido** (uso), não por valor.
- Tabela de preços do estabelecimento é **limpa e livre** (sem campos de custo embutidos).

## 3. Fluxo de dinheiro (4 camadas)

```
CLIENTE final
   │  paga frete (preço do ESTABELECIMENTO — tabela própria)
   ▼
ESTABELECIMENTO (próprio)
   │  paga seus entregadores (regra própria: PER_DELIVERY/PER_KM/PERCENTAGE/FIXED...) — JÁ EXISTE
   │  paga o ADMIN pelo uso da plataforma (assinatura) — ESBOÇO EXISTE
   ▼
ADMIN (tenant)
   │  paga a MUV pelo uso da plataforma (assinatura) — A IMPLEMENTAR
   ▼
MUV (plataforma)
```

## 4. O que JÁ existe no sistema (evidências)

| Peça | Estado | Onde |
|------|--------|------|
| Tabela de preços do cliente (`PricingTable`) | ✅ Completa (fonte única de frete pós-Fase 1/2) | `src/models/finance.py` |
| Pagamento ao entregador próprio | ✅ Completo (tipo/valor/% por estabelecimento) | `admin_est_drivers_pay.py` · portal do estab. "Pagamentos Entregadores" |
| Assinatura estab → admin (esboço) | ✅ `FIXO + R$/entregador ativo`, ciclo WEEKLY/MONTHLY, faturas | `/admin/subscriptions` · `finance_billing.py` (hoje `price_per_driver` default R$50) |
| Faturas + link de pagamento PIX | ✅ | `/admin/invoices` · Asaas (`webhooks_payments.py`) |
| Cobrança admin → MUV | ❌ Não existe | — |

⚠️ **Débito técnico já identificado:** a fórmula da assinatura está duplicada em **3 lugares**
(`finance_billing.py:58-59`, `:231`, `:444`) — mesmo tipo de drift que causou a confusão de preços.
Ao tocar nela, **centralizar em uma única função**.

## 5. Modelo de cobrança — decisões

### 5.1 Estabelecimento → Admin: tabela flexível de 3 termos (argumento de venda)

O admin **negocia por estabelecimento** — mesma fórmula, três termos configuráveis (zeros permitidos):

```
total do ciclo = FIXO + (R$/entregador × entregadores ativos) + (R$/pedido × pedidos no ciclo)
```

| Configuração do admin | Vira o modelo |
|---|---|
| só FIXO | mensalidade simples |
| só R$/entregador | o esboço atual |
| só R$/pedido | uso real |
| mistura | negociação comercial livre (brindes = tudo zero) |

Implementação: coluna `price_per_order` na assinatura + fórmula **centralizada única**
`calcular_assinatura(subscription, inicio, fim)` + campo no modal/card/fatura.

### 5.2 Admin → MUV: motor por COMPONENTES configuráveis (2026-11-20)

**Atualização (pedido do Mauro):** o modelo de cobrança em si passou a ser **configurável por
assinatura** — cada admin/contrato monta a própria fórmula (diretriz "tudo configurável" aplicada
às relações operacionais). Motor Único em `platform_billing.calcular_ciclo_plataforma`:

```
total do ciclo = [FIXO] + [R$/estab × contagem(modo, N)] + [R$/pedido × máx(0, pedidos − cota)]
```

| Componente | Parâmetros | Observação |
|---|---|---|
| Fixo | valor por ciclo | 0 = desligado |
| Por estabelecimento | R$/estab + **modo de contagem** + N mínimo | `SNAPSHOT` = ativos no instante (legado) · `USO` = ≥N pedidos no ciclo · `PRO_RATA_USO` = proporcional a dias com pedido |
| Por pedido | **faixas marginais** (escalonamento por volume, 2026-11-22) | Cada faixa cobra só os pedidos que entram nela (como conta de luz): ex. 200 inclusos (R$0) → até 500 a R$0,80 → até 1.000 a R$0,70 → ∞ a R$0,60. Quem vende mais paga mais no total com pedido mais barato; mês fraco = fatura menor. A fatura/simulação traz a **quebra por faixa** |

**Por que os modos (cenários levantados pelo Mauro):** teste sem venda não conta (modo `USO`);
"ativou só pra uma venda" cobra fração (`PRO_RATA_USO`); "desativou na véspera" não zera a conta
(o olhar é o ciclo, não o instante); estabelecimento ativo sem uso não conta. Tudo por período —
o bug de o cálculo ignorar início/fim foi corrigido. Extensão futura: modo PICO (exigiria
histórico diário novo — não necessário hoje). A fatura guarda o **snapshot do cálculo** (modo,
contagens, cota) para auditoria do admin. UI: aba **Cobrança** do Painel da Plataforma
(componentes, **Simular fatura**, editar contrato).

| Modelo antigo | Veredito |
|--------|----------|
| (a) Por estabelecimento ativo/mês | ✅ Mantido como modo `SNAPSHOT` |
| (b) Fixo mensal por tenant | ✅ Mantido como componente Fixo |
| (c) Cota inclusa + excedente suave | ✅ **Implementado** como componente Por pedido (cota + excedente) |
| (d) Fixo até X entregas (padrão Entregas Expressas) | ❌ Pune o sucesso — queixa real do Mauro |

### 5.3 Pagamentos: Asaas nas duas pontas

- **Mesma engrenagem** (faturas, links PIX, webhooks) para admin → estabelecimento **e** MUV → admin.
- Trocar o meio de pagamento no futuro = mexer em **um módulo de serviço** (manter a fronteira
  `webhooks_payments` / serviço de pagamento).
- **Ressalva de arquitetura:** hoje o Asaas usa conta única (basta enquanto o grupo é dono das duas
  pontas). Para SaaS de verdade, cada tenant precisará da **própria credencial Asaas**
  (padrão `PlatformCredential`, como o iFood) — deixar o campo preparado.

## 6. Fases de implementação

| Fase | O quê | Status |
|------|-------|--------|
| **A** | Cadastro como Próprio **cria automaticamente** praça privada (nome do estabelecimento) + tabela de preços vinculada e livre | **EM EXECUÇÃO** |
| **B** | Menu **"Meus Preços"** no portal do estabelecimento (preenche sua tabela; formulário limpo, sem campos de custo) | Planejada |
| **C** | Unificar menus de pagamento (cliente: "Pagamentos Entregadores" + "Pagamentos Próprios" → um só; admin: organizar "Pagamentos Próprios"/"Saques"/página órfã) | Planejada |
| **D** | Assinatura flexível de 3 termos (fixo + R$/entregador + R$/pedido) configurável por estabelecimento + fórmula centralizada | Planejada |
| **E** | Cobrança MUV → admin (por estabelecimento ativo) reusando assinaturas/faturas + Asaas nas duas pontas + credencial por tenant preparada | Planejada |
| **F — Guias e checklists (SÓ AO FINAL)** | "Menu 5/5" do processo de entregas próprias nos **dois lados**: portal do estabelecimento (preços, pagamentos, assinatura) e painel do admin (assinaturas, cobrança) — no espírito do guia Primeiros Passos/checklist do dashboard | Planejada (pedido do Mauro) |

### 7.1 Tipos de tabela de preços (análise comparada com a Entregas Expressas, 2026-11-17)

Decisões do Mauro após analisar o form "Nova tabela de preços" da referência:

| Opção | Decisão | Motivo |
|-------|---------|--------|
| Por km / Valor fixo por pedido | ✅ Já temos | — |
| **Por faixa de km (SEM volta)** | ✅ **Prioridade 1** | Modelo mais usado em delivery; era gap histórico ("Alta") |
| **Frete grátis acima de R$ X** | ✅ **Prioridade 2** | Barato; argumento de venda |
| Por bairro/local | ✅ Prioridade 3 | Alto valor em cidades como Capão da Canoa |
| "Considerar a volta" | ❌ **Fora** | Regra de domínio: entregador PRÓPRIO sempre volta ao estabelecimento — a volta só faz sentido no modelo PLATAFORMA (ex.: máquina de cartão/troco após a entrega; cobrar do estab. o retorno). |
| Área desenhada no mapa / tipo de serviço na tabela | ❌ **Fora por ora** | Cria conflito de negociação ("estou no bairro vizinho mais barato"); só se cliente real pedir após operação |
| Simulador estilo deles | ❌ Fora | Não interessa ao Mauro |
| Comissão do app (% do pedido) | ❌ **Nunca** | Cobrança por transação — viola o princípio da independência; nossa monetização é assinatura (fases D/E) |

**Princípio anti-inchaço (decisão de produto):** a referência é eficiente, mas **peca pelo excesso** de configurações. Copiamos o que resolve problema real do nosso cliente; o resto fica de fora — menos knobs, defaults sensatos, guia claro (regra "auto-explicitivo").

### 7.2 Backlog de Melhorias (referência Entregas Expressas — análise dos cards de configuração)

Contexto: a EE tem ~60 cards de configuração + IA para configurar + 50+ integrações — crescimento por
acréscimo. Nós adotamos curadoria: copiar o que resolve problema real, portas fechadas para o resto.

| Melhoria | Modelo | Valor | Esforço | Quando |
|----------|--------|-------|---------|--------|
| **Nomenclaturas** (renomear termos do sistema) | Ambos | Alto (white-label) | Baixo | Curto |
| **Link de Pedido Rápido** (pedido por link/WhatsApp) | Próprio/Plataforma | Alto | Baixo | Curto |
| **Chegada na Entrega** ("cheguei") + status do local de coleta | Ambos | Médio-alto | Baixo | Médio |
| **Registro de Atividades** (log de ações do admin/equipe) | Ambos | Alto (suporte/auditoria) | Médio | Médio |
| **Valores Transportados / Taxa de Deslocamento** (troco, deslocamento até a coleta) | **Plataforma** | Médio-alto | Baixo/Médio | Depois |
| **Punição e Desafios dos entregadores** (rédea + gamificação do contingente) | **Plataforma** | Médio (temos MuvScore/penalties no modelo — falta superfície) | Médio | Depois |
| **Agrupamento Inteligente** (1 motoboy, vários pedidos) | **Plataforma** | Médio (rotas multi-parada só p/ próprios hoje) | Alto | Futuro |
| **Perfis de Acesso (RBAC)** | Ambos | Médio (equipe do tenant) | Médio | Depois |
| **Notas Fiscais** | Ambos | Alto p/ compliance BR | Alto | Operação real |
| **Domínio Próprio** | Ambos | Médio (premium) | Baixo/Médio | Depois |
| **Financeiro: insights e limiares** (alertas) | Ambos | Médio | Baixo | Depois |
| 50+ integrações de mercado, seguradoras, marketing, IAGo | — | — | — | **FORA** (sob demanda) |
| Configuração para tudo (estilo EE) | — | — | — | **FORA** (anti-inchaço) |

**Modelo plataforma × próprio:** o modelo PLATAFORMA da EE vive de comissão por transação e gestão de
contingente (troco, agrupamento, punição) — nós cobrimos comissão via `driver_percentage` e monetizamos
por assinatura; os picks acima marcam onde cada melhoria brilha em cada modelo.

### 7.3 Ajuste futuro — distância MANUAL quando estimativa/rota ruim (pedido do Mauro, 2026-11-17)

**Regra de produto:** o frete depende da distância — **ninguém sai no prejuízo por frete mal calculado.**

Problema recorrente (também frequente no app atual de referência):
1. Geolocalização do cliente não exata → sistema usa **estimativa** → frete errado.
2. Rota calculada "fácil" porém **mais longa** que o necessário → frete inflado.

Solução planejada:
- Quando o cálculo cair em estimativa (`is_approximate` / `distance_source` ≠ rota real — **campos já
  existem** na resposta de `estimate-fee`), abrir **imediatamente** o campo **"Distância real (km)"** para
  o estabelecimento preencher (verifica em qualquer mapa, em segundos) — o frete recalcula com o valor
  manual.
- **"Corrigir distância"** sempre disponível (mesmo com rota real) — cobre rota longa demais.
- **Raiz da frequência** (ver memória 2026-11-01): o geocoding SERVER-SIDE está quebrado (chave Google
  Maps com restrição de referrer → fallback Photon impreciso no Brasil). Corrigir a chave (chave de
  servidor com restrição por IP OU geocodificar só no cliente) **reduz a frequência**; o campo manual é
  a rede de segurança final.

### 7.4 Expansão futura das tabelas — modelo PLATAFORMA (pedido do Mauro, 2026-11-17)

**Esclarecimento:** as tabelas de plataforma **não ficaram para trás** — faixas de km e frete grátis
são do MOTOR de tabelas e valem para ambos os modelos (o admin edita em Tabelas de Preço). O que é
exclusivo dos próprios é o autosserviço "Meus Preços".

Acrescentar às tabelas (futuro, útil ao modelo plataforma):

| Recurso | Motivo (regra de domínio do Mauro) |
|---------|-------------------------------------|
| **"Considerar a volta" como opção da tabela** (padrão DESLIGADO) | Entregador de PLATAFORMA que sai para serviço extra (troco, máquina de cartão) **não retorna** ao estabelecimento — cobra-se a volta. Nos próprios fica sempre desligado (entregador sempre retorna) |
| **Taxa de deslocamento até a coleta** | Na plataforma o motoboy corre até o estabelecimento — hoje o frete cobre só estab → cliente |
| Tabela por tipo de veículo (moto/bike) | Útil com frota mista |

Fases A–C não decidem dinheiro. D–E implementam as decisões da seção 5.

## 7. Decisões registradas (histórico)

- 2026-11-16 — Preços **independentes** de custos/cobranças (princípio da amiga que embute frete no lanche).
- 2026-11-16 — Nunca cobrar % do frete; termos de cobrança ligados a **acesso/uso** (fixo, por entregador, por pedido).
- 2026-11-16 — Admin→MUV recomendado: **por estabelecimento ativo** (sem teto); cota+excedente como complemento futuro, nunca teto.
- 2026-11-16 — **Asaas nas duas pontas**, com credencial por tenant preparada para SaaS.
