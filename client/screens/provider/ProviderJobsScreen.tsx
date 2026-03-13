import React from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ScreenDecoration } from "@/components/ScreenDecoration";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, ServiceRequest } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
  other: "Other",
};

const serviceTypeIcons: Record<ServiceType, keyof typeof Feather.glyphMap> = {
  flat_tire: "disc",
  jump_start: "battery-charging",
  tow: "truck",
  fuel: "droplet",
  lockout: "key",
  obd_diagnostic: "cpu",
  other: "more-horizontal",
};

function JobCard({ job }: { job: ServiceRequest }) {
  const { theme } = useTheme();
  const { setActiveRequest, currentProvider, updateHistoryEntry, removePendingJob, addToHistory } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const [accepting, setAccepting] = React.useState(false);

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    const acceptedJob: ServiceRequest = {
      ...job,
      status: "accepted",
      provider: currentProvider ?? undefined,
      eta: 8,
    };
    try {
      const url = new URL(`/api/jobs/${job.id}/accept`, getApiUrl());
      await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: currentProvider, eta: 8 }),
      });
    } catch {
    }
    updateHistoryEntry(job.id, {
      status: "accepted",
      provider: currentProvider ?? undefined,
    });
    removePendingJob(job.id);
    addToHistory(acceptedJob);
    setActiveRequest(acceptedJob);
    queryClient.invalidateQueries({ queryKey: ["/api/jobs/pending"] });
    navigation.navigate("ProviderActiveJob");
    setAccepting(false);
  };

  return (
    <View style={[styles.jobCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.jobHeader}>
        <View style={[styles.serviceIcon, { backgroundColor: theme.primary + "15" }]}>
          <Feather name={serviceTypeIcons[job.serviceType]} size={24} color={theme.primary} />
        </View>
        <View style={styles.jobHeaderInfo}>
          <ThemedText type="h4">{serviceTypeLabels[job.serviceType]}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {getTimeAgo(job.createdAt)}
          </ThemedText>
        </View>
        <ThemedText type="h4" style={{ color: theme.success }}>
          ${job.estimatedCost}
        </ThemedText>
      </View>

      <View style={styles.jobDetails}>
        {job.driver ? (
          <View style={styles.detailRow}>
            <Feather name="user" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              {job.driver.name}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={16} color={theme.textSecondary} />
          <ThemedText
            type="body"
            style={{ marginLeft: Spacing.sm, flex: 1, color: theme.textSecondary }}
            numberOfLines={1}
          >
            {job.location.address}
          </ThemedText>
        </View>
        {job.notes ? (
          <View style={styles.detailRow}>
            <Feather name="message-circle" size={16} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{ marginLeft: Spacing.sm, flex: 1, color: theme.textSecondary }}
              numberOfLines={2}
            >
              {job.notes}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={handleAccept}
        disabled={accepting}
        style={({ pressed }) => [
          styles.acceptButton,
          { backgroundColor: accepting ? theme.textSecondary : theme.success, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          {accepting ? "Accepting..." : "Accept Job"}
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default function ProviderJobsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { currentProvider, pendingJobs } = useApp();

  const { data: serverJobs } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/jobs/pending"],
    queryFn: async () => {
      const url = new URL("/api/jobs/pending", getApiUrl());
      const res = await fetch(url.toString());
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((j: Record<string, unknown>) => ({
        ...j,
        createdAt: new Date(j.createdAt as string),
      })) as ServiceRequest[];
    },
    refetchInterval: currentProvider?.isAvailable ? 5000 : false,
    enabled: currentProvider?.isAvailable ?? false,
  });

  const availableJobs = currentProvider?.isAvailable
    ? (serverJobs && serverJobs.length > 0 ? serverJobs : pendingJobs)
    : [];

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />
      <FlatList
        data={availableJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="heart" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
              {currentProvider?.isAvailable ? "Ready to Help" : "You're Offline"}
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              {currentProvider?.isAvailable
                ? "When someone nearby needs help, their request will appear here. You decide which jobs to accept!"
                : "Go online when you're ready to earn. Work on your own schedule."}
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  jobCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  jobHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  jobHeaderInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  jobDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  acceptButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
});
