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
import AnimatedBackground, { DARK_BG, LIGHT_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
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
  const { isDark, theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardBg      = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const cardBorder  = isDark ? "rgba(255,255,255,0.09)" : theme.border;
  const cardRecBorder = isDark ? "rgba(192,192,192,0.18)" : "rgba(0,0,0,0.18)";
  const sheenBg     = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const iconContBg  = isDark ? "rgba(255,255,255,0.06)" : theme.backgroundSecondary;
  const titleColor  = isDark ? "#FFF" : theme.text;
  const subtitleColor = isDark ? "rgba(255,255,255,0.45)" : theme.textSecondary;
  const featureColor  = isDark ? "rgba(255,255,255,0.65)" : theme.textSecondary;
  const badgeBg     = isDark ? "rgba(192,192,192,0.12)" : "rgba(0,0,0,0.07)";
  const badgeBorder = isDark ? "rgba(192,192,192,0.20)" : "rgba(0,0,0,0.12)";
  const badgeText   = isDark ? "rgba(255,255,255,0.7)" : theme.textSecondary;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        style={[
          styles.card, animatedStyle,
          { backgroundColor: cardBg, borderColor: recommended ? cardRecBorder : cardBorder },
        ]}
      >
        <View style={[styles.cardSheen, { backgroundColor: sheenBg }]} />

        {recommended ? (
          <View style={[styles.recommendedBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
            <ThemedText type="small" style={[styles.recommendedText, { color: badgeText }]}>Most Popular</ThemedText>
          </View>
        ) : null}

        <View style={styles.cardIconRow}>
          <View style={[styles.cardIconContainer, { backgroundColor: iconContBg, borderColor: accentColor + "30" }]}>
            <Feather name={icon} size={28} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="h3" style={{ color: titleColor, fontSize: 20, fontWeight: "700", marginBottom: 2 }}>{title}</ThemedText>
            <ThemedText type="small" style={{ color: subtitleColor, fontSize: 13 }}>{subtitle}</ThemedText>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureCheck, { backgroundColor: accentColor + "20" }]}>
                <Feather name="check" size={12} color={accentColor} />
              </View>
              <ThemedText type="small" style={[styles.featureText, { color: featureColor }]}>{feature}</ThemedText>
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
  const { isDark, theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSelectType = (providerType: ProviderType) => {
    navigation.navigate("ProviderSignUp", { providerType });
  };

  const backBg      = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const backBorder  = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";
  const backIcon    = isDark ? "rgba(255,255,255,0.8)" : theme.text;
  const taglineColor= isDark ? "rgba(192,192,192,0.5)" : theme.textSecondary;
  const titleColor  = isDark ? "#FFF" : theme.text;
  const subtitleColor = isDark ? "rgba(255,255,255,0.4)" : theme.textSecondary;

  const indAccent = isDark ? "#C0C0C0" : "#444444";
  const shopAccent = isDark ? "#A0A0A0" : "#555555";

  return (
    <View style={[styles.container, { backgroundColor: isDark ? DARK_BG : LIGHT_BG }]}>
      <AnimatedBackground />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={[styles.backButtonBg, { backgroundColor: backBg, borderColor: backBorder }]}>
            <Feather name="arrow-left" size={20} color={backIcon} />
          </View>
        </Pressable>

        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.header}>
          <ThemedText type="small" style={[styles.tagline, { color: taglineColor }]}>BECOME A PROVIDER</ThemedText>
          <ThemedText type="h2" style={{ color: titleColor, marginBottom: Spacing.sm }}>How would you like to help?</ThemedText>
          <ThemedText type="body" style={{ color: subtitleColor, lineHeight: 22 }}>
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
            accentColor={indAccent}
            recommended
            delay={300}
          />
          <ProviderTypeCard
            icon="briefcase"
            title="Roadside Shop"
            subtitle="Registered business with a team"
            features={["List your business", "Manage multiple vehicles", "Business analytics", "Priority placement"]}
            onPress={() => handleSelectType("shop")}
            accentColor={shopAccent}
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
  backButtonBg: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  header: { marginBottom: Spacing.xl },
  tagline: { fontSize: 11, fontWeight: "700", letterSpacing: 4, marginBottom: 8 },
  cardsContainer: { gap: 16 },
  card: {
    borderRadius: 22, borderWidth: 1,
    padding: 20, position: "relative", overflow: "hidden",
  },
  cardSheen: {
    position: "absolute", top: 0, left: 0, right: 0, height: 40,
  },
  recommendedBadge: {
    position: "absolute", top: 14, right: 14,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1,
  },
  recommendedText: { fontWeight: "700", fontSize: 11 },
  cardIconRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  cardIconContainer: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  featuresContainer: { gap: 10, marginBottom: 18 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, fontSize: 14 },
  selectButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 14, gap: 8,
    borderWidth: 1,
  },
  selectButtonText: { fontWeight: "700", fontSize: 15 },
});
