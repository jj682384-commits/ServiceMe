import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GoogleMapView } from "@/components/GoogleMapView";
import { ScreenDecoration } from "@/components/ScreenDecoration";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceStatus, ServiceType, Provider } from "@/context/AppContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  notifyProviderEnRoute,
  notifyProviderArrived,
  notifyServiceComplete,
} from "@/lib/notifications";

const statusLabels: Record<ServiceStatus, string> = {
  pending: "Finding Provider",
  accepted: "Provider Found",
  en_route: "Provider En Route",
  arrived: "Provider Arrived",
  in_progress: "Service In Progress",
  completed: "Service Completed",
  cancelled: "Cancelled",
};

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
  other: "Other",
};

const statusColors: Record<ServiceStatus, string> = {
  pending: "#F59E0B",
  accepted: "#3B82F6",
  en_route: "#F59E0B",
  arrived: "#16A34A",
  in_progress: "#8B5CF6",
  completed: "#16A34A",
  cancelled: "#DC2626",
};

const STATUS_ORDER: ServiceStatus[] = ["pending", "accepted", "en_route", "arrived", "in_progress", "completed", "cancelled"];

function StatusTimeline({ currentStatus }: { currentStatus: ServiceStatus }) {
  const { theme } = useTheme();
  const statuses: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress", "completed"];
  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <View style={styles.timeline}>
      {statuses.map((status, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <View key={status} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor: isActive ? statusColors[status] : theme.border,
                  borderColor: isCurrent ? statusColors[status] : "transparent",
                  borderWidth: isCurrent ? 3 : 0,
                },
              ]}
            >
              {isActive && index < currentIndex ? (
                <Feather name="check" size={12} color="#FFFFFF" />
              ) : null}
            </View>
            <ThemedText
              type="small"
              style={[
                styles.timelineLabel,
                { color: isActive ? theme.text : theme.textSecondary },
              ]}
            >
              {statusLabels[status]}
            </ThemedText>
            {index < statuses.length - 1 ? (
              <View
                style={[
                  styles.timelineLine,
                  { backgroundColor: index < currentIndex ? statusColors[status] : theme.border },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default function ActiveServiceScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { activeRequest, setActiveRequest, updateHistoryEntry, userRole } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const safeGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("DriverTabs");
  };

  const [eta, setEta] = useState(activeRequest?.eta || 8);
  const [providerLocation, setProviderLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeRequestRef = useRef(activeRequest);
  const isFocused = useIsFocused();
  // Tracks whether we've already fired the immediate poll for the current job ID
  const initialPollFiredRef = useRef<string | null>(null);

  useEffect(() => {
    activeRequestRef.current = activeRequest;
  }, [activeRequest]);

  useEffect(() => {
    if (!activeRequest) {
      if (isFocused) safeGoBack();
      return;
    }

    const timer = setInterval(() => {
      setEta((prev) => {
        if (prev <= 1) {
          const cur = activeRequestRef.current;
          if (cur && (cur.status === "accepted" || cur.status === "en_route")) {
            setActiveRequest({ ...cur, status: "arrived" });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 60000);

    return () => clearInterval(timer);
  // Only recreate the timer when the job changes or focus changes, not on every status update
  }, [activeRequest?.id, isFocused]);

  useEffect(() => {
    if (!activeRequest?.id) return;
    const apiUrl = getApiUrl();
    const wsBase = apiUrl.replace(/^https/, "wss").replace(/^http/, "ws").replace(/\/$/, "");
    const wsUrl = `${wsBase}/ws`;

    const applyJobUpdate = (job: Record<string, unknown>) => {
      const current = activeRequestRef.current;
      if (!current || job.id !== current.id) return;
      if (job.status === "cancelled") {
        setActiveRequest(null);
        return;
      }
      // Fix server field name mismatch: server sends { lat, lng }, client expects { latitude, longitude }
      const rawLoc = job.providerLocation as { lat?: number; lng?: number; latitude?: number; longitude?: number } | undefined;
      if (rawLoc) {
        const lat = rawLoc.latitude ?? rawLoc.lat;
        const lng = rawLoc.longitude ?? rawLoc.lng;
        if (lat && lng && (lat !== 0 || lng !== 0)) {
          setProviderLocation({ latitude: lat, longitude: lng });
        }
      }
      const serverIdx = STATUS_ORDER.indexOf(job.status as ServiceStatus);
      const localIdx = STATUS_ORDER.indexOf(current.status);
      // Apply if server is ahead OR if job is completed (safety net in case indices are tied)
      if (serverIdx > localIdx || job.status === "completed" || (job.provider && !current.provider)) {
        const newStatus = job.status as ServiceStatus;
        const newProvider = (job.provider as Provider | undefined) ?? current.provider;
        // setActiveRequest triggers the dedicated completion-navigation useEffect
        setActiveRequest({ ...current, status: newStatus, provider: newProvider, eta: (job.eta as number | undefined) ?? current.eta });
        setEta((job.eta as number | undefined) ?? current.eta ?? 8);
        updateHistoryEntry(current.id, { status: newStatus, provider: newProvider });
      }
    };

    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "job_status_update") applyJobUpdate(data.job);
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => {
        if (!cancelled) setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [activeRequest?.id]);

  // Single source of truth for completion navigation — fires whenever status lands on "completed"
  useEffect(() => {
    if (activeRequest?.status === "completed" && userRole === "driver") {
      navigation.navigate("ServiceCompletion");
    }
  }, [activeRequest?.status]);

  useEffect(() => {
    if (!activeRequest) return;
    if (activeRequest.status === "cancelled") return;
    // Don't poll if already completed — the navigation effect above handles it
    if (activeRequest.status === "completed") return;

    const poll = async () => {
      try {
        const url = new URL(`/api/jobs/${activeRequest.id}`, getApiUrl());
        const res = await fetch(url.toString(), {
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
        });
        if (!res.ok) return;
        const job = await res.json();

        if (job.status === "cancelled") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setActiveRequest(null);
          safeGoBack();
          return;
        }

        const serverIdx = STATUS_ORDER.indexOf(job.status as ServiceStatus);
        const localIdx = STATUS_ORDER.indexOf(activeRequest.status);

        if (job.providerLocation) {
          const loc = job.providerLocation as { lat?: number; lng?: number; latitude?: number; longitude?: number };
          const lat = loc.latitude ?? loc.lat;
          const lng = loc.longitude ?? loc.lng;
          if (lat && lng && (lat !== 0 || lng !== 0)) {
            setProviderLocation({ latitude: lat, longitude: lng });
          }
        }

        // Always apply if server is ahead OR if server says completed regardless of local state
        if (serverIdx > localIdx || job.status === "completed" || (job.provider && !activeRequest.provider)) {
          const newStatus = job.status as ServiceStatus;
          const newProvider = job.provider ? (job.provider as Provider) : activeRequest.provider;
          setActiveRequest({
            ...activeRequest,
            status: newStatus,
            provider: newProvider,
            eta: job.eta ?? activeRequest.eta,
          });
          setEta(job.eta ?? activeRequest.eta ?? 8);
          updateHistoryEntry(activeRequest.id, { status: newStatus, provider: newProvider });
          if (newStatus === "completed") {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          }
        }
      } catch {
      }
    };

    // Only fire the immediate poll once per job ID to avoid thrashing on status-change re-runs
    if (initialPollFiredRef.current !== activeRequest.id) {
      initialPollFiredRef.current = activeRequest.id;
      poll();
    }
    pollRef.current = setInterval(poll, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeRequest?.id, activeRequest?.status]);

  useEffect(() => {
    if (!activeRequest) return;
    const providerName = activeRequest.provider?.name ?? "Your provider";
    const serviceLabel = serviceTypeLabels[activeRequest.serviceType] ?? "service";

    if (activeRequest.status === "en_route") {
      notifyProviderEnRoute(providerName, activeRequest.eta ?? 8);
    } else if (activeRequest.status === "arrived") {
      notifyProviderArrived(providerName);
    } else if (activeRequest.status === "completed") {
      notifyServiceComplete(serviceLabel);
    }
  }, [activeRequest?.status]);

  if (!activeRequest) return null;

  const handleCancel = () => {
    Alert.alert(
      "Cancel Service",
      "Are you sure you want to cancel this service request?",
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest("PATCH", `/api/jobs/${activeRequest.id}/cancel`);
            } catch {
            }
            updateHistoryEntry(activeRequest.id, { status: "cancelled" });
            setActiveRequest(null);
            safeGoBack();
          },
        },
      ]
    );
  };

  if (activeRequest.status === "pending") {
    return (
      <ThemedView style={styles.container}>
        <ScreenDecoration />
        <View style={[styles.pendingContainer, { paddingTop: headerHeight + Spacing.xl }]}>
          <View style={[styles.pendingIcon, { backgroundColor: theme.primary + "15" }]}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.xl, textAlign: "center" }}>
            Finding a Provider
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm, paddingHorizontal: Spacing.xl }}>
            Your request is live. Nearby providers are being notified and can accept your job.
          </ThemedText>
          <View style={[styles.pendingCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <Feather name="map-pin" size={16} color={theme.primary} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
              {activeRequest.location.address}
            </ThemedText>
          </View>
          <View style={[styles.pendingCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <Feather name="dollar-sign" size={16} color={theme.success} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm, color: theme.success, fontWeight: "600" }}>
              ${activeRequest.estimatedCost} estimated
            </ThemedText>
          </View>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelPendingBtn,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="x" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
              Cancel Request
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const handleComplete = async () => {
    setActiveRequest({ ...activeRequest, status: "completed" });
    updateHistoryEntry(activeRequest.id, { status: "completed" });
    try {
      await apiRequest("PATCH", `/api/jobs/${activeRequest.id}/status`, { status: "completed" });
    } catch {
    }
    if (userRole === "driver") {
      navigation.navigate("ServiceCompletion");
    } else {
      safeGoBack();
    }
  };

  const handleAdvanceStatus = async () => {
    const statuses: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress", "completed"];
    const currentIndex = statuses.indexOf(activeRequest.status);
    if (currentIndex < statuses.length - 1) {
      const nextStatus = statuses[currentIndex + 1];
      setActiveRequest({ ...activeRequest, status: nextStatus });
      updateHistoryEntry(activeRequest.id, { status: nextStatus });
      try {
        await apiRequest("PATCH", `/api/jobs/${activeRequest.id}/status`, { status: nextStatus });
      } catch {
      }
      if (nextStatus === "completed") {
        handleComplete();
      }
    }
  };

  const handleMessage = () => {
    navigation.navigate("Chat", {
      conversationId: activeRequest.id,
      providerName: activeRequest.provider?.name || "Provider",
    });
  };

  const userLat = activeRequest.location.latitude || 37.7849;
  const userLng = activeRequest.location.longitude || -122.4094;
  const providerLat = providerLocation?.latitude || activeRequest.provider?.location?.latitude || userLat + 0.01;
  const providerLng = providerLocation?.longitude || activeRequest.provider?.location?.longitude || userLng + 0.01;

  const routeCoords = [
    { latitude: userLat, longitude: userLng },
    { latitude: (userLat + providerLat) / 2 + 0.003, longitude: (userLng + providerLng) / 2 },
    { latitude: providerLat, longitude: providerLng },
  ];

  const mapMarkers = [
    {
      id: "user",
      latitude: userLat,
      longitude: userLng,
      title: "Your location",
      color: theme.primary,
    },
    {
      id: "provider",
      latitude: providerLat,
      longitude: providerLng,
      title: activeRequest.provider?.name ?? "Provider",
      description: activeRequest.provider?.vehicleMake,
      color: theme.secondary,
    },
  ];

  const MapFallback = (
    <View style={[styles.mapBackground, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.mapContent}>
        <View style={[styles.userMarker, { backgroundColor: theme.primary }]}>
          <Feather name="navigation" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.routeLine}>
          {[...Array(8)].map((_, i) => (
            <View key={i} style={[styles.routeDot, { backgroundColor: theme.secondary }]} />
          ))}
        </View>
        <View style={[styles.providerMarker, { backgroundColor: theme.secondary }]}>
          <Feather name="truck" size={20} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />
      <View style={styles.mapPlaceholder}>
        <GoogleMapView
          latitude={(userLat + providerLat) / 2}
          longitude={(userLng + providerLng) / 2}
          markers={mapMarkers}
          showRoute={activeRequest.status === "en_route" || activeRequest.status === "accepted"}
          routeCoordinates={routeCoords}
          routeColor={theme.primary}
          fallback={MapFallback}
        />
      </View>

      <View
        style={[
          styles.detailsPanel,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom + Spacing.lg,
            ...Shadows.md,
          },
        ]}
      >
        <View style={styles.panelHandle} />

        <View style={styles.statusHeader}>
          <View style={styles.statusBadges}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[activeRequest.status] + "20" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColors[activeRequest.status] }]} />
              <ThemedText type="body" style={{ color: statusColors[activeRequest.status], fontWeight: "600" }}>
                {statusLabels[activeRequest.status]}
              </ThemedText>
            </View>
            {activeRequest.isExpress ? (
              <View style={[styles.expressBadge, { backgroundColor: theme.warning }]}>
                <Feather name="zap" size={12} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 2 }}>
                  Express
                </ThemedText>
              </View>
            ) : null}
          </View>
          {eta > 0 && (activeRequest.status === "en_route" || activeRequest.status === "accepted") ? (
            <ThemedText type="h3">
              {eta} min
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.providerInfo}>
          <View style={[styles.providerAvatar, { backgroundColor: theme.secondary }]}>
            <Feather name="truck" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.providerDetails}>
            <ThemedText type="h4">{activeRequest.provider?.name}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {activeRequest.provider?.vehicleMake} {activeRequest.provider?.vehicleModel}
            </ThemedText>
            <View style={styles.ratingRow}>
              <Feather name="star" size={14} color={theme.warning} />
              <ThemedText type="small" style={{ marginLeft: 4 }}>
                {activeRequest.provider?.rating.toFixed(1)} ({activeRequest.provider?.reviewCount} reviews)
              </ThemedText>
            </View>
          </View>
          <ThemedText type="h4" style={{ color: theme.success }}>
            ${activeRequest.totalCost?.toFixed(2) || activeRequest.estimatedCost}
          </ThemedText>
        </View>

        <View style={[styles.serviceInfo, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="tool" size={20} color={theme.textSecondary} />
          <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.sm }}>
            {serviceTypeLabels[activeRequest.serviceType]}
          </ThemedText>
          <Feather name="map-pin" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
            {activeRequest.location.address}
          </ThemedText>
        </View>

        <StatusTimeline currentStatus={activeRequest.status} />

        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleMessage}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="message-circle" size={20} color={theme.text} />
            <ThemedText type="body">Message</ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="phone" size={20} color={theme.text} />
            <ThemedText type="body">Call</ThemedText>
          </Pressable>
        </View>

        {userRole === "provider" && activeRequest.status !== "completed" ? (
          <Pressable
            onPress={handleAdvanceStatus}
            style={({ pressed }) => [
              styles.completeButton,
              { backgroundColor: theme.success, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {activeRequest.status === "in_progress" ? "Complete Service" : "Update Status"}
            </ThemedText>
          </Pressable>
        ) : null}

        {userRole === "driver" && activeRequest.status !== "completed" ? (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              { borderColor: theme.error, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText type="body" style={{ color: theme.error, fontWeight: "600" }}>
              Cancel Request
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pendingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  pendingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: "100%",
    marginTop: Spacing.xs,
  },
  cancelPendingBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  mapPlaceholder: {
    flex: 0.5,
  },
  mapBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  userMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  routeLine: {
    flexDirection: "row",
    gap: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsPanel: {
    flex: 0.5,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: -Spacing.lg,
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  statusBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  expressBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  providerDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  timeline: {
    marginBottom: Spacing.lg,
  },
  timelineStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLabel: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  timelineLine: {
    position: "absolute",
    left: 11,
    top: 24,
    width: 2,
    height: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  completeButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cancelButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    borderWidth: 1,
  },
});
