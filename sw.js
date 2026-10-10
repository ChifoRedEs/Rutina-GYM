/* Rutina Gym — service worker.
 * Red primero para los archivos de la app (siempre la última versión si hay conexión),
 * caché si no la hay. Solo guarda archivos del propio sitio: nada de YouTube ni enlaces externos.
 * Sube CACHE al publicar una versión nueva. */
const CACHE = 'rutina-gym-v3.0.0';
const ASSETS = [
  './', './index.html', './manifest.json', './css/app.css', './data/exercises.js',
  './js/util.js', './js/store.js', './js/images.js', './js/logic.js', './js/timer.js', './js/charts.js',
  './js/backup.js', './js/views-train.js', './js/views-manage.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'
];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => (list[0] ? list[0].focus() : self.clients.openWindow('./'))));
});
