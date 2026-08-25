// ===================================================================
// AYATI — PWA Service Worker (Offline Cache & Instant Loading)
// ===================================================================
const CACHE_NAME = 'ayati-v3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './firebase-config.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@300;400;500;600;700&family=Dancing+Script:wght@400;700&display=swap'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // Stale-while-revalidate strategy for local assets
    if (e.request.method !== 'GET') return;
    
    e.respondWith(
        caches.match(e.request).then((cached) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && e.request.url.startsWith('http')) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                }
                return networkResponse;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});
