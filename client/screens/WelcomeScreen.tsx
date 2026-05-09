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
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground, { DARK_BG, LIGHT_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionButtonProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant: "primary" | "secondary";
}

function ActionButton({ title, subtitle, icon, onPress, variant }: ActionButtonProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPrimary = variant === "primary";

  return (
    <AnimatedPressable
      style={[
        styles.actionButton,
        animatedStyle,
        isPrimary
          ? { overflow: "hidden" }
          : {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
            },
      ]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
    >
      {isPrimary ? (
        <LinearGradient
          colors={["#CC1B1B", "#A01515"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[styles.iconContainer, { backgroundColor: isPrimary ? "rgba(255,255,255,0.2)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
        <Feather name={icon} size={22} color={isPrimary ? "#FFF" : theme.secondary} />
      </View>
      <View style={styles.buttonTextContainer}>
        <ThemedText type="body" style={[styles.buttonTitle, { color: isPrimary ? "#FFF" : theme.text }]}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={[styles.buttonSubtitle, { color: isPrimary ? "rgba(255,255,255,0.75)" : theme.textSecondary }]}>
          {subtitle}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={isPrimary ? "rgba(255,255,255,0.7)" : theme.textSecondary} />
    </AnimatedPressable>
  );
}

function FeaturePill({ text, delay }: { text: string; delay: number }) {
  const { theme, isDark } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify()}
      style={[
        styles.featurePill,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <View style={[styles.featurePillDot, { backgroundColor: theme.secondary }]} />
      <ThemedText type="small" style={[styles.featurePillText, { color: isDark ? "rgba(255,255,255,0.7)" : theme.textSecondary }]}>
        {text}
      </ThemedText>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hydrated, isAuthenticated, userRole } = useApp();

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    const dest = userRole === "provider" ? "ProviderTabs" : "DriverTabs";
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: dest }] }));
  }, [hydrated, isAuthenticated, userRole]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? DARK_BG : LIGHT_BG }]}>
      <AnimatedBackground />

      {/* Large translucent logo watermark */}
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.bgLogo}
        resizeMode="contain"
        pointerEvents="none"
      />

      <View style={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg }]}>
        <Animated.View entering={FadeInDown.delay(250).duration(600).springify()} style={styles.header}>
          <ThemedText type="small" style={[styles.tagline, { color: isDark ? "rgba(0,200,255,0.7)" : theme.secondary }]}>
            ROADSIDE ASSISTANCE
          </ThemedText>
          <View style={styles.titleRow}>
            <ThemedText type="h1" style={[styles.titleMain, { color: isDark ? "#FFFFFF" : "#0D1428" }]}>Resq</ThemedText>
            <ThemedText type="h1" style={[styles.titleAccent, { color: theme.secondary }]}>Ride</ThemedText>
          </View>
          <ThemedText type="body" style={[styles.subtitle, { color: isDark ? "rgba(255,255,255,0.45)" : theme.textSecondary }]}>
            Help is always closer than you think
          </ThemedText>
          <View style={[styles.noBadge, { backgroundColor: isDark ? "rgba(0,200,255,0.08)" : "rgba(26,124,199,0.08)", borderColor: isDark ? "rgba(0,200,255,0.20)" : "rgba(26,124,199,0.20)" }]}>
            <Feather name="check-circle" size={13} color={theme.secondary} />
            <ThemedText type="small" style={[styles.noBadgeText, { color: isDark ? "rgba(0,200,255,0.85)" : theme.secondary }]}>
              No membership required — pay only when you need us
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500).springify()} style={styles.featuresContainer}>
          <FeaturePill text="8-min avg response" delay={500} />
          <FeaturePill text="ID-verified providers" delay={600} />
          <FeaturePill text="GPS-powered matching" delay={700} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(600).springify()} style={styles.actionsContainer}>
          <ActionButton title="I Need Help" subtitle="Get roadside assistance now" icon="alert-circle" onPress={() => navigation.navigate("SignUp")} variant="primary" />
          <ActionButton title="Sign In" subtitle="Already have an account?" icon="log-in" onPress={() => navigation.navigate("SignIn")} variant="secondary" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(700).duration(500).springify()}>
          <Pressable
            style={[
              styles.providerLink,
              {
                borderColor: isDark ? "rgba(26,124,199,0.20)" : "rgba(26,124,199,0.18)",
                backgroundColor: isDark ? "rgba(26,124,199,0.07)" : "rgba(26,124,199,0.06)",
              },
            ]}
            onPress={() => navigation.navigate("ProviderTypeSelection")}
          >
            <View style={[styles.providerLinkIcon, { backgroundColor: isDark ? "rgba(26,124,199,0.15)" : "rgba(26,124,199,0.10)" }]}>
              <Feather name="heart" size={16} color={theme.secondary} />
            </View>
            <View style={styles.providerLinkText}>
              <ThemedText type="body" style={{ color: isDark ? "#FFF" : theme.text, fontSize: 14, fontWeight: "600" }}>Want to earn helping others?</ThemedText>
              <ThemedText type="small" style={{ color: theme.secondary, fontSize: 12 }}>Become a service provider</ThemedText>
            </View>
            <Feather name="arrow-right" size={16} color={theme.secondary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(900).duration(400)}>
          <ThemedText type="small" style={[styles.termsText, { color: isDark ? "rgba(255,255,255,0.25)" : theme.textSecondary }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLogo: {
    position: "absolute",
    alignSelf: "center",
    top: 0,
    width: "95%",
    aspectRatio: 1,
    opacity: 0.18,
    transform: [{ translateY: -60 }],
  },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
  logo: { width: 130, height: 130 },
  header: { alignItems: "center", gap: 6 },
  tagline: { fontSize: 11, fontWeight: "700", letterSpacing: 4, marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "baseline" },
  titleMain: { fontSize: 42, fontWeight: "800", letterSpacing: -1.5 },
  titleAccent: { fontSize: 42, fontWeight: "800", letterSpacing: -1.5 },
  subtitle: { fontSize: 15, fontWeight: "400", marginTop: 4, letterSpacing: 0.3 },
  noBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  noBadgeText: { fontSize: 12, fontWeight: "500", flexShrink: 1 },
  featuresContainer: { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  featurePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  featurePillDot: { width: 5, height: 5, borderRadius: 2.5 },
  featurePillText: { fontSize: 12, fontWeight: "500" },
  actionsContainer: { gap: 12 },
  actionButton: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 16, gap: 14 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  buttonTextContainer: { flex: 1, gap: 2 },
  buttonTitle: { fontWeight: "700", fontSize: 16 },
  buttonSubtitle: { fontSize: 13 },
  providerLink: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderRadius: 16, borderWidth: 1 },
  providerLinkIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  providerLinkText: { flex: 1, gap: 1 },
  termsText: { textAlign: "center", fontSize: 11, paddingHorizontal: 20 },
});
