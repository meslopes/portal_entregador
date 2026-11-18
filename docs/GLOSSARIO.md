# Glossário oficial do sistema — muv.log (Portal Entregador)

> **Regra de nomenclatura (§7.2 do backlog EE):** a interface usa SEMPRE
> os termos desta tabela. Código (modelos, variáveis) pode manter nomes
> internos (`restaurant_id` etc.) — o que o usuário vê é o que importa.

| Termo oficial | Use para | NÃO use |
|---|---|---|
| **Estabelecimento** | o lojista/parceiro que recebe pedidos | Restaurante, Loja, Empresa |
| **Entregador** | quem faz as entregas | Motoboy, Correiro |
| **Praça** | a área de atuação (ex.: "Canoas Centro") | Região, Área, Zona |
| **Pedido** | a solicitação do cliente | Ordem, Requisição |
| **Cliente** | quem consome (pedido) | Consumidor, Usuário final |
| **Próprio / Plataforma** | o tipo de entrega: equipe do estabelecimento × rede muv.log | — |
| **Link de ativação** | o link onde o entregador define o próprio PIN | Convite |
| **Link de Pedido Rápido** | o link onde o cliente faz pedido sem instalar nada | Cardápio digital |
| **Registro de Atividades** | log de ações da equipe (suporte/auditoria) | Log, Histórico |

## Por que isso importa

- **White-label:** o produto precisa falar uma língua só para poder ser
  "vestido" com a marca de qualquer cliente.
- **Auto-explicação:** quem chega de novo entende o sistema sem traduzir
  termos diferentes na mesma tela.
- **Renomeação pelo admin** (ex.: "Entregador" → "Motoboy" na interface do
  tenant) é uma decisão de produto futura — esta tabela é a base dela.

_Última atualização: 2026-11-18 (padronização da UI para Estabelecimento/Praça)._
