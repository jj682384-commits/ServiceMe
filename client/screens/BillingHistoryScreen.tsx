import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceRequest, ServiceType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire:        "Flat Tire",
  jump_start:       "Jump Start",
  tow:              "Tow Service",
  fuel:             "Fuel Delivery",
  lockout:          "Lockout",
  obd_diagnostic:   "OBD Diagnostic",
  mobile_inflation: "Mobile Tire Inflation",
  tire_check:       "Tire Inspection",
  tire_replacement: "Tire Replacement",
  battery_check:    "Battery Check",
};

interface BillingEntry {
  id: string;
  date: Date;
  description: string;
  amount: number;
  last4: string;
  type: "service" | "membership";
  serviceType?: ServiceType;
  status: "completed" | "pending" | "refunded";
}

const SERVICE_ICON_COLORS: Record<string, { bg: string; color: string }> = {
  flat_tire:     { bg: "#EF444420", color: "#EF4444" },
  jump_start:    { bg: "#F59E0B20", color: "#F59E0B" },
  tow:           { bg: "#3B82F620", color: "#3B82F6" },
  fuel:          { bg: "#10B98120", color: "#10B981" },
  lockout:       { bg: "#8B5CF620", color: "#8B5CF6" },
  obd_diagnostic:{ bg: "#06B6D420", color: "#06B6D4" },
  mobile_inflation:{ bg: "#F97316" + "20", color: "#F97316" },
  tire_check:    { bg: "#84CC1620", color: "#84CC16" },
  membership:    { bg: "#F59E0B20", color: "#F59E0B" },
};

export default function BillingHistoryScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { requestHistory, currentDriver, paymentMethods } = useApp();

  const sectionBg = theme.cardAnimatedBg;
  const defaultCard = paymentMethods.find((m) => m.isDefault) || paymentMethods[0];
  const defaultLast4 = defaultCard?.last4 || "----";
  const isPremium = currentDriver?.membership === "premium";

  const entries: BillingEntry[] = React.useMemo(() => {
    const serviceEntries: BillingEntry[] = requestHistory
      .filter((r) => r.status === "completed")
      .map((r) => ({
        id: r.id,
        date: r.createdAt,
        description: `${serviceTypeLabels[r.serviceType] || "Service"} — ${r.provider?.name || "Provider"}`,
        amount: r.totalCost || r.estimatedCost || 0,
        last4: defaultLast4,
        type: "service" as const,
        serviceType: r.serviceType,
        status: "completed" as const,
      }));

    if (isPremium && !currentDriver?.isOnTrial) {
      serviceEntries.unshift({
        id: "membership-current",
        date: new Date(),
        description: "Premium Membership",
        amount: currentDriver?.billingCycle === "yearly" ? 59.99 : 7.99,
        last4: defaultLast4,
        type: "membership",
        status: "completed",
      });
    }

    return serviceEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [requestHistory, isPremium, currentDriver, defaultLast4]);

  const now = new Date();
  const thisMonthTotal = entries
    .filter((e) => e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear())
    .reduce((sum, e) => sum + e.amount, 0);
  const allTimeTotal = entries.reduce((sum, e) => sum + e.amount, 0);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const renderItem = ({ item, index }: { item: BillingEntry; index: number }) => {
    const iconStyle = item.type === "membership"
      ? SERVICE_ICON_COLORS.membership
      : SERVICE_ICON_COLORS[item.serviceType as ServiceType] || { bg: theme.textSecondary + "20", color: theme.textSecondary };
    const statusColor = item.status === "completed" ? theme.success :
      item.status === "refunded" ? theme.warning : theme.textSecondary;

    return (
      <View style={[styles.entryRow, { backgroundColor: sectionBg }]}>
        <View style={[styles.iconBox, { backgroundColor: iconStyle.bg }]}>
          <Feather
            name={item.type === "membership" ? "star" : "file-text"}
            size={16}
            color={iconStyle.color}
          />
        </View>
        <View style={styles.entryContent}>
          <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
            {item.description}
          </ThemedText>
          <View style={styles.entryMeta}>
            <Feather name="calendar" size={11} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {formatDate(item.date)}
            </ThemedText>
            {item.last4 !== "----" ? (
              <>
                <ThemedText type="small" style={{ color: theme.textSecondary }}> · </ThemedText>
                <Feather name="credit-card" size={11} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 3 }}>
                  ···{item.last4}
                </ThemedText>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.entryRight}>
          <ThemedText type="body" style={{ fontWeight: "700", color: theme.text }}>
            ${item.amount.toFixed(2)}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <ThemedText style={{ fontSize: 10, fontWeight: "700", color: statusColor }}>
              {item.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={["#0A1F3A", "#0F2855", "#14124A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroBadge}>
          <Feather name="credit-card" size={26} color="#93C5FD" />
        </View>
        <ThemedText style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: Spacing.md, marginBottom: Spacing.xs }}>
          Billing History
        </ThemedText>
        <ThemedText type="small" style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", marginBottom: Spacing.lg }}>
          All your service charges and membership fees
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>This Month</ThemedText>
            <ThemedText style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>
              ${thisMonthTotal.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
          <View style={styles.statBox}>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>All Time</ThemedText>
            <ThemedText style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>
              ${allTimeTotal.toFixed(2)}
            </ThemedText>
          </View>
        </View>
      </LinearGradient>

      {entries.length > 0 ? (
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          RECENT TRANSACTIONS
        </ThemedText>
      ) : null}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
      <AnimatedBackground />
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.sm,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: theme.textSecondary + "15" }]}>
              <Feather name="file-text" size={32} color={theme.textSecondary} />
            </View>
            <ThemedText type="h4" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
              No Billing History
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Your billing transactions will appear here
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,197,253,0.15)",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  statDivider: { width: 1, height: 40 },
  sectionLabel: {
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  entryContent: { flex: 1, gap: 3 },
  entryMeta: { flexDirection: "row", alignItems: "center" },
  entryRight: { alignItems: "flex-end", gap: Spacing.xs },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
