# Resumo - Modal de Codigo de Coleta/Entrega

## Problema

O entregador precisava de um codigo para coletar o pedido, mas nao havia campo para inserir o codigo na pagina de entrega ativa (`ActiveDeliveryPage`).

## Correcao

Adicionado modal de codigo na `ActiveDeliveryPage`:

### Modal de Codigo
- Aparece quando o entregador clica em "Coletar Pedido" (se houver pickup_code)
- Aparece quando o entregador clica em "Entregar Pedido" (se houver delivery_code)
- Input de 6 digitos com validacao
- Botoes "Cancelar" e "Confirmar"
- Indica se e codigo de coleta ou entrega

### Fluxo
1. Entregador ve o pedido e clica em "Coletar Pedido"
2. Se o pedido tem pickup_code, o modal aparece
3. Entregador pede o codigo ao estabelecimento
4. Digita o codigo e clica "Confirmar"
5. Sistema valida o codigo e atualiza o status

---

## Como funciona

### Para Coleta (pickup_code)
- Entregador clica em "Coletar Pedido"
- Modal mostra "Codigo de Coleta"
- Mensagem: "Peca o codigo ao estabelecimento"
- Entregador digita o codigo de 6 digitos
- Clica "Confirmar"

### Para Entrega (delivery_code)
- Entregador clica em "Entregar Pedido"
- Modal mostra "Codigo de Entrega"
- Mensagem: "Peca o codigo ao cliente"
- Entregador digita o codigo de 6 digitos
- Clica "Confirmar"

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Faca login como entregador
   - Abra um pedido que tenha pickup_code
   - Clique em "Coletar Pedido"
   - O modal deve aparecer pedindo o codigo
   - Digite o codigo e confirme
