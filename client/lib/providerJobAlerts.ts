import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiUrl } from "./query-client";

export const PROVIDER_JOB_TASK = "resqride-provider-job-poll";
const SEEN_JOBS_KEY = "provider_seen_job_ids";

const SERVICE_LABELS: Record<string, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
};

type JobShape = { id: string; serviceType: string; estimatedCost?: number; isEmergency?: boolean };

async function fireNewJobNotification(jobs: JobShape[]) {
  if (Platform.OS === "web") return;
  const latest = jobs[jobs.length - 1];
  const label = SERVICE_LABELS[latest.serviceType] ?? "Roadside Assistance";
  const extra = jobs.length > 1 ? ` (+${jobs.length - 1} more)` : "";
  const isEmergency = jobs.some((j) => j.isEmergency);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isEmergency ? "EMERGENCY Job Request" : "New Job Request",
      body: `${label} needed nearby${extra} — tap to accept.`,
      data: { screen: "ProviderDashboard" },
      sound: "default",
    },
    trigger: null,
    ...(Platform.OS === "android"
      ? { channelId: isEmergency ? "emergency" : "default" }
      : {}),
  } as Notifications.NotificationRequestInput);
}

export async function checkAndNotifyNewJobs(): Promise<void> {
  try {
    const url = new URL("/api/jobs/pending", getApiUrl()).toString();
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return;

    const jobs: JobShape[] = await res.json();
    if (!Array.isArray(jobs) || jobs.length === 0) return;

    const raw = await AsyncStorage.getItem(SEEN_JOBS_KEY);
    const seenSet = new Set<string>(raw ? JSON.parse(raw) : []);
    const newJobs = jobs.filter((j) => !seenSet.has(j.id));
    if (newJobs.length === 0) return;

    const merged = [...seenSet, ...newJobs.map((j) => j.id)];
    await AsyncStorage.setItem(SEEN_JOBS_KEY, JSON.stringify(merged.slice(-100)));
    await fireNewJobNotification(newJobs);
  } catch {
    // Network errors are expected — ignore silently
  }
}

export async function registerProviderJobAlerts(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    // Dynamically import native-only modules so the web bundler never loads them
    const [BackgroundFetch, TaskManager] = await Promise.all([
      import("expo-background-fetch"),
      import("expo-task-manager"),
    ]);

    // Define the task (idempotent — safe to call multiple times)
    if (!TaskManager.isTaskDefined(PROVIDER_JOB_TASK)) {
      TaskManager.defineTask(PROVIDER_JOB_TASK, async () => {
        await checkAndNotifyNewJobs();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      });
    }

    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      console.warn("[BGFetch] Background fetch is restricted/denied on this device.");
      return;
    }

    const already = await TaskManager.isTaskRegisteredAsync(PROVIDER_JOB_TASK);
    if (!already) {
      await BackgroundFetch.registerTaskAsync(PROVIDER_JOB_TASK, {
        minimumInterval: 60 * 15,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log("[BGFetch] Provider job alerts registered.");
    }
  } catch (err) {
    console.warn("[BGFetch] Registration failed:", err);
  }
}

export async function unregisterProviderJobAlerts(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const [BackgroundFetch, TaskManager] = await Promise.all([
      import("expo-background-fetch"),
      import("expo-task-manager"),
    ]);
    const already = await TaskManager.isTaskRegisteredAsync(PROVIDER_JOB_TASK);
    if (already) await BackgroundFetch.unregisterTaskAsync(PROVIDER_JOB_TASK);
  } catch {}
}

export async function clearSeenProviderJobs(): Promise<void> {
  await AsyncStorage.removeItem(SEEN_JOBS_KEY);
}

export async function markJobSeen(jobId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_JOBS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(jobId)) {
      await AsyncStorage.setItem(SEEN_JOBS_KEY, JSON.stringify([...ids, jobId].slice(-100)));
    }
  } catch {}
}
