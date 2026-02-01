const CACHE_NAME = 'family-biz-v2';
const ASSETS = [
    './',
    'index.html',
    'css/styles.css',
    'js/app.js',
    'js/storage.js',
    'js/utils.js',
    'js/transactions.js',
    'js/investments.js',
    'manifest.json',
    'icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});

