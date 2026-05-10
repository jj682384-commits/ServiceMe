import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ProviderType } from "@/context/AppContext";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ProviderTypeCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  features: string[];
  onPress: () => void;
  accentColor: string;
  recommended?: boolean;
  delay: number;
}

function ProviderTypeCard({ icon, title, subtitle, features, onPress, accentColor, recommended, delay }: ProviderTypeCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        style={[styles.card, animatedStyle, recommended ? styles.cardRecommended : null]}
      >
        {/* Card sheen */}
        <View style={styles.cardSheen} />

        {recommended ? (
          <View style={styles.recommendedBadge}>
            <ThemedText type="small" style={styles.recommendedText}>Most Popular</ThemedText>
          </View>
        ) : null}

        <View style={styles.cardIconRow}>
          <View style={[styles.cardIconContainer, { borderColor: accentColor + "30" }]}>
            <Feather name={icon} size={28} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="h3" style={styles.cardTitle}>{title}</ThemedText>
            <ThemedText type="small" style={styles.cardSubtitle}>{subtitle}</ThemedText>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureCheck, { backgroundColor: accentColor + "20" }]}>
                <Feather name="check" size={12} color={accentColor} />
              </View>
              <ThemedText type="small" style={styles.featureText}>{feature}</ThemedText>
            </View>
          ))}
        </View>

        <Pressable onPress={onPress} style={[styles.selectButton, { borderColor: accentColor + "30", backgroundColor: accentColor + "10" }]}>
          <ThemedText type="body" style={[styles.selectButtonText, { color: accentColor }]}>Get Started</ThemedText>
          <Feather name="arrow-right" size={18} color={accentColor} />
        </Pressable>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function ProviderTypeSelectionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleSelectType = (providerType: ProviderType) => {
    navigation.navigate("ProviderSignUp", { providerType });
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTL} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backButtonBg}>
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </Pressable>

        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.header}>
          <ThemedText type="small" style={styles.tagline}>BECOME A PROVIDER</ThemedText>
          <ThemedText type="h2" style={styles.title}>How would you like to help?</ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Choose the option that best fits you. Both require ID verification for driver safety.
          </ThemedText>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <ProviderTypeCard
            icon="user"
            title="Independent Helper"
            subtitle="Help others on your own schedule"
            features={["No experience needed", "Work when you want", "Use your own vehicle", "Quick signup process"]}
            onPress={() => handleSelectType("independent")}
            accentColor="#C0C0C0"
            recommended
            delay={300}
          />
          <ProviderTypeCard
            icon="briefcase"
            title="Roadside Shop"
            subtitle="Registered business with a team"
            features={["List your business", "Manage multiple vehicles", "Business analytics", "Priority placement"]}
            onPress={() => handleSelectType("shop")}
            accentColor="#A0A0A0"
            delay={450}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  glowTL: {
    position: "absolute", top: -80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: "rgba(192,192,192,0.04)",
  },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { marginBottom: Spacing.lg },
  backButtonBg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
    alignItems: "center", justifyContent: "center",
  },
  header: { marginBottom: Spacing.xl },
  tagline: { color: "rgba(192,192,192,0.5)", fontSize: 11, fontWeight: "700", letterSpacing: 4, marginBottom: 8 },
  title: { color: "#FFF", marginBottom: Spacing.sm },
  subtitle: { color: "rgba(255,255,255,0.4)", lineHeight: 22 },
  cardsContainer: { gap: 16 },
  card: {
    borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(255,255,255,0.04)", padding: 20, position: "relative", overflow: "hidden",
  },
  cardRecommended: { borderColor: "rgba(192,192,192,0.18)" },
  cardSheen: {
    position: "absolute", top: 0, left: 0, right: 0, height: 40,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  recommendedBadge: {
    position: "absolute", top: 14, right: 14,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
    backgroundColor: "rgba(192,192,192,0.12)",
    borderWidth: 1, borderColor: "rgba(192,192,192,0.20)",
  },
  recommendedText: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 11 },
  cardIconRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  cardIconContainer: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
  },
  cardTitle: { color: "#FFF", fontSize: 20, fontWeight: "700", marginBottom: 2 },
  cardSubtitle: { color: "rgba(255,255,255,0.45)", fontSize: 13 },
  featuresContainer: { gap: 10, marginBottom: 18 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, color: "rgba(255,255,255,0.65)", fontSize: 14 },
  selectButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 14, gap: 8,
    borderWidth: 1,
  },
  selectButtonText: { fontWeight: "700", fontSize: 15 },
});
