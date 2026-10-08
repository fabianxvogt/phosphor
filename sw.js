const REVISION = "__BUILD__";
const CACHE = `phosphor-performance-v2-${REVISION}`;
// Unstamped development previews must never cache a mutable asset generation.
const BUILT = /^[a-f0-9]+$/.test(REVISION);
// Replaced by build.mjs from the HTML/module import graph. Dev never caches.
const ASSETS = ["__ASSETS__"];
self.addEventListener("install", (event) => {
  if (!BUILT) return;
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          ASSETS.map((path) => new Request(path, { cache: "reload" })),
        ),
      ),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("phosphor-") && (!BUILT || k !== CACHE))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  ),
);
// Activate only from the sole remaining app window. Old control tabs can
// otherwise keep running stale code and overwrite saved sets on unload.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "activate-release" || !event.ports[0]) return;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const otherAppOpen = clients.some(
        (client) =>
          client.id !== event.source?.id &&
          client.url.startsWith(self.registration.scope),
      );
      if (otherAppOpen) {
        event.ports[0].postMessage({ blocked: true });
        return;
      }
      await self.skipWaiting();
      event.ports[0].postMessage({ ready: true });
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    !BUILT ||
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      return fetch(event.request);
    }),
  );
});
