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
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("phosphor-") && (!BUILT || k !== CACHE))
            .map((k) => caches.delete(k)),
        ),
      ),
  ),
);
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
