const appCacheName = 'shigatsu-app-shell-v1';
const appShellFiles = [
  '/',
  '/index.html',
  '/aplicacion.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(appCacheName)
      .then((cache) => cache.addAll(appShellFiles))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('shigatsu-app-shell-') && key !== appCacheName)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        const shouldCacheAsset = new URL(request.url).origin === self.location.origin;
        if (shouldCacheAsset && response.ok) {
          const responseCopy = response.clone();
          caches.open(appCacheName).then((cache) => cache.put(request, responseCopy));
        }
        return response;
      });
    })
  );
});
