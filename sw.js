const CACHE_NAME = 'miniapps-sm-v3';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './neat/',
  './neat/index.html',
  './neat/manifest.json',
  './neat/icons/icon.svg',
  './neat/icons/apple-touch-icon.png',
  './neat/icons/icon-192.png',
  './neat/icons/icon-512.png',
  './gym/',
  './gym/index.html',
  './gym/manifest.json',
  './gym/icons/icon.svg',
  './gym/icons/apple-touch-icon.png',
  './gym/icons/icon-192.png',
  './gym/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: true });

      const networkPromise = fetch(event.request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkPromise);
        return cached;
      }

      const networkResponse = await networkPromise;
      if (networkResponse) return networkResponse;

      if (event.request.mode === 'navigate') {
        if (url.pathname.includes('/neat')) {
          return (await cache.match('./neat/index.html')) || (await cache.match('./index.html'));
        }
        if (url.pathname.includes('/gym')) {
          return (await cache.match('./gym/index.html')) || (await cache.match('./index.html'));
        }
        return cache.match('./index.html');
      }

      return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
    })
  );
});
