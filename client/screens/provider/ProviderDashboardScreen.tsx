import React from "react";
import { View, StyleSheet, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, BACKGROUND_SCHEMES, ServiceRequest } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useProviderLocation, updateProviderAvailability, registerProviderOnServer } from "@/hooks/useProviderLocation";

const PLATFORM_FEE = 0.15;

function netEarnings(r: ServiceRequest): number {
  const gross = r.estimatedCost || 0;
  const tip = (r.totalCost || 0) - gross;
  const safeTip = tip > 0 ? tip : 0;
  return gross * (1 - PLATFORM_FEE) + safeTip;
}

function StatCard({
  icon,
  label,
  value,
  color,
  cardBg,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
  cardBg: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: cardBg, borderLeftWidth: 4, borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <ThemedText type="h3" style={[styles.statValue, { color: theme.text }]}>
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function ProviderDashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { currentProvider, setCurrentProvider, requestHistory, backgroundPreferences } = useApp();
  const [isAvailable, setIsAvailable] = React.useState(currentProvider?.isAvailable ?? false);
  const isAnimated = backgroundPreferences.mode === "animated";
  const scheme = BACKGROUND_SCHEMES[backgroundPreferences.colorScheme];
  const cardBg = isAnimated ? theme.cardAnimatedBg : theme.backgroundDefault;

  useProviderLocation(currentProvider?.id ?? null, isAvailable);

  React.useEffect(() => {
    if (currentProvider) {
      registerProviderOnServer(currentProvider);
    }
  }, [currentProvider?.id]);

  const handleAvailabilityChange = (value: boolean) => {
    setIsAvailable(value);
    if (currentProvider) {
      setCurrentProvider({ ...currentProvider, isAvailable: value });
      updateProviderAvailability(currentProvider.id, value);
    }
  };

  const myJobs = React.useMemo(() =>
    requestHistory.filter(
      (r) => r.provider?.id === currentProvider?.id && r.status === "completed"
    ),
    [requestHistory, currentProvider?.id]
  );

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const todayJobs = myJobs.filter((r) => r.createdAt >= todayStart);
  const weekJobs = myJobs.filter((r) => r.createdAt >= weekStart);

  const todayEarnings = todayJobs.reduce((s, r) => s + netEarnings(r), 0);
  const weekEarnings = weekJobs.reduce((s, r) => s + netEarnings(r), 0);
  const allTimeEarnings = myJobs.reduce((s, r) => s + netEarnings(r), 0);

  const rating = currentProvider?.rating ?? 0;
  const reviewCount = currentProvider?.reviewCount ?? 0;
  const isVerified = currentProvider?.verificationStatus === "verified";
  const hasAnyJobs = myJobs.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: isAnimated ? (isDark ? scheme.bgColor : scheme.bgColorLight) : theme.backgroundRoot }]}>
      {isAnimated ? <AnimatedBackground customColors={isDark ? scheme.colors : scheme.colorsLight} opacityBoost={isDark ? scheme.opacityBoost : scheme.opacityBoostLight} flashColor={isDark ? scheme.flashColor : scheme.flashColorLight} isDark={isDark} /> : null}
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, Spacing["2xl"]) + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>Dashboard</ThemedText>

        <View style={[styles.welcomeBanner, { backgroundColor: theme.secondary + "15" }]}>
          <Feather name="heart" size={20} color={theme.secondary} />
          <ThemedText type="body" style={{ color: theme.secondary, marginLeft: Spacing.sm, flex: 1 }}>
            {isAvailable
              ? "You're online — drivers in your area can see you."
              : "Toggle online when you're ready to accept jobs."}
          </ThemedText>
        </View>

        {isVerified ? (
          <View style={[styles.verificationBanner, { backgroundColor: theme.success + "15" }]}>
            <Feather name="shield" size={20} color={theme.success} />
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <ThemedText type="body" style={{ color: theme.success, fontWeight: "600" }}>
                ID Verified Provider
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Your identity has been verified for driver safety
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={[styles.verificationBanner, { backgroundColor: theme.warning + "15" }]}>
            <Feather name="alert-circle" size={20} color={theme.warning} />
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <ThemedText type="body" style={{ color: theme.warning, fontWeight: "600" }}>
                Verification Pending
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Complete ID verification to appear in driver searches
              </ThemedText>
            </View>
          </View>
        )}

        <View style={[styles.availabilityCard, { backgroundColor: cardBg }]}>
          <View style={styles.availabilityRow}>
            <View>
              <ThemedText type="h4">Ready to Earn?</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {isAvailable ? "You're visible to nearby drivers" : "Go online when you're ready"}
              </ThemedText>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityChange}
              trackColor={{ false: theme.border, true: theme.success }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: isAvailable ? theme.success : theme.textSecondary },
            ]}
          />
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Today's Stats
        </ThemedText>
        <View style={styles.statsGrid}>
          <StatCard
            icon="dollar-sign"
            label="Earnings"
            value={todayJobs.length > 0 ? `$${todayEarnings.toFixed(2)}` : "$0.00"}
            color={theme.success}
            cardBg={cardBg}
          />
          <StatCard
            icon="check-circle"
            label="Jobs Done"
            value={String(todayJobs.length)}
            color={theme.secondary}
            cardBg={cardBg}
          />
          <StatCard
            icon="star"
            label="Rating"
            value={rating > 0 ? rating.toFixed(1) : "--"}
            color="#F59E0B"
            cardBg={cardBg}
          />
          <StatCard
            icon="briefcase"
            label="Total Jobs"
            value={String(myJobs.length)}
            color={theme.primary}
            cardBg={cardBg}
          />
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          This Week
        </ThemedText>
        <View style={[styles.weeklyCard, { backgroundColor: cardBg }]}>
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Net Earnings</ThemedText>
            <ThemedText type="h4" style={{ color: theme.success }}>
              ${weekEarnings.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Jobs Completed</ThemedText>
            <ThemedText type="h4">{weekJobs.length}</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">All-Time Earned</ThemedText>
            <ThemedText type="h4" style={{ color: theme.success }}>
              ${allTimeEarnings.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Avg. Rating</ThemedText>
            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color={theme.warning} />
              <ThemedText type="h4" style={{ marginLeft: 4 }}>
                {rating > 0 ? `${rating.toFixed(1)} (${reviewCount})` : "--"}
              </ThemedText>
            </View>
          </View>
        </View>

        {!hasAnyJobs ? (
          <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
            <Feather name="zap" size={32} color={theme.secondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.md, textAlign: "center" }}>
              Ready for Your First Job
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Toggle online above and accept jobs from the Jobs tab. Your earnings and stats will appear here after each completed job.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  verificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  availabilityCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing["2xl"],
    position: "relative",
    overflow: "hidden",
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    marginBottom: 2,
  },
  weeklyCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing["2xl"],
  },
  weeklyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
  },
});
