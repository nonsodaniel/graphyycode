/**
 * GraphyyCode Service Worker
 * Provides offline caching for static assets and previously loaded analyses.
 */

const CACHE_NAME = "graphyycode-v1";
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first with offline fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and API calls (except GET analysis)
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/analysis/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for pages and analysis data
        if (response.ok && (
          !url.pathname.startsWith("/api/") ||
          url.pathname.startsWith("/api/analysis/")
        )) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        // Try cache first
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Navigate requests fallback to offline page
          if (event.request.mode === "navigate") {
            return caches.match("/offline") || new Response("Offline", { status: 503 });
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
