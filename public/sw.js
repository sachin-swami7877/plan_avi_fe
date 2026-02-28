// Service Worker for RushkroLudo PWA
// Minimal SW — required for Chrome install prompt

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
