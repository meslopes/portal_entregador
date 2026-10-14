// Service Worker - muv.log Portal Entregador
// Permite instalar como app no celular (PWA)

// Versão do cache — incrementar para invalidar SW antigo nos clientes
const CACHE_NAME = 'muvlog-v2';

// Instalar
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Ativar
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Estratégia: Network First para estáticos; NÃO cachear HTML de rotas autenticadas
const STATIC_ASSET = /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|ico|json)$/i;

self.addEventListener('fetch', (event) => {
  // Não interceptar chamadas de API do backend
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Não interceptar conexões do Supabase (Realtime WebSocket, Storage, etc.)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Só cachear assets estáticos — nunca HTML de páginas autenticadas
  const url = new URL(event.request.url);
  const isStatic = STATIC_ASSET.test(url.pathname) || url.pathname.startsWith('/assets/');
  if (!isStatic) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sem cache? Devolve 404 em vez de undefined (quebrava o fetch)
        return caches.match(event.request).then((cached) => {
          return cached || new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
  );
});

// Push notifications em background
self.addEventListener('push', (event) => {
  let data = { title: 'muv.log', body: '' };
  try {
    data = event.data.json();
  } catch {
    data.body = event.data?.text() || '';
  }

  const options = {
    body: data.notification?.body || data.body || '',
    icon: data.notification?.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    sound: 'default',
    data: data.data || {},
    tag: data.data?.type || 'default',
    requireInteraction: data.data?.type === 'ACCOUNT_APPROVED' || data.data?.type === 'ACCOUNT_REJECTED'
  };

  event.waitUntil(
    self.registration.showNotification(data.notification?.title || data.title || 'muv.log', options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já tem uma janela aberta, foca nela
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Senão, abre uma nova
      clients.openWindow(url);
    })
  );
});
