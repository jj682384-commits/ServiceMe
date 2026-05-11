import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

// ── Notification handler ──────────────────────────────────────────────────
// This governs how notifications behave when the app is in the FOREGROUND.
// Background and killed-state notifications are always shown by the OS.
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

// ── Step 1: Request permission early and independently ────────────────────
// Call this at app start so local notifications always work, regardless of
// whether push token registration succeeds.
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "ResqRide",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00AAFF",
    });
    await Notifications.setNotificationChannelAsync("emergency", {
      name: "Emergency Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#B01A1A",
      sound: "default",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── Step 2: Try to obtain an Expo push token (best-effort) ────────────────
// Returns the token string if successful, null otherwise.
// Failure here does NOT affect local notifications.
export async function initNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  try {
    // Prefer EAS projectId; fall back to expo.dev owner/slug experienceId
    const projectId =
      (Constants.easConfig as { projectId?: string } | null)?.projectId ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

    const tokenOptions: Parameters<typeof Notifications.getExpoPushTokenAsync>[0] = projectId
      ? { projectId }
      : {};

    const token = await Notifications.getExpoPushTokenAsync(tokenOptions);
    console.log("[PUSH] Token registered:", token.data?.slice(0, 30) + "...");
    return token.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Only warn once — this is expected in Expo Go without a projectId
    if (!_pushWarnedOnce) {
      console.warn("[PUSH] Push token unavailable (app-closed notifications won't work):", msg);
      console.warn("[PUSH] Fix: add your Expo username as `owner` in app.json, or add `extra.eas.projectId`.");
      _pushWarnedOnce = true;
    }
    return null;
  }
}
let _pushWarnedOnce = false;

// ── Local notification scheduler ─────────────────────────────────────────
// Works whenever the app is running (foreground or background).
// Does NOT work when the app is fully killed — that requires push tokens.
async function scheduleNotification(
  title: string,
  body: string,
  data?: NotificationData,
  channelId = "default"
) {
  if (Platform.OS === "web") return;
  try {
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
  } catch {
    // Silently ignore — permission may not be granted yet
  }
}

// ── Named helpers ────────────────────────────────────────────────────────

export async function notifySOSActivated() {
  await scheduleNotification(
    "SOS Activated",
    "Emergency dispatch is active. Help is on the way. Stay safe.",
    { screen: "EmergencyMode" },
    "emergency"
  );
}

export async function notifyProviderAccepted(providerName: string, eta: number) {
  await scheduleNotification(
    "Provider Found",
    `${providerName} accepted your request — ETA ~${eta} min`,
    { screen: "ActiveService" }
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
