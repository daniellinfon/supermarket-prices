const CACHE = 'preciomercado-v1'
const STATIC = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Peticiones a la API siempre van a la red
  if (e.request.url.includes('/api/') || e.request.url.includes('railway.app')) {
    return e.respondWith(fetch(e.request))
  }
  // Resto: cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
})
