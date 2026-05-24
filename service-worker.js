const CACHE = 'yethiomenu-v1';
const URLS = [
  '/', '/index.html', '/restaurant.html', '/login.html',
  '/admin.html', '/admin.js', '/script.js', '/style.css',
  '/config.js', '/i18n.js', '/manifest.json',
  '/customer-login.html', '/customer-dashboard.html', '/order-status.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
