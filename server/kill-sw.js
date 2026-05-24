// Self-unregistering service worker.
// Served at all common SW paths so the browser auto-updates the stale Expo SW.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration.unregister().then(() =>
      clients.matchAll({ type: "window" }).then((cs) =>
        cs.forEach((c) => c.navigate(c.url))
      )
    )
  );
});
