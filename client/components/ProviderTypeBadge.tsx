import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ProviderType } from "@/context/AppContext";

interface ProviderTypeBadgeProps {
  type: ProviderType;
  size?: "small" | "medium";
}

export function ProviderTypeBadge({ type, size = "small" }: ProviderTypeBadgeProps) {
  const { theme } = useTheme();

  const config = {
    shop: {
      icon: "briefcase" as const,
      label: "Shop",
      color: theme.primary,
      bgColor: theme.primary + "20",
    },
    independent: {
      icon: "user" as const,
      label: "Independent",
      color: theme.secondary,
      bgColor: theme.secondary + "20",
    },
  };

  const { icon, label, color, bgColor } = config[type];
  const iconSize = size === "small" ? 12 : 16;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, size === "medium" && styles.badgeMedium]}>
      <Feather name={icon} size={iconSize} color={color} />
      <ThemedText
        type="small"
        style={[styles.label, { color, fontSize: size === "small" ? 10 : 12 }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  badgeMedium: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  label: {
    fontWeight: "500",
  },
});
