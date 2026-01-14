import React from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
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
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

export default function PremiumUpgradeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { currentDriver, startFreeTrial, cancelTrial, getTrialDaysRemaining, upgradeMembership } = useApp();

  const isPremium = currentDriver?.membership === "premium";
  const isOnTrial = currentDriver?.isOnTrial;
  const daysRemaining = getTrialDaysRemaining();

  const trialButtonScale = useSharedValue(1);
  const subscribeButtonScale = useSharedValue(1);

  const trialButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trialButtonScale.value }],
  }));

  const subscribeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: subscribeButtonScale.value }],
  }));

  const handleStartTrial = () => {
    startFreeTrial();
    Alert.alert(
      "Trial Started!",
      "Your 10-day free trial has begun. Enjoy all Premium benefits! You can cancel anytime during the trial at no charge.",
      [{ text: "Great!", onPress: () => navigation.goBack() }]
    );
  };

  const handleCancelTrial = () => {
    Alert.alert(
      "Cancel Free Trial",
      "Are you sure you want to cancel your free trial? You'll lose access to Premium benefits immediately.",
      [
        { text: "Keep Trial", style: "cancel" },
        {
          text: "Cancel Trial",
          style: "destructive",
          onPress: () => {
            cancelTrial();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleSubscribe = () => {
    Alert.alert(
      "Subscribe to Premium",
      "You'll be charged $9.99/month for Premium membership. This includes all Premium benefits.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Subscribe",
          onPress: () => {
            upgradeMembership("premium");
            Alert.alert("Welcome to Premium!", "You now have access to all Premium benefits.", [
              { text: "Great!", onPress: () => navigation.goBack() },
            ]);
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingTop: insets.top + Spacing["2xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.header}>
          <View style={[styles.starBadge, { backgroundColor: theme.secondary }]}>
            <Feather name="star" size={32} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.title}>
            ServiceMe Premium
          </ThemedText>
          {isOnTrial ? (
            <View style={[styles.trialBadge, { backgroundColor: theme.success + "20" }]}>
              <ThemedText type="small" style={{ color: theme.success, fontWeight: "600" }}>
                {daysRemaining} days left in free trial
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
              Unlock exclusive benefits with a 10-day free trial
            </ThemedText>
          )}
        </View>

        <View style={[styles.benefitsCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.benefitsTitle}>
            Premium Benefits
          </ThemedText>
          <BenefitRow
            icon="percent"
            title="20% Off All Services"
            description="Save on every roadside assistance request"
          />
          <BenefitRow
            icon="zap"
            title="Priority Matching"
            description="Get connected to providers faster"
          />
          <BenefitRow
            icon="shield"
            title="Extended Coverage"
            description="Coverage in more remote areas"
          />
          <BenefitRow
            icon="clock"
            title="24/7 Priority Support"
            description="Skip the queue when you need help"
          />
          <BenefitRow
            icon="gift"
            title="Exclusive Offers"
            description="Special deals from partner businesses"
          />
        </View>

        {isOnTrial ? (
          <View style={styles.actionSection}>
            <View style={[styles.trialInfoCard, { backgroundColor: theme.backgroundTertiary }]}>
              <Feather name="check-circle" size={24} color={theme.success} />
              <View style={styles.trialInfoContent}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  You're on a Free Trial
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Cancel anytime within {daysRemaining} days at no charge
                </ThemedText>
              </View>
            </View>

            <AnimatedPressable
              onPress={handleSubscribe}
              onPressIn={() => { subscribeButtonScale.value = withSpring(0.97); }}
              onPressOut={() => { subscribeButtonScale.value = withSpring(1); }}
              style={[
                styles.primaryButton,
                { backgroundColor: theme.primary },
                subscribeButtonStyle,
              ]}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Subscribe Now - $9.99/month
              </ThemedText>
            </AnimatedPressable>

            <Pressable onPress={handleCancelTrial} style={styles.cancelLink}>
              <ThemedText type="body" style={{ color: theme.error }}>
                Cancel Free Trial
              </ThemedText>
            </Pressable>
          </View>
        ) : isPremium ? (
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
            <View style={[styles.pricingCard, { backgroundColor: theme.backgroundTertiary }]}>
              <View style={styles.pricingHeader}>
                <ThemedText type="h3">$9.99</ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>/month</ThemedText>
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                After 10-day free trial
              </ThemedText>
            </View>

            <AnimatedPressable
              onPress={handleStartTrial}
              onPressIn={() => { trialButtonScale.value = withSpring(0.97); }}
              onPressOut={() => { trialButtonScale.value = withSpring(1); }}
              style={[
                styles.primaryButton,
                { backgroundColor: theme.primary, ...Shadows.lg },
                trialButtonStyle,
              ]}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Start 10-Day Free Trial
              </ThemedText>
            </AnimatedPressable>

            <ThemedText type="small" style={[styles.trialNote, { color: theme.textSecondary }]}>
              Cancel anytime during the trial - no charge
            </ThemedText>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginHorizontal: Spacing.md }}>
                or
              </ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <AnimatedPressable
              onPress={handleSubscribe}
              onPressIn={() => { subscribeButtonScale.value = withSpring(0.97); }}
              onPressOut={() => { subscribeButtonScale.value = withSpring(1); }}
              style={[
                styles.secondaryButton,
                { borderColor: theme.primary },
                subscribeButtonStyle,
              ]}
            >
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                Subscribe Without Trial
              </ThemedText>
            </AnimatedPressable>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  starBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.md,
  },
  trialBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  benefitsCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  benefitsTitle: {
    marginBottom: Spacing.lg,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  benefitContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  actionSection: {
    gap: Spacing.lg,
  },
  pricingCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
  },
  pricingHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.xs,
  },
  primaryButton: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  secondaryButton: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 2,
  },
  trialNote: {
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  trialInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  trialInfoContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  premiumActiveCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
