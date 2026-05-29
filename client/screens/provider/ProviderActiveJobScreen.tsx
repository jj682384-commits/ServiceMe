import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { GoogleMapView } from "@/components/GoogleMapView";
import { ScreenDecoration } from "@/components/ScreenDecoration";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceStatus, ServiceType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { height: SCREEN_H } = Dimensions.get("window");

// How much of the panel is visible in each snap state
const PEEK_H   = 260;  // peeked: handle + status + advance button all visible
const EXPANDED_H = Math.round(SCREEN_H * 0.62); // expanded: full detail cards

// The panel DOM height is always EXPANDED_H.
// translateY 0 = expanded, CLOSED_Y = peeked (shifted down to hide top content).
const CLOSED_Y = EXPANDED_H - PEEK_H;

const STATUS_ORDER: ServiceStatus[] = [
  "pending", "accepted", "en_route", "arrived", "in_progress", "completed", "cancelled",
];

const serviceTypeLabels: Record<string, string> = {
  flat_tire:        "Flat Tire",
  jump_start:       "Jump Start",
  tow:              "Tow Service",
  fuel:             "Fuel Delivery",
  lockout:          "Lockout",
  obd_diagnostic:   "OBD Diagnostic",
  ev_charging:      "EV Mobile Charging",
  ev_towing:        "EV-Safe Towing",
  tire_replacement: "Tire Replacement",
  mobile_inflation: "Mobile Tire Inflation",
  tire_check:       "Tire Inspection",
  battery_check:    "Battery Check",
  other:            "Other",
};

const serviceTypeIcons: Record<string, keyof typeof Feather.glyphMap> = {
  flat_tire:        "disc",
  jump_start:       "battery-charging",
  tow:              "truck",
  fuel:             "droplet",
  lockout:          "key",
  obd_diagnostic:   "cpu",
  ev_charging:      "zap",
  ev_towing:        "truck",
  tire_replacement: "disc",
  mobile_inflation: "wind",
  tire_check:       "search",
  battery_check:    "battery-charging",
  other:            "more-horizontal",
};

const statusConfig: Record<ServiceStatus, { label: string; color: string; nextLabel?: string }> = {
  pending:     { label: "Pending",      color: "#F59E0B" },
  accepted:    { label: "Job Accepted", color: "#3B82F6", nextLabel: "Mark En Route" },
  en_route:    { label: "En Route",     color: "#F59E0B", nextLabel: "Mark Arrived" },
  arrived:     { label: "Arrived",      color: "#16A34A", nextLabel: "Start Service" },
  in_progress: { label: "In Progress",  color: "#8B5CF6", nextLabel: "Complete Service" },
  completed:   { label: "Completed",    color: "#16A34A" },
  cancelled:   { label: "Cancelled",    color: "#DC2626" },
};

const ADVANCE_STATUSES: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress"];

export default function ProviderActiveJobScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { activeRequest, setActiveRequest, updateHistoryEntry } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const safeGoBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("ProviderTabs");
  };

  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRequestRef = useRef(activeRequest);
  const gpsPermittedRef  = useRef<boolean | null>(null);
  const gpsInFlightRef   = useRef(false);
  const [advancing, setAdvancing] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [driverStars, setDriverStars] = useState(0);
  const completedJobIdRef = useRef<string | null>(null);

  useEffect(() => { activeRequestRef.current = activeRequest; }, [activeRequest]);

  // ── Bottom-sheet state ──────────────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(CLOSED_Y)).current;
  const currentY   = useRef(CLOSED_Y); // mirrors translateY for gesture math
  const [isExpanded, setIsExpanded] = useState(false);

  // Listen to animation updates so currentY stays accurate
  useEffect(() => {
    const id = translateY.addListener(({ value }) => { currentY.current = value; });
    return () => translateY.removeListener(id);
  }, []);

  const snapTo = (y: number) => {
    const expanding = y === 0;
    setIsExpanded(expanding);
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
        // Flick velocity wins, otherwise go to nearest snap
        if (g.vy < -0.4 || (g.vy >= -0.4 && g.vy <= 0.4 && cur < mid)) {
          snapTo(0);
        } else {
          snapTo(CLOSED_Y);
        }
      },
    })
  ).current;

  // ── GPS push ────────────────────────────────────────────────────────────────
  // Deps: [activeRequest?.id] only — status is read from ref inside the callback so this
  // effect never tears down mid-status-advance (which was blocking the JS thread on device).
  useEffect(() => {
    if (!activeRequest?.id) return;
    const GPS_ACTIVE: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress"];

    const pushLocation = async () => {
      const cur = activeRequestRef.current;
      if (!cur || !GPS_ACTIVE.includes(cur.status)) return;
      if (gpsInFlightRef.current) return; // don't stack concurrent location calls
      gpsInFlightRef.current = true;
      try {
        // Cache permission — only call the native API once per job session
        if (gpsPermittedRef.current === null) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          gpsPermittedRef.current = status === "granted";
        }
        if (!gpsPermittedRef.current) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await apiRequest("PATCH", `/api/jobs/${cur.id}/location`, {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch { /* silent */ }
      finally { gpsInFlightRef.current = false; }
    };

    // Start interval — no immediate call here; first push fires after 12 s to avoid
    // competing with the status PATCH that triggered this component mount/update.
    gpsRef.current = setInterval(pushLocation, 12000);
    return () => { if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; } };
  }, [activeRequest?.id]);

  // ── Cancel / completion polling ──────────────────────────────────────────────
  // Watches for driver cancellation. When activeRequest becomes null (id disappears),
  // this effect re-runs and safeGoBack() handles navigation — so we only call
  // setActiveRequest(null) in the poll, never safeGoBack(), to avoid double-navigation.
  useEffect(() => {
    if (!activeRequest?.id) { safeGoBack(); return; }
    const poll = async () => {
      const cur = activeRequestRef.current;
      if (!cur) return;
      if (cur.status === "completed" || cur.status === "cancelled") {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        return;
      }
      try {
        const res = await fetch(new URL(`/api/jobs/${cur.id}`, getApiUrl()).toString(), {
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const job = await res.json();
        if (job.status === "cancelled") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setActiveRequest(null);
          // safeGoBack() intentionally omitted — the effect re-runs when activeRequest
          // becomes null and handles navigation via the guard at the top of this effect.
        }
      } catch { }
    };
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [activeRequest?.id]);

  if (!activeRequest) return null;

  const config    = statusConfig[activeRequest.status] ?? statusConfig.accepted;
  const canAdvance = ADVANCE_STATUSES.includes(activeRequest.status);
  const customerLat = activeRequest.location.latitude  || 0;
  const customerLng = activeRequest.location.longitude || 0;

  const mapMarkers = [{
    id: "user",
    latitude:  customerLat,
    longitude: customerLng,
    title: activeRequest.driver?.name ?? "Customer",
    color: theme.primary,
  }];

  const MapFallback = (
    <View style={[styles.mapFallback, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.customerMarker, { backgroundColor: theme.primary }]}>
        <Feather name="map-pin" size={22} color="#FFFFFF" />
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
        {activeRequest.location.address}
      </ThemedText>
    </View>
  );

  const handleAdvance = async () => {
    if (advancing) return;
    const statuses: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress", "completed"];
    const idx = statuses.indexOf(activeRequest.status);
    if (idx < 0 || idx >= statuses.length - 1) return;
    const nextStatus = statuses[idx + 1];
    const prevStatus = activeRequest.status;

    setAdvancing(true);
    // Optimistic update for immediate UI feedback
    setActiveRequest({ ...activeRequest, status: nextStatus });
    updateHistoryEntry(activeRequest.id, { status: nextStatus });

    try {
      await apiRequest("PATCH", `/api/jobs/${activeRequest.id}/status`, { status: nextStatus });
      if (nextStatus === "completed") {
        completedJobIdRef.current = activeRequest.id;
        setShowRatingModal(true);
      }
    } catch {
      // Revert on failure so status stays in sync with server
      setActiveRequest({ ...activeRequest, status: prevStatus });
      updateHistoryEntry(activeRequest.id, { status: prevStatus });
      Alert.alert("Connection Error", "Could not update job status. Please check your connection and try again.");
    } finally {
      setAdvancing(false);
    }
  };

  const handleChat = () => {
    navigation.navigate("Chat", {
      conversationId: activeRequest.id,
      providerName: activeRequest.driver?.name ?? "Customer",
    });
  };

  const handleBlockDriver = () => {
    const driverEmail = (activeRequest.driver as any)?.email as string | undefined;
    const driverName = activeRequest.driver?.name ?? "this customer";
    if (!driverEmail) {
      Alert.alert("Cannot Block", "Customer contact information is not available.");
      return;
    }
    Alert.alert(
      "Block Customer",
      `Block ${driverName}? They will no longer be able to request your services.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest("POST", "/api/blocks", { blockedEmail: driverEmail });
              Alert.alert("Blocked", `${driverName} has been blocked.`);
            } catch {
              Alert.alert("Error", "Could not block customer. Please try again.");
            }
          },
        },
      ]
    );
  };

  const timeAgo = () => {
    const d = activeRequest.createdAt;
    const diff = Math.floor((Date.now() - (d instanceof Date ? d.getTime() : new Date(d).getTime())) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />

      {/* Map fills entire screen */}
      <View style={StyleSheet.absoluteFill}>
        <GoogleMapView
          latitude={customerLat}
          longitude={customerLng}
          markers={mapMarkers}
          fallback={MapFallback}
          mapStyle="standard"
        />
      </View>

      {/* Floating back button — rendered above the map */}
      <Pressable
        onPress={safeGoBack}
        style={[styles.floatingBack, { top: insets.top + Spacing.sm, backgroundColor: theme.backgroundDefault }]}
      >
        <Feather name="arrow-left" size={20} color={theme.text} />
      </Pressable>

      {/* ── Draggable bottom sheet ─────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Drag handle row — tap toggles, drag moves */}
        <Pressable onPress={toggleSheet} style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
          <View style={[styles.statusBanner, { backgroundColor: config.color + "20", borderColor: config.color + "40" }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <ThemedText type="body" style={{ color: config.color, fontWeight: "700", flex: 1 }}>
              {config.label}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.xs }}>
              {timeAgo()}
            </ThemedText>
            <Feather name={isExpanded ? "chevron-down" : "chevron-up"} size={18} color={theme.textSecondary} />
          </View>
        </Pressable>

        {/* Advance button — always visible just below the handle */}
        {canAdvance ? (
          <View style={styles.advanceBtnWrap}>
            <Pressable
              onPress={handleAdvance}
              disabled={advancing}
              style={({ pressed }) => [
                styles.advanceBtn,
                { backgroundColor: advancing ? theme.textSecondary : theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {advancing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="chevrons-right" size={20} color="#FFFFFF" />
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
                    {config.nextLabel}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* Scrollable detail cards — only scrolls when expanded */}
        <ScrollView
          scrollEnabled={isExpanded}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.sm,
            paddingBottom: Spacing.xl,
            gap: Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Service info card */}
          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: theme.primary + "15" }]}>
                <Feather name={serviceTypeIcons[activeRequest.serviceType] ?? "more-horizontal"} size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="h4">{serviceTypeLabels[activeRequest.serviceType] ?? "Service"}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Service Request</ThemedText>
              </View>
              <ThemedText type="h4" style={{ color: theme.success }}>
                ~${(Math.round((activeRequest.totalCost ?? activeRequest.estimatedCost) * (activeRequest.isExpress ? 0.90 : 0.85) * 100) / 100).toFixed(2)} payout
              </ThemedText>
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

          {/* Customer card */}
          {activeRequest.driver ? (
            <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                CUSTOMER
              </ThemedText>
              <View style={styles.detailRow}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Feather name="user" size={18} color="#FFFFFF" />
                </View>
                <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                  <ThemedText type="h4">{activeRequest.driver.name}</ThemedText>
                </View>
                <Pressable
                  onPress={handleChat}
                  style={[styles.chatBtn, { backgroundColor: theme.primary + "15" }]}
                >
                  <Feather name="message-circle" size={20} color={theme.primary} />
                </Pressable>
                <Pressable
                  onPress={handleBlockDriver}
                  style={[styles.chatBtn, { backgroundColor: theme.error + "15", marginLeft: 8 }]}
                >
                  <Feather name="slash" size={18} color={theme.error} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Progress timeline */}
          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              JOB PROGRESS
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
                Great work! Payment will be processed automatically.
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>

      {/* ── Provider rates driver modal ──────────────────────────────────── */}
      {showRatingModal ? (
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="check-circle" size={36} color="#16A34A" style={{ alignSelf: "center", marginBottom: Spacing.md }} />
            <ThemedText type="h3" style={{ textAlign: "center", marginBottom: Spacing.xs }}>
              Job Complete
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.xl }}>
              How was {activeRequest?.driver?.name ?? "this driver"}?
            </ThemedText>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setDriverStars(star)} style={styles.starBtn}>
                  <Feather
                    name="star"
                    size={38}
                    color={star <= driverStars ? "#F59E0B" : theme.border}
                    style={{ opacity: star <= driverStars ? 1 : 0.35 }}
                  />
                </Pressable>
              ))}
            </View>
            {driverStars > 0 ? (
              <ThemedText type="small" style={{ color: theme.primary, textAlign: "center", marginTop: Spacing.sm }}>
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][driverStars]}
              </ThemedText>
            ) : null}
            <Pressable
              onPress={async () => {
                const jobId = completedJobIdRef.current;
                if (jobId && driverStars > 0) {
                  apiRequest("PATCH", `/api/jobs/${jobId}/provider-rating`, { rating: driverStars }).catch(() => {});
                }
                setShowRatingModal(false);
                safeGoBack();
              }}
              disabled={driverStars === 0}
              style={({ pressed }) => [
                styles.submitRatingBtn,
                {
                  backgroundColor: driverStars > 0 ? theme.primary : theme.border,
                  opacity: pressed ? 0.85 : 1,
                  marginTop: Spacing.xl,
                },
              ]}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {driverStars > 0 ? "Submit Rating" : "Select a rating"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => { setShowRatingModal(false); safeGoBack(); }}
              style={styles.skipRatingBtn}
            >
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Skip</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

// ── Status timeline ────────────────────────────────────────────────────────────
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
                    borderColor: isCurrent ? cfg.color : "transparent",
                    borderWidth: isCurrent ? 2 : 0,
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
                color: isActive ? theme.textPrimary : theme.textSecondary,
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

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1 },
  mapFallback:    { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  customerMarker: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },

  floatingBack: {
    position: "absolute",
    left: Spacing.lg,
    zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 6,
  },

  sheet: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    height: EXPANDED_H,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 16,
  },

  // Handle area — big enough to be an easy drag/tap target
  handleArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  advanceBtnWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },

  card:       { borderRadius: BorderRadius.md, padding: Spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconBox:    { width: 48, height: 48, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
  divider:    { height: 1, marginVertical: Spacing.md },
  detailRow:  { flexDirection: "row", alignItems: "center" },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  chatBtn:    { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  completedBox: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.xl, alignItems: "center" },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: Spacing.xl,
  },
  modalCard: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: Spacing.sm, marginTop: Spacing.sm },
  starBtn: { padding: Spacing.xs },
  submitRatingBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  skipRatingBtn: { alignItems: "center", paddingTop: Spacing.md },

  timeline:     { gap: 0 },
  timelineRow:  { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  timelineLeft: { alignItems: "center", width: 20 },
  timelineDot:  { width: 16, height: 16, borderRadius: 8, marginTop: 2 },
  timelineLine: { width: 2, flex: 1, minHeight: Spacing.lg, marginTop: 2 },
});
