import { registerRootComponent } from "expo";

import App from "@/App";

// If the Expo app bundle was served by a stale service worker for an admin
// path, unregister all SWs (so the next request hits the server directly) and
// reload once.  A sessionStorage flag stops the loop after the first reload.
if (typeof window !== "undefined" && window.location) {
  const _adminPaths = ["/admin", "/go-admin", "/resqadmin", "/rr-ops", "/api/admin-hub"];
  const _onAdminPath = _adminPaths.some((p) => window.location.pathname.startsWith(p));
  if (_onAdminPath && sessionStorage.getItem("_sw_cleared") !== "1") {
    sessionStorage.setItem("_sw_cleared", "1");
    Promise.all([
      "serviceWorker" in navigator
        ? navigator.serviceWorker.getRegistrations().then((regs) =>
            Promise.all(regs.map((r) => r.unregister()))
          )
        : Promise.resolve(),
      "caches" in window
        ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        : Promise.resolve(),
    ]).then(() => window.location.reload(true));
  }
}

registerRootComponent(App);
