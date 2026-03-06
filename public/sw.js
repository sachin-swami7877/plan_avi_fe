// Service Worker for RushkroLudo PWA + Firebase Cloud Messaging
// Minimal SW — required for Chrome install prompt + push notifications

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Network-first: just pass through to network
  // No caching needed — keeps things simple
});

// Firebase Cloud Messaging — background push handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  // Support both notification-based and data-only messages
  const notification = payload.notification || {};
  const dataFields = payload.data || {};
  const title = notification.title || dataFields.title || 'RushkroLudo';
  const body = notification.body || dataFields.body || '';

  // Skip if no meaningful content
  if (!title && !body) return;

  const options = {
    body,
    icon: self.location.origin + '/icon-192.png',
    badge: self.location.origin + '/icon-192.png',
    data: dataFields,
    tag: dataFields.type || 'general',
    renotify: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
