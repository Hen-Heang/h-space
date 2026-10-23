// Name of the service worker's offline API cache — keep in sync with
// API_CACHE in public/sw.js.
export const OFFLINE_API_CACHE = "luyra-api-v3";

// Drops the offline copies of personal API responses so they can't be shown to
// the next account that signs in on this device. Best-effort: the Cache API is
// missing in some contexts (insecure origins, private modes), and sign-out
// must never fail because of it.
export async function clearOfflineApiCache(): Promise<void> {
  try {
    if (typeof caches !== "undefined") await caches.delete(OFFLINE_API_CACHE);
  } catch (error) {
    console.error("[pwa] failed to clear offline API cache", error);
  }
}
