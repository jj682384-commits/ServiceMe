import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { initNotifications, NotificationData } from "@/lib/notifications";
import { navigationRef } from "@/lib/navigationRef";
import { useApp } from "@/context/AppContext";
import { apiRequest, getAuthToken } from "@/lib/query-client";

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const { userRole, currentProvider } = useApp();

  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelled = false;

    const setup = async () => {
      const token = await initNotifications();
      if (cancelled || !token) return;

      if (userRole === "provider" && currentProvider?.id) {
        try {
          // MUST use apiRequest — raw fetch silently hangs on physical iOS in Expo Go
          await apiRequest("PATCH", `/api/providers/${currentProvider.id}/push-token`, { pushToken: token });
        } catch {
          // non-critical — retry on next mount
        }
      } else if (userRole === "driver" && getAuthToken()) {
        try {
          await apiRequest("PATCH", "/api/auth/push-token", { pushToken: token });
        } catch {
          // non-critical
        }
      }
    };

    setup();

    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData | undefined;
      if (!data?.screen) return;

      if (!navigationRef.isReady()) return;

      switch (data.screen) {
        case "ActiveService":
          navigationRef.navigate("ActiveService" as any);
          break;
        case "EmergencyMode":
          navigationRef.navigate("EmergencyMode" as any);
          break;
        case "EVRangeAlert":
          navigationRef.navigate("EVRangeAlert" as any);
          break;
        case "ProviderDashboard":
          // Navigate into the provider tab navigator and open the Jobs tab
          navigationRef.navigate("ProviderTabs" as any, { screen: "JobsTab" } as any);
          break;
      }
    });

    return () => {
      cancelled = true;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userRole, currentProvider?.id]);
}
