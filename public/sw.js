// Service Worker para Push Notifications - Obuxixo Gospel
const CACHE_NAME = 'obuxixo-gospel-v1';

// Evento de instalação
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

// Evento de ativação
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  event.waitUntil(clients.claim());
});

// Evento de push notification
self.addEventListener('push', (event) => {
  console.log('Push recebido:', event);
  
  let data = {
    title: 'Obuxixo Gospel',
    body: 'Nova notícia disponível!',
    icon: '/images/logo-icon.png',
    badge: '/images/badge-icon.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/images/logo-icon.png',
    badge: data.badge || '/images/badge-icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open', title: 'Ler agora' },
      { action: 'close', title: 'Fechar' }
    ],
    requireInteraction: false,
    tag: data.tag || 'obuxixo-notification'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Evento de clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Verificar se já existe uma janela aberta
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Se não, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
