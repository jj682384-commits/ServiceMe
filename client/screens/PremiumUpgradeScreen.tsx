import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { PurchasesPackage } from "react-native-purchases";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ScreenDecoration } from "@/components/ScreenDecoration";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/lib/revenuecat";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BenefitRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}

function BenefitRow({ icon, title, description }: BenefitRowProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.benefitRow}>
      <View style={[styles.benefitIcon, { backgroundColor: theme.secondary }]}>
        <Feather name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.benefitContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>{title}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>{description}</ThemedText>
      </View>
    </View>
  );
}

interface ComparisonRowProps {
  feature: string;
  free: string | boolean;
  premium: string | boolean;
}

function ComparisonRow({ feature, free, premium }: ComparisonRowProps) {
  const { theme } = useTheme();
  const renderValue = (val: string | boolean) => {
    if (typeof val === "boolean") {
      return val ? (
        <Feather name="check" size={18} color={theme.success} />
      ) : (
        <Feather name="x" size={18} color={theme.textSecondary} />
      );
    }
    return (
      <ThemedText type="small" style={{ color: theme.text, fontWeight: "500", textAlign: "center" }}>
        {val}
      </ThemedText>
    );
  };
  return (
    <View style={[styles.comparisonRow, { borderBottomColor: theme.border }]}>
      <View style={styles.comparisonFeature}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>{feature}</ThemedText>
      </View>
      <View style={styles.comparisonValue}>{renderValue(free)}</View>
      <View style={styles.comparisonValue}>{renderValue(premium)}</View>
    </View>
  );
}

export default function PremiumUpgradeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { currentDriver, upgradeMembership } = useApp();
  const { offerings, isSubscribed, isLoading, requestPurchase, isPurchasing, restore, isRestoring } = useSubscription();

  const [selectedTab, setSelectedTab] = useState<"monthly" | "yearly">("monthly");

  const headerHeight = useHeaderHeight();

  const isPremium = currentDriver?.membership === "premium" || isSubscribed;

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

  const trialButtonScale = useSharedValue(1);
  const subscribeButtonScale = useSharedValue(1);
  const trialButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: trialButtonScale.value }] }));
  const subscribeButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: subscribeButtonScale.value }] }));

  const handleSubscribe = async () => {
    if (!selectedPkg) return;
    requestPurchase(selectedPkg);
  };

  const handleRestore = async () => {
    try {
      const result = await restore();
      const hasEntitlement = result.activeSubscriptions.length > 0;
      if (hasEntitlement) {
        upgradeMembership("premium");
      }
    } catch (e) {
      console.warn("Restore failed:", e);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.header}>
          <View style={[styles.starBadge, { backgroundColor: theme.secondary }]}>
            <Feather name="star" size={32} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.title}>ServiceMe Premium</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Unlock exclusive benefits for roadside peace of mind
          </ThemedText>
        </View>

        {!isPremium && (
          <View style={[styles.cycleToggle, { backgroundColor: theme.backgroundTertiary }]}>
            <Pressable
              onPress={() => setSelectedTab("monthly")}
              style={[styles.cycleOption, selectedTab === "monthly" && { backgroundColor: theme.primary }]}
            >
              <ThemedText
                type="body"
                style={{ fontWeight: "600", color: selectedTab === "monthly" ? "#FFFFFF" : theme.textSecondary }}
              >
                Monthly
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: selectedTab === "monthly" ? "rgba(255,255,255,0.8)" : theme.textSecondary }}
              >
                {monthlyPrice}/mo
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSelectedTab("yearly")}
              style={[styles.cycleOption, selectedTab === "yearly" && { backgroundColor: theme.primary }]}
            >
              <View style={styles.yearlyLabelRow}>
                <ThemedText
                  type="body"
                  style={{ fontWeight: "600", color: selectedTab === "yearly" ? "#FFFFFF" : theme.textSecondary }}
                >
                  Yearly
                </ThemedText>
                <View style={[styles.saveBadge, { backgroundColor: theme.success }]}>
                  <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 10 }}>
                    SAVE 33%
                  </ThemedText>
                </View>
              </View>
              <ThemedText
                type="small"
                style={{ color: selectedTab === "yearly" ? "rgba(255,255,255,0.8)" : theme.textSecondary }}
              >
                {yearlyMonthlyEq}
              </ThemedText>
            </Pressable>
          </View>
        )}

        <View style={[styles.comparisonCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.benefitsTitle}>Free vs Premium</ThemedText>
          <View style={[styles.comparisonHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.comparisonFeature} />
            <View style={styles.comparisonValue}>
              <ThemedText type="small" style={{ fontWeight: "600", color: theme.textSecondary }}>Free</ThemedText>
            </View>
            <View style={styles.comparisonValue}>
              <ThemedText type="small" style={{ fontWeight: "600", color: theme.primary }}>Premium</ThemedText>
            </View>
          </View>
          <ComparisonRow feature="Free services" free="None" premium={selectedTab === "yearly" ? "2/year" : "1/month"} />
          <ComparisonRow feature="All services" free="Standard" premium="20% off" />
          <ComparisonRow feature="Tow service" free="Full price" premium="Discounted" />
          <ComparisonRow feature="Priority response" free={false} premium={true} />
          <ComparisonRow feature="24/7 support" free={false} premium={true} />
          <ComparisonRow feature="Extended coverage" free={false} premium={true} />
        </View>

        <View style={[styles.benefitsCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.benefitsTitle}>Premium Benefits</ThemedText>
          <BenefitRow
            icon="gift"
            title="Free Services Included"
            description={selectedTab === "yearly" ? "2 free services per year — any service type" : "1 free service per month — any service type"}
          />
          <BenefitRow icon="percent" title="20% Off All Services" description="Save on every roadside assistance request" />
          <BenefitRow icon="truck" title="Discounted Tows" description="Reduced rates on all towing services" />
          <BenefitRow icon="zap" title="Priority Response" description="Get connected to providers faster" />
          <BenefitRow icon="shield" title="Extended Coverage" description="Coverage in more remote areas" />
          <BenefitRow icon="clock" title="24/7 Priority Support" description="Skip the queue when you need help" />
        </View>

        {isPremium ? (
          <View style={styles.actionSection}>
            <View style={[styles.premiumActiveCard, { backgroundColor: theme.secondary }]}>
              <Feather name="star" size={24} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600", marginLeft: Spacing.sm }}>
                You're a Premium Member
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.actionSection}>
            {isLoading ? (
              <ActivityIndicator color={theme.primary} size="large" />
            ) : (
              <>
                <View style={[styles.pricingCard, { backgroundColor: theme.backgroundTertiary }]}>
                  <View style={styles.pricingHeader}>
                    <ThemedText type="h3">
                      {selectedTab === "monthly" ? monthlyPrice : yearlyPrice}
                    </ThemedText>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>
                      /{selectedTab === "monthly" ? "month" : "year"}
                    </ThemedText>
                  </View>
                  {selectedTab === "yearly" && (
                    <ThemedText type="small" style={{ color: theme.success, textAlign: "center", fontWeight: "600" }}>
                      Save ~33% compared to monthly
                    </ThemedText>
                  )}
                </View>

                <AnimatedPressable
                  onPress={handleSubscribe}
                  onPressIn={() => { subscribeButtonScale.value = withSpring(0.97); }}
                  onPressOut={() => { subscribeButtonScale.value = withSpring(1); }}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: isPurchasing ? theme.textSecondary : theme.primary, ...Shadows.lg },
                    subscribeButtonStyle,
                  ]}
                  disabled={isPurchasing || !selectedPkg}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                      Subscribe — {selectedTab === "monthly" ? monthlyPrice : yearlyPrice}
                    </ThemedText>
                  )}
                </AnimatedPressable>

                <Pressable onPress={handleRestore} style={styles.restoreLink} disabled={isRestoring}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {isRestoring ? "Restoring..." : "Restore purchases"}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", marginBottom: Spacing["2xl"] },
  starBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: { marginBottom: Spacing.md },
  cycleToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing["2xl"],
  },
  cycleOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  yearlyLabelRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  saveBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  comparisonCard: { borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.lg },
  comparisonHeader: {
    flexDirection: "row",
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  comparisonRow: { flexDirection: "row", paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  comparisonFeature: { flex: 2, justifyContent: "center" },
  comparisonValue: { flex: 1, alignItems: "center", justifyContent: "center" },
  benefitsCard: { borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing["2xl"] },
  benefitsTitle: { marginBottom: Spacing.lg },
  benefitRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  benefitContent: { flex: 1, gap: Spacing.xs },
  actionSection: { gap: Spacing.lg },
  pricingCard: { borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: "center" },
  pricingHeader: { flexDirection: "row", alignItems: "baseline", marginBottom: Spacing.xs },
  primaryButton: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  restoreLink: { alignItems: "center", paddingVertical: Spacing.sm },
  premiumActiveCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
