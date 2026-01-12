// static/sw.js
// LectureScribe AI Service Worker - v2

const CACHE_NAME = 'lecturescribe-cache-v2';
const STATIC_CACHE = 'lecturescribe-static-v2';
const DYNAMIC_CACHE = 'lecturescribe-dynamic-v2';

const urlsToCache = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/manifest.json',
  '/static/images/icons/icon-192x192.png',
  '/static/images/icons/icon-1024x1024.png',
  '/static/images/logo.png'
];

// Install the service worker and cache the app shell
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // API calls - Network first, fall back to cache
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/transcribe') || 
      url.pathname.startsWith('/chat') ||
      url.pathname.startsWith('/session/') ||
      url.pathname.startsWith('/history') ||
      url.pathname.startsWith('/status/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // Static assets - Cache first, fall back to network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request).then((networkResponse) => {
          // Cache successful responses for static assets
          if (networkResponse.ok && request.method === 'GET') {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
  );
});