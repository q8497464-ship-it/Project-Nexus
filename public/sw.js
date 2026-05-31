// Bypass caching service worker to override any stale cached assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log("[Service Worker] Destroying stale cache:", key);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Direct network pass-through
self.addEventListener("fetch", (event) => {
  return; // Allow the browser to fetch standard resources normally
});
