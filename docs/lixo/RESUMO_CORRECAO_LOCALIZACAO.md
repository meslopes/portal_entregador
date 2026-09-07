# Resumo - Correcao da Obtencao de Localizacao

## Problema

O codigo anterior tinha um bug na obtencao de localizacao:
1. `getCurrentLocation()` era assincrona (usava callback)
2. `handleToggleOnline()` nao esperava corretamente a localizacao ser obtida
3. O timeout de 2 segundos era arbitrario e nao funcionava corretamente
4. O estado `location` nao era atualizado a tempo

## Correcao

### getCurrentLocation() agora retorna Promise
```javascript
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(loc);
        resolve(loc);
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
};
```

### handleToggleOnline() agora aguarda corretamente
```javascript
const handleToggleOnline = async () => {
  if (newStatus && !location) {
    try {
      const loc = await getCurrentLocation(); // Aguarda a localizacao
      // Usa loc.latitude e loc.longitude
    } catch (err) {
      // Trata erros especificos
    }
  }
};
```

### Mensagens de erro mais especificas
- **PERMISSION_DENIED (code 1)**: "Permissão de localização negada. Clique no ícone 🔒 na barra de endereço e permita o acesso à localização."
- **POSITION_UNAVAILABLE (code 2)**: "Localização indisponível. Verifique se o GPS está ativado."
- **TIMEOUT (code 3)**: "Tempo esgotado ao obter localização. Tente novamente."

---

## Como testar

1. **Aguardar deploy** (~2-5 minutos)
2. **No celular**:
   - Acesse o site
   - Faca login como entregador
   - Clique em "Ficar Online"
   - O navegador deve solicitar permissao de localizacao
   - Permita o acesso
   - O entregador deve ficar online

3. **Se ainda houver erro**:
   - A mensagem de erro agora indica exatamente qual o problema
   - Siga as instrucoes na mensagem de erro

---

## Possiveis causas do erro anterior

1. **Timeout muito curto**: Agora e 15 segundos (era 10)
2. **Promise nao aguardada**: Agora usa await corretamente
3. **Estado nao atualizado**: Agora usa o retorno da Promise em vez do estado
