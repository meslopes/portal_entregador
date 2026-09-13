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
  // Não cachear chamadas de API
  if (event.request.url.includes('/api/')) {
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
