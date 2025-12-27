import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
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
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const isPrimary = variant === "primary";

  return (
    <AnimatedPressable
      style={[
        styles.actionButton,
        animatedStyle,
        {
          backgroundColor: isPrimary ? theme.primary : theme.backgroundSecondary,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={[styles.iconContainer, { backgroundColor: isPrimary ? "rgba(255,255,255,0.2)" : theme.backgroundDefault }]}>
        <Feather name={icon} size={24} color={isPrimary ? "#FFF" : theme.primary} />
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
      <Feather name="chevron-right" size={20} color={isPrimary ? "#FFF" : theme.textSecondary} />
    </AnimatedPressable>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
          <ThemedText type="h1" style={[styles.title, { color: theme.primary }]}>
            ServiceMe
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Roadside assistance when you need it most
          </ThemedText>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: theme.backgroundTertiary }]}>
              <Feather name="clock" size={16} color={theme.primary} />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Average 8-minute response time
            </ThemedText>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: theme.backgroundTertiary }]}>
              <Feather name="shield" size={16} color={theme.primary} />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              All providers are ID verified
            </ThemedText>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: theme.backgroundTertiary }]}>
              <Feather name="map-pin" size={16} color={theme.primary} />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              GPS-powered nearby matching
            </ThemedText>
          </View>
        </View>

        <View style={styles.actionsContainer}>
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
        </View>

        <Pressable
          style={styles.providerLink}
          onPress={() => navigation.navigate("SignUp", { becomeProvider: true })}
        >
          <View style={[styles.providerLinkIcon, { backgroundColor: theme.backgroundTertiary }]}>
            <Feather name="heart" size={18} color={theme.secondary} />
          </View>
          <View style={styles.providerLinkText}>
            <ThemedText type="body" style={{ color: theme.text }}>
              Want to earn helping others?
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.secondary }}>
              Become a service provider
            </ThemedText>
          </View>
          <Feather name="arrow-right" size={18} color={theme.secondary} />
        </Pressable>

        <ThemedText type="small" style={[styles.termsText, { color: theme.textSecondary }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
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
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 280,
  },
  featuresContainer: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsContainer: {
    gap: Spacing.md,
  },
  providerLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  providerLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  providerLinkText: {
    flex: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonTextContainer: {
    flex: 1,
    gap: 2,
  },
  buttonTitle: {
    fontWeight: "600",
  },
  buttonSubtitle: {},
  termsText: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
