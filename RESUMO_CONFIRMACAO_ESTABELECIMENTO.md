# Resumo - Tipo de Confirmacao Configuravel por Estabelecimento

## Implementado

### Backend

1. **Modelo Restaurant** - Adicionados campos:
   - `pickup_confirmation_type` (VARCHAR(20), default='code')
   - `delivery_confirmation_type` (VARCHAR(20), default='code')

2. **Migration** - Adicionadas colunas na tabela `restaurants`

3. **Geracao de codigos** - Agora so gera codigos quando estabelecimento usa confirmacao por codigo

### Frontend

1. **Formulario de Estabelecimento** - Adicionados campos:
   - "Confirmação de Coleta" (dropdown)
   - "Confirmação de Entrega" (dropdown)

2. **ActiveDeliveryPage** - Verifica tipo de confirmacao do estabelecimento:
   - `code`: Mostra modal de codigo
   - `photo`: Mostra camera para foto
   - `code_and_photo`: Mostra codigo e depois foto
   - `none`: Prossegue direto sem confirmacao

---

## Tipos de Confirmacao Disponiveis

| Tipo | Descricao | Uso |
|------|-----------|-----|
| `code` | Codigo de 6 digitos | Padrao - entregador pede codigo ao estabelecimento/cliente |
| `photo` | Foto da entrega | Entregador tira foto como prova de entrega |
| `code_and_photo` | Codigo + Foto | Entregador precisa do codigo E da foto |
| `none` | Nenhuma confirmacao | Entregador marca como coletado/entregue direto |

---

## Como Configurar

1. Acesse `/admin/establishments`
2. Clique em um estabelecimento
3. Clique em "Editar"
4. Na seção "Confirmação de Coleta", selecione o tipo desejado
5. Na seção "Confirmação de Entrega", selecione o tipo desejado
6. Salve

---

## Para Pedidos Integrados (iFood, 99Food, etc.)

Para pedidos que vem de plataformas externas:
- O admin pode configurar o estabelecimento com `none` (nenhuma confirmacao)
- Ou usar `code` para que o entregador use o codigo da plataforma externa
- A confirmacao da plataforma externa e independente do sistema muv.log

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Acesse `/admin/establishments`
   - Edite um estabelecimento
   - Configure o tipo de confirmacao desejado
   - Crie um pedido para esse estabelecimento
   - Teste o fluxo de entrega com o tipo de confirmacao selecionado
