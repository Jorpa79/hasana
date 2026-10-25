/* ============================================================
   Control de Negocio (Hasana) — Service Worker
   Versión de interfaz: 1.0.0

   - Navegación: red primero (sin caché HTTP); la copia guardada solo
     se usa sin conexión.
   - Archivos de la app: se responde desde caché y se actualiza en
     segundo plano.
   - El servidor de Apps Script NUNCA se guarda en caché.
   - Al activarse solo borra SUS cachés viejas (prefijo "hasana-cn-").
   Cada versión nueva de index.html debe subir el número de CACHE.
   ============================================================ */
const PREFIJO = 'hasana-cn-';
const CACHE = PREFIJO + 'v1-1.0.0-20261020';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './apple-touch-icon.png', './gota.png', './logo-hasana.png', './logo-hasana-horizontal.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(APP_SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.indexOf(PREFIJO) === 0 && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.indexOf('script.google.com') >= 0 || url.hostname.indexOf('googleusercontent.com') >= 0) return;
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(r => {
        if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return r;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
