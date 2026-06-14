const CACHE_NAME = 'casovac-v1';
const urlsToCache = [
  '/',
  '/casovac.html',
  '/manifest.json'
];

// Instalace – uložení do cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Aktivace – okamžitá kontrola
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

// Fetch – servírování z cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});

// ===== PUSH NOTIFIKACE =====
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
      {
        action: 'dismiss',
        title: '✅ Zrušit'
      },
      {
        action: 'snooze',
        title: '😴 Odložit'
      }
    ],
    data: {
      entryId: data.entryId,
      endMinutes: data.endMinutes
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '⏰ Časovač',
      options
    )
  );
});

// Kliknutí na notifikaci
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'snooze') {
    // Odložit o 1 minutu
    setTimeout(() => {
      self.registration.showNotification('⏰ Odpočet končí!', {
        body: 'Odložené upozornění',
        tag: 'casovac-snooze',
        requireInteraction: true,
        vibrate: [500, 200, 500]
      });
    }, 60000);
  }

  // Otevřít aplikaci
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow('/');
        }
      })
  );
});

// Periodická synchronizace (pro budoucí použití)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-timers') {
    event.waitUntil(checkTimers());
  }
});

async function checkTimers() {
  // Kontrola časovačů – volá se z hlavní stránky
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'CHECK_TIMERS' });
  });
}