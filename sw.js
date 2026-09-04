// ==========================================================================
// CODE QUIZ: 1984 ARCADE EDITION - SERVICE WORKER
// Enables offline gameplay, asset caching, and standalone PWA experience
// ==========================================================================

const CACHE_NAME = 'code-quiz-arcade-v1';

// Core assets required for full offline operation
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/deckLoader.js',
  './js/quizEngine.js',
  './js/highscores.js',
  './js/audio.js',
  './questions/postgresql.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg'
];

// Install Event: Pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First with Network Revalidation (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle Google Fonts and external resources caching
  const url = new URL(request.url);
  const isGoogleFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached response immediately if available
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // Verify valid response
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is a navigation (HTML page), return index.html
          if (request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
