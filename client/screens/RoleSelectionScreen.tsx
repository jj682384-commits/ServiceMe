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
        {/* Chrome top sheen */}
        <View style={styles.cardSheen} />

        <View style={[styles.cardIconContainer, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)", borderWidth: 1 }]}>
          <Feather name={icon} size={36} color={accentColor} />
        </View>
        <ThemedText type="h3" style={styles.cardTitle}>{title}</ThemedText>
        <ThemedText type="body" style={styles.cardDescription}>{description}</ThemedText>
        <View style={styles.cardArrow}>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      {/* Ambient chrome glows */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      <View style={[styles.content, { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.header}>
          <ThemedText type="small" style={styles.tagline}>CHOOSE YOUR ROLE</ThemedText>
          <ThemedText type="h1" style={styles.title}>How can we help?</ThemedText>
          <ThemedText type="body" style={styles.subtitle}>Get help fast or earn helping others</ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <RoleCard
            icon="truck"
            title="I Need Help"
            description="Find nearby service providers instantly. Average response time: 8 minutes"
            onPress={handleDriverSelect}
            accentColor="#CC1B1B"
            delay={300}
          />
          <RoleCard
            icon="tool"
            title="Earn Helping Others"
            description="No experience needed. Help nearby drivers on your own time"
            onPress={handleProviderSelect}
            accentColor="#C0C0C0"
            delay={450}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  glowTL: {
    position: "absolute", top: -80, left: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(192,192,192,0.04)",
  },
  glowBR: {
    position: "absolute", bottom: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(160,160,180,0.03)",
  },
  content: { flex: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: Spacing["3xl"] },
  tagline: {
    color: "rgba(192,192,192,0.5)",
    fontSize: 11, fontWeight: "700", letterSpacing: 4, marginBottom: 10,
  },
  title: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", letterSpacing: -1, marginBottom: 6, textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.4)", fontSize: 15, textAlign: "center" },
  cardsContainer: { flex: 1, justifyContent: "center", gap: 16 },
  roleCard: {
    padding: 26,
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardSheen: {
    position: "absolute", top: 0, left: 0, right: 0, height: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cardIconContainer: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  cardTitle: { color: "#FFF", marginBottom: 6, fontSize: 22, fontWeight: "700" },
  cardDescription: { color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 20 },
  cardArrow: { position: "absolute", top: 26, right: 22 },
});
