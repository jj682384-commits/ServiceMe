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
} from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ProviderType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ProviderTypeCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  features: string[];
  onPress: () => void;
  color: string;
  recommended?: boolean;
}

function ProviderTypeCard({ icon, title, subtitle, features, onPress, color, recommended }: ProviderTypeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        animatedStyle,
      ]}
    >
      {recommended ? (
        <View style={[styles.recommendedBadge, { backgroundColor: color }]}>
          <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            Most Popular
          </ThemedText>
        </View>
      ) : null}
      
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={32} color={color} />
      </View>
      
      <ThemedText type="h3" style={styles.cardTitle}>
        {title}
      </ThemedText>
      
      <ThemedText type="body" style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
        {subtitle}
      </ThemedText>
      
      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Feather name="check" size={16} color={theme.success} />
            <ThemedText type="small" style={[styles.featureText, { color: theme.text }]}>
              {feature}
            </ThemedText>
          </View>
        ))}
      </View>
      
      <View style={[styles.selectButton, { backgroundColor: color }]}>
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          Get Started
        </ThemedText>
        <Feather name="arrow-right" size={18} color="#FFFFFF" />
      </View>
    </AnimatedPressable>
  );
}

export default function ProviderTypeSelectionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setUserRole, setCurrentProvider } = useApp();

  const handleSelectType = (providerType: ProviderType) => {
    setUserRole("provider");
    setCurrentProvider({
      id: "p4",
      name: providerType === "shop" ? "Your Business Name" : "Your Name",
      phone: "+1 555-9999",
      email: "you@service.com",
      rating: 5.0,
      reviewCount: 0,
      vehicleType: providerType === "shop" ? "tow_truck" : "pickup",
      vehicleMake: "Ford",
      vehicleModel: providerType === "shop" ? "F-550" : "F-150",
      licensePlate: "SVC-001",
      servicesOffered: ["flat_tire", "jump_start", "fuel", "lockout"],
      isAvailable: true,
      providerType: providerType,
      verificationStatus: "verified",
    });
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "ProviderTabs" }],
      })
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
            paddingHorizontal: Spacing.lg,
          },
        ]}
      >
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>

        <View style={styles.header}>
          <ThemedText type="h2" style={styles.title}>
            How would you like to help?
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose the option that best fits you. Both require ID verification for driver safety.
          </ThemedText>
        </View>

        <View style={styles.cardsContainer}>
          <ProviderTypeCard
            icon="user"
            title="Independent Helper"
            subtitle="Help others on your own schedule"
            features={[
              "No experience needed",
              "Work when you want",
              "Use your own vehicle",
              "Quick signup process",
            ]}
            onPress={() => handleSelectType("independent")}
            color={theme.secondary}
            recommended
          />
          
          <ProviderTypeCard
            icon="briefcase"
            title="Roadside Shop"
            subtitle="Registered business with a team"
            features={[
              "List your business",
              "Manage multiple vehicles",
              "Business analytics",
              "Priority placement",
            ]}
            onPress={() => handleSelectType("shop")}
            color={theme.primary}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  backButton: {
    marginBottom: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  cardsContainer: {
    flex: 1,
    gap: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    position: "relative",
    overflow: "hidden",
  },
  recommendedBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    marginBottom: Spacing.md,
  },
  featuresContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureText: {
    flex: 1,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
});
