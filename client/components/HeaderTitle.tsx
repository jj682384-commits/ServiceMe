import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

interface HeaderTitleProps {
  title?: string;
  iconOnly?: boolean;
}

export function HeaderTitle({ title, iconOnly }: HeaderTitleProps) {
  if (iconOnly) {
    return (
      <View style={styles.iconOnlyContainer}>
        <Image
          source={require("../../assets/images/logo_chrome.png")}
          style={styles.iconLarge}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/logo_chrome.png")}
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
    width: 32,
    height: 32,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  iconOnlyContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
  },
  iconLarge: {
    width: 36,
    height: 36,
  },
});
