import React, { useEffect } from "react";
import { View, StyleSheet, Image, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { useApp } from "@/context/AppContext";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground, { DARK_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO_SIZE = SCREEN_WIDTH * 1.2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionButtonProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant: "primary" | "secondary";
}

function ActionButton({ title, subtitle, icon, onPress, variant }: ActionButtonProps) {
  const { theme } = useTheme();
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
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            },
      ]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
    >
      {isPrimary ? (
        <LinearGradient
          colors={["#FF6B35", "#FF3D00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[styles.iconContainer, { backgroundColor: isPrimary ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)" }]}>
        <Feather name={icon} size={22} color={isPrimary ? "#FFF" : theme.secondary} />
      </View>
      <View style={styles.buttonTextContainer}>
        <ThemedText type="body" style={[styles.buttonTitle, { color: isPrimary ? "#FFF" : "#F0F2F5" }]}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={[styles.buttonSubtitle, { color: isPrimary ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)" }]}>
          {subtitle}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={isPrimary ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)"} />
    </AnimatedPressable>
  );
}

function FeaturePill({ text, delay }: { text: string; delay: number }) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()} style={styles.featurePill}>
      <View style={[styles.featurePillDot, { backgroundColor: theme.secondary }]} />
      <ThemedText type="small" style={styles.featurePillText}>{text}</ThemedText>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hydrated, isAuthenticated, userRole } = useApp();
  const logoRotate = useSharedValue(0);

  useEffect(() => {
    logoRotate.value = withRepeat(withTiming(1, { duration: 30000, easing: Easing.linear }), -1, false);
  }, []);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    const dest = userRole === "provider" ? "ProviderTabs" : "DriverTabs";
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: dest }] }));
  }, [hydrated, isAuthenticated, userRole]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(logoRotate.value, [0, 1], [0, 360])}deg` }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: DARK_BG }]}>
      <AnimatedBackground />

      <View style={styles.backdropContainer}>
        <Animated.View style={logoAnimStyle}>
          <Image source={require("../../assets/images/icon.png")} style={[styles.backdropLogo, { opacity: 0.04 }]} resizeMode="contain" />
        </Animated.View>
      </View>

      <View style={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.lg }]}>
        <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.header}>
          <ThemedText type="small" style={styles.tagline}>ROADSIDE ASSISTANCE</ThemedText>
          <View style={styles.titleRow}>
            <ThemedText type="h1" style={styles.titleMain}>Service</ThemedText>
            <ThemedText type="h1" style={[styles.titleAccent, { color: theme.secondary }]}>Me</ThemedText>
          </View>
          <ThemedText type="body" style={styles.subtitle}>Help is always closer than you think</ThemedText>
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
          <Pressable style={styles.providerLink} onPress={() => navigation.navigate("ProviderTypeSelection")}>
            <LinearGradient colors={["rgba(0,217,255,0.1)", "rgba(0,217,255,0.03)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            <View style={styles.providerLinkIcon}>
              <Feather name="heart" size={16} color={theme.secondary} />
            </View>
            <View style={styles.providerLinkText}>
              <ThemedText type="body" style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>Want to earn helping others?</ThemedText>
              <ThemedText type="small" style={{ color: theme.secondary, fontSize: 12 }}>Become a service provider</ThemedText>
            </View>
            <Feather name="arrow-right" size={16} color={theme.secondary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(900).duration(400)}>
          <ThemedText type="small" style={styles.termsText}>By continuing, you agree to our Terms of Service and Privacy Policy</ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdropContainer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  backdropLogo: { width: LOGO_SIZE, height: LOGO_SIZE },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
  header: { alignItems: "center", gap: 6, marginTop: 8 },
  tagline: { color: "rgba(0,217,255,0.6)", fontSize: 11, fontWeight: "700", letterSpacing: 4, marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "baseline" },
  titleMain: { color: "#FFFFFF", fontSize: 42, fontWeight: "800", letterSpacing: -1.5 },
  titleAccent: { fontSize: 42, fontWeight: "800", letterSpacing: -1.5 },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: "400", marginTop: 4, letterSpacing: 0.3 },
  featuresContainer: { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  featurePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  featurePillDot: { width: 5, height: 5, borderRadius: 2.5 },
  featurePillText: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.7)" },
  actionsContainer: { gap: 12 },
  actionButton: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 16, gap: 14 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  buttonTextContainer: { flex: 1, gap: 2 },
  buttonTitle: { fontWeight: "700", fontSize: 16 },
  buttonSubtitle: { fontSize: 13 },
  providerLink: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,217,255,0.15)", overflow: "hidden" },
  providerLinkIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,217,255,0.12)" },
  providerLinkText: { flex: 1, gap: 1 },
  termsText: { textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 11, paddingHorizontal: 20 },
});
