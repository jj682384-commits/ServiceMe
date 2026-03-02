import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ProviderTypeBadge } from "@/components/ProviderTypeBadge";
import { useTheme } from "@/hooks/useTheme";
import { useApp, Provider, ServiceType, BADGE_CONFIG, BadgeType } from "@/context/AppContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type SortOption = "nearest" | "highest_rated" | "most_reviews";
type ProviderTypeFilter = "all" | "shop" | "independent";

const SORT_OPTIONS: { value: SortOption; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "nearest", label: "Nearest", icon: "navigation" },
  { value: "highest_rated", label: "Top Rated", icon: "star" },
  { value: "most_reviews", label: "Most Reviews", icon: "message-circle" },
];

const SERVICE_FILTERS: { type: ServiceType | "all"; label: string }[] = [
  { type: "all", label: "All Services" },
  { type: "flat_tire", label: "Flat Tire" },
  { type: "jump_start", label: "Jump Start" },
  { type: "fuel", label: "Fuel" },
  { type: "lockout", label: "Lockout" },
  { type: "obd_diagnostic", label: "OBD Diagnostic" },
  { type: "tow", label: "Towing" },
];

const PROVIDER_TYPE_FILTERS: { type: ProviderTypeFilter; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { type: "all", label: "All", icon: "users" },
  { type: "shop", label: "Shops", icon: "home" },
  { type: "independent", label: "Helpers", icon: "user" },
];

function formatServiceName(service: string): string {
  return service.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProviderCard({ provider, onPress }: { provider: Provider; onPress: () => void }) {
  const { theme } = useTheme();

  const vehicleIcon: keyof typeof Feather.glyphMap =
    provider.vehicleType === "tow_truck" ? "truck" :
    provider.vehicleType === "service_van" ? "box" : "tool";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerCard,
        {
          backgroundColor: theme.backgroundSecondary,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.providerAvatar, { backgroundColor: provider.providerType === "shop" ? theme.secondary : theme.primary }]}>
          <Feather name={vehicleIcon} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.providerHeaderInfo}>
          <View style={styles.nameRow}>
            <ThemedText type="body" style={{ fontWeight: "700", flex: 1 }}>
              {provider.name}
            </ThemedText>
            <ProviderTypeBadge type={provider.providerType} size="small" />
          </View>
          <View style={styles.metaRow}>
            <Feather name="star" size={14} color={theme.warning} />
            <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", marginLeft: 2 }}>
              {provider.rating.toFixed(1)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 2 }}>
              ({provider.reviewCount} reviews)
            </ThemedText>
            {provider.distance !== undefined ? (
              <>
                <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
                <Feather name="navigation" size={12} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: 2 }}>
                  {provider.distance} mi
                </ThemedText>
              </>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.vehicleInfo}>
          <Feather name="truck" size={12} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
            {provider.vehicleMake} {provider.vehicleModel}
          </ThemedText>
        </View>
        <View style={styles.servicesWrap}>
          {provider.servicesOffered.map((service) => (
            <View
              key={service}
              style={[styles.serviceChip, { backgroundColor: theme.backgroundTertiary }]}
            >
              <ThemedText type="small" style={{ fontSize: 11, color: theme.textSecondary }}>
                {formatServiceName(service)}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.badgeRow}>
          {provider.verificationStatus === "verified" ? (
            <VerificationBadge status="verified" size="small" showLabel />
          ) : null}
          {provider.badges && provider.badges.length > 0 ? (
            (() => {
              const topBadge = provider.badges[0];
              const config = BADGE_CONFIG[topBadge.type as BadgeType];
              return (
                <View style={[styles.trustBadgeSmall, { backgroundColor: config.color + "15" }]}>
                  <Feather name={config.icon as keyof typeof Feather.glyphMap} size={10} color={config.color} />
                  <ThemedText type="small" style={{ color: config.color, fontWeight: "600", fontSize: 10, marginLeft: 2 }}>
                    {config.label}
                  </ThemedText>
                </View>
              );
            })()
          ) : null}
        </View>
        <View style={styles.viewProfileRow}>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            View Details
          </ThemedText>
          <Feather name="chevron-right" size={16} color={theme.primary} />
        </View>
      </View>
    </Pressable>
  );
}

export default function BrowseProvidersScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { getProvidersWithDistance } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [sortBy, setSortBy] = useState<SortOption>("nearest");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ProviderTypeFilter>("all");

  const allProviders = getProvidersWithDistance();

  const filteredAndSorted = useMemo(() => {
    let result = [...allProviders];

    if (serviceFilter !== "all") {
      result = result.filter((p) => p.servicesOffered.includes(serviceFilter));
    }

    if (typeFilter !== "all") {
      result = result.filter((p) => p.providerType === typeFilter);
    }

    switch (sortBy) {
      case "nearest":
        result.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        break;
      case "highest_rated":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "most_reviews":
        result.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }

    return result;
  }, [allProviders, sortBy, serviceFilter, typeFilter]);

  const renderProvider = ({ item }: { item: Provider }) => (
    <ProviderCard
      provider={item}
      onPress={() => navigation.navigate("ProviderDetail", { providerId: item.id })}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filtersContainer}>
        <View style={styles.sortRow}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.sm }}>
            Sort:
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setSortBy(option.value)}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor: sortBy === option.value ? theme.primary : theme.backgroundTertiary,
                    borderColor: sortBy === option.value ? theme.primary : theme.border,
                  },
                ]}
              >
                <Feather
                  name={option.icon}
                  size={12}
                  color={sortBy === option.value ? "#FFFFFF" : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{
                    color: sortBy === option.value ? "#FFFFFF" : theme.text,
                    marginLeft: 4,
                    fontWeight: sortBy === option.value ? "600" : "400",
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.typeFilterRow}>
          {PROVIDER_TYPE_FILTERS.map((filter) => (
            <Pressable
              key={filter.type}
              onPress={() => setTypeFilter(filter.type)}
              style={[
                styles.typeChip,
                {
                  backgroundColor: typeFilter === filter.type ? theme.secondary + "20" : theme.backgroundTertiary,
                  borderColor: typeFilter === filter.type ? theme.secondary : "transparent",
                  borderWidth: 1,
                  flex: 1,
                },
              ]}
            >
              <Feather
                name={filter.icon}
                size={14}
                color={typeFilter === filter.type ? theme.secondary : theme.textSecondary}
              />
              <ThemedText
                type="small"
                style={{
                  color: typeFilter === filter.type ? theme.secondary : theme.text,
                  marginLeft: 4,
                  fontWeight: typeFilter === filter.type ? "600" : "400",
                }}
              >
                {filter.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
          {SERVICE_FILTERS.map((filter) => (
            <Pressable
              key={filter.type}
              onPress={() => setServiceFilter(filter.type)}
              style={[
                styles.serviceFilterChip,
                {
                  backgroundColor: serviceFilter === filter.type ? theme.primary + "15" : theme.backgroundTertiary,
                  borderColor: serviceFilter === filter.type ? theme.primary : "transparent",
                  borderWidth: 1,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: serviceFilter === filter.type ? theme.primary : theme.textSecondary,
                  fontWeight: serviceFilter === filter.type ? "600" : "400",
                }}
              >
                {filter.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.resultsHeader}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {filteredAndSorted.length} Provider{filteredAndSorted.length !== 1 ? "s" : ""} Found
        </ThemedText>
      </View>

      <FlatList
        data={filteredAndSorted}
        renderItem={renderProvider}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
              No providers match your filters.
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Try adjusting your sort or filter options.
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
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  typeFilterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  serviceFilterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  resultsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  providerCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  providerHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: Spacing.sm,
  },
  cardBody: {
    gap: Spacing.sm,
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  servicesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  serviceChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  viewProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  trustBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
});
