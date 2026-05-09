import React from "react";
import { View, StyleSheet, Image } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface HeaderTitleProps {
  title?: string;
  iconOnly?: boolean;
}

export function HeaderTitle({ title, iconOnly }: HeaderTitleProps) {
  const { theme } = useTheme();

  if (iconOnly) {
    return (
      <View style={styles.iconOnlyContainer}>
        <View style={[styles.iconGlow, { backgroundColor: theme.primary + "22" }]} />
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.iconLarge}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.icon}
        resizeMode="contain"
      />
      {title ? <ThemedText style={styles.title}>{title}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  icon: {
    width: 28,
    height: 28,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  iconOnlyContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
  },
  iconGlow: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconLarge: {
    width: 32,
    height: 32,
  },
});
