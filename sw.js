/**
 * Flow Service Worker
 * Caches core assets for offline use
 */

const CACHE_NAME = 'flow-v2';
const STATIC_ASSETS = [
  '/flow/',
  '/flow/index.html',
  '/flow/time.html',
  '/flow/styles.css',
  '/flow/app.js',
  '/flow/public/icon-192.png',
  '/flow/public/icon-512.png'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('Cache install error:', err))
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch: Stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached version immediately (stale-while-revalidate)
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Update cache with fresh version
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(err => {
          console.log('Fetch failed, serving from cache:', err);
          // Return cached response if network fails
          return cachedResponse;
        });
      
      // Return cached version or wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
