// MUTCU DMS Service Worker — PWA Support
const CACHE_NAME = 'mutcu-dms-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/mutcu-icon.png',
  '/manifest.json',
]

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
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

// Fetch — network first, cache fallback for navigation
self.addEventListener('fetch', event => {
  const { request } = event
  // Skip non-GET and API requests
  if (request.method !== 'GET' || request.url.includes('/api/')) return

  // Navigation requests — serve index.html from cache if offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
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