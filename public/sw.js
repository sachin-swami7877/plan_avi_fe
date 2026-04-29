// Service Worker for RushkroLudo PWA install prompt
// Push notifications are handled by firebase-messaging-sw.js (FCM)

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Network-first: just pass through to network
});

// Fallback push handler — used only if FCM SW isn't intercepted (rare)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }

  const notification = payload.notification || {};
  const dataFields = payload.data || {};
  const title = notification.title || dataFields.title || 'RushkroLudo';
  const body = notification.body || dataFields.body || '';
  if (!title && !body) return;

  const clickUrl = dataFields.websiteUrl || dataFields.link || '/';
  const imageUrl = dataFields.imageUrl || notification.image;

  const options = {
    body,
    icon: self.location.origin + '/icon-192.png',
    badge: self.location.origin + '/icon-192.png',
    data: { ...dataFields, url: clickUrl },
    tag: dataFields.type || 'general',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    ...(imageUrl && { image: imageUrl }),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of allClients) {
      if ('focus' in c) {
        try { await c.navigate(targetUrl); } catch {}
        return c.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  })());
});
