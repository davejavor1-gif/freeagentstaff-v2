const CACHE_NAME = 'freeagentstaff-shell-v2';
const OFFLINE_URL = '/offline';
const APP_SHELL_URLS = [
  '/',
  '/offline',
  '/favicon.ico',
  '/favicon-v2.png',
  '/favicon-192.png',
  '/favicon-search.png',
  '/apple-touch-icon.png',
  '/pwa-maskable.png',
  '/FullLogo-clean-v2.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isSameOrigin && (request.destination === 'style' || request.destination === 'script' || request.destination === 'font' || request.destination === 'image')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        }).catch(() => caches.match('/favicon.ico'));
      })
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        }).catch(() => caches.match('/offline'));
      })
    );
    return;
  }

  if (isSameOrigin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isSameOrigin && (url.pathname.startsWith('/auth') || url.pathname.includes('/auth/'))) {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});
