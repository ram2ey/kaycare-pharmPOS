// KayCare PharmPOS Service Worker
// Caches static assets and serves drug catalog from cache when offline

const CACHE_NAME = 'pharmpos-cache-v1';
const STATIC_ASSETS = ['/', '/index.html'];

// On install: cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// On activate: claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// On fetch: Network-first for API calls, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For drug catalog API requests: try network first, fall back to cache
  if (url.pathname.startsWith('/api/pharmacy/drugs') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Clone and cache the fresh drug catalog
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => {
          // Offline: serve from cache
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify([]), {
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // For static files: cache-first
  if (event.request.method === 'GET' && !url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Everything else (POST, PUT etc): network only
});
