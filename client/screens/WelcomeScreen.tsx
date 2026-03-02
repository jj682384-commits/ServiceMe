import React, { useEffect } from "react";
import { View, StyleSheet, Image, Pressable, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const LOGO_SIZE = SCREEN_WIDTH * 1.2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface OrbConfig {
  size: number;
  colors: string[];
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  opacityRange: [number, number];
}

const ORB_CONFIGS: OrbConfig[] = [
  { size: 320, colors: ["#00D9FF", "#0088CC"], startX: -60, startY: SCREEN_HEIGHT * 0.12, driftX: 80, driftY: -30, duration: 14000, delay: 0, opacityRange: [0.04, 0.1] },
  { size: 240, colors: ["#FF6B35", "#FF3D00"], startX: SCREEN_WIDTH - 60, startY: SCREEN_HEIGHT * 0.5, driftX: -70, driftY: 40, duration: 18000, delay: 2000, opacityRange: [0.03, 0.08] },
  { size: 200, colors: ["#7B2FFF", "#4800FF"], startX: SCREEN_WIDTH * 0.4, startY: SCREEN_HEIGHT * 0.78, driftX: 50, driftY: -60, duration: 20000, delay: 4000, opacityRange: [0.03, 0.07] },
  { size: 160, colors: ["#FF6B35", "#FF8C5A"], startX: SCREEN_WIDTH * 0.7, startY: SCREEN_HEIGHT * 0.08, driftX: -40, driftY: 50, duration: 16000, delay: 1500, opacityRange: [0.03, 0.06] },
  { size: 280, colors: ["#00D9FF", "#00FFD4"], startX: SCREEN_WIDTH * 0.05, startY: SCREEN_HEIGHT * 0.42, driftX: 55, driftY: 35, duration: 22000, delay: 3000, opacityRange: [0.02, 0.06] },
  { size: 180, colors: ["#7B2FFF", "#00D9FF"], startX: SCREEN_WIDTH * 0.5, startY: SCREEN_HEIGHT * 0.3, driftX: -35, driftY: -25, duration: 17000, delay: 5000, opacityRange: [0.02, 0.05] },
];

function FloatingOrb({ config }: { config: OrbConfig }) {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration * 0.6, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration * 0.6, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }, config.delay);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 0.5, 1], [0, config.driftX, 0]);
    const translateY = interpolate(progress.value, [0, 0.5, 1], [0, config.driftY, 0]);
    const opacity = interpolate(pulse.value, [0, 1], [config.opacityRange[0], config.opacityRange[1]]);
    const scale = interpolate(pulse.value, [0, 1], [0.85, 1.15]);

    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: config.startX - config.size / 2,
          top: config.startY - config.size / 2,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          overflow: "hidden",
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={config.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: config.size, height: config.size, borderRadius: config.size / 2 }}
      />
    </Animated.View>
  );
}

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

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

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
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
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
        <ThemedText
          type="body"
          style={[styles.buttonTitle, { color: isPrimary ? "#FFF" : theme.text }]}
        >
          {title}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.buttonSubtitle, { color: isPrimary ? "rgba(255,255,255,0.8)" : theme.textSecondary }]}
        >
          {subtitle}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={isPrimary ? "rgba(255,255,255,0.7)" : theme.textSecondary} />
    </AnimatedPressable>
  );
}

function FeaturePill({ icon, text, delay }: { icon: keyof typeof Feather.glyphMap; text: string; delay: number }) {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify()}
      style={styles.featurePill}
    >
      <View style={[styles.featurePillDot, { backgroundColor: theme.secondary }]} />
      <ThemedText type="small" style={[styles.featurePillText, { color: "rgba(255,255,255,0.7)" }]}>
        {text}
      </ThemedText>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const logoRotate = useSharedValue(0);

  useEffect(() => {
    logoRotate.value = withRepeat(
      withTiming(1, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => {
    const rotate = interpolate(logoRotate.value, [0, 1], [0, 360]);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: "#060918" }]}>
      <View style={styles.animatedBackground}>
        {ORB_CONFIGS.map((config, index) => (
          <FloatingOrb key={index} config={config} />
        ))}
      </View>

      <View style={styles.backdropContainer}>
        <Animated.View style={logoAnimStyle}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={[styles.backdropLogo, { opacity: 0.04 }]}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <Animated.View
          entering={FadeInDown.delay(200).duration(600).springify()}
          style={styles.header}
        >
          <ThemedText type="small" style={styles.tagline}>
            ROADSIDE ASSISTANCE
          </ThemedText>
          <View style={styles.titleRow}>
            <ThemedText type="h1" style={styles.titleMain}>
              Service
            </ThemedText>
            <ThemedText type="h1" style={[styles.titleAccent, { color: theme.secondary }]}>
              Me
            </ThemedText>
          </View>
          <ThemedText type="body" style={styles.subtitle}>
            Help is always closer than you think
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).duration(500).springify()}
          style={styles.featuresContainer}
        >
          <FeaturePill icon="clock" text="8-min avg response" delay={500} />
          <FeaturePill icon="shield" text="ID-verified providers" delay={600} />
          <FeaturePill icon="map-pin" text="GPS-powered matching" delay={700} />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(500).duration(600).springify()}
          style={styles.actionsContainer}
        >
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

        <Animated.View entering={FadeInUp.delay(700).duration(500).springify()}>
          <Pressable
            style={styles.providerLink}
            onPress={() => navigation.navigate("SignUp", { becomeProvider: true })}
          >
            <LinearGradient
              colors={["rgba(0,217,255,0.1)", "rgba(0,217,255,0.03)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <View style={styles.providerLinkIcon}>
              <Feather name="heart" size={16} color={theme.secondary} />
            </View>
            <View style={styles.providerLinkText}>
              <ThemedText type="body" style={{ color: "#FFF", fontSize: 14, fontWeight: "600" }}>
                Want to earn helping others?
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.secondary, fontSize: 12 }}>
                Become a service provider
              </ThemedText>
            </View>
            <Feather name="arrow-right" size={16} color={theme.secondary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(900).duration(400)}>
          <ThemedText type="small" style={styles.termsText}>
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
  },
  animatedBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  backdropLogo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  tagline: {
    color: "rgba(0,217,255,0.6)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 4,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  titleMain: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  titleAccent: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    fontWeight: "400",
    marginTop: 4,
    letterSpacing: 0.3,
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
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  featurePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonTextContainer: {
    flex: 1,
    gap: 2,
  },
  buttonTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  buttonSubtitle: {
    fontSize: 13,
  },
  providerLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.15)",
    overflow: "hidden",
  },
  providerLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,217,255,0.12)",
  },
  providerLinkText: {
    flex: 1,
    gap: 1,
  },
  termsText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    paddingHorizontal: 20,
  },
});
