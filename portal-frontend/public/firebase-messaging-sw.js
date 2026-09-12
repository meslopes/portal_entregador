// Service Worker para Firebase Cloud Messaging (FCM)
// Recebe notificações quando o app está em background ou fechado

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCaPgR3xg-Fkeu3go9W4tOsb2Y3MBYYq5A",
  authDomain: "muv-log.firebaseapp.com",
  projectId: "muv-log",
  storageBucket: "muv-log.firebasestorage.app",
  messagingSenderId: "517350557310",
  appId: "1:517350557310:web:717c9f2598fcb2f98d3a2f"
});

const messaging = firebase.messaging();

// Receber mensagens em background
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Mensagem em background:', payload);

  const { title, body, icon } = payload.notification || {};
  const { orderId, type } = payload.data || {};

  const notificationOptions = {
    body: body || 'Nova notificação',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: type || 'default',
    data: { orderId, type, url: payload.data?.url || '/' },
    vibrate: [200, 100, 200],
    actions: []
  };

  // Ações customizadas por tipo de notificação
  if (type === 'NEW_ORDER') {
    notificationOptions.actions = [
      { action: 'accept', title: 'Aceitar' },
      { action: 'view', title: 'Ver detalhes' }
    ];
    notificationOptions.requireInteraction = true;
  } else if (type === 'ORDER_UPDATE') {
    notificationOptions.actions = [
      { action: 'view', title: 'Acompanhar' }
    ];
  }

  self.registration.showNotification(
    title || 'muv.log',
    notificationOptions
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { orderId, type, url } = event.notification.data || {};

  // Abrir ou focar no app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já tem uma janela aberta, focar nela
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (orderId) {
            client.postMessage({ type: 'NAVIGATE', url: `/delivery/${orderId}` });
          }
          return;
        }
      }
      // Se não, abrir nova janela
      clients.openWindow(url || '/');
    })
  );
});
