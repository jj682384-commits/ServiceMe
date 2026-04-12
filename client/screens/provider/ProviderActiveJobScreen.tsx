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
import { getApiUrl } from "@/lib/query-client";
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

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [advancing, setAdvancing] = useState(false);

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
  useEffect(() => {
    if (!activeRequest?.id) return;
    const activeStatuses: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress"];
    if (!activeStatuses.includes(activeRequest.status)) {
      if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; }
      return;
    }
    const pushLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await fetch(new URL(`/api/jobs/${activeRequest.id}/location`, getApiUrl()).toString(), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
        });
      } catch { /* silent */ }
    };
    pushLocation();
    gpsRef.current = setInterval(pushLocation, 8000);
    return () => { if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; } };
  }, [activeRequest?.id, activeRequest?.status]);

  // ── Cancel polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeRequest) { safeGoBack(); return; }
    const terminal = activeRequest.status === "completed" || activeRequest.status === "cancelled";
    if (terminal) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    const poll = async () => {
      try {
        const res = await fetch(new URL(`/api/jobs/${activeRequest.id}`, getApiUrl()).toString(), {
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const job = await res.json();
        if (job.status === "cancelled") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setActiveRequest(null);
          safeGoBack();
        }
      } catch { }
    };
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [activeRequest?.id, activeRequest?.status]);

  if (!activeRequest) return null;

  const config    = statusConfig[activeRequest.status] ?? statusConfig.accepted;
  const canAdvance = ADVANCE_STATUSES.includes(activeRequest.status);
  const customerLat = activeRequest.location.latitude  || 37.7849;
  const customerLng = activeRequest.location.longitude || -122.4094;

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

  const handleAdvance = () => {
    if (advancing) return;
    const statuses: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress", "completed"];
    const idx = statuses.indexOf(activeRequest.status);
    if (idx < 0 || idx >= statuses.length - 1) return;
    const nextStatus = statuses[idx + 1];
    setAdvancing(true);
    setActiveRequest({ ...activeRequest, status: nextStatus });
    updateHistoryEntry(activeRequest.id, { status: nextStatus });
    fetch(new URL(`/api/jobs/${activeRequest.id}/status`, getApiUrl()).toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => {});
    setAdvancing(false);
    if (nextStatus === "completed") safeGoBack();
  };

  const handleChat = () => {
    navigation.navigate("Chat", {
      conversationId: activeRequest.id,
      providerName: activeRequest.driver?.name ?? "Customer",
    });
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

          {/* Customer card */}
          {activeRequest.driver ? (
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
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
              </View>
            </View>
          ) : null}

          {/* Progress timeline */}
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
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

  timeline:     { gap: 0 },
  timelineRow:  { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  timelineLeft: { alignItems: "center", width: 20 },
  timelineDot:  { width: 16, height: 16, borderRadius: 8, marginTop: 2 },
  timelineLine: { width: 2, flex: 1, minHeight: Spacing.lg, marginTop: 2 },
});
