const CACHE_NAME = 'family-biz-v1';
const ASSETS = [
    'index.html',
    'css/styles.css',
    'js/app.js',
    'js/storage.js',
    'js/utils.js',
    'js/transactions.js',
    'js/investments.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
