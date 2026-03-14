import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { initNotifications, NotificationData } from "@/lib/notifications";
import { navigateTo } from "@/lib/navigationRef";
import { useApp } from "@/context/AppContext";
import { getApiUrl } from "@/lib/query-client";

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const { userRole, currentProvider } = useApp();

  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelled = false;

    const setup = async () => {
      const token = await initNotifications();

      if (!cancelled && token && userRole === "provider" && currentProvider?.id) {
        try {
          const url = new URL(`/api/providers/${currentProvider.id}/push-token`, getApiUrl());
          await fetch(url.toString(), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pushToken: token }),
          });
        } catch {
          // non-critical — will retry next mount
        }
      }
    };

    setup();

    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData | undefined;
      if (!data?.screen) return;

      switch (data.screen) {
        case "ActiveService":
          navigateTo("ActiveService");
          break;
        case "EmergencyMode":
          navigateTo("EmergencyMode");
          break;
        case "EVRangeAlert":
          navigateTo("EVRangeAlert");
          break;
        case "ProviderDashboard":
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
