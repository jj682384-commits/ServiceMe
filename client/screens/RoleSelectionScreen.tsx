import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
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
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RoleCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
}

function RoleCard({ icon, title, description, onPress, color }: RoleCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 12, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.roleCard,
        { 
          backgroundColor: theme.backgroundDefault,
          borderWidth: 2,
          borderColor: color + "20",
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={40} color={color} />
      </View>
      <ThemedText type="h3" style={styles.cardTitle}>
        {title}
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.cardDescription, { color: theme.textSecondary }]}
      >
        {description}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function RoleSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setUserRole, setCurrentDriver, setCurrentProvider } = useApp();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleDriverSelect = () => {
    setUserRole("driver");
    setCurrentDriver({
      id: "d1",
      name: "Alex Johnson",
      phone: "+1 555-1234",
      email: "alex@email.com",
      avatarPreset: 1,
    });
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "DriverTabs" }],
      })
    );
  };

  const handleProviderSelect = () => {
    setUserRole("provider");
    setCurrentProvider({
      id: "p4",
      name: "Your Service Co",
      phone: "+1 555-9999",
      email: "you@service.com",
      rating: 5.0,
      reviewCount: 0,
      vehicleType: "service_van",
      vehicleMake: "Ford",
      vehicleModel: "Transit",
      licensePlate: "SVC-001",
      servicesOffered: ["flat_tire", "jump_start", "fuel", "lockout"],
      isAvailable: true,
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
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h1" style={[styles.welcomeTitle, { color: theme.primary }]}>
            Help is Nearby
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}
          >
            Get help fast or earn helping others
          </ThemedText>
        </View>

        <View style={styles.cardsContainer}>
          <RoleCard
            icon="truck"
            title="I Need Help"
            description="Find nearby service providers instantly. Average response time: 8 minutes"
            onPress={handleDriverSelect}
            color={theme.primary}
          />
          <RoleCard
            icon="tool"
            title="Earn Helping Others"
            description="No experience needed. Help nearby drivers on your own time. ID verification required for safety"
            onPress={handleProviderSelect}
            color={theme.secondary}
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
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    textAlign: "center",
  },
  cardsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.xl,
  },
  roleCard: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    borderWidth: 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    textAlign: "center",
  },
});
