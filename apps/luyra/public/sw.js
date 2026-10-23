// Luyra service worker. Scope stays deliberately modest: static-asset cache
// + read-only recent API data as an offline-only fallback. Mutations are never
// intercepted, cached, or queued — an offline write simply fails normally.
//
// Pages (HTML documents and RSC payloads) are never cached. They are
// personalized and auth-gated: a cached copy could be a /login redirect saved
// under /finance, or one account's dashboard shown to the next account on the
// same device. Navigations always go to the network so the proxy's session
// check runs on every visit.
//
// Bumping these names makes `activate` delete every older cache, which purges
// any page responses an earlier worker version stored.
const STATIC_CACHE = "luyra-static-v3";
// Keep in sync with OFFLINE_API_CACHE in lib/pwa-cache.ts (cleared on sign-out).
const API_CACHE = "luyra-api-v3";
const CURRENT_CACHES = [STATIC_CACHE, API_CACHE];

// Public, non-personalized files only — never a protected route.
const PRECACHE_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch a mutation — no offline write queue exists, so a POST/PUT/
  // PATCH/DELETE must always hit the real network (and fail normally if
  // there isn't one). Only GET is ever cached.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API routes: network-first. The cached copy is used only when the network
  // is unreachable — any real response (success or error) is returned as-is,
  // so a successful fetch always wins over the cache.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 401) {
            // Session ended — drop every cached personal response so it can't
            // resurface offline for whoever signs in next.
            event.waitUntil(caches.delete(API_CACHE));
          } else if (response.ok && response.type === "basic") {
            const clone = response.clone();
            event.waitUntil(caches.open(API_CACHE).then((cache) => cache.put(request, clone)));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { cacheName: API_CACHE });
          return cached ?? Response.error();
        })
    );
    return;
  }

  // Content-hashed build output and public icons: cache-first is safe because
  // the URL changes whenever the bytes do. Everything else — documents, RSC
  // payloads, route handlers outside /api — falls through to the network.
  if (!isStaticAsset(url)) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok && !response.redirected) cache.put(request, response.clone());
            return response;
          })
      )
    )
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Luyra", body: event.data.text() };
  }

  const { title = "Luyra", ...options } = payload ?? {};
  event.waitUntil(
    self.registration.showNotification(title, {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      ...options,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const requestedPath = event.notification.data?.url;
  const path = typeof requestedPath === "string" && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/finance";
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ("navigate" in client && client.url !== targetUrl) await client.navigate(targetUrl);
        if ("focus" in client) return client.focus();
      }

      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    })
  );
});
