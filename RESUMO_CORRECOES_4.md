# Resumo da Correcao

## Problema
Ao criar uma tabela de precos para uma praca, o backend retornava erro 500:
`float() argument must be a string or a real number, not 'NoneType'`

## Causa
Os campos numericos (price_per_km, min_distance_km, etc.) podiam estar vazios ou nulos, e o `float()` nao aceita esses valores.

## Correcao
Adicionada funcao `safe_float()` que:
- Retorna o valor padrao se o campo for None ou vazio
- Tenta converter para float, retornando o padrao se falhar

Endpoints corrigidos:
- `POST /api/admin/pricing-tables` (criacao)
- `PUT /api/admin/pricing-tables/:id` (atualizacao)

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Tentar criar a tabela de precos novamente**:
   - Va para `/admin/squares`
   - Clique em uma praca
   - Clique em "Nova Tabela de Precos"
   - Preencha os dados e salve
   - O erro nao deve mais aparecer
