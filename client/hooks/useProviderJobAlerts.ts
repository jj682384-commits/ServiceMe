import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useApp } from "@/context/AppContext";
import {
  registerProviderJobAlerts,
  unregisterProviderJobAlerts,
  markJobSeen,
  checkAndNotifyNewJobs,
} from "@/lib/providerJobAlerts";

const FOREGROUND_INTERVAL_MS = 15_000; // poll every 15 s while app is foregrounded

export function useProviderJobAlerts() {
  const { userRole, currentProvider } = useApp();
  const isProvider = userRole === "provider" && !!currentProvider?.id;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  // Delay the first check by 3 s so ProviderJobsScreen has time to mark
  // already-visible jobs as seen before we fire any notifications.
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!isProvider || Platform.OS === "web") return;

    // Register background fetch so the OS wakes the app periodically
    registerProviderJobAlerts();

    // Delay first check so visible jobs on the Jobs tab are marked seen first
    const initialTimer = setTimeout(() => {
      mountedRef.current = true;
      checkAndNotifyNewJobs();
    }, 3000);

    // Poll while app is foregrounded
    intervalRef.current = setInterval(() => {
      if (mountedRef.current && appStateRef.current === "active") checkAndNotifyNewJobs();
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
      clearTimeout(initialTimer);
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
