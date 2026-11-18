/**
 * Navegação para o Google Maps (item N-02 da auditoria).
 *
 * Abre o APP do Google Maps quando instalado (deep link por esquema do
 * sistema) e cai na versão web quando o app não existe — antes sempre
 * abria o navegador, mesmo com o app no celular.
 */
export function abrirGoogleMaps(destino) {
  const dest = String(destino);
  const web = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isAndroid && !isIOS) {
    window.open(web, '_blank', 'noopener,noreferrer');
    return;
  }

  // Deep link do app; se nada abrir (a aba continua visível), usa a web
  const appUrl = isAndroid
    ? `google.navigation:q=${encodeURIComponent(dest)}`
    : `comgooglemaps://?daddr=${encodeURIComponent(dest)}&directionsmode=driving`;
  const timer = setTimeout(() => {
    if (!document.hidden) window.open(web, '_blank', 'noopener,noreferrer');
  }, 1500);
  window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
  window.location.href = appUrl;
}
