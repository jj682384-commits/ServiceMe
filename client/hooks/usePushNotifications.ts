import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { initNotifications, NotificationData } from "@/lib/notifications";
import { navigateTo } from "@/lib/navigationRef";

export function usePushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    initNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
    });

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
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
