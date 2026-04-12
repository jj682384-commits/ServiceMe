import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
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
import { getApiUrl, apiRequest } from "@/lib/query-client";
import * as Location from "expo-location";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const EV_CYAN = "#00D4FF";

const serviceTypeLabels: Record<string, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
};

const serviceTypeIcons: Record<string, keyof typeof Feather.glyphMap> = {
  flat_tire: "disc",
  jump_start: "battery-charging",
  tow: "truck",
  fuel: "droplet",
  lockout: "key",
  obd_diagnostic: "cpu",
};

function jobLabel(job: ServiceRequest): string {
  if (job.isEV) {
    if (job.serviceType === "fuel") return "EV Mobile Charging";
    if (job.serviceType === "tow") return "EV-Safe Towing";
  }
  return serviceTypeLabels[job.serviceType] ?? job.serviceType;
}

function jobIcon(job: ServiceRequest): keyof typeof Feather.glyphMap {
  if (job.isEV) return "zap";
  return serviceTypeIcons[job.serviceType] ?? "tool";
}

function EVBadge() {
  return (
    <View style={evBadgeStyle.badge}>
      <Feather name="zap" size={10} color={EV_CYAN} />
      <ThemedText type="small" style={evBadgeStyle.text}>
        EV
      </ThemedText>
    </View>
  );
}

const evBadgeStyle = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: EV_CYAN + "20",
    borderWidth: 1,
    borderColor: EV_CYAN + "50",
  },
  text: {
    color: EV_CYAN,
    fontSize: 10,
    fontWeight: "700",
  },
});

function JobDetailSheet({
  job,
  visible,
  onClose,
  onAccept,
  accepting,
  canAccept,
  isEvCapable,
}: {
  job: ServiceRequest;
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
  accepting: boolean;
  canAccept: boolean;
  isEvCapable: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const iconColor = job.isEV ? EV_CYAN : theme.primary;
  const iconBg = job.isEV ? EV_CYAN + "20" : theme.primary + "20";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={sheetStyles.overlay}>
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={[sheetStyles.sheet, { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={sheetStyles.handle} />

          <View style={sheetStyles.sheetHeader}>
            <View style={[sheetStyles.sheetIcon, { backgroundColor: iconBg }]}>
              <Feather name={jobIcon(job)} size={28} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                <ThemedText type="h3" style={{ fontWeight: "700" }}>
                  {jobLabel(job)}
                </ThemedText>
                {job.isEV ? <EVBadge /> : null}
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Posted {getTimeAgo(job.createdAt)}
              </ThemedText>
            </View>
            <Pressable onPress={onClose} style={sheetStyles.closeButton}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={[sheetStyles.earningsRow, { backgroundColor: theme.success + "15", borderColor: theme.success + "40" }]}>
            <Feather name="dollar-sign" size={20} color={theme.success} />
            <View style={{ flex: 1 }}>
              <ThemedText type="h3" style={{ color: theme.success, fontWeight: "800" }}>
                ${job.estimatedCost}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.success, opacity: 0.8 }}>
                Estimated payout (after 15% fee)
              </ThemedText>
            </View>
            {job.isExpress ? (
              <View style={[sheetStyles.expressTag, { backgroundColor: theme.warning + "20" }]}>
                <ThemedText type="small" style={{ color: theme.warning, fontWeight: "700" }}>
                  Priority
                </ThemedText>
              </View>
            ) : null}
          </View>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            <View style={[sheetStyles.detailsCard, { backgroundColor: theme.backgroundSecondary }]}>
              {job.driver ? (
                <View style={sheetStyles.detailItem}>
                  <Feather name="user" size={16} color={theme.textSecondary} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Driver</ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>{job.driver.name as string}</ThemedText>
                  </View>
                </View>
              ) : null}

              <View style={[sheetStyles.detailItem, { borderTopWidth: job.driver ? 1 : 0, borderTopColor: theme.border }]}>
                <Feather name="map-pin" size={16} color={theme.textSecondary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Location</ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "500" }}>{job.location.address}</ThemedText>
                </View>
              </View>

              {job.notes ? (
                <View style={[sheetStyles.detailItem, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <Feather name="message-circle" size={16} color={theme.textSecondary} />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Driver Note</ThemedText>
                    <ThemedText type="body">{job.notes}</ThemedText>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {job.isEV && !isEvCapable ? (
            <View style={[sheetStyles.evBlockedBanner, { backgroundColor: EV_CYAN + "15", borderColor: EV_CYAN + "40" }]}>
              <Feather name="zap" size={16} color={EV_CYAN} />
              <ThemedText type="small" style={{ color: EV_CYAN, fontWeight: "600", marginLeft: Spacing.sm, flex: 1 }}>
                EV certification required to accept this job. Enable EV services in your profile to unlock these requests.
              </ThemedText>
            </View>
          ) : null}

          <View style={sheetStyles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                sheetStyles.passButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="skip-forward" size={18} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: "600", marginLeft: Spacing.sm }}>
                Pass
              </ThemedText>
            </Pressable>

            {job.isEV && !isEvCapable ? (
              <View style={[sheetStyles.acceptButton, { backgroundColor: EV_CYAN + "20", borderWidth: 1, borderColor: EV_CYAN + "40" }]}>
                <Feather name="lock" size={18} color={EV_CYAN} />
                <ThemedText type="small" style={{ color: EV_CYAN, marginLeft: Spacing.sm, fontWeight: "600" }}>
                  EV Capability Required
                </ThemedText>
              </View>
            ) : canAccept ? (
              <Pressable
                onPress={onAccept}
                disabled={accepting}
                style={({ pressed }) => [
                  sheetStyles.acceptButton,
                  { backgroundColor: accepting ? theme.textSecondary : theme.success, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name="check-circle" size={18} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
                  {accepting ? "Accepting..." : "Accept Job"}
                </ThemedText>
              </Pressable>
            ) : (
              <View style={[sheetStyles.acceptButton, { backgroundColor: theme.border }]}>
                <Feather name="wifi-off" size={18} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                  Go online to accept
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function JobCard({ job, onPress }: { job: ServiceRequest; onPress: () => void }) {
  const { theme } = useTheme();

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const iconColor = job.isEV ? EV_CYAN : theme.primary;
  const iconBg = job.isEV ? EV_CYAN + "25" : theme.primary + "15";
  const cardBg = job.isEV ? "#0A1A2E" : theme.backgroundDefault;
  const cardBorderColor = job.isEV ? EV_CYAN + "50" : "transparent";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.jobCard,
        {
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: cardBorderColor,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {job.isEV ? (
        <View style={{ height: 3, backgroundColor: EV_CYAN, marginHorizontal: -Spacing.lg, marginTop: -Spacing.lg, marginBottom: Spacing.md, borderTopLeftRadius: BorderRadius.md, borderTopRightRadius: BorderRadius.md }} />
      ) : null}
      <View style={styles.jobHeader}>
        <View style={[styles.serviceIcon, { backgroundColor: iconBg }]}>
          <Feather name={jobIcon(job)} size={24} color={iconColor} />
        </View>
        <View style={styles.jobHeaderInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
            <ThemedText type="h4">{jobLabel(job)}</ThemedText>
            {job.isEV ? <EVBadge /> : null}
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {getTimeAgo(job.createdAt)}
          </ThemedText>
        </View>
        <View style={styles.rightColumn}>
          <ThemedText type="h4" style={{ color: theme.success }}>${job.estimatedCost}</ThemedText>
          {job.isExpress ? (
            <View style={[styles.priorityBadge, { backgroundColor: theme.warning + "20" }]}>
              <ThemedText type="small" style={{ color: theme.warning, fontSize: 10, fontWeight: "700" }}>
                Priority
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.jobDetails}>
        {job.driver ? (
          <View style={styles.detailRow}>
            <Feather name="user" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ marginLeft: Spacing.xs, color: theme.textSecondary }}>
              {job.driver.name as string}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText
            type="small"
            style={{ marginLeft: Spacing.xs, flex: 1, color: theme.textSecondary }}
            numberOfLines={1}
          >
            {job.location.address}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.tapHint, { borderTopColor: theme.border }]}>
        <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
          Tap to view details and accept
        </ThemedText>
        <Feather name="chevron-right" size={14} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

export default function ProviderJobsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { currentProvider, pendingJobs, setActiveRequest, updateHistoryEntry, removePendingJob, addToHistory } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [selectedJob, setSelectedJob] = React.useState<ServiceRequest | null>(null);
  const [accepting, setAccepting] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: serverJobs } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/jobs/pending"],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL("/api/jobs/pending", baseUrl);
      url.searchParams.set("_t", Date.now().toString());
      let res: Response;
      try {
        res = await fetch(url.toString(), { cache: "no-store" });
      } catch {
        return [];
      }
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((j: Record<string, unknown>) => ({
        ...j,
        createdAt: new Date(j.createdAt as string),
      })) as ServiceRequest[];
    },
    refetchInterval: 1000,
    enabled: true,
  });

  // WebSocket: instantly receive new job broadcasts instead of waiting for next poll
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    const apiUrl = getApiUrl();
    const wsBase = apiUrl.replace(/^https/, "wss").replace(/^http/, "ws").replace(/\/$/, "");
    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(`${wsBase}/ws`);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "job_status_update" && data.job?.status === "pending") {
            queryClient.invalidateQueries({ queryKey: ["/api/jobs/pending"] });
          }
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => { if (!cancelled) setTimeout(connect, 3000); };
    };
    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const isEvCapable = currentProvider?.evCapable ?? false;

  const merged = React.useMemo(() => {
    const map = new Map<string, ServiceRequest>();
    (pendingJobs ?? []).forEach((j) => map.set(j.id, j));
    (serverJobs ?? []).forEach((j) => map.set(j.id, j));
    return Array.from(map.values());
  }, [serverJobs, pendingJobs]);

  const handleAccept = async () => {
    if (!selectedJob || accepting) return;
    setAccepting(true);

    let providerLocation: { latitude: number; longitude: number } | undefined;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        providerLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch {
      // location unavailable — continue without it
    }

    try {
      await apiRequest("PATCH", `/api/jobs/${selectedJob.id}/accept`, {
        provider: currentProvider,
        eta: 8,
        providerLocation,
      });
    } catch {
      // proceed with local state even if server call fails
    }

    const acceptedJob: ServiceRequest = {
      ...selectedJob,
      status: "accepted",
      provider: currentProvider ?? undefined,
      eta: 8,
    };

    updateHistoryEntry(selectedJob.id, {
      status: "accepted",
      provider: currentProvider ?? undefined,
    });
    removePendingJob(selectedJob.id);
    addToHistory(acceptedJob);
    setActiveRequest(acceptedJob);
    queryClient.invalidateQueries({ queryKey: ["/api/jobs/pending"] });

    setSelectedJob(null);
    setAccepting(false);
    navigation.navigate("ProviderActiveJob");
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/jobs/pending"] });
    setIsRefreshing(false);
  }, [queryClient]);

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />
      <FlatList
        data={merged}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => setSelectedJob(item)}
          />
        )}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            title="Checking for new jobs..."
            titleColor={theme.textSecondary}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <ThemedText type="h2">Available Jobs</ThemedText>
            <View style={styles.refreshHintInline}>
              <Feather name="refresh-cw" size={12} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                Pull down to refresh
              </ThemedText>
            </View>
          </View>
        }
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
                ? "When someone nearby needs help, their request will appear here. Tap a job to review it before accepting."
                : "Go online when you're ready to earn. Work on your own schedule."}
            </ThemedText>
          </View>
        }
      />

      {selectedJob ? (
        <JobDetailSheet
          job={selectedJob}
          visible={true}
          onClose={() => { setSelectedJob(null); setAccepting(false); }}
          onAccept={handleAccept}
          accepting={accepting}
          canAccept={currentProvider?.isAvailable ?? false}
          isEvCapable={isEvCapable}
        />
      ) : null}
    </ThemedView>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    alignSelf: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sheetIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    padding: Spacing.sm,
  },
  earningsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  expressTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  detailsCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
  },
  evBlockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  passButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  refreshHintInline: {
    flexDirection: "row",
    alignItems: "center",
    opacity: 0.7,
  },
  jobCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  jobHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
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
  rightColumn: {
    alignItems: "flex-end",
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jobDetails: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
});
