import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationData =
  | { screen: "ActiveService" }
  | { screen: "EmergencyMode" }
  | { screen: "ProviderDashboard" }
  | { screen: "EVRangeAlert" };

export async function initNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "ResqRide",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00D9FF",
    });
    await Notifications.setNotificationChannelAsync("emergency", {
      name: "Emergency Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#FF3D00",
      sound: "default",
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

async function scheduleNotification(
  title: string,
  body: string,
  data?: NotificationData,
  channelId = "default"
) {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: "default",
    },
    trigger: null,
    ...(Platform.OS === "android" ? { channelId } : {}),
  } as Notifications.NotificationRequestInput);
}

export async function notifySOSActivated() {
  await scheduleNotification(
    "SOS Activated",
    "Emergency dispatch is active. Help is on the way. Stay safe.",
    { screen: "EmergencyMode" },
    "emergency"
  );
}

export async function notifyProviderDispatched(providerName: string, eta: number) {
  await scheduleNotification(
    "Provider Dispatched",
    `${providerName} is on the way! Estimated arrival: ${eta} min`,
    { screen: "ActiveService" }
  );
}

export async function notifyProviderEnRoute(providerName: string, eta: number) {
  await scheduleNotification(
    "Provider En Route",
    `${providerName} is heading your way. ETA: ${eta} min`,
    { screen: "ActiveService" }
  );
}

export async function notifyProviderArrived(providerName: string) {
  await scheduleNotification(
    "Provider Arrived",
    `${providerName} has arrived at your location!`,
    { screen: "ActiveService" }
  );
}

export async function notifyServiceComplete(serviceType: string) {
  await scheduleNotification(
    "Service Complete",
    `Your ${serviceType} service is done. Tap to rate your experience.`,
    { screen: "ActiveService" }
  );
}

export async function notifyNewJobRequest(serviceType: string, distance: string) {
  await scheduleNotification(
    "New Job Request",
    `${serviceType} needed ${distance} away. Tap to accept.`,
    { screen: "ProviderDashboard" }
  );
}

export async function notifyNewChatMessage(senderName: string, preview: string) {
  await scheduleNotification(
    `Message from ${senderName}`,
    preview.length > 80 ? preview.slice(0, 77) + "…" : preview,
    { screen: "ActiveService" }
  );
}

export async function notifyRangeAlert(milesRemaining: number, threshold: number) {
  await scheduleNotification(
    "Range Alert",
    `Battery range is ${milesRemaining} miles — below your ${threshold}-mile threshold. Find a charger now.`,
    { screen: "EVRangeAlert" }
  );
}

export async function notifyChargeComplete() {
  await scheduleNotification(
    "Charge Complete",
    "Your EV is fully charged and ready to go!",
    { screen: "EVRangeAlert" }
  );
}
