const CACHE = 'wedding-desk-v28';
const FILES = ["./", "./fonts/cormorant-latin-500-normal.woff2", "./fonts/cormorant-latin-600-normal.woff2", "./fonts/cormorant-latin-700-normal.woff2", "./fonts/inter-latin-400-normal.woff2", "./fonts/inter-latin-500-normal.woff2", "./fonts/inter-latin-600-normal.woff2", "./fonts/inter-latin-700-normal.woff2", "./icons/apple-touch-icon.png", "./icons/favicon-32.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./index.html", "./lib/jspdf.umd.min.js", "./lib/xlsx.full.min.js", "./manifest.webmanifest", "./tour-poster.jpg", "./wedding-desk-template.xlsx"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('.mp4')) return;
  if (e.request.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html') || u.pathname.endsWith('.webmanifest')) {
    e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })).catch(() => caches.match('./index.html')));
});
