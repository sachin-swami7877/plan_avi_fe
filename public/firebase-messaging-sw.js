// Firebase Cloud Messaging Service Worker — handles BACKGROUND push notifications
// This file MUST be at the root of the public folder with this exact name.
// It runs even when the site is closed, allowing notifications to appear on the home screen
// (just like WhatsApp / Myntra).

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAEoFzVjmiS8Y6wGSysY8pZH5Y-lcfHphw',
  authDomain: 'rushkroludo.firebaseapp.com',
  projectId: 'rushkroludo',
  storageBucket: 'rushkroludo.firebasestorage.app',
  messagingSenderId: '644734751497',
  appId: '1:644734751497:web:8201c2b088d261fdceb9d8',
});

const messaging = firebase.messaging();

// Background message handler — fires when site is in background or closed
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notif = payload.notification || {};
  const title = notif.title || data.title || 'RushkroLudo';
  const body = notif.body || data.body || '';

  const clickUrl = data.websiteUrl || data.link || '/';
  const imageUrl = data.imageUrl || notif.image;

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.type || 'rushkroludo-broadcast',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: clickUrl },
    ...(imageUrl && { image: imageUrl }),
  };

  return self.registration.showNotification(title, options);
});

// Notification click handler — open the URL set in data
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Try to focus an existing tab first
    for (const c of allClients) {
      if ('focus' in c) {
        try { await c.navigate(targetUrl); } catch {}
        return c.focus();
      }
    }
    // No tab open — open a new one
    if (clients.openWindow) return clients.openWindow(targetUrl);
  })());
});
