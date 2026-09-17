// Service Worker - muv.log Portal Entregador
// Permite instalar como app no celular (PWA)

const CACHE_NAME = 'muvlog-v1';

// Instalar
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ativar
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Estratégia: Network First (sempre busca dados frescos, cache como fallback)
self.addEventListener('fetch', (event) => {
  // Não interceptar chamadas de API do backend
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Não interceptar conexões do Supabase (Realtime WebSocket, Storage, etc.)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear recursos estáticos
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback: buscar do cache
        return caches.match(event.request);
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
