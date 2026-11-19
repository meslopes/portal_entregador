# Livro Financeiro (F-11) — o que é, regras e como usar

## O que é

**Cada movimento de dinheiro vira uma linha; as linhas nunca mudam.**
Como um extrato bancário: se um valor está errado, escreve-se uma linha
de **estorno** — a original continua lá, sempre.

Saldo de qualquer pessoa = **soma dos créditos − débitos**. Sem números
escondidos.

## Regras do modelo

| Regra | Como está implementada |
|---|---|
| **Imutável** | trigger `trg_ledger_immutable` no banco **bloqueia UPDATE/DELETE** + não existem rotas de alteração (só consulta). Correção = lançamento `REFUND`/`ADJUSTMENT` |
| **Decimal exato** | `amount NUMERIC(12,2)` — nenhum float no caminho do dinheiro |
| **Snapshot da época** | campo `snapshot` (JSON) guarda as regras/preços do momento — o passado nunca é recalculado |
| **Idempotência** | `dedupe_key` única — retry de webhook/processamento não dobra o caixa |

## Campos

```
occurred_at   quando o dinheiro moveu (≠ created_at = quando anotou)
entry_type    CREDIT (entrou) / DEBIT (saiu)
party_type    DRIVER / ESTABLISHMENT / PLATFORM / TENANT  (o "quem")
party_id      id de quem (omitir para PLATFORM)
amount        valor SEMPRE positivo (o sinal vem do entry_type)
reason        ORDER_FEE · DRIVER_PAYOUT · WITHDRAWAL · BONUS ·
              SUBSCRIPTION · REFUND · ADJUSTMENT
description   texto humano
reference     tipo + id do evento (order/payment/invoice/bonus)
snapshot      regras/preços da época (JSON)
dedupe_key    chave de idempotência
```

## De onde vêm os lançamentos (hoje)

| Evento | Lançamento |
|---|---|
| Entrega concluída (pagamento ao entregador) | CREDIT DRIVER · DRIVER_PAYOUT |
| Saque processado | DEBIT DRIVER · WITHDRAWAL |
| Bônus semanal/mensal processado | CREDIT DRIVER · BONUS |

Próximos candidatos (quando precisar): repasse de comissão da plataforma,
assinaturas (estabelecimento↔admin↔MUV), estornos de cancelamento.

## Como consultar

**Admin → Livro Financeiro** (`/admin/ledger`): escolhe o tipo de parte
(entregador/estabelecimento/plataforma), o ID e consulta — mostra o saldo
e o extrato.

API: `GET /api/admin/ledger?party_type=DRIVER&party_id=12`

## Para testes/carga (escape da imutabilidade)

O dono da tabela pode temporariamente:

```sql
ALTER TABLE financial_ledger DISABLE TRIGGER trg_ledger_immutable;
-- ... limpar dados de teste ...
ALTER TABLE financial_ledger ENABLE TRIGGER trg_ledger_immutable;
```

## Verificação (2026-11-18)

`scripts/_tmp_smoke_ledger.py` — 9/9: lançamento Decimal, idempotência,
saldo correto, centavo exato (0,10+0,20), valor negativo rejeitado,
**UPDATE e DELETE bloqueados pelo trigger**, extrato e API OK.
