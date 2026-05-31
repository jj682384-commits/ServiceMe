import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RoleCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  accentColor: string;
  delay: number;
}

function RoleCard({ icon, title, description, onPress, accentColor, delay }: RoleCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const cardBg     = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const cardBorder = isDark ? "rgba(255,255,255,0.10)" : theme.border;
  const iconBg     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const iconBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const sheenBg    = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)";
  const arrowColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.25)";
  const descColor  = isDark ? "rgba(255,255,255,0.55)" : theme.textSecondary;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        style={[styles.roleCard, animatedStyle, { backgroundColor: cardBg, borderColor: cardBorder }]}
      >
        <View style={[styles.cardSheen, { backgroundColor: sheenBg }]} />
        <View style={[styles.cardIconContainer, { backgroundColor: iconBg, borderColor: iconBorder, borderWidth: 1 }]}>
          <Feather name={icon} size={36} color={accentColor} />
        </View>
        <ThemedText type="h3" style={[styles.cardTitle, { color: theme.text }]}>{title}</ThemedText>
        <ThemedText type="body" style={[styles.cardDescription, { color: descColor }]}>{description}</ThemedText>
        <View style={styles.cardArrow}>
          <Feather name="chevron-right" size={20} color={arrowColor} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { switchUserRole, setCurrentDriver, setCurrentProvider, currentDriver, currentProvider, authUser } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleDriverSelect = async () => {
    await switchUserRole("driver");
    // Only initialise driver profile if one doesn't already exist
    if (!currentDriver?.id) {
      setCurrentDriver({
        id: authUser?.id || `d-${Date.now()}`,
        name: authUser?.name || "Driver",
        phone: authUser?.phone || "",
        email: authUser?.email || "",
        avatarPreset: Math.floor(Math.random() * 5) + 1,
        membership: "free",
      });
    }
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "DriverTabs" }] }));
  };

  const handleProviderSelect = async () => {
    // If a provider profile already exists, go straight to ProviderTabs
    if (currentProvider?.servicesOffered && currentProvider.servicesOffered.length > 0) {
      await switchUserRole("provider");
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderTabs" }] }));
      return;
    }
    // No provider profile yet — send to sign-up flow
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderSignUp" }] }));
  };

  const taglineColor  = isDark ? "rgba(192,192,192,0.5)" : theme.textSecondary;
  const subtitleColor = isDark ? "rgba(255,255,255,0.4)" : theme.textSecondary;
  const glowColor1    = isDark ? "rgba(192,192,192,0.04)" : "rgba(0,0,0,0.03)";
  const glowColor2    = isDark ? "rgba(160,160,180,0.03)" : "rgba(0,0,0,0.02)";

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.glowTL, { backgroundColor: glowColor1 }]} pointerEvents="none" />
      <View style={[styles.glowBR, { backgroundColor: glowColor2 }]} pointerEvents="none" />

      <View style={[styles.content, { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.header}>
          <ThemedText type="small" style={[styles.tagline, { color: taglineColor }]}>CHOOSE YOUR ROLE</ThemedText>
          <ThemedText type="h1" style={[styles.title, { color: theme.text }]}>How can we help?</ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: subtitleColor }]}>Get help fast or earn helping others</ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <RoleCard icon="truck" title="I Need Help" description="Find nearby service providers instantly. Average response time: 8 minutes" onPress={handleDriverSelect} accentColor={theme.primary} delay={300} />
          <RoleCard icon="tool" title="Earn Helping Others" description="No experience needed. Help nearby drivers on your own time" onPress={handleProviderSelect} accentColor={isDark ? "#C0C0C0" : "#555555"} delay={450} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowTL: { position: "absolute", top: -80, left: -80, width: 280, height: 280, borderRadius: 140 },
  glowBR: { position: "absolute", bottom: -60, right: -60, width: 220, height: 220, borderRadius: 110 },
  content: { flex: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: Spacing["3xl"] },
  tagline: { fontSize: 11, fontWeight: "700", letterSpacing: 4, marginBottom: 10 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center" },
  cardsContainer: { flex: 1, justifyContent: "center", gap: 16 },
  roleCard: { padding: 26, borderRadius: 22, overflow: "hidden", position: "relative", borderWidth: 1 },
  cardSheen: { position: "absolute", top: 0, left: 0, right: 0, height: 40 },
  cardIconContainer: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  cardTitle: { marginBottom: 6, fontSize: 22, fontWeight: "700" },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  cardArrow: { position: "absolute", top: 26, right: 22 },
});
