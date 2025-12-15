import React from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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
  other: "Other",
};

const serviceTypeIcons: Record<ServiceType, keyof typeof Feather.glyphMap> = {
  flat_tire: "disc",
  jump_start: "battery-charging",
  tow: "truck",
  fuel: "droplet",
  lockout: "key",
  other: "more-horizontal",
};

const mockHistory: ServiceRequest[] = [
  {
    id: "h1",
    serviceType: "flat_tire",
    location: { address: "123 Main St, San Francisco, CA", latitude: 37.78, longitude: -122.41 },
    notes: "",
    status: "completed",
    estimatedCost: 85,
    createdAt: new Date(Date.now() - 86400000 * 2),
    provider: {
      id: "p1",
      name: "Mike's Towing",
      phone: "+1 555-0101",
      email: "mike@towing.com",
      rating: 4.8,
      reviewCount: 156,
      vehicleType: "tow_truck",
      vehicleMake: "Ford",
      vehicleModel: "F-550",
      licensePlate: "TOW-123",
      servicesOffered: ["tow", "flat_tire", "jump_start", "lockout"],
      isAvailable: true,
    },
  },
  {
    id: "h2",
    serviceType: "jump_start",
    location: { address: "456 Oak Ave, Oakland, CA", latitude: 37.80, longitude: -122.27 },
    notes: "",
    status: "completed",
    estimatedCost: 55,
    createdAt: new Date(Date.now() - 86400000 * 7),
    provider: {
      id: "p2",
      name: "Quick Fix Auto",
      phone: "+1 555-0102",
      email: "quick@fixauto.com",
      rating: 4.6,
      reviewCount: 89,
      vehicleType: "service_van",
      vehicleMake: "Mercedes",
      vehicleModel: "Sprinter",
      licensePlate: "FIX-456",
      servicesOffered: ["flat_tire", "jump_start", "fuel", "lockout"],
      isAvailable: true,
    },
  },
  {
    id: "h3",
    serviceType: "fuel",
    location: { address: "789 Pine Blvd, Berkeley, CA", latitude: 37.87, longitude: -122.26 },
    notes: "Out of gas on highway",
    status: "completed",
    estimatedCost: 45,
    createdAt: new Date(Date.now() - 86400000 * 14),
    provider: {
      id: "p3",
      name: "Road Rescue",
      phone: "+1 555-0103",
      email: "help@roadrescue.com",
      rating: 4.9,
      reviewCount: 234,
      vehicleType: "pickup",
      vehicleMake: "Chevrolet",
      vehicleModel: "Silverado",
      licensePlate: "RES-789",
      servicesOffered: ["flat_tire", "jump_start", "fuel", "other"],
      isAvailable: true,
    },
  },
];

function HistoryItem({ item }: { item: ServiceRequest }) {
  const { theme } = useTheme();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.historyItem,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.serviceIcon, { backgroundColor: theme.secondary + "15" }]}>
        <Feather
          name={serviceTypeIcons[item.serviceType]}
          size={24}
          color={theme.secondary}
        />
      </View>
      <View style={styles.historyContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {serviceTypeLabels[item.serviceType]}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
          {item.provider?.name}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {formatDate(item.createdAt)}
        </ThemedText>
      </View>
      <View style={styles.historyRight}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          ${item.estimatedCost}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: theme.success + "20" }]}>
          <ThemedText type="small" style={{ color: theme.success, fontWeight: "500" }}>
            Completed
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export default function DriverHistoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { requestHistory } = useApp();

  const displayHistory = requestHistory.length > 0 ? requestHistory : mockHistory;

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={displayHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryItem item={item} />}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
