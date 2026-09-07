// ==========================================================================
// CODE QUIZ: 1984 ARCADE EDITION - SERVICE WORKER
// Enables offline gameplay, asset caching, and standalone PWA experience
// ==========================================================================

const CACHE_NAME = 'code-quiz-arcade-v6';

// Core assets required for full offline operation (including all 4 built-in decks)
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
  './questions/decks.json',
  './questions/postgresql.json',
  './questions/python.json',
  './questions/http_status_codes.json',
  './questions/design_patterns.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg'
];

// Install Event: Pre-cache all app shell and question assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches and claim clients immediately
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

// Fetch Event: Network-First for HTML/Code/Decks (instant fresh updates), Cache-First for fonts/icons
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isStaticMedia = url.pathname.includes('/icons/') || 
                        url.hostname.includes('fonts.googleapis.com') || 
                        url.hostname.includes('fonts.gstatic.com');

  if (isStaticMedia) {
    // Cache-First with background revalidation for icons & fonts
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Network-First for app shell, scripts, and question JSONs
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline or network fails
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If offline and request is a page navigation, return index.html
        if (request.mode === 'navigate') {
          return (await caches.match('./index.html')) || caches.match('./');
        }
      })
  );
});
