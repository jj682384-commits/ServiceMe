import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceRequest, ServiceType, BACKGROUND_SCHEMES } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
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


function StatCard({
  icon,
  value,
  label,
  color,
  cardBg,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  color: string;
  cardBg: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: cardBg }]}>
      <Feather name={icon} size={20} color={color} />
      <ThemedText type="h4" style={{ marginTop: Spacing.xs }}>
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
        {label}
      </ThemedText>
    </View>
  );
}

function HistoryItem({ item, onPress, cardBg }: { item: ServiceRequest; onPress: () => void; cardBg: string }) {
  const { theme } = useTheme();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isScheduled = !!item.scheduledDate;
  const statusColor = item.status === "completed" ? theme.success :
    item.status === "cancelled" ? theme.error :
    (item.status === "pending" && isScheduled) ? theme.primary : theme.warning;

  const statusLabel = item.status === "completed" ? "Completed" :
    item.status === "cancelled" ? "Cancelled" :
    (item.status === "pending" && isScheduled) ? "Scheduled" : "In Progress";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.historyItem,
        { backgroundColor: cardBg, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.serviceIcon, { backgroundColor: theme.secondary + "15" }]}>
        <Feather
          name={serviceTypeIcons[item.serviceType] || "more-horizontal"}
          size={24}
          color={theme.secondary}
        />
      </View>
      <View style={styles.historyContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {serviceTypeLabels[item.serviceType] || "Service"}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
          {item.provider?.name}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
          {item.location?.address || "Unknown location"}
        </ThemedText>
        <View style={styles.historyMeta}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatDate(item.createdAt)}
          </ThemedText>
          {isScheduled ? (
            <>
              <View style={[styles.metaDot, { backgroundColor: theme.textSecondary }]} />
              <Feather name="calendar" size={10} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, marginLeft: 2 }}>
                {formatDate(item.scheduledDate!)}
              </ThemedText>
            </>
          ) : item.timeSaved ? (
            <>
              <View style={[styles.metaDot, { backgroundColor: theme.textSecondary }]} />
              <Feather name="clock" size={10} color={theme.success} />
              <ThemedText type="small" style={{ color: theme.success, marginLeft: 2 }}>
                Saved ~{item.timeSaved} min
              </ThemedText>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.historyRight}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          ${item.estimatedCost}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <ThemedText type="small" style={{ color: statusColor, fontWeight: "500", fontSize: 10 }}>
            {statusLabel}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function DriverHistoryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { requestHistory, backgroundPreferences } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAnimated = backgroundPreferences.mode === "animated";
  const scheme = BACKGROUND_SCHEMES[backgroundPreferences.colorScheme];

  const displayHistory = requestHistory;

  const totalServices = displayHistory.length;
  const totalSpent = displayHistory.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
  const totalTimeSaved = displayHistory.reduce((sum, r) => sum + (r.timeSaved || 0), 0);

  const cardBg = isAnimated ? theme.cardAnimatedBg : theme.backgroundSecondary;

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>History</ThemedText>
      <View style={styles.statsRow}>
        <StatCard
          icon="tool"
          value={`${totalServices}`}
          label="Total Services"
          color={theme.primary}
          cardBg={cardBg}
        />
        <StatCard
          icon="dollar-sign"
          value={`$${totalSpent}`}
          label="Total Spent"
          color={theme.secondary}
          cardBg={cardBg}
        />
        <StatCard
          icon="clock"
          value={`${totalTimeSaved}m`}
          label="Time Saved"
          color={theme.success}
          cardBg={cardBg}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isAnimated ? (isDark ? scheme.bgColor : scheme.bgColorLight) : theme.backgroundRoot }]}>
      {isAnimated ? <AnimatedBackground customColors={isDark ? scheme.colors : scheme.colorsLight} opacityBoost={isDark ? scheme.opacityBoost : scheme.opacityBoostLight} flashColor={isDark ? scheme.flashColor : scheme.flashColorLight} isDark={isDark} /> : null}
      <FlatList
        data={displayHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryItem
            item={item}
            onPress={() => navigation.navigate("ServiceDetail", { requestId: item.id })}
            cardBg={isAnimated ? theme.cardAnimatedBg : theme.backgroundDefault}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, Spacing["2xl"]) + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.md,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="clock" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
              No Service History
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              Your past service requests will appear here
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: Spacing.xs,
  },
  historyRight: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
});
