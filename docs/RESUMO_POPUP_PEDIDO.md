# Resumo - Popup de Oferta de Pedido para Entregadores

## Problema

O entregador recebia notificacao pelo sino, mas nao sabia que tinha um pedido disponivel para aceitar. A notificacao nao era prominente o suficiente.

## Solucao

Criado componente `OrderOfferPopup` que aparece em **todas as paginas** do entregador quando ha um pedido disponivel.

### Caracteristicas do Popup

1. **Aparece automaticamente** quando ha pedido disponivel
2. **Sirene toca** quando o popup aparece
3. **Mostra detalhes do pedido**:
   - Nome do restaurante
   - Endereco de entrega
   - Valor da entrega
4. **Contagem regressiva** de 60 segundos
5. **Botoes**:
   - "Aceitar Pedido" - aceita e vai para a pagina de entrega
   - "Rejeitar" - fecha o popup
6. **Animacao** de pulso para chamar atencao

### Como funciona

1. Entregador esta online em qualquer pagina
2. Sistema verifica pedidos disponiveis a cada 5 segundos
3. Se houver pedido, popup aparece com sirene
4. Entregador pode aceitar ou rejeitar
5. Se aceitar, e redirecionado para a pagina de entrega
6. Se nao agir em 60 segundos, popup fecha automaticamente

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Faca login como entregador
   - Fique online
   - Crie um pedido para o estabelecimento
   - O popup deve aparecer no celular do entregador com sirene
   - Entregador pode aceitar ou rejeitar
