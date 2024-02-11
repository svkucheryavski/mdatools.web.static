// service-worker.js
const CACHE_NAME = 'ddsimca-cache';
const CACHE_VERSION = '0.9.1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`${CACHE_NAME}-${CACHE_VERSION}`).then((cache) => {
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

// update to new version when necessary
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_NAME) && cacheName !== `${CACHE_NAME}-${CACHE_VERSION}`) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});