// service-worker.js
const CACHE_NAME = 'ddsimca-cache';
const CACHE_VERSION = '2.1.8a';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(`${CACHE_NAME}-${CACHE_VERSION}`).then((cache) => {
      return cache.addAll([
        '/ddsimca/',
        '/ddsimca/manifest.json',
        '/ddsimca/index.html',
        '/ddsimca/ddsimca.js',
        '/ddsimca/ddsimca.wasm',
        '/ddsimca/logo.svg',
        '/ddsimca/icon.png',
      ]);
    })
    .then(() => console.log('Resources cached successfully.'))
    .catch(error => console.error('Error caching resources:', error))
   );
});

self.addEventListener('fetch', (event) => {
   // console.log("ddsimca: try to fetch:")
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
               //console.log("deleting cache")
               return caches.delete(cacheName);
            }
            return null;
        })
      );
    })
  );
});