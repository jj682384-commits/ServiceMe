import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { PurchasesPackage } from "react-native-purchases";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/lib/revenuecat";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BENEFIT_ROWS = [
  { icon: "gift" as const, title: "Free Services Included", descMonthly: "1 free service per month — any type", descYearly: "2 free services per month — any type", color: "#F59E0B" },
  { icon: "percent" as const, title: "Service Discounts", descMonthly: "20% off every roadside request", descYearly: "25% off every roadside request", color: "#10B981" },
  { icon: "truck" as const, title: "Discounted Tows", descMonthly: "Reduced rates on all towing services", descYearly: "Reduced rates on all towing services", color: "#3B82F6" },
  { icon: "zap" as const, title: "Priority Response", descMonthly: "Get connected to providers faster", descYearly: "Get connected to providers faster", color: "#8B5CF6" },
  { icon: "shield" as const, title: "Extended Coverage", descMonthly: "Coverage in more remote areas", descYearly: "Coverage in more remote areas", color: "#EC4899" },
  { icon: "clock" as const, title: "24/7 Priority Support", descMonthly: "Skip the queue when you need help", descYearly: "Skip the queue when you need help", color: "#14B8A6" },
];

const COMPARISON_ROWS = [
  { feature: "Free services", free: "None", monthlyPremium: "1/month", yearlyPremium: "2/month" },
  { feature: "All services", free: "Standard", monthlyPremium: "20% off", yearlyPremium: "25% off" },
  { feature: "Tow service", free: "Full price", monthlyPremium: "Discounted", yearlyPremium: "Discounted" },
  { feature: "Priority response", free: false, monthlyPremium: true, yearlyPremium: true },
  { feature: "24/7 support", free: false, monthlyPremium: true, yearlyPremium: true },
  { feature: "Extended coverage", free: false, monthlyPremium: true, yearlyPremium: true },
];

export default function PremiumUpgradeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { currentDriver, upgradeMembership } = useApp();
  const { offerings, isSubscribed, isLoading, requestPurchase, isPurchasing, restore, isRestoring } = useSubscription();

  const [selectedTab, setSelectedTab] = useState<"monthly" | "yearly">("monthly");

  const isPremium = currentDriver?.membership === "premium" || isSubscribed;
  const sectionBg = theme.cardAnimatedBg;

  const currentOffering = offerings?.current;
  const monthlyPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly"
  );
  const yearlyPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual"
  );
  const selectedPkg: PurchasesPackage | undefined = selectedTab === "monthly" ? monthlyPkg : yearlyPkg;
  const monthlyPrice = monthlyPkg?.product.priceString ?? "$9.99";
  const yearlyPrice = yearlyPkg?.product.priceString ?? "$79.99";
  const yearlyMonthlyEq = yearlyPkg ? `$${(yearlyPkg.product.price / 12).toFixed(2)}/mo` : "$6.67/mo";

  const subscribeButtonScale = useSharedValue(1);
  const subscribeButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: subscribeButtonScale.value }] }));

  const handleSubscribe = async () => {
    if (!selectedPkg) {
      if (Platform.OS === "web") {
        upgradeMembership("premium");
        Alert.alert("Premium Activated", "Your account has been upgraded to Premium.");
      } else {
        Alert.alert(
          "Subscriptions Unavailable",
          "In-app purchases are not available in this version. Download the app from the App Store to subscribe.",
        );
      }
      return;
    }
    requestPurchase(selectedPkg);
  };

  const handleRestore = async () => {
    try {
      const result = await restore();
      const hasEntitlement = result.activeSubscriptions.length > 0;
      if (hasEntitlement) {
        upgradeMembership("premium");
        Alert.alert("Restored", "Your Premium subscription has been restored.");
      } else {
        Alert.alert("Nothing to Restore", "No active Premium subscription found on this Apple ID.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (!msg.toLowerCase().includes("cancel")) {
        Alert.alert("Restore Failed", "Could not restore purchases. Please try again.");
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
      <AnimatedBackground />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Hero gradient card */}
        <LinearGradient
          colors={isPremium ? ["#78350F", "#451A03", "#1C0A02"] : ["#1A0A2E", "#0F1B4C", "#0A2840"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={[styles.heroBadge, { backgroundColor: isPremium ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.1)" }]}>
            <Feather name="star" size={28} color={isPremium ? "#FFD700" : "#93C5FD"} />
          </View>
          <ThemedText style={{ color: isPremium ? "#FFD700" : "#93C5FD", fontWeight: "800", fontSize: 22, marginTop: Spacing.md, marginBottom: Spacing.xs }}>
            ResqRide Premium
          </ThemedText>
          <ThemedText type="small" style={{ color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
            {isPremium ? "You're enjoying all premium benefits" : "Unlock exclusive benefits for roadside peace of mind"}
          </ThemedText>
          {isPremium && (
            <View style={styles.activeBadge}>
              <Feather name="check-circle" size={14} color="#FFD700" />
              <ThemedText type="small" style={{ color: "#FFD700", fontWeight: "700", marginLeft: 6 }}>
                Active Subscription
              </ThemedText>
            </View>
          )}
        </LinearGradient>

        {/* Plan selector */}
        {!isPremium && (
          <>
            <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              CHOOSE YOUR PLAN
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg }]}>
              <Pressable
                onPress={() => setSelectedTab("monthly")}
                style={[styles.planRow, selectedTab === "monthly" && { backgroundColor: theme.primary + "15" }]}
              >
                <View style={[styles.iconBox, { backgroundColor: selectedTab === "monthly" ? theme.primary + "25" : theme.border }]}>
                  <Feather name="calendar" size={16} color={selectedTab === "monthly" ? theme.primary : theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Monthly</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>{monthlyPrice}/month · cancel anytime</ThemedText>
                </View>
                <View style={[styles.radioOuter, { borderColor: selectedTab === "monthly" ? theme.primary : theme.border }]}>
                  {selectedTab === "monthly" && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
                </View>
              </Pressable>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <Pressable
                onPress={() => setSelectedTab("yearly")}
                style={[styles.planRow, selectedTab === "yearly" && { backgroundColor: "#10B98115" }]}
              >
                <View style={[styles.iconBox, { backgroundColor: selectedTab === "yearly" ? "#10B98125" : theme.border }]}>
                  <Feather name="award" size={16} color={selectedTab === "yearly" ? "#10B981" : theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>Yearly</ThemedText>
                    <View style={[styles.saveBadge, { backgroundColor: "#10B981" }]}>
                      <ThemedText style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800" }}>SAVE 33%</ThemedText>
                    </View>
                  </View>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>{yearlyMonthlyEq} · billed {yearlyPrice}/yr</ThemedText>
                </View>
                <View style={[styles.radioOuter, { borderColor: selectedTab === "yearly" ? "#10B981" : theme.border }]}>
                  {selectedTab === "yearly" && <View style={[styles.radioInner, { backgroundColor: "#10B981" }]} />}
                </View>
              </Pressable>
            </View>
          </>
        )}

        {/* Free vs Premium comparison */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          FREE VS PREMIUM
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={[styles.comparisonHeader, { borderBottomColor: theme.border }]}>
            <ThemedText type="small" style={{ flex: 2, color: theme.textSecondary, fontWeight: "600" }}> </ThemedText>
            <ThemedText type="small" style={[styles.colHead, { color: theme.textSecondary }]}>Free</ThemedText>
            <ThemedText type="small" style={[styles.colHead, { color: theme.primary }]}>Premium</ThemedText>
          </View>
          {COMPARISON_ROWS.map((row, i) => {
            const premiumVal = selectedTab === "monthly" ? row.monthlyPremium : row.yearlyPremium;
            return (
              <View
                key={row.feature}
                style={[styles.comparisonRow, { borderTopColor: theme.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}
              >
                <ThemedText type="small" style={{ flex: 2, color: theme.textSecondary }}>{row.feature}</ThemedText>
                <View style={styles.colCell}>
                  {typeof row.free === "boolean" ? (
                    <Feather name={row.free ? "check" : "x"} size={16} color={row.free ? theme.success : theme.textSecondary} />
                  ) : (
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "500" }}>{row.free}</ThemedText>
                  )}
                </View>
                <View style={styles.colCell}>
                  {typeof premiumVal === "boolean" ? (
                    <Feather name={premiumVal ? "check" : "x"} size={16} color={premiumVal ? theme.success : theme.textSecondary} />
                  ) : (
                    <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>{premiumVal as string}</ThemedText>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Premium benefits */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          PREMIUM BENEFITS
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          {BENEFIT_ROWS.map((b, i) => (
            <View key={b.title}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <View style={styles.benefitRow}>
                <View style={[styles.iconBox, { backgroundColor: b.color + "20" }]}>
                  <Feather name={b.icon} size={16} color={b.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{b.title}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {selectedTab === "yearly" ? b.descYearly : b.descMonthly}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* CTA / active state */}
        {isPremium ? (
          <>
            <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              MEMBERSHIP
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg }]}>
              <View style={styles.benefitRow}>
                <View style={[styles.iconBox, { backgroundColor: "#FFD70020" }]}>
                  <Feather name="star" size={16} color="#FFD700" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "700" }}>Premium Member</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>All benefits are active on your account</ThemedText>
                </View>
                <Feather name="check-circle" size={20} color={theme.success} />
              </View>
            </View>
          </>
        ) : (
          <>
            <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              SUBSCRIBE
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, padding: Spacing.lg }]}>
              <View style={styles.priceSummary}>
                <ThemedText style={{ color: theme.text, fontSize: 28, fontWeight: "800" }}>
                  {selectedTab === "monthly" ? monthlyPrice : yearlyMonthlyEq.split("/")[0]}
                </ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: 4, marginTop: 6 }}>
                  /{selectedTab === "monthly" ? "month" : "month"}
                </ThemedText>
                {selectedTab === "yearly" && (
                  <View style={[styles.saveBadge, { backgroundColor: "#10B981", marginLeft: Spacing.sm, marginTop: 6 }]}>
                    <ThemedText style={{ color: "#FFF", fontSize: 10, fontWeight: "800" }}>BEST VALUE</ThemedText>
                  </View>
                )}
              </View>
              {selectedTab === "yearly" && (
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                  Billed {yearlyPrice}/year · saves ~33% vs monthly
                </ThemedText>
              )}

              {isLoading ? (
                <ActivityIndicator color={theme.primary} size="large" style={{ marginVertical: Spacing.lg }} />
              ) : (
                <AnimatedPressable
                  onPress={handleSubscribe}
                  onPressIn={() => { subscribeButtonScale.value = withSpring(0.97); }}
                  onPressOut={() => { subscribeButtonScale.value = withSpring(1); }}
                  style={[styles.primaryButton, { backgroundColor: isPurchasing ? theme.textSecondary : theme.primary }, subscribeButtonStyle]}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                      Subscribe — {selectedTab === "monthly" ? `${monthlyPrice}/mo` : `${yearlyPrice}/yr`}
                    </ThemedText>
                  )}
                </AnimatedPressable>
              )}
            </View>

            <Pressable onPress={handleRestore} style={styles.restoreLink} disabled={isRestoring}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {isRestoring ? "Restoring..." : "Restore purchases"}
              </ThemedText>
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    backgroundColor: "rgba(255,215,0,0.12)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  sectionLabel: {
    paddingBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.lg },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  saveBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  comparisonHeader: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colHead: { flex: 1, fontWeight: "700", textAlign: "center" },
  comparisonRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  colCell: { flex: 1, alignItems: "center" },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  priceSummary: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.xs,
  },
  primaryButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    marginTop: Spacing.sm,
  },
  restoreLink: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
});
