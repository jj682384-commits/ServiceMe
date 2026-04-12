import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
} from "react-native";
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
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  notifyProviderEnRoute,
  notifyProviderArrived,
  notifyServiceComplete,
} from "@/lib/notifications";

const { height: SCREEN_H } = Dimensions.get("window");

const PEEK_H     = 260;
const EXPANDED_H = Math.round(SCREEN_H * 0.62);
const CLOSED_Y   = EXPANDED_H - PEEK_H;

const STATUS_ORDER: ServiceStatus[] = [
  "pending", "accepted", "en_route", "arrived", "in_progress", "completed", "cancelled",
];

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire:      "Flat Tire",
  jump_start:     "Jump Start",
  tow:            "Tow Service",
  fuel:           "Fuel Delivery",
  lockout:        "Lockout",
  obd_diagnostic: "OBD Diagnostic",
  other:          "Other",
};

const serviceTypeIcons: Record<ServiceType, keyof typeof Feather.glyphMap> = {
  flat_tire:      "disc",
  jump_start:     "battery-charging",
  tow:            "truck",
  fuel:           "droplet",
  lockout:        "key",
  obd_diagnostic: "cpu",
  other:          "more-horizontal",
};

const statusConfig: Record<ServiceStatus, { label: string; color: string }> = {
  pending:     { label: "Finding Provider",    color: "#F59E0B" },
  accepted:    { label: "Provider Found",      color: "#3B82F6" },
  en_route:    { label: "Provider En Route",   color: "#F59E0B" },
  arrived:     { label: "Provider Arrived",    color: "#16A34A" },
  in_progress: { label: "Service In Progress", color: "#8B5CF6" },
  completed:   { label: "Service Completed",   color: "#16A34A" },
  cancelled:   { label: "Cancelled",           color: "#DC2626" },
};

function StatusTimeline({
  currentStatus,
  theme,
}: {
  currentStatus: ServiceStatus;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const steps: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress", "completed"];
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  return (
    <View style={styles.timeline}>
      {steps.map((step, i) => {
        const stepIndex = STATUS_ORDER.indexOf(step);
        const isActive  = stepIndex <= currentIndex;
        const isCurrent = step === currentStatus;
        const cfg       = statusConfig[step];
        return (
          <View key={step} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: isActive ? cfg.color : theme.border,
                    borderColor:     isCurrent ? cfg.color : "transparent",
                    borderWidth:     isCurrent ? 2 : 0,
                  },
                ]}
              />
              {i < steps.length - 1 ? (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: stepIndex < currentIndex ? cfg.color : theme.border },
                  ]}
                />
              ) : null}
            </View>
            <ThemedText
              type="body"
              style={{
                color:      isActive ? theme.text : theme.textSecondary,
                fontWeight: isCurrent ? "700" : "400",
                paddingBottom: i < steps.length - 1 ? Spacing.lg : 0,
              }}
            >
              {cfg.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

export default function ActiveServiceScreen() {
  const insets      = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme }   = useTheme();
  const { activeRequest, setActiveRequest, updateHistoryEntry, userRole } = useApp();
  const navigation  = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused   = useIsFocused();

  const safeGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("DriverTabs");
  };

  const [eta, setEta]                   = useState(activeRequest?.eta || 8);
  const [providerLocation, setProviderLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef            = useRef<WebSocket | null>(null);
  const activeRequestRef = useRef(activeRequest);

  useEffect(() => { activeRequestRef.current = activeRequest; }, [activeRequest]);

  // ── Bottom-sheet ────────────────────────────────────────────────────────────
  const translateY  = useRef(new Animated.Value(CLOSED_Y)).current;
  const currentY    = useRef(CLOSED_Y);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => { currentY.current = value; });
    return () => translateY.removeListener(id);
  }, []);

  const snapTo = (y: number) => {
    setIsExpanded(y === 0);
    Animated.spring(translateY, {
      toValue: y,
      useNativeDriver: true,
      bounciness: 5,
      speed: 14,
    }).start();
  };

  const toggleSheet = () => snapTo(isExpanded ? CLOSED_Y : 0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => { translateY.stopAnimation(); },
      onPanResponderMove: (_, g) => {
        const next = Math.max(0, Math.min(CLOSED_Y, currentY.current + g.dy));
        translateY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const cur = currentY.current;
        const mid = CLOSED_Y / 2;
        if (g.vy < -0.4 || (g.vy >= -0.4 && g.vy <= 0.4 && cur < mid)) {
          snapTo(0);
        } else {
          snapTo(CLOSED_Y);
        }
      },
    })
  ).current;

  // ── ETA countdown ───────────────────────────────────────────────────────────
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
  }, [activeRequest?.id, isFocused]);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeRequest?.id) return;
    const apiUrl  = getApiUrl();
    const wsBase  = apiUrl.replace(/^https/, "wss").replace(/^http/, "ws").replace(/\/$/, "");
    const wsUrl   = `${wsBase}/ws`;

    const applyJobUpdate = (job: Record<string, unknown>) => {
      const current = activeRequestRef.current;
      if (!current || job.id !== current.id) return;
      if (job.status === "cancelled") { setActiveRequest(null); return; }
      const rawLoc = job.providerLocation as { lat?: number; lng?: number; latitude?: number; longitude?: number } | undefined;
      if (rawLoc) {
        const lat = rawLoc.latitude ?? rawLoc.lat;
        const lng = rawLoc.longitude ?? rawLoc.lng;
        if (lat && lng && (lat !== 0 || lng !== 0)) setProviderLocation({ latitude: lat, longitude: lng });
      }
      const serverIdx = STATUS_ORDER.indexOf(job.status as ServiceStatus);
      const localIdx  = STATUS_ORDER.indexOf(current.status);
      if (serverIdx > localIdx || job.status === "completed" || (job.provider && !current.provider)) {
        const newStatus   = job.status as ServiceStatus;
        const newProvider = (job.provider as Provider | undefined) ?? current.provider;
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
        try { const d = JSON.parse(event.data as string); if (d.type === "job_status_update") applyJobUpdate(d.job); } catch {}
      };
      ws.onerror  = () => {};
      ws.onclose  = () => { if (!cancelled) setTimeout(connect, 1000); };
    };
    connect();
    return () => { cancelled = true; wsRef.current?.close(); wsRef.current = null; };
  }, [activeRequest?.id]);

  // ── Completion navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeRequest?.status === "completed" && userRole === "driver") {
      navigation.navigate("ServiceCompletion");
    }
  }, [activeRequest?.status]);

  // ── Polling ──────────────────────────────────────────────────────────────────
  // NOTE: deps are [activeRequest?.id] only — the poll reads the LIVE status via
  // activeRequestRef so stale closures never silently stop updates on mid-job status changes.
  useEffect(() => {
    if (!activeRequest?.id) return;

    const poll = async () => {
      // Always read the latest request from the ref, never the stale closure
      const cur = activeRequestRef.current;
      if (!cur) return;
      if (cur.status === "cancelled" || cur.status === "completed") {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        return;
      }
      try {
        const url = new URL(`/api/jobs/${cur.id}`, getApiUrl());
        const res = await fetch(url.toString(), { headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } });
        if (!res.ok) return;
        const job = await res.json();
        if (job.status === "cancelled") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setActiveRequest(null); safeGoBack(); return;
        }
        if (job.providerLocation) {
          const loc = job.providerLocation as { lat?: number; lng?: number; latitude?: number; longitude?: number };
          const lat = loc.latitude ?? loc.lat;
          const lng = loc.longitude ?? loc.lng;
          if (lat && lng && (lat !== 0 || lng !== 0)) setProviderLocation({ latitude: lat, longitude: lng });
        }
        // Compare server vs current live status (not stale closure)
        const serverIdx = STATUS_ORDER.indexOf(job.status as ServiceStatus);
        const localIdx  = STATUS_ORDER.indexOf(cur.status);
        if (serverIdx > localIdx || job.status === "completed" || (job.provider && !cur.provider)) {
          const newStatus   = job.status as ServiceStatus;
          const newProvider = job.provider ? (job.provider as Provider) : cur.provider;
          setActiveRequest({ ...cur, status: newStatus, provider: newProvider, eta: job.eta ?? cur.eta });
          setEta(job.eta ?? cur.eta ?? 8);
          updateHistoryEntry(cur.id, { status: newStatus, provider: newProvider });
          if (newStatus === "completed" && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch {}
    };

    poll(); // immediate poll on mount / job change
    pollRef.current = setInterval(poll, 1000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [activeRequest?.id]);

  // ── Notifications ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeRequest) return;
    const providerName = activeRequest.provider?.name ?? "Your provider";
    const serviceLabel = serviceTypeLabels[activeRequest.serviceType] ?? "service";
    if (activeRequest.status === "en_route")  notifyProviderEnRoute(providerName, activeRequest.eta ?? 8);
    else if (activeRequest.status === "arrived")   notifyProviderArrived(providerName);
    else if (activeRequest.status === "completed") notifyServiceComplete(serviceLabel);
  }, [activeRequest?.status]);

  if (!activeRequest) return null;

  // ── Pending state ────────────────────────────────────────────────────────────
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
            try { await apiRequest("PATCH", `/api/jobs/${activeRequest.id}/cancel`); } catch {}
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
            <ThemedText type="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>{activeRequest.location.address}</ThemedText>
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
            <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>Cancel Request</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // ── Map markers ──────────────────────────────────────────────────────────────
  const userLat      = activeRequest.location.latitude  || 37.7849;
  const userLng      = activeRequest.location.longitude || -122.4094;
  const providerLat  = providerLocation?.latitude  || activeRequest.provider?.location?.latitude  || userLat + 0.01;
  const providerLng  = providerLocation?.longitude || activeRequest.provider?.location?.longitude || userLng + 0.01;

  const routeCoords = [
    { latitude: userLat, longitude: userLng },
    { latitude: (userLat + providerLat) / 2 + 0.003, longitude: (userLng + providerLng) / 2 },
    { latitude: providerLat, longitude: providerLng },
  ];

  const mapMarkers = [
    { id: "user",     latitude: userLat,     longitude: userLng,     title: "Your location",                         color: theme.primary   },
    { id: "provider", latitude: providerLat, longitude: providerLng, title: activeRequest.provider?.name ?? "Provider", color: theme.secondary },
  ];

  const MapFallback = (
    <View style={[styles.mapFallback, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.mapMarker, { backgroundColor: theme.primary }]}>
        <Feather name="navigation" size={22} color="#FFFFFF" />
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
        {activeRequest.location.address}
      </ThemedText>
    </View>
  );

  const config   = statusConfig[activeRequest.status] ?? statusConfig.accepted;
  const showEta  = eta > 0 && (activeRequest.status === "en_route" || activeRequest.status === "accepted");

  const handleMessage = () => {
    navigation.navigate("Chat", {
      conversationId: activeRequest.id,
      providerName:   activeRequest.provider?.name || "Provider",
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />

      {/* Full-screen map */}
      <View style={StyleSheet.absoluteFill}>
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

      {/* Draggable bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom:   insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle row — tap toggles, drag moves */}
        <Pressable onPress={toggleSheet} style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
          <View style={[styles.statusBanner, { backgroundColor: config.color + "20", borderColor: config.color + "40" }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <ThemedText type="body" style={{ color: config.color, fontWeight: "700", flex: 1 }}>
              {config.label}
            </ThemedText>
            {showEta ? (
              <ThemedText type="body" style={{ color: theme.text, fontWeight: "700", marginRight: Spacing.xs }}>
                {eta} min
              </ThemedText>
            ) : null}
            {activeRequest.isExpress ? (
              <View style={[styles.expressBadge, { backgroundColor: theme.warning }]}>
                <Feather name="zap" size={12} color="#FFFFFF" />
              </View>
            ) : null}
            <Feather name={isExpanded ? "chevron-down" : "chevron-up"} size={18} color={theme.textSecondary} />
          </View>
        </Pressable>

        {/* Cancel button — always visible just below the handle (mirrors provider's advance button) */}
        {activeRequest.status !== "completed" ? (
          <View style={styles.cancelBtnWrap}>
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: theme.error, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="x-circle" size={18} color={theme.error} />
              <ThemedText type="body" style={{ color: theme.error, fontWeight: "600", marginLeft: Spacing.sm }}>
                Cancel Request
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {/* Scrollable detail cards */}
        <ScrollView
          scrollEnabled={isExpanded}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingTop:        Spacing.sm,
            paddingBottom:     Spacing.xl,
            gap:               Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Provider card */}
          {activeRequest.provider ? (
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                YOUR PROVIDER
              </ThemedText>
              <View style={styles.detailRow}>
                <View style={[styles.avatar, { backgroundColor: theme.secondary }]}>
                  <Feather name="truck" size={20} color="#FFFFFF" />
                </View>
                <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                  <ThemedText type="h4">{activeRequest.provider.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {activeRequest.provider.vehicleMake} {activeRequest.provider.vehicleModel}
                  </ThemedText>
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={13} color={theme.warning} />
                    <ThemedText type="small" style={{ marginLeft: 4 }}>
                      {activeRequest.provider.rating.toFixed(1)} ({activeRequest.provider.reviewCount} reviews)
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="h4" style={{ color: theme.success }}>
                  ${activeRequest.totalCost?.toFixed(2) || activeRequest.estimatedCost}
                </ThemedText>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleMessage}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="message-circle" size={18} color={theme.primary} />
                  <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs, fontWeight: "600" }}>
                    Message
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="phone" size={18} color={theme.text} />
                  <ThemedText type="small" style={{ color: theme.text, marginLeft: Spacing.xs }}>Call</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Service info card */}
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: theme.primary + "15" }]}>
                <Feather name={serviceTypeIcons[activeRequest.serviceType]} size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="h4">{serviceTypeLabels[activeRequest.serviceType]}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Service Request</ThemedText>
              </View>
              <ThemedText type="h4" style={{ color: theme.success }}>${activeRequest.estimatedCost}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.detailRow}>
              <Feather name="map-pin" size={16} color={theme.primary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
                {activeRequest.location.address}
              </ThemedText>
            </View>
            {activeRequest.notes ? (
              <View style={[styles.detailRow, { marginTop: Spacing.sm }]}>
                <Feather name="file-text" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={{ marginLeft: Spacing.sm, flex: 1, color: theme.textSecondary }}>
                  {activeRequest.notes}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {/* Progress timeline */}
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              SERVICE PROGRESS
            </ThemedText>
            <StatusTimeline currentStatus={activeRequest.status} theme={theme} />
          </View>

          {activeRequest.status === "completed" ? (
            <View style={[styles.completedBox, { backgroundColor: "#16A34A20", borderColor: "#16A34A40" }]}>
              <Feather name="check-circle" size={24} color="#16A34A" />
              <ThemedText type="h4" style={{ color: "#16A34A", marginTop: Spacing.sm }}>
                Service Completed
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
                Redirecting to your receipt...
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  mapMarker:   { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },

  pendingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  pendingIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  pendingCard: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, width: "100%", marginTop: Spacing.xs,
  },
  cancelPendingBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, marginTop: Spacing.lg,
  },

  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    height: EXPANDED_H,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 16,
  },

  handleArea: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  statusBanner: {
    flexDirection: "row", alignItems: "center",
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.sm,
  },
  statusDot:   { width: 10, height: 10, borderRadius: 5 },
  expressBadge: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#F59E0B",
  },

  cancelBtnWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.xs,
  },

  card:       { borderRadius: BorderRadius.md, padding: Spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconBox:    { width: 48, height: 48, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
  divider:    { height: 1, marginVertical: Spacing.md },
  detailRow:  { flexDirection: "row", alignItems: "center" },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  ratingRow:  { flexDirection: "row", alignItems: "center", marginTop: 2 },

  actionRow:  { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: Spacing.sm, borderRadius: BorderRadius.sm,
  },

  completedBox: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.xl, alignItems: "center" },

  timeline:     { gap: 0 },
  timelineRow:  { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  timelineLeft: { alignItems: "center", width: 20 },
  timelineDot:  { width: 16, height: 16, borderRadius: 8, marginTop: 2 },
  timelineLine: { width: 2, flex: 1, minHeight: Spacing.lg, marginTop: 2 },
});
