import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { SERVICE_FEE, EXPRESS_FEE } from "@/constants/pricing";
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

export default function ServiceDetailScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { requestHistory } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ServiceDetail">>();

  const { requestId } = route.params;
  const request = requestHistory.find((r) => r.id === requestId);

  if (!request) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.emptyState, { paddingTop: headerHeight + Spacing.xl }]}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
            Service Not Found
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const isScheduled = !!request.scheduledDate;
  const statusColor = request.status === "completed" ? theme.success :
    request.status === "cancelled" ? theme.error :
    (request.status === "pending" && isScheduled) ? theme.primary : theme.warning;
  const statusLabel = request.status === "completed" ? "Completed" :
    request.status === "cancelled" ? "Cancelled" :
    (request.status === "pending" && isScheduled) ? "Scheduled" : "In Progress";

  const receiptNumber = "SM-" + request.id.slice(0, 8).toUpperCase();

  const baseCost = request.estimatedCost || 0;
  const serviceFee = SERVICE_FEE;
  const expressFee = request.isExpress ? (request.expressFee || EXPRESS_FEE) : 0;
  const tip = request.tip || 0;
  const total = request.totalCost || (baseCost + serviceFee + expressFee + tip);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.headerSection}>
          <View style={[styles.iconCircle, { backgroundColor: theme.secondary + "15" }]}>
            <Feather
              name={serviceTypeIcons[request.serviceType] || "more-horizontal"}
              size={32}
              color={theme.secondary}
            />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.md, textAlign: "center" }}>
            {serviceTypeLabels[request.serviceType] || "Service"}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20", marginTop: Spacing.sm }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <ThemedText type="small" style={{ color: statusColor, fontWeight: "600" }}>
              {statusLabel}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Feather name="user" size={16} color={theme.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Provider</ThemedText>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                {request.provider?.name || "N/A"}
              </ThemedText>
              {request.provider?.rating ? (
                <View style={styles.ratingRow}>
                  <Feather name="star" size={12} color={theme.warning} />
                  <ThemedText type="small" style={{ color: theme.warning, marginLeft: 4 }}>
                    {request.provider.rating}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Date & Time</ThemedText>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                {formatDate(request.createdAt)}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {formatTime(request.createdAt)}
              </ThemedText>
            </View>
          </View>

          {isScheduled ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Feather name="calendar" size={16} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Scheduled For</ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "500", color: theme.primary }}>
                    {formatDate(request.scheduledDate!)}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    {formatTime(request.scheduledDate!)}
                  </ThemedText>
                </View>
              </View>
            </>
          ) : null}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Location</ThemedText>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                {request.location?.address || "Unknown location"}
              </ThemedText>
            </View>
          </View>

          {request.timeSaved ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Feather name="clock" size={16} color={theme.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Time Saved</ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "500", color: theme.success }}>
                    ~{request.timeSaved} minutes
                  </ThemedText>
                </View>
              </View>
            </>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.receiptHeader}>
            <Feather name="file-text" size={18} color={theme.primary} />
            <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
              Cost Breakdown
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.md }}>
            Receipt #{receiptNumber}
          </ThemedText>

          <View style={styles.costRow}>
            <ThemedText type="body">Base Cost</ThemedText>
            <ThemedText type="body">${baseCost.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.costRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Service Fee</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>${serviceFee.toFixed(2)}</ThemedText>
          </View>
          {request.isExpress ? (
            <View style={styles.costRow}>
              <ThemedText type="small" style={{ color: theme.warning }}>Express Fee</ThemedText>
              <ThemedText type="small" style={{ color: theme.warning }}>${expressFee.toFixed(2)}</ThemedText>
            </View>
          ) : null}
          {tip > 0 ? (
            <View style={styles.costRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Tip</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>${tip.toFixed(2)}</ThemedText>
            </View>
          ) : null}
          <View style={[styles.totalDivider, { backgroundColor: theme.border }]} />
          <View style={styles.costRow}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Total</ThemedText>
            <ThemedText type="h4" style={{ color: theme.success }}>${total.toFixed(2)}</ThemedText>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate("ReportProblem")}
          style={({ pressed }) => [
            styles.reportButton,
            { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="alert-triangle" size={18} color={theme.error} />
          <ThemedText type="body" style={{ color: theme.error, fontWeight: "600", marginLeft: Spacing.sm }}>
            Report a Problem
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
  },
  detailIcon: {
    width: 32,
    alignItems: "center",
    paddingTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: Spacing.xs,
  },
  totalDivider: {
    height: 1,
    width: "100%",
    marginVertical: Spacing.sm,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
});
