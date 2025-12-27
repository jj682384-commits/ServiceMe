import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { VerificationStatus } from "@/context/AppContext";

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: "small" | "medium";
  showLabel?: boolean;
}

export function VerificationBadge({ status, size = "small", showLabel = true }: VerificationBadgeProps) {
  const { theme } = useTheme();

  const config = {
    verified: {
      icon: "check-circle" as const,
      label: "ID Verified",
      color: theme.success,
      bgColor: theme.success + "20",
    },
    pending: {
      icon: "clock" as const,
      label: "Verification Pending",
      color: theme.warning,
      bgColor: theme.warning + "20",
    },
    not_started: {
      icon: "alert-circle" as const,
      label: "Not Verified",
      color: theme.textSecondary,
      bgColor: theme.textSecondary + "20",
    },
  };

  const { icon, label, color, bgColor } = config[status];
  const iconSize = size === "small" ? 14 : 18;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, size === "medium" && styles.badgeMedium]}>
      <Feather name={icon} size={iconSize} color={color} />
      {showLabel ? (
        <ThemedText
          type={size === "small" ? "small" : "body"}
          style={[styles.label, { color }]}
        >
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  badgeMedium: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  label: {
    fontWeight: "500",
  },
});
