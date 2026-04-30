const CACHE_NAME = 'carter-v1'
const STATIC_ASSETS = [
  '/shopping',
  '/wishlist',
  '/templates',
  '/analytics',
  '/receipts',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // For navigation requests: stale-while-revalidate — serve cache instantly,
  // then refresh in the background so the next visit is up to date.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        const networkFetch = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone())
          return res
        }).catch(() => cached ?? Response.error())
        return cached ?? networkFetch
      })
    )
    return
  }

  // For static assets: cache-first
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          return res
        })
      )
    )
  }
})
