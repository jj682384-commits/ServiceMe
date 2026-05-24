import { registerRootComponent } from "expo";

import App from "@/App";

// If a stale service worker served this page for an admin path, unregister all
// SWs and reload so the server can respond directly.  Using
// navigator.serviceWorker.controller (null when NOT SW-controlled) means this
// self-limits: after the reload the controller is null and the block is skipped.
if (typeof window !== "undefined" && window.location && "serviceWorker" in navigator) {
  const _adminPaths = ["/admin", "/go-admin", "/resqadmin", "/rr-ops", "/api/admin-hub", "/clear"];
  const _onAdminPath = _adminPaths.some((p) => window.location.pathname.startsWith(p));
  if (_onAdminPath && navigator.serviceWorker.controller) {
    Promise.all([
      navigator.serviceWorker.getRegistrations().then((regs) =>
        Promise.all(regs.map((r) => r.unregister()))
      ),
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    ]).then(() => window.location.reload(true));
  }
}

registerRootComponent(App);
