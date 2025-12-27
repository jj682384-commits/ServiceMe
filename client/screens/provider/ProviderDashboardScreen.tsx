import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault, borderLeftWidth: 4, borderLeftColor: color }]}>
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
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { currentProvider, setCurrentProvider } = useApp();
  const [isAvailable, setIsAvailable] = React.useState(currentProvider?.isAvailable ?? true);

  const handleAvailabilityChange = (value: boolean) => {
    setIsAvailable(value);
    if (currentProvider) {
      setCurrentProvider({ ...currentProvider, isAvailable: value });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={[styles.welcomeBanner, { backgroundColor: theme.secondary + "15" }]}>
          <Feather name="heart" size={20} color={theme.secondary} />
          <ThemedText type="body" style={{ color: theme.secondary, marginLeft: Spacing.sm, flex: 1 }}>
            You're making a difference. Help someone get back on the road today!
          </ThemedText>
        </View>

        <View style={[styles.availabilityCard, { backgroundColor: theme.backgroundDefault }]}>
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
          <StatCard icon="dollar-sign" label="Earnings" value="$245" color={theme.success} />
          <StatCard icon="check-circle" label="Jobs Done" value="5" color={theme.secondary} />
          <StatCard icon="clock" label="Hours" value="6.5" color={theme.warning} />
          <StatCard icon="star" label="Rating" value="4.9" color="#F59E0B" />
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Active Job
        </ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.activeJobCard,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={styles.noActiveJob}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              No active job
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Accept a job from the Jobs tab
            </ThemedText>
          </View>
        </Pressable>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Weekly Summary
        </ThemedText>
        <View style={[styles.weeklyCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Total Earnings</ThemedText>
            <ThemedText type="h4">$1,245.00</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Jobs Completed</ThemedText>
            <ThemedText type="h4">23</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Hours Worked</ThemedText>
            <ThemedText type="h4">32.5</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyRow}>
            <ThemedText type="body">Avg. Rating</ThemedText>
            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color={theme.warning} />
              <ThemedText type="h4" style={{ marginLeft: 4 }}>
                4.8
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
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
  activeJobCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing["2xl"],
  },
  noActiveJob: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  weeklyCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
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
});
