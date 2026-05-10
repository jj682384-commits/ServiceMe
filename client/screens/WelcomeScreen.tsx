import React, { useEffect } from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { useApp } from "@/context/AppContext";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionButtonProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant: "primary" | "secondary" | "ghost";
}

function ActionButton({ title, subtitle, icon, onPress, variant }: ActionButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgColor =
    variant === "primary"
      ? "rgba(42,42,42,1)"
      : variant === "secondary"
      ? "rgba(255,255,255,0.04)"
      : "rgba(255,255,255,0.02)";

  const borderColor =
    variant === "primary"
      ? "rgba(255,255,255,0.16)"
      : variant === "secondary"
      ? "rgba(255,255,255,0.08)"
      : "rgba(255,255,255,0.05)";

  const iconBg =
    variant === "primary"
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.06)";

  return (
    <AnimatedPressable
      style={[
        styles.actionButton,
        animatedStyle,
        { backgroundColor: bgColor, borderColor, borderWidth: 1 },
      ]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
    >
      {variant === "primary" ? (
        <View style={styles.chromeSheenBar} />
      ) : null}
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={22} color="rgba(255,255,255,0.85)" />
      </View>
      <View style={styles.buttonTextContainer}>
        <ThemedText
          type="body"
          style={[styles.buttonTitle, { color: variant === "primary" ? "#FFFFFF" : "rgba(255,255,255,0.8)" }]}
        >
          {title}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.buttonSubtitle, { color: variant === "primary" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.35)" }]}
        >
          {subtitle}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
    </AnimatedPressable>
  );
}

function FeaturePill({ text, delay }: { text: string; delay: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify()}
      style={styles.featurePill}
    >
      <View style={styles.featurePillDot} />
      <ThemedText type="small" style={styles.featurePillText}>
        {text}
      </ThemedText>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hydrated, isAuthenticated, userRole } = useApp();

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    const dest = userRole === "provider" ? "ProviderTabs" : "DriverTabs";
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: dest }] }));
  }, [hydrated, isAuthenticated, userRole]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Subtle chrome ambient glows */}
      <View style={styles.glowTopLeft} pointerEvents="none" />
      <View style={styles.glowBottomRight} pointerEvents="none" />

      <View style={styles.content}>
        {/* Big chrome logo — clipped to remove built-in image margins */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.logoClip}>
          <Image
            source={require("../../assets/images/logo_chrome.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.View entering={FadeInDown.delay(200).duration(500).springify()} style={styles.taglineRow}>
          <View style={styles.taglinePill}>
            <ThemedText style={styles.taglineText}>ROADSIDE ASSISTANCE</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>Help is always closer than you think</ThemedText>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View entering={FadeInDown.delay(350).duration(500).springify()} style={styles.featuresContainer}>
          <FeaturePill text="8-min avg response" delay={400} />
          <FeaturePill text="ID-verified providers" delay={480} />
          <FeaturePill text="GPS-powered matching" delay={560} />
        </Animated.View>

        {/* Action buttons */}
        <Animated.View entering={FadeInUp.delay(450).duration(600).springify()} style={styles.actionsContainer}>
          <ActionButton
            title="I Need Help"
            subtitle="Get roadside assistance now"
            icon="alert-circle"
            onPress={() => navigation.navigate("SignUp")}
            variant="primary"
          />
          <ActionButton
            title="Sign In"
            subtitle="Already have an account?"
            icon="log-in"
            onPress={() => navigation.navigate("SignIn")}
            variant="secondary"
          />
        </Animated.View>

        {/* Provider link */}
        <Animated.View entering={FadeInUp.delay(600).duration(500).springify()}>
          <Pressable
            style={styles.providerLink}
            onPress={() => navigation.navigate("ProviderTypeSelection")}
          >
            <View style={styles.providerLinkIcon}>
              <Feather name="heart" size={15} color="rgba(192,192,192,0.7)" />
            </View>
            <View style={styles.providerLinkText}>
              <ThemedText style={styles.providerLinkTitle}>Want to earn helping others?</ThemedText>
              <ThemedText style={styles.providerLinkSub}>Become a service provider</ThemedText>
            </View>
            <Feather name="arrow-right" size={15} color="rgba(255,255,255,0.25)" />
          </Pressable>
        </Animated.View>

        {/* Terms */}
        <Animated.View entering={FadeIn.delay(800).duration(400)}>
          <ThemedText style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  glowTopLeft: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(192,192,192,0.04)",
  },
  glowBottomRight: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(160,160,180,0.03)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  logoClip: {
    height: 260,
    overflow: "hidden",
    alignItems: "center",
    marginTop: -10,
  },
  logoImage: {
    width: "100%",
    height: 460,
    marginTop: -100,
  },
  taglineRow: {
    alignItems: "center",
    gap: 6,
    marginTop: -8,
  },
  taglinePill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 4,
    color: "rgba(255,255,255,0.5)",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.07)",
  },
  featurePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(192,192,192,0.7)",
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.55)",
  },
  actionsContainer: { gap: 10 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    borderRadius: 18,
    gap: 14,
    overflow: "hidden",
    position: "relative",
  },
  chromeSheenBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonTextContainer: { flex: 1, gap: 2 },
  buttonTitle: { fontWeight: "700", fontSize: 16 },
  buttonSubtitle: { fontSize: 13 },
  providerLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  providerLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  providerLinkText: { flex: 1, gap: 1 },
  providerLinkTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.78)",
  },
  providerLinkSub: {
    fontSize: 12,
    color: "rgba(192,192,192,0.5)",
  },
  termsText: {
    textAlign: "center",
    fontSize: 11,
    paddingHorizontal: 20,
    color: "rgba(255,255,255,0.2)",
  },
});
