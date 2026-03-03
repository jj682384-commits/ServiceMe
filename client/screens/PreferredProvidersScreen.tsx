import React from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ProviderTypeBadge } from "@/components/ProviderTypeBadge";
import { useTheme } from "@/hooks/useTheme";
import { useApp, Provider, BADGE_CONFIG, BadgeType, PREFERRED_THRESHOLD } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

function PreferredProviderCard({
  provider,
  serviceCount,
  onPress,
}: {
  provider: Provider;
  serviceCount: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  const vehicleIcon: keyof typeof Feather.glyphMap =
    provider.vehicleType === "tow_truck" ? "truck" :
    provider.vehicleType === "service_van" ? "box" : "tool";

  const progressToNext = Math.min(serviceCount / (PREFERRED_THRESHOLD + 5), 1);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundSecondary,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: provider.providerType === "shop" ? theme.secondary : theme.primary }]}>
          <Feather name={vehicleIcon} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <ThemedText type="body" style={{ fontWeight: "700", flex: 1 }}>
              {provider.name}
            </ThemedText>
            <View style={[styles.preferredBadge, { backgroundColor: "#E91E63" + "20" }]}>
              <Feather name="heart" size={12} color="#E91E63" />
              <ThemedText type="small" style={{ color: "#E91E63", fontWeight: "700", fontSize: 11, marginLeft: 4 }}>
                Preferred
              </ThemedText>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Feather name="star" size={14} color={theme.warning} />
            <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", marginLeft: 2 }}>
              {provider.rating.toFixed(1)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 2 }}>
              ({provider.reviewCount} reviews)
            </ThemedText>
          </View>
          <View style={styles.badgeRow}>
            <ProviderTypeBadge type={provider.providerType} size="small" />
            {provider.verificationStatus === "verified" ? (
              <VerificationBadge status="verified" size="small" showLabel={false} />
            ) : null}
          </View>
        </View>
      </View>

      <View style={[styles.statsSection, { borderTopColor: theme.border }]}>
        <View style={styles.statItem}>
          <Feather name="check-circle" size={16} color={theme.success} />
          <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", marginLeft: 6 }}>
            {serviceCount} completed services
          </ThemedText>
        </View>
        <View style={styles.loyaltyBar}>
          <View style={[styles.loyaltyTrack, { backgroundColor: theme.backgroundTertiary }]}>
            <View
              style={[
                styles.loyaltyFill,
                {
                  backgroundColor: "#E91E63",
                  width: `${progressToNext * 100}%`,
                },
              ]}
            />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 4 }}>
            Loyalty Level {serviceCount >= 8 ? "Gold" : serviceCount >= 5 ? "Silver" : "Bronze"}
          </ThemedText>
        </View>
      </View>

      {provider.badges && provider.badges.length > 0 ? (
        <View style={styles.badgesWrap}>
          {provider.badges.slice(0, 2).map((badge) => {
            const config = BADGE_CONFIG[badge.type as BadgeType];
            return (
              <View
                key={badge.type}
                style={[styles.trustBadge, { backgroundColor: config.color + "15" }]}
              >
                <Feather name={config.icon as keyof typeof Feather.glyphMap} size={10} color={config.color} />
                <ThemedText type="small" style={{ color: config.color, fontWeight: "600", fontSize: 10, marginLeft: 3 }}>
                  {config.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.cardAction}>
        <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
          Request Service
        </ThemedText>
        <Feather name="chevron-right" size={16} color={theme.primary} />
      </View>
    </Pressable>
  );
}

export default function PreferredProvidersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { preferredProviders, getProvidersWithDistance, getProviderServiceCount } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const allProviders = getProvidersWithDistance();

  const preferredWithDetails = preferredProviders
    .map((pref) => {
      const provider = allProviders.find((p) => p.id === pref.providerId);
      return provider ? { provider, serviceCount: pref.serviceCount } : null;
    })
    .filter(Boolean) as { provider: Provider; serviceCount: number }[];

  const nonPreferredProgress = allProviders
    .filter((p) => !preferredProviders.some((pref) => pref.providerId === p.id))
    .map((p) => ({ provider: p, count: getProviderServiceCount(p.id) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={preferredWithDetails}
        keyExtractor={(item) => item.provider.id}
        renderItem={({ item }) => (
          <PreferredProviderCard
            provider={item.provider}
            serviceCount={item.serviceCount}
            onPress={() => navigation.navigate("ProviderDetail", { providerId: item.provider.id })}
          />
        )}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={[styles.headerIconWrap, { backgroundColor: "#E91E63" + "15" }]}>
              <Feather name="heart" size={28} color="#E91E63" />
            </View>
            <ThemedText type="h3" style={{ textAlign: "center", marginTop: Spacing.md }}>
              Your Preferred Providers
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Providers you've used {PREFERRED_THRESHOLD}+ times earn preferred status. They know your needs and you trust their work.
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="heart" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
              No Preferred Providers Yet
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              Use the same provider {PREFERRED_THRESHOLD} or more times and they'll automatically become your preferred provider.
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          nonPreferredProgress.length > 0 ? (
            <View style={styles.progressSection}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
                Almost There
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
                These providers are on their way to becoming preferred
              </ThemedText>
              {nonPreferredProgress.map((item) => (
                <Pressable
                  key={item.provider.id}
                  onPress={() => navigation.navigate("ProviderDetail", { providerId: item.provider.id })}
                  style={[styles.progressItem, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                    {item.provider.name}
                  </ThemedText>
                  <View style={styles.progressRight}>
                    <View style={[styles.miniProgress, { backgroundColor: theme.backgroundTertiary }]}>
                      <View
                        style={[
                          styles.miniFill,
                          {
                            backgroundColor: theme.primary,
                            width: `${(item.count / PREFERRED_THRESHOLD) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8 }}>
                      {item.count}/{PREFERRED_THRESHOLD}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  headerIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  cardTop: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
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
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  preferredBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  loyaltyBar: {
    marginTop: Spacing.sm,
  },
  loyaltyTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  loyaltyFill: {
    height: "100%",
    borderRadius: 3,
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: Spacing.md,
    gap: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  progressSection: {
    marginTop: Spacing.xl,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  progressRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  miniProgress: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  miniFill: {
    height: "100%",
    borderRadius: 2,
  },
});
