// service-worker.js
const CACHE_NAME = 'ddsimca-cache-0.9.0';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/ddsimca/',
        '/ddsimca/index.html',
        '/ddsimca/ddsimca.js',
        '/ddsimca/ddsimca.wasm',
        '/ddsimca/logo.svg',
        '/ddsimca/icon.png',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
