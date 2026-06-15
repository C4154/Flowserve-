const CACHE_NAME = 'casovac-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).catch(() => {
          // Fallback pro offline
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

self.addEventListener('push', event => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || 'Čas vypršel!',
    icon: 'data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%230f172a' width='192' height='192'/%3E%3Ctext x='96' y='120' font-size='100' text-anchor='middle' fill='%2338bdf8'%3E⏱%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%230f172a' width='192' height='192'/%3E%3Ctext x='96' y='120' font-size='100' text-anchor='middle' fill='%2338bdf8'%3E⏱%3C/text%3E%3C/svg%3E',
    tag: data.tag || 'casovac-alert',
    requireInteraction: true,
    renotify: true,
    vibrate: [500, 200, 500, 200, 500, 200, 500],
    actions: [
      { action: 'dismiss', title: '✅ Zrušit' },
      { action: 'snooze', title: '😴 Odložit' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '⏰ Časovač',
      options
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;

  if (action === 'snooze') {
    setTimeout(() => {
      self.registration.showNotification('⏰ Odpočet končí!', {
        body: 'Odložené upozornění',
        tag: 'casovac-snooze',
        requireInteraction: true,
        vibrate: [500, 200, 500]
      });
    }, 60000);
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow('./');
        }
      })
  );
});
