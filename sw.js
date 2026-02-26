const CACHE_VERSION = 'tech-builders-v3';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.webmanifest',
    './data/challenges.json',
    './data/challenges.schema.json',
    './assets/icons/icon-192.svg',
    './assets/icons/icon-512.svg',
    './js/constants.js',
    './js/eventBus.js',
    './js/persistence.js',
    './js/systemEvaluator.js',
    './js/challengeRepository.js',
    './js/router.js',
    './js/progressionEngine.js',
    './js/telemetry.js',
    './js/aboutPage.js',
    './js/utils.js',
    './js/gameState.js',
    './js/canvasManager.js',
    './js/challenge.js',
    './js/simulationEngine.js',
    './js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.addAll(APP_SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    if (!sameOrigin) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(request)
                .then((response) => {
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    const copy = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match('./index.html'));
        })
    );
});
