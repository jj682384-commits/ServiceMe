import React, { useMemo, useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, ServiceRequest } from "@/context/AppContext";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const PLATFORM_FEE = 0.15;

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
  other: "tool",
};

type PayoutStatus = "paid" | "processing" | "pending";

interface EarningEntry {
  id: string;
  request: ServiceRequest;
  gross: number;
  fee: number;
  net: number;
  tip: number;
  status: PayoutStatus;
  payoutDate?: Date;
}

function getPayoutStatus(job: ServiceRequest, index: number): { status: PayoutStatus; payoutDate?: Date } {
  if (index > 1) return { status: "paid", payoutDate: new Date(job.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) };
  if (index === 1) return { status: "processing" };
  return { status: "pending" };
}

const statusConfig: Record<PayoutStatus, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  paid: { label: "Paid", color: "#10B981", icon: "check-circle" },
  processing: { label: "Processing", color: "#F59E0B", icon: "clock" },
  pending: { label: "Pending", color: "#6B7280", icon: "circle" },
};

function EarningCard({ entry }: { entry: EarningEntry }) {
  const { theme } = useTheme();
  const status = statusConfig[entry.status];
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handlePress = () => {
    Alert.alert(
      `${serviceTypeLabels[entry.request.serviceType]} — Earnings Detail`,
      [
        `Driver: ${entry.request.driver?.name ?? "Unknown"}`,
        `Date: ${formatDate(entry.request.createdAt)}`,
        `Service fee: $${entry.gross.toFixed(2)}`,
        `Tip: $${entry.tip.toFixed(2)}`,
        `Platform fee (15%): -$${entry.fee.toFixed(2)}`,
        `Net payout: $${entry.net.toFixed(2)}`,
        `Status: ${status.label}`,
        entry.payoutDate ? `Paid on: ${formatDate(entry.payoutDate)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      [{ text: "OK" }]
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: theme.secondary + "15" }]}>
        <Feather name={serviceTypeIcons[entry.request.serviceType]} size={20} color={theme.secondary} />
      </View>

      <View style={styles.cardContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
          {serviceTypeLabels[entry.request.serviceType]}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {entry.request.driver?.name ?? "Driver"} · {formatDate(entry.request.createdAt)}
        </ThemedText>
        <View style={styles.feeRow}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            ${entry.gross.toFixed(2)} gross
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.error }}>
            {"  "}−${entry.fee.toFixed(2)} fee
          </ThemedText>
          {entry.tip > 0 ? (
            <ThemedText type="small" style={{ color: theme.success }}>
              {"  "}+${entry.tip.toFixed(2)} tip
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.cardRight}>
        <ThemedText type="h4" style={{ color: theme.success }}>
          ${entry.net.toFixed(2)}
        </ThemedText>
        <View style={styles.statusBadge}>
          <Feather name={status.icon} size={10} color={status.color} />
          <ThemedText type="small" style={{ color: status.color, fontWeight: "600", fontSize: 10, marginLeft: 3 }}>
            {status.label}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProviderEarningsHistoryScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { requestHistory, currentProvider, updateHistoryEntry } = useApp();

  // Map of jobId → tip amount fetched from server (so driver's tip shows correctly)
  const [serverTips, setServerTips] = useState<Record<string, number>>({});

  const completedJobs = useMemo(
    () =>
      requestHistory
        .filter((r) => r.provider?.id === currentProvider?.id && r.status === "completed")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [requestHistory, currentProvider],
  );

  useEffect(() => {
    if (completedJobs.length === 0) return;
    const fetchTips = async () => {
      const results: Record<string, number> = {};
      await Promise.all(
        completedJobs.map(async (r) => {
          try {
            const url = new URL(`/api/jobs/${r.id}`, getApiUrl());
            const res = await fetch(url.toString(), { headers: { "Cache-Control": "no-cache" } });
            if (!res.ok) return;
            const job = await res.json();
            if (typeof job.tip === "number") {
              results[r.id] = job.tip;
              // Write tip back into local history so dashboard totals stay accurate
              if (r.tip !== job.tip) {
                updateHistoryEntry(r.id, { tip: job.tip, totalCost: job.totalCost });
              }
            }
          } catch {
          }
        }),
      );
      setServerTips((prev) => ({ ...prev, ...results }));
    };
    fetchTips();
  }, [completedJobs.length]);

  const entries = useMemo<EarningEntry[]>(() => {
    return completedJobs.map((r, i) => {
      const gross = r.estimatedCost || 0;
      // Prefer server-fetched tip; fall back to local calculation
      const tip = serverTips[r.id] !== undefined ? serverTips[r.id] : Math.max(0, (r.tip || 0));
      const fee = gross * PLATFORM_FEE;
      const net = gross - fee + tip;
      const { status, payoutDate } = getPayoutStatus(r, i);
      return { id: r.id, request: r, gross, fee, net, tip, status, payoutDate };
    });
  }, [completedJobs, serverTips]);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const thisWeekNet = entries
    .filter((e) => e.request.createdAt >= startOfWeek)
    .reduce((s, e) => s + e.net, 0);

  const thisMonthNet = entries
    .filter(
      (e) =>
        e.request.createdAt.getMonth() === now.getMonth() &&
        e.request.createdAt.getFullYear() === now.getFullYear()
    )
    .reduce((s, e) => s + e.net, 0);

  const allTimeNet = entries.reduce((s, e) => s + e.net, 0);
  const pendingNet = entries
    .filter((e) => e.status === "pending" || e.status === "processing")
    .reduce((s, e) => s + e.net, 0);

  const nextPayoutDate = new Date();
  nextPayoutDate.setDate(nextPayoutDate.getDate() + ((5 - nextPayoutDate.getDay() + 7) % 7 || 7));

  const renderHeader = () => (
    <View>
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="trending-up" size={16} color={theme.secondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 6 }}>
            This Week
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: 2 }}>
            ${thisWeekNet.toFixed(2)}
          </ThemedText>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="calendar" size={16} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 6 }}>
            This Month
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: 2 }}>
            ${thisMonthNet.toFixed(2)}
          </ThemedText>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="award" size={16} color={theme.warning} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 6 }}>
            All Time
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: 2 }}>
            ${allTimeNet.toFixed(2)}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.payoutBanner, { backgroundColor: theme.success + "12", borderColor: theme.success + "30" }]}>
        <View style={styles.payoutBannerLeft}>
          <View style={[styles.payoutIcon, { backgroundColor: theme.success + "20" }]}>
            <Feather name="dollar-sign" size={18} color={theme.success} />
          </View>
          <View>
            <ThemedText type="body" style={{ fontWeight: "600", color: theme.success }}>
              Next Payout
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {nextPayoutDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="h4" style={{ color: theme.success }}>
          ${pendingNet.toFixed(2)}
        </ThemedText>
      </View>

      {entries.length > 0 ? (
        <View style={styles.feeNotice}>
          <Feather name="info" size={12} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            15% platform fee deducted. Tips are fee-free — you keep 100%.
          </ThemedText>
        </View>
      ) : null}

      {entries.length > 0 ? (
        <ThemedText type="small" style={[styles.listHeader, { color: theme.textSecondary }]}>
          COMPLETED JOBS
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EarningCard entry={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.sm,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="dollar-sign" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
              No Earnings Yet
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              Accept and complete jobs to start earning. Your earnings history will appear here.
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  payoutBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  payoutBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  payoutIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  feeNotice: {
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  listHeader: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  feeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
});
