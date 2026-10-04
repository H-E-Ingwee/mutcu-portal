// MUTCU DMS Service Worker — PWA Support v3
const CACHE_NAME = 'mutcu-dms-v3'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/mutcu-icon.png',
  '/manifest.json',
]

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => {}) // Don't fail install if caching fails
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — ONLY intercept same-origin static assets
// ALL cross-origin requests (API, Supabase, Cloudinary) pass through untouched
self.addEventListener('fetch', event => {
  const { request } = event

  // Skip non-GET requests entirely
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return // Invalid URL — skip
  }

  // Skip ALL cross-origin requests (API on Render, Supabase, Cloudinary, etc.)
  if (url.origin !== self.location.origin) return

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return

  // Skip API routes on same origin
  if (url.pathname.startsWith('/api/')) return

  // Navigation requests — try network first, fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
        .catch(() => {
          // Offline — serve cached index.html
          return caches.match('/index.html').then(cached => {
            if (cached) return cached
            // If no cache, return a minimal offline page
            return new Response('<html><body><h1>MUTCU DMS</h1><p>You are offline. Please check your connection.</p></body></html>', {
              headers: { 'Content-Type': 'text/html' }
            })
          })
        })
    )
    return
  }

  // Static assets (JS, CSS, images) — cache first, network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
        .catch(() => new Response('', { status: 408 })) // Timeout fallback
    })
  )
})

// Push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  const title = data.title || 'MUTCU DMS'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/mutcu-icon.png',
    badge: '/mutcu-icon.png',
    tag: data.tag || 'mutcu-notification',
    data: { url: data.url || '/' },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click — open the app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
