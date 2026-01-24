// service-worker.js
const CACHE_NAME = 'pls-cache';
const CACHE_VERSION = '1.2.8a';
self.addEventListener('install', (event) => {
   self.skipWaiting();
   event.waitUntil(
    caches.open(`${CACHE_NAME}-${CACHE_VERSION}`).then((cache) => {
      return cache.addAll([
        '/pls/',
        '/pls/manifest.json',
        '/pls/index.html',
        '/pls/pls.js',
        '/pls/pls.wasm',
        '/pls/logo.svg',
        '/pls/icon.png',
      ]);
    })
    .then(() => console.log('Resources cached successfully.'))
    .catch(error => console.error('Error caching resources:', error))
   );
});

self.addEventListener('fetch', (event) => {
   // console.log("pca: try to fetch:")
   // console.log(event.request);
   event.respondWith(
      caches.match(event.request, {ignoreSearch: true, ignoreMethod: true, ignoreVary: true}).then((response) => {
         // console.log("cache response: ");
         // console.log(response);
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
               console.log("deleting cache")
               return caches.delete(cacheName);
            }
            return null;
        })
      );
    }).then(() => self.clients.claim()) // this is needed to start controling clients immediately
  );
});