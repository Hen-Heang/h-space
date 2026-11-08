// H-Space service worker — Web Push delivery.
// Receives pushes from the `kori-send-push` Supabase Edge Function
// (payload: { title, body, url }) and shows a notification; clicking focuses
// an open tab or opens the URL.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: "H-Space", body: event.data ? event.data.text() : "" }
  }

  const title = data.title || "H-Space"
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    // Android draws only the badge's alpha channel, so it's a white silhouette.
    badge: "/icons/badge-96.png",
    data: { url: data.url || "/" },
    tag: data.tag || undefined,
  }

  // Test hook: let an open page observe that a push was received.
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of clientList) {
        client.postMessage({ type: "push-received", payload: data })
      }
      await self.registration.showNotification(title, options)
    })(),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of clientList) {
        const target = new URL(url, self.location.origin)
        if (new URL(client.url).pathname === target.pathname && "focus" in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })(),
  )
})
