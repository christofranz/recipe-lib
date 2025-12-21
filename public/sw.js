const CACHE_NAME = 'recipe-app-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png'
];

// 1. Installation: Statische Dateien sichern
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
});

// 2. Fetch-Event: Hier passiert die Magie
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Nur GET-Requests cachen (kein Login oder POST!)
    if (request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cachedResponse = await cache.match(request);

            // Netzwerk-Request im Hintergrund starten
            const networkFetch = fetch(request).then(networkResponse => {
                // Wenn die Antwort gültig ist, Kopie im Cache speichern
                if (networkResponse.ok) {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(() => {
                // Offline-Fall: Wenn Netzwerk fehlschlägt, geben wir nichts weiter (Error handling)
            });

            // Sofort Cache zurückgeben (falls vorhanden), sonst auf Netzwerk warten
            return cachedResponse || networkFetch;
        })
    );
});