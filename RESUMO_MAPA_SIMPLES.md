# Resumo - Correcao do Mapa (Abordagem Mais Simples)

## Mudanca de Abordagem

Em vez de **destruir e recriar** o mapa ao trocar de praca, agora:

1. **Inicializacao**: Usa `callback ref` para inicializar o mapa quando o container esta pronto
2. **Troca de praca**: Apenas invalida o tamanho e reseta a visao (sem destruir)

## Por que isso e mais confiavel?

- **Sem condicoes de corrida**: O mapa nao e destruido/recriado
- **Mais rapido**: Apenas invalida o tamanho, nao recria o mapa inteiro
- **Mais estavel**: O callback ref garante que o container esta pronto antes de inicializar

---

## O que voce precisa fazer

1. **Aguardar deploy** (~2-5 minutos)
2. **Testar**:
   - Va para o dashboard do admin
   - Troque de praca varias vezes
   - Verifique se o mapa carrega consistentemente
3. **Me avise** se o problema persistir
