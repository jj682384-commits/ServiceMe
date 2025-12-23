import React from "react";
import { StyleSheet, Pressable, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface CardProps {
  elevation?: "sm" | "md" | "lg" | "xl";
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  glassmorphic?: boolean;
  blurAmount?: number;
}

const springConfig: WithSpringConfig = {
  damping: 12,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const getBackgroundColorForElevation = (
  elevation: string,
  theme: any,
): string => {
  switch (elevation) {
    case "sm":
      return theme.backgroundDefault;
    case "md":
      return theme.backgroundSecondary;
    case "lg":
      return theme.backgroundTertiary;
    case "xl":
      return theme.backgroundSecondary;
    default:
      return theme.backgroundDefault;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  elevation = "md",
  title,
  description,
  children,
  onPress,
  style,
  glassmorphic = true,
  blurAmount = 10,
}: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const cardBackgroundColor = getBackgroundColorForElevation(
    elevation as string,
    theme,
  );
  const shadowStyle = Shadows[elevation as keyof typeof Shadows] || Shadows.md;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const cardContent = (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          backgroundColor: glassmorphic
            ? "transparent"
            : cardBackgroundColor,
        },
        shadowStyle,
        animatedStyle,
        style,
      ]}
    >
      {title ? (
        <ThemedText type="h4" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="small" style={styles.cardDescription}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </AnimatedPressable>
  );

  if (glassmorphic) {
    return (
      <BlurView intensity={blurAmount} style={styles.blurContainer}>
        <Animated.View
          style={[
            styles.glassmorphicOverlay,
            {
              backgroundColor: theme.glassmorphic,
              borderColor: theme.border,
            },
            animatedStyle,
          ]}
        >
          {cardContent}
        </Animated.View>
      </BlurView>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  blurContainer: {
    overflow: "hidden",
    borderRadius: BorderRadius.lg,
  },
  glassmorphicOverlay: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    overflow: "hidden",
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    opacity: 0.8,
  },
});
