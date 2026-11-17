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

### 5.2 Admin → MUV: por estabelecimento ativo (recomendado)

| Modelo | Veredito |
|--------|----------|
| **(a) Por estabelecimento ativo/mês** | ✅ **Recomendado** — espelha a cadeia, previsível, sem teto que pune crescimento |
| (b) Fixo mensal por tenant | Possível (simples), mas a MUV não participa do crescimento |
| (c) Cota inclusa + excedente suave | ✅ Complemento futuro — evolução do modelo atual do Mauro (hoje: "fixo até X entregas" que fica caro) |
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

Fases A–C não decidem dinheiro. D–E implementam as decisões da seção 5.

## 7. Decisões registradas (histórico)

- 2026-11-16 — Preços **independentes** de custos/cobranças (princípio da amiga que embute frete no lanche).
- 2026-11-16 — Nunca cobrar % do frete; termos de cobrança ligados a **acesso/uso** (fixo, por entregador, por pedido).
- 2026-11-16 — Admin→MUV recomendado: **por estabelecimento ativo** (sem teto); cota+excedente como complemento futuro, nunca teto.
- 2026-11-16 — **Asaas nas duas pontas**, com credencial por tenant preparada para SaaS.
