// public/sw.js
const CACHE_NAME = 'hiremercy-cache-v2'; // Changed version to clear previous cache

// Install event - force the new service worker to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
});

// Activate event - delete old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First for HTML/JS, Cache-First for static assets (images/icons)
self.addEventListener('fetch', (event) => {
  const destination = event.request.destination;

  // For HTML pages, JS scripts, and CSS styles, always try the internet first
  if (event.request.mode === 'navigate' || destination === 'script' || destination === 'style') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // If offline, load from local cache
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-First for static assets (icons, images)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        });
      })
    );
  }
});