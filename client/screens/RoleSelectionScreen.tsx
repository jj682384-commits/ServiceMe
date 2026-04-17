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
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground, { DARK_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RoleCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  gradientColors: string[];
  accentColor: string;
  delay: number;
}

function RoleCard({ icon, title, description, onPress, gradientColors, accentColor, delay }: RoleCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        style={[styles.roleCard, animatedStyle]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.cardIconContainer, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name={icon} size={36} color="#FFF" />
        </View>
        <ThemedText type="h3" style={styles.cardTitle}>{title}</ThemedText>
        <ThemedText type="body" style={styles.cardDescription}>{description}</ThemedText>
        <View style={styles.cardArrow}>
          <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.7)" />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { switchUserRole, setCurrentDriver, setCurrentProvider, authUser } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleDriverSelect = async () => {
    await switchUserRole("driver");
    setCurrentDriver({
      id: authUser?.id || `d-${Date.now()}`,
      name: authUser?.name || "Driver",
      phone: authUser?.phone || "",
      email: authUser?.email || "",
      avatarPreset: Math.floor(Math.random() * 5) + 1,
      membership: "free",
    });
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "DriverTabs" }] }));
  };

  const handleProviderSelect = async () => {
    await switchUserRole("provider");
    setCurrentProvider({
      id: authUser?.id || `p-${Date.now()}`,
      name: authUser?.name || "Provider",
      phone: authUser?.phone || "",
      email: authUser?.email || "",
      rating: 0,
      reviewCount: 0,
      vehicleType: "service_van",
      vehicleMake: "",
      vehicleModel: "",
      licensePlate: "",
      servicesOffered: [],
      isAvailable: false,
      providerType: "independent",
      verificationStatus: "not_started",
      badges: [],
    });
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderTabs" }] }));
  };

  return (
    <View style={[styles.container, { backgroundColor: DARK_BG }]}>
      <AnimatedBackground />
      <View style={[styles.content, { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.header}>
          <ThemedText type="small" style={styles.tagline}>CHOOSE YOUR ROLE</ThemedText>
          <View style={styles.titleRow}>
            <ThemedText type="h1" style={styles.titleMain}>Help is </ThemedText>
            <ThemedText type="h1" style={[styles.titleAccent, { color: theme.secondary }]}>Nearby</ThemedText>
          </View>
          <ThemedText type="body" style={styles.subtitle}>Get help fast or earn helping others</ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <RoleCard
            icon="truck"
            title="I Need Help"
            description="Find nearby service providers instantly. Average response time: 8 minutes"
            onPress={handleDriverSelect}
            gradientColors={["#D92222", "#B01A1A"]}
            accentColor="#D92222"
            delay={300}
          />
          <RoleCard
            icon="tool"
            title="Earn Helping Others"
            description="No experience needed. Help nearby drivers on your own time"
            onPress={handleProviderSelect}
            gradientColors={["#0050CC", "#0077B6"]}
            accentColor="#00AAFF"
            delay={450}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: Spacing["3xl"] },
  tagline: { color: "rgba(0,217,255,0.6)", fontSize: 11, fontWeight: "700", letterSpacing: 4, marginBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "baseline" },
  titleMain: { color: "#FFFFFF", fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  titleAccent: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 16, marginTop: 6, letterSpacing: 0.3 },
  cardsContainer: { flex: 1, justifyContent: "center", gap: 20 },
  roleCard: { padding: 28, borderRadius: 20, overflow: "hidden", position: "relative" },
  cardIconContainer: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  cardTitle: { color: "#FFF", marginBottom: 6, fontSize: 22, fontWeight: "700" },
  cardDescription: { color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 20 },
  cardArrow: { position: "absolute", top: 28, right: 24 },
});
