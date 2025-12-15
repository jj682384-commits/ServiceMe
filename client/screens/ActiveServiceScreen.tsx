import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceStatus, ServiceType } from "@/context/AppContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const statusLabels: Record<ServiceStatus, string> = {
  pending: "Finding Provider",
  accepted: "Provider Found",
  en_route: "Provider En Route",
  arrived: "Provider Arrived",
  in_progress: "Service In Progress",
  completed: "Service Completed",
  cancelled: "Cancelled",
};

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  other: "Other",
};

const statusColors: Record<ServiceStatus, string> = {
  pending: "#F59E0B",
  accepted: "#3B82F6",
  en_route: "#F59E0B",
  arrived: "#16A34A",
  in_progress: "#8B5CF6",
  completed: "#16A34A",
  cancelled: "#DC2626",
};

function StatusTimeline({ currentStatus }: { currentStatus: ServiceStatus }) {
  const { theme } = useTheme();
  const statuses: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress", "completed"];
  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <View style={styles.timeline}>
      {statuses.map((status, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <View key={status} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor: isActive ? statusColors[status] : theme.border,
                  borderColor: isCurrent ? statusColors[status] : "transparent",
                  borderWidth: isCurrent ? 3 : 0,
                },
              ]}
            >
              {isActive && index < currentIndex ? (
                <Feather name="check" size={12} color="#FFFFFF" />
              ) : null}
            </View>
            <ThemedText
              type="small"
              style={[
                styles.timelineLabel,
                { color: isActive ? theme.text : theme.textSecondary },
              ]}
            >
              {statusLabels[status]}
            </ThemedText>
            {index < statuses.length - 1 ? (
              <View
                style={[
                  styles.timelineLine,
                  { backgroundColor: index < currentIndex ? statusColors[status] : theme.border },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default function ActiveServiceScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { activeRequest, setActiveRequest, userRole } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [eta, setEta] = useState(activeRequest?.eta || 8);

  useEffect(() => {
    if (!activeRequest) {
      navigation.goBack();
      return;
    }

    const timer = setInterval(() => {
      setEta((prev) => {
        if (prev <= 1) {
          if (activeRequest.status === "accepted" || activeRequest.status === "en_route") {
            setActiveRequest({ ...activeRequest, status: "arrived" });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [activeRequest]);

  useEffect(() => {
    if (activeRequest?.status === "accepted") {
      const timer = setTimeout(() => {
        setActiveRequest({ ...activeRequest, status: "en_route" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeRequest?.status]);

  if (!activeRequest) return null;

  const handleCancel = () => {
    Alert.alert(
      "Cancel Service",
      "Are you sure you want to cancel this service request?",
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            setActiveRequest(null);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    setActiveRequest({ ...activeRequest, status: "completed" });
    Alert.alert(
      "Service Completed",
      "Thank you for using ServiceMe! Would you like to rate your provider?",
      [
        { text: "Skip", onPress: () => {
          setActiveRequest(null);
          navigation.goBack();
        }},
        { text: "Rate Provider", onPress: () => {
          setActiveRequest(null);
          navigation.goBack();
        }},
      ]
    );
  };

  const handleAdvanceStatus = () => {
    const statuses: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress", "completed"];
    const currentIndex = statuses.indexOf(activeRequest.status);
    if (currentIndex < statuses.length - 1) {
      const nextStatus = statuses[currentIndex + 1];
      setActiveRequest({ ...activeRequest, status: nextStatus });
      if (nextStatus === "completed") {
        handleComplete();
      }
    }
  };

  const handleMessage = () => {
    navigation.navigate("Chat", {
      conversationId: activeRequest.id,
      providerName: activeRequest.provider?.name || "Provider",
    });
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <View style={[styles.mapBackground, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.mapContent}>
            <View style={[styles.userMarker, { backgroundColor: theme.primary }]}>
              <Feather name="navigation" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.routeLine}>
              {[...Array(8)].map((_, i) => (
                <View
                  key={i}
                  style={[styles.routeDot, { backgroundColor: theme.secondary }]}
                />
              ))}
            </View>
            <View style={[styles.providerMarker, { backgroundColor: theme.secondary }]}>
              <Feather name="truck" size={20} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.detailsPanel,
          {
            backgroundColor: theme.backgroundDefault,
            paddingBottom: insets.bottom + Spacing.lg,
            ...Shadows.card,
          },
        ]}
      >
        <View style={styles.panelHandle} />

        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[activeRequest.status] + "20" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[activeRequest.status] }]} />
            <ThemedText type="body" style={{ color: statusColors[activeRequest.status], fontWeight: "600" }}>
              {statusLabels[activeRequest.status]}
            </ThemedText>
          </View>
          {eta > 0 && (activeRequest.status === "en_route" || activeRequest.status === "accepted") ? (
            <ThemedText type="h3">
              {eta} min
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.providerInfo}>
          <View style={[styles.providerAvatar, { backgroundColor: theme.secondary }]}>
            <Feather name="truck" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.providerDetails}>
            <ThemedText type="h4">{activeRequest.provider?.name}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {activeRequest.provider?.vehicleMake} {activeRequest.provider?.vehicleModel}
            </ThemedText>
            <View style={styles.ratingRow}>
              <Feather name="star" size={14} color={theme.warning} />
              <ThemedText type="small" style={{ marginLeft: 4 }}>
                {activeRequest.provider?.rating.toFixed(1)} ({activeRequest.provider?.reviewCount} reviews)
              </ThemedText>
            </View>
          </View>
          <ThemedText type="h4" style={{ color: theme.success }}>
            ${activeRequest.estimatedCost}
          </ThemedText>
        </View>

        <View style={[styles.serviceInfo, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="tool" size={20} color={theme.textSecondary} />
          <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.sm }}>
            {serviceTypeLabels[activeRequest.serviceType]}
          </ThemedText>
          <Feather name="map-pin" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
            {activeRequest.location.address}
          </ThemedText>
        </View>

        <StatusTimeline currentStatus={activeRequest.status} />

        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleMessage}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="message-circle" size={20} color={theme.text} />
            <ThemedText type="body">Message</ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="phone" size={20} color={theme.text} />
            <ThemedText type="body">Call</ThemedText>
          </Pressable>
        </View>

        {userRole === "provider" && activeRequest.status !== "completed" ? (
          <Pressable
            onPress={handleAdvanceStatus}
            style={({ pressed }) => [
              styles.completeButton,
              { backgroundColor: theme.success, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {activeRequest.status === "in_progress" ? "Complete Service" : "Update Status"}
            </ThemedText>
          </Pressable>
        ) : null}

        {userRole === "driver" && activeRequest.status !== "completed" ? (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              { borderColor: theme.error, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText type="body" style={{ color: theme.error, fontWeight: "600" }}>
              Cancel Request
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 0.5,
  },
  mapBackground: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  userMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  routeLine: {
    flexDirection: "row",
    gap: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsPanel: {
    flex: 0.5,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: -Spacing.lg,
  },
  panelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  providerDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  timeline: {
    marginBottom: Spacing.lg,
  },
  timelineStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLabel: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  timelineLine: {
    position: "absolute",
    left: 11,
    top: 24,
    width: 2,
    height: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  completeButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cancelButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    borderWidth: 1,
  },
});
