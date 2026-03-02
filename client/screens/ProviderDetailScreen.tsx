import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ProviderTypeBadge } from "@/components/ProviderTypeBadge";
import { useTheme } from "@/hooks/useTheme";
import { useApp, BADGE_CONFIG, BadgeType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

function formatServiceName(service: string): string {
  return service.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SERVICE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  flat_tire: "disc",
  jump_start: "battery-charging",
  fuel: "droplet",
  lockout: "key",
  tow: "truck",
  obd_diagnostic: "cpu",
  other: "more-horizontal",
};

function StarRating({ rating }: { rating: number }) {
  const { theme } = useTheme();
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <View style={detailStyles.starsRow}>
      {[...Array(5)].map((_, i) => (
        <Feather
          key={i}
          name="star"
          size={18}
          color={i < fullStars ? theme.warning : i === fullStars && hasHalf ? theme.warning : theme.border}
          style={{ opacity: i < fullStars ? 1 : i === fullStars && hasHalf ? 0.6 : 0.3 }}
        />
      ))}
    </View>
  );
}

export default function ProviderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { getProvidersWithDistance } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ProviderDetail">>();

  const providers = getProvidersWithDistance();
  const provider = providers.find((p) => p.id === route.params.providerId);

  if (!provider) {
    return (
      <ThemedView style={detailStyles.container}>
        <View style={detailStyles.emptyState}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            Provider not found
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const vehicleIcon: keyof typeof Feather.glyphMap =
    provider.vehicleType === "tow_truck" ? "truck" :
    provider.vehicleType === "service_van" ? "box" : "tool";

  const handleRequestService = () => {
    navigation.navigate("ServiceRequest", { providerId: provider.id });
  };

  return (
    <ThemedView style={detailStyles.container}>
      <ScrollView
        contentContainerStyle={[
          detailStyles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[detailStyles.heroSection, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[detailStyles.avatarLarge, { backgroundColor: provider.providerType === "shop" ? theme.secondary : theme.primary }]}>
            <Feather name={vehicleIcon} size={36} color="#FFFFFF" />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.md, textAlign: "center" }}>
            {provider.name}
          </ThemedText>
          <View style={{ marginTop: Spacing.sm }}>
            <ProviderTypeBadge type={provider.providerType} size="small" />
          </View>
          <View style={detailStyles.ratingSection}>
            <StarRating rating={provider.rating} />
            <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
              {provider.rating.toFixed(1)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
              ({provider.reviewCount} reviews)
            </ThemedText>
          </View>
          {provider.verificationStatus === "verified" ? (
            <View style={{ marginTop: Spacing.sm }}>
              <VerificationBadge status="verified" size="small" showLabel />
            </View>
          ) : null}
        </View>

        {provider.badges && provider.badges.length > 0 ? (
          <View style={detailStyles.badgesSection}>
            {provider.badges.map((badge) => {
              const config = BADGE_CONFIG[badge.type as BadgeType];
              return (
                <View
                  key={badge.type}
                  style={[detailStyles.trustBadge, { backgroundColor: config.color + "15", borderColor: config.color + "40" }]}
                >
                  <Feather name={config.icon as keyof typeof Feather.glyphMap} size={14} color={config.color} />
                  <ThemedText type="small" style={{ color: config.color, fontWeight: "600", marginLeft: 4 }}>
                    {config.label}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={detailStyles.statsRow}>
          <View style={[detailStyles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="navigation" size={20} color={theme.primary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.xs }}>
              {provider.distance !== undefined ? `${provider.distance} mi` : "N/A"}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Away
            </ThemedText>
          </View>
          <View style={[detailStyles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="star" size={20} color={theme.warning} />
            <ThemedText type="h4" style={{ marginTop: Spacing.xs }}>
              {provider.rating.toFixed(1)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Rating
            </ThemedText>
          </View>
          <View style={[detailStyles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="message-circle" size={20} color={theme.secondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.xs }}>
              {provider.reviewCount}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Reviews
            </ThemedText>
          </View>
        </View>

        <ThemedText type="h4" style={detailStyles.sectionTitle}>
          Services Offered
        </ThemedText>
        <View style={[detailStyles.servicesCard, { backgroundColor: theme.backgroundSecondary }]}>
          {provider.servicesOffered.map((service, index) => (
            <View
              key={service}
              style={[
                detailStyles.serviceItem,
                index < provider.servicesOffered.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: theme.border }
                  : null,
              ]}
            >
              <View style={[detailStyles.serviceIconWrap, { backgroundColor: theme.backgroundTertiary }]}>
                <Feather
                  name={SERVICE_ICONS[service] || "tool"}
                  size={18}
                  color={theme.primary}
                />
              </View>
              <ThemedText type="body" style={{ flex: 1 }}>
                {formatServiceName(service)}
              </ThemedText>
              <Feather name="check-circle" size={16} color={theme.success} />
            </View>
          ))}
        </View>

        <ThemedText type="h4" style={detailStyles.sectionTitle}>
          Vehicle Information
        </ThemedText>
        <View style={[detailStyles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={detailStyles.infoRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Vehicle Type
            </ThemedText>
            <ThemedText type="body">
              {provider.vehicleType === "tow_truck" ? "Tow Truck" :
               provider.vehicleType === "service_van" ? "Service Van" : "Pickup Truck"}
            </ThemedText>
          </View>
          <View style={[detailStyles.infoDivider, { backgroundColor: theme.border }]} />
          <View style={detailStyles.infoRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Make & Model
            </ThemedText>
            <ThemedText type="body">
              {provider.vehicleMake} {provider.vehicleModel}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="h4" style={detailStyles.sectionTitle}>
          Contact
        </ThemedText>
        <View style={[detailStyles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={detailStyles.infoRow}>
            <View style={detailStyles.contactRow}>
              <Feather name="phone" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                Phone
              </ThemedText>
            </View>
            <ThemedText type="body">
              {provider.phone}
            </ThemedText>
          </View>
          <View style={[detailStyles.infoDivider, { backgroundColor: theme.border }]} />
          <View style={detailStyles.infoRow}>
            <View style={detailStyles.contactRow}>
              <Feather name="mail" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                Email
              </ThemedText>
            </View>
            <ThemedText type="body" style={{ fontSize: 14 }}>
              {provider.email}
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          detailStyles.bottomBar,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={handleRequestService}
          style={({ pressed }) => [
            detailStyles.requestButton,
            {
              backgroundColor: theme.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Feather name="zap" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
            Request Service from {provider.name.split(" ")[0]}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  servicesCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoDivider: {
    height: 1,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgesSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    justifyContent: "center",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
});
