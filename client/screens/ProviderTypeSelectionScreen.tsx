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
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground, { DARK_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { ProviderType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ProviderTypeCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  features: string[];
  onPress: () => void;
  gradientColors: string[];
  recommended?: boolean;
  delay: number;
}

function ProviderTypeCard({ icon, title, subtitle, features, onPress, gradientColors, recommended, delay }: ProviderTypeCardProps) {
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
        style={[styles.card, animatedStyle]}
      >
        {recommended ? (
          <View style={styles.recommendedBadge}>
            <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
            <ThemedText type="small" style={styles.recommendedText}>Most Popular</ThemedText>
          </View>
        ) : null}

        <View style={styles.cardIconRow}>
          <View style={styles.cardIconContainer}>
            <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
            <Feather name={icon} size={28} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="h3" style={styles.cardTitle}>{title}</ThemedText>
            <ThemedText type="small" style={styles.cardSubtitle}>{subtitle}</ThemedText>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Feather name="check" size={14} color="#00E676" />
              <ThemedText type="small" style={styles.featureText}>{feature}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.selectButton}>
          <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
          <ThemedText type="body" style={styles.selectButtonText}>Get Started</ThemedText>
          <Feather name="arrow-right" size={18} color="#FFF" />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function ProviderTypeSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleSelectType = (providerType: ProviderType) => {
    navigation.navigate("ProviderSignUp", { providerType });
  };

  return (
    <View style={[styles.container, { backgroundColor: DARK_BG }]}>
      <AnimatedBackground />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backButtonBg}>
            <Feather name="arrow-left" size={20} color="#FFF" />
          </View>
        </Pressable>

        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.header}>
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
            gradientColors={["#0050CC", "#0077B6"]}
            recommended
            delay={300}
          />
          <ProviderTypeCard
            icon="briefcase"
            title="Roadside Shop"
            subtitle="Registered business with a team"
            features={["List your business", "Manage multiple vehicles", "Business analytics", "Priority placement"]}
            onPress={() => handleSelectType("shop")}
            gradientColors={["#D92222", "#B01A1A"]}
            delay={450}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { marginBottom: Spacing.lg },
  backButtonBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  header: { marginBottom: Spacing.xl },
  title: { color: "#FFF", marginBottom: Spacing.sm },
  subtitle: { color: "rgba(255,255,255,0.5)", lineHeight: 22 },
  cardsContainer: { gap: 20 },
  card: { borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", padding: 20, position: "relative", overflow: "hidden" },
  recommendedBadge: { position: "absolute", top: 16, right: 16, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, overflow: "hidden" },
  recommendedText: { color: "#FFF", fontWeight: "700", fontSize: 11 },
  cardIconRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  cardIconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardTitle: { color: "#FFF", fontSize: 20, fontWeight: "700", marginBottom: 2 },
  cardSubtitle: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  featuresContainer: { gap: 10, marginBottom: 18 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 14 },
  selectButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, gap: 8, overflow: "hidden" },
  selectButtonText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
