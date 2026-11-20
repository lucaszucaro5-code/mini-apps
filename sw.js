const CACHE_NAME = 'miniapps-sm-v12';

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
  './neat/styles.css',
  './neat/app.js',
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

function getCanonicalHtmlKey(pathname) {
  if (pathname.includes('/neat')) return './neat/index.html';
  if (pathname.includes('/gym')) return './gym/index.html';
  return './index.html';
}

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Permitir bypass limpio cuando se solicita ?reset=1
  if (url.searchParams.get('reset') === '1') {
    event.respondWith(fetch(event.request));
    return;
  }

  const accept = event.request.headers.get('accept') || '';
  const isHtmlRequest = event.request.mode === 'navigate' || accept.includes('text/html');

  if (isHtmlRequest) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const canonicalKey = getCanonicalHtmlKey(url.pathname);
        try {
          const networkResponse = await fetchWithTimeout(event.request, 3000);
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(canonicalKey, networkResponse.clone());
            return networkResponse;
          }
        } catch (_) {}

        const cached = (await cache.match(canonicalKey)) || (await cache.match('./index.html'));
        if (cached) return cached;
        return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

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

      return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
    })
  );
});
