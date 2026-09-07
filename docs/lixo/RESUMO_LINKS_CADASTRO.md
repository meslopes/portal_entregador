# Resumo - Links de Autocadastro e Aprovacao

## Implementado

### 1. Links de Autocadastro

**Pagina de Entregadores** (`/admin/drivers`):
- Botao "LINK DE CADASTRO" ao lado de "NOVO ENTREGADOR"
- Copia o link `https://muv.log.br/register` para a area de transferencia
- O entregador acessa o link e faz seu cadastro
- O cadastro fica pendente de aprovacao

**Pagina de Estabelecimentos** (`/admin/establishments`):
- Botao "LINK DE CADASTRO" ao lado de "NOVO ESTABELECIMENTO"
- Copia o link `https://muv.log.br/client/register` para a area de transferencia
- O estabelecimento acessa o link e faz seu cadastro
- O cadastro fica pendente de aprovacao

### 2. Lista de Pendentes no Dashboard

**Nova aba "Pendentes"** no sidebar do dashboard:
- Aparece apenas quando ha cadastros pendentes
- Mostra o numero de pendentes com badge vermelho
- Lista todos os usuarios com status INACTIVE
- Mostra: nome, email, telefone, tipo (entregador/estabelecimento)
- Botoes "Aprovar" e "Rejeitar" para cada usuario

---

## Fluxo Completo

1. Admin clica em "LINK DE CADASTRO" na pagina de entregadores ou estabelecimentos
2. Admin copia o link e envia para o futuro usuario (WhatsApp, email, etc.)
3. O usuario acessa o link e faz seu cadastro
4. O cadastro fica com status INACTIVE (pendente)
5. No dashboard do admin, aparece a aba "Pendentes" com o badge
6. Admin clica em "Pendentes" e ve a lista de cadastros aguardando aprovacao
7. Admin clica em "Aprovar" para ativar o usuario ou "Rejeitar" para excluir

---

## Links de Cadastro

| Tipo | Link |
|------|------|
| Entregador | `https://muv.log.br/register` |
| Estabelecimento | `https://muv.log.br/client/register` |

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Va para `/admin/drivers` e clique em "LINK DE CADASTRO"
   - Va para `/admin/establishments` e clique em "LINK DE CADASTRO"
   - Abra o link em uma aba anonima e faca um cadastro
   - Volte para o dashboard e verifique se a aba "Pendentes" aparece
   - Aprove ou rejeite o cadastro
