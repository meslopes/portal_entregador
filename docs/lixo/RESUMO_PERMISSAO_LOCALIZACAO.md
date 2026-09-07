# Resumo - Correcao de Permissao de Localizacao no Celular

## Problema

O app solicitava permissao de localizacao automaticamente ao carregar a pagina do dashboard. Alguns navegadores mobile bloqueiam isso e mostram a mensagem "este site nao pode pedir permissoes".

## Correcao

### DashboardPage.jsx

1. **Nao solicita mais localizacao automaticamente** ao carregar a pagina
2. **Solicita apenas quando o usuario tenta ficar online**
3. **Melhor tratamento de erros**:
   - Se a permissao for negada, mostra mensagem clara
   - Se a localizacao nao for obtida, mostra erro informativo
4. **Timeout configurado** (10 segundos) para evitar travamento

---

## Como funciona agora

1. Entregador faz login e ve o dashboard
2. Nenhuma permissao e solicitada automaticamente
3. Quando clica em "Ficar Online":
   - App solicita permissao de localizacao
   - Se permitido, atualiza a localizacao e fica online
   - Se negado, mostra mensagem pedindo para verificar configuracoes

---

## Para o usuario do celular

Se a mensagem "este site nao pode pedir permissoes" aparecer:

### Android (Chrome)
1. Va em Configuracoes > Apps > Chrome > Permissoes
2. Ative "Localizacao"
3. Recarregue a pagina

### iPhone (Safari)
1. Va em Configuracoes > Safari > Localizacao
2. Selecione "Permitir"
3. Recarregue a pagina

### Alternativa
1. Na barra de enderecos, toque no icone de cadeado (🔒)
2. Va em "Permissoes"
3. Ative "Localizacao"

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar no celular**:
   - Faca login como entregador
   - Nenhuma permissao deve ser solicitada automaticamente
   - Clique em "Ficar Online"
   - O app deve solicitar permissao de localizacao
   - Se permitido, o entregador fica online
3. **Se ainda aparecer erro**:
   - Verifique as permissoes do navegador (conforme instrucoes acima)
   - Tente usar outro navegador (Chrome, Safari, Firefox)
