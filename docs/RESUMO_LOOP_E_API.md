# Resumo - Correcao do Loop e Erros de API

## Problemas Corrigidos

### 1. Objeto inteiro sendo enviado como square_id
**Causa**: `getLiveTracking(selectedSquare)` passava o objeto inteiro da praca em vez do ID.

Isso gerava URLs como:
```
/api/admin/live-tracking?square_id[city]=Capao&square_id[id]=1&square_id[name]=...
```

Em vez de:
```
/api/admin/live-tracking?square_id=1
```

**Correcao**: Alterado para `getLiveTracking(squareId)` - agora envia apenas o numero.

### 2. Erro CORS no dashboard
**Causa**: O backend crashava ao receber um objeto como `square_id` em vez de um numero inteiro.

**Correcao**: A correcao acima resolve o problema - o backend agora recebe apenas o ID.

### 3. Loop do cadastro
**Ja corrigido**: O cadastro agora redireciona para `/pending-approval` em vez de fazer login.

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Limpar cache do navegador** (Ctrl+Shift+Delete)
3. **Testar**:
   - Acesse o admin no notebook
   - Verifique se o dashboard carrega sem erros
   - Troque de praca e verifique se funciona
   - No celular, tente acessar o sistema
   - Se estiver em loop, limpe os dados do site no navegador
4. **Me avise** se funcionar
