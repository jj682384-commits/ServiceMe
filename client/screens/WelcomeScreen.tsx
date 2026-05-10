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
import { Spacing } from "@/constants/theme";
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
  const { isDark } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bgColor = isDark
    ? variant === "primary" ? "rgba(42,42,42,1)" : "rgba(255,255,255,0.04)"
    : variant === "primary" ? "#1A1A1A"           : "rgba(0,0,0,0.04)";

  const borderColor = isDark
    ? variant === "primary" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)"
    : variant === "primary" ? "rgba(0,0,0,0.18)"       : "rgba(0,0,0,0.10)";

  const iconBg = isDark
    ? variant === "primary" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"
    : variant === "primary" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.06)";

  const iconColor  = isDark ? "rgba(255,255,255,0.85)" : variant === "primary" ? "#FFFFFF" : "rgba(0,0,0,0.7)";
  const titleColor = isDark ? "#FFFFFF" : variant === "primary" ? "#FFFFFF" : "#0D0D0D";
  const subColor   = isDark
    ? variant === "primary" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.35)"
    : variant === "primary" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)";
  const arrowColor = isDark ? "rgba(255,255,255,0.3)" : variant === "primary" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.25)";

  return (
    <AnimatedPressable
      style={[styles.actionButton, animatedStyle, { backgroundColor: bgColor, borderColor, borderWidth: 1 }]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
    >
      {variant === "primary" ? <View style={[styles.chromeSheenBar, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.10)" }]} /> : null}
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.buttonTextContainer}>
        <ThemedText type="body" style={{ fontWeight: "700", fontSize: 16, color: titleColor }}>{title}</ThemedText>
        <ThemedText type="small" style={{ fontSize: 13, color: subColor }}>{subtitle}</ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={arrowColor} />
    </AnimatedPressable>
  );
}

function FeaturePill({ text, delay }: { text: string; delay: number }) {
  const { isDark } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify()}
      style={[
        styles.featurePill,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
          borderColor:     isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <View style={[styles.featurePillDot, { backgroundColor: isDark ? "rgba(192,192,192,0.7)" : "rgba(0,0,0,0.4)" }]} />
      <ThemedText type="small" style={{ fontSize: 12, fontWeight: "500", color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" }}>
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

  const glowColor1 = isDark ? "rgba(192,192,192,0.04)" : "rgba(0,0,0,0.03)";
  const glowColor2 = isDark ? "rgba(160,160,180,0.03)" : "rgba(0,0,0,0.02)";

  const pillBg     = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const pillBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)";
  const taglineColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const subtitleColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)";
  const providerBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const providerBg     = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
  const providerIconBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const providerIconBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";
  const heartColor  = isDark ? "rgba(192,192,192,0.7)" : "rgba(0,0,0,0.45)";
  const arrowColor  = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
  const termsColor  = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)";
  const providerTitleColor = isDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.75)";
  const providerSubColor   = isDark ? "rgba(192,192,192,0.5)" : "rgba(0,0,0,0.4)";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.glowTopLeft, { backgroundColor: glowColor1 }]} pointerEvents="none" />
      <View style={[styles.glowBottomRight, { backgroundColor: glowColor2 }]} pointerEvents="none" />

      <View style={styles.content}>
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.logoClip}>
          <View style={!isDark ? styles.logoLightWrap : undefined}>
            <Image
              source={require("../../assets/images/logo_chrome.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500).springify()} style={styles.taglineRow}>
          <View style={[styles.taglinePill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
            <ThemedText style={{ fontSize: 11, fontWeight: "700", letterSpacing: 4, color: taglineColor }}>
              ROADSIDE ASSISTANCE
            </ThemedText>
          </View>
          <ThemedText style={{ fontSize: 13, color: subtitleColor, textAlign: "center" }}>
            Help is always closer than you think
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).duration(500).springify()} style={styles.featuresContainer}>
          <FeaturePill text="8-min avg response" delay={400} />
          <FeaturePill text="ID-verified providers" delay={480} />
          <FeaturePill text="GPS-powered matching" delay={560} />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(450).duration(600).springify()} style={styles.actionsContainer}>
          <ActionButton title="I Need Help" subtitle="Get roadside assistance now" icon="alert-circle" onPress={() => navigation.navigate("SignUp")} variant="primary" />
          <ActionButton title="Sign In" subtitle="Already have an account?" icon="log-in" onPress={() => navigation.navigate("SignIn")} variant="secondary" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(500).springify()}>
          <Pressable
            style={[styles.providerLink, { borderColor: providerBorder, backgroundColor: providerBg }]}
            onPress={() => navigation.navigate("ProviderTypeSelection")}
          >
            <View style={[styles.providerLinkIcon, { backgroundColor: providerIconBg, borderColor: providerIconBorder }]}>
              <Feather name="heart" size={15} color={heartColor} />
            </View>
            <View style={styles.providerLinkText}>
              <ThemedText style={{ fontSize: 14, fontWeight: "600", color: providerTitleColor }}>Want to earn helping others?</ThemedText>
              <ThemedText style={{ fontSize: 12, color: providerSubColor }}>Become a service provider</ThemedText>
            </View>
            <Feather name="arrow-right" size={15} color={arrowColor} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(800).duration(400)}>
          <ThemedText style={{ textAlign: "center", fontSize: 11, paddingHorizontal: 20, color: termsColor }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowTopLeft: { position: "absolute", top: -60, left: -60, width: 240, height: 240, borderRadius: 120 },
  glowBottomRight: { position: "absolute", bottom: -60, right: -60, width: 200, height: 200, borderRadius: 100 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between", paddingBottom: 12 },
  logoClip: { height: 260, overflow: "hidden", alignItems: "center", marginTop: -10 },
  logoImage: { width: "100%", height: 460, marginTop: -100 },
  logoLightWrap: { borderRadius: 36, overflow: "hidden", backgroundColor: "#000000" },
  taglineRow: { alignItems: "center", gap: 6, marginTop: -8 },
  taglinePill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5 },
  featuresContainer: { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  featurePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  featurePillDot: { width: 5, height: 5, borderRadius: 2.5 },
  actionsContainer: { gap: 10 },
  actionButton: { flexDirection: "row", alignItems: "center", padding: 17, borderRadius: 18, gap: 14, overflow: "hidden", position: "relative" },
  chromeSheenBar: { position: "absolute", top: 0, left: 0, right: 0, height: "50%" },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  buttonTextContainer: { flex: 1, gap: 2 },
  providerLink: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderRadius: 16, borderWidth: 1 },
  providerLinkIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  providerLinkText: { flex: 1, gap: 1 },
});
