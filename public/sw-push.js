/**
 * Service Worker Push Handler
 * 
 * Handles incoming push notifications in the service worker.
 * This file is loaded by the service worker to handle push events.
 */

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'default',
    requireInteraction: false,
  }

  // Parse push payload if available
  if (event.data) {
    try {
      const payload = event.data.json()
      notificationData = {
        ...notificationData,
        ...payload,
      }
    } catch (e) {
      // If JSON parsing fails, try text
      const text = event.data.text()
      if (text) {
        notificationData.body = text
      }
    }
  }

  // Show notification
  const promiseChain = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon || '/pwa-192x192.png',
    badge: notificationData.badge || '/pwa-192x192.png',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    requireInteraction: notificationData.requireInteraction || false,
  })

  event.waitUntil(promiseChain)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notificationData = event.notification.data || {}
  const urlToOpen = notificationData.url || '/'

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }

        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})
