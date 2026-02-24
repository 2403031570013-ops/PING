// Campus Governance PWA Service Worker
const CACHE_NAME = 'campus-governance-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/pwa-icons/icon-192.png',
    '/pwa-icons/icon-512.png',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS).catch(err => {
                    console.log('[SW] Some assets failed to cache:', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - Network first, fallback to cache (for API calls: network only)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API calls and socket connections - always go to network
    if (url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/socket.io') ||
        url.hostname !== self.location.hostname) {
        return;
    }

    // For navigation requests (HTML pages) - Network first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache the latest version
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    // Offline: return cached version
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('/');
                    });
                })
        );
        return;
    }

    // For static assets - Cache first, then network
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                // Return cache but also update in background
                fetch(request).then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
                    }
                }).catch(() => { });
                return cached;
            }

            // Not in cache, fetch from network
            return fetch(request).then((response) => {
                if (response.ok && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for images
                if (request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#F1F5F9" width="200" height="200"/><text fill="#94A3B8" x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14">Offline</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            });
        })
    );
});

// Push notifications (future support)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/pwa-icons/icon-192.png',
        badge: '/pwa-icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: data.url ? { url: data.url } : {},
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Campus Governance', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                // Focus existing window if available
                for (const client of clients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window
                return self.clients.openWindow(url);
            })
    );
});
