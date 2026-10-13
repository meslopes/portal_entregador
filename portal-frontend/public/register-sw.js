// Registro do Service Worker PWA — extraído do index.html
// para permitir CSP sem 'unsafe-inline' em script-src.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registrado:', reg.scope);
      })
      .catch((err) => {
        console.error('[PWA] Erro ao registrar Service Worker:', err);
      });
  });
}
