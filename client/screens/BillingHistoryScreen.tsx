import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceRequest, ServiceType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
};

interface BillingEntry {
  id: string;
  date: Date;
  description: string;
  amount: number;
  last4: string;
  type: "service" | "membership";
  status: "completed" | "pending" | "refunded";
}

export default function BillingHistoryScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { requestHistory, currentDriver, paymentMethods } = useApp();

  const defaultCard = paymentMethods.find((m) => m.isDefault) || paymentMethods[0];
  const defaultLast4 = defaultCard?.last4 || "----";
  const isPremium = currentDriver?.membership === "premium";

  const entries: BillingEntry[] = React.useMemo(() => {
    const serviceEntries: BillingEntry[] = requestHistory
      .filter((r) => r.status === "completed")
      .map((r) => ({
        id: r.id,
        date: r.createdAt,
        description: `${serviceTypeLabels[r.serviceType] || "Service"} - ${r.provider?.name || "Provider"}`,
        amount: r.totalCost || r.estimatedCost || 0,
        last4: defaultLast4,
        type: "service" as const,
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

  const renderItem = ({ item }: { item: BillingEntry }) => {
    const statusColor = item.status === "completed" ? theme.success :
      item.status === "refunded" ? theme.warning : theme.textSecondary;

    return (
      <View style={[styles.entryItem, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.entryIcon, { backgroundColor: (item.type === "membership" ? theme.primary : theme.secondary) + "15" }]}>
          <Feather
            name={item.type === "membership" ? "star" : "file-text"}
            size={20}
            color={item.type === "membership" ? theme.primary : theme.secondary}
          />
        </View>
        <View style={styles.entryContent}>
          <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
            {item.description}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatDate(item.date)}
          </ThemedText>
          <View style={styles.entryMeta}>
            <Feather name="credit-card" size={10} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              Ending in {item.last4}
            </ThemedText>
          </View>
        </View>
        <View style={styles.entryRight}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            ${item.amount.toFixed(2)}
          </ThemedText>
          <Feather name="check-circle" size={14} color={statusColor} />
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.summarySection}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            This Month
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>
            ${thisMonthTotal.toFixed(2)}
          </ThemedText>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            All Time
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>
            ${allTimeTotal.toFixed(2)}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.md,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="file-text" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
              No Billing History
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              Your billing transactions will appear here
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
  summarySection: {
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  entryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  entryContent: {
    flex: 1,
    gap: 2,
  },
  entryMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  entryRight: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
});
