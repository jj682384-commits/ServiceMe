import React from "react";
import { View, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ScreenDecoration } from "@/components/ScreenDecoration";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, ServiceRequest } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

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

const mockJobs: ServiceRequest[] = [
  {
    id: "j1",
    serviceType: "flat_tire",
    location: { address: "123 Main St, San Francisco, CA", latitude: 37.78, longitude: -122.41 },
    notes: "Front left tire is completely flat",
    status: "pending",
    estimatedCost: 85,
    createdAt: new Date(Date.now() - 300000),
    driver: {
      id: "d1",
      name: "Alex Johnson",
      phone: "+1 555-1234",
      email: "alex@email.com",
      avatarPreset: 1,
    },
  },
  {
    id: "j2",
    serviceType: "jump_start",
    location: { address: "456 Market St, San Francisco, CA", latitude: 37.79, longitude: -122.40 },
    notes: "",
    status: "pending",
    estimatedCost: 55,
    createdAt: new Date(Date.now() - 600000),
    driver: {
      id: "d2",
      name: "Sarah Miller",
      phone: "+1 555-5678",
      email: "sarah@email.com",
      avatarPreset: 2,
    },
  },
  {
    id: "j3",
    serviceType: "lockout",
    location: { address: "789 Valencia St, San Francisco, CA", latitude: 37.76, longitude: -122.42 },
    notes: "Keys locked inside, parked in front of coffee shop",
    status: "pending",
    estimatedCost: 65,
    createdAt: new Date(Date.now() - 900000),
    driver: {
      id: "d3",
      name: "Mike Chen",
      phone: "+1 555-9012",
      email: "mike@email.com",
      avatarPreset: 3,
    },
  },
];

function JobCard({ job }: { job: ServiceRequest }) {
  const { theme } = useTheme();
  const { setActiveRequest } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const handleAccept = () => {
    Alert.alert(
      "Accept Job",
      `Accept ${serviceTypeLabels[job.serviceType]} request from ${job.driver?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: () => {
            setActiveRequest({
              ...job,
              status: "accepted",
            });
            navigation.navigate("ActiveService");
          },
        },
      ]
    );
  };

  return (
    <Pressable
      style={[styles.jobCard, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.jobHeader}>
        <View style={[styles.serviceIcon, { backgroundColor: theme.primary + "15" }]}>
          <Feather name={serviceTypeIcons[job.serviceType]} size={24} color={theme.primary} />
        </View>
        <View style={styles.jobHeaderInfo}>
          <ThemedText type="h4">{serviceTypeLabels[job.serviceType]}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {getTimeAgo(job.createdAt)}
          </ThemedText>
        </View>
        <ThemedText type="h4" style={{ color: theme.success }}>
          ${job.estimatedCost}
        </ThemedText>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Feather name="user" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
            {job.driver?.name}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={16} color={theme.textSecondary} />
          <ThemedText
            type="body"
            style={{ marginLeft: Spacing.sm, flex: 1, color: theme.textSecondary }}
            numberOfLines={1}
          >
            {job.location.address}
          </ThemedText>
        </View>
        {job.notes ? (
          <View style={styles.detailRow}>
            <Feather name="message-circle" size={16} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{ marginLeft: Spacing.sm, flex: 1, color: theme.textSecondary }}
              numberOfLines={2}
            >
              {job.notes}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={handleAccept}
        style={({ pressed }) => [
          styles.acceptButton,
          { backgroundColor: theme.success, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          Accept Job
        </ThemedText>
      </Pressable>
    </Pressable>
  );
}

export default function ProviderJobsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { currentProvider } = useApp();

  const availableJobs = currentProvider?.isAvailable ? mockJobs : [];

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />
      <FlatList
        data={availableJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="heart" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
              {currentProvider?.isAvailable ? "Ready to Help" : "You're Offline"}
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              {currentProvider?.isAvailable
                ? "When someone nearby needs help, their request will appear here. You decide which jobs to accept!"
                : "Go online when you're ready to earn. Work on your own schedule."}
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
  jobCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  jobHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  jobHeaderInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  jobDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  acceptButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
});
