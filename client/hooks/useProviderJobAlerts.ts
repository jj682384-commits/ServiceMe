import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useApp } from "@/context/AppContext";
import {
  registerProviderJobAlerts,
  unregisterProviderJobAlerts,
  markJobSeen,
  checkAndNotifyNewJobs,
} from "@/lib/providerJobAlerts";

const FOREGROUND_INTERVAL_MS = 30_000; // check every 30 s while app is foregrounded

export function useProviderJobAlerts() {
  const { userRole, currentProvider } = useApp();
  const isProvider = userRole === "provider" && !!currentProvider?.id;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!isProvider || Platform.OS === "web") return;

    // Register background fetch so the OS wakes the app periodically
    registerProviderJobAlerts();

    // Run an immediate check when the effect mounts (provider just signed in)
    checkAndNotifyNewJobs();

    // Also poll while the app is foregrounded (every 30 s)
    intervalRef.current = setInterval(() => {
      if (appStateRef.current === "active") checkAndNotifyNewJobs();
    }, FOREGROUND_INTERVAL_MS);

    // Listen for app coming back to foreground — check immediately
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === "active" && prev !== "active") {
        checkAndNotifyNewJobs();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [isProvider]);

  // Unregister background task when provider signs out
  useEffect(() => {
    if (!isProvider) {
      unregisterProviderJobAlerts();
    }
  }, [isProvider]);
}

export { markJobSeen };
