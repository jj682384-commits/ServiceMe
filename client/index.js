import { registerRootComponent } from "expo";

import App from "@/App";

// When the Expo service worker intercepts /api/admin-hub and serves the cached
// web app instead, this code detects it, kills the SW, and hard-redirects so
// the real admin page loads from the server.
if (
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  window.location &&
  window.location.pathname.includes("admin")
) {
  const killSwAndRedirect = async () => {
    const target = window.location.href;
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (_) {}
    window.location.replace(target);
  };
  killSwAndRedirect();
} else {
  registerRootComponent(App);
}
