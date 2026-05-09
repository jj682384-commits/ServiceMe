import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground, { DARK_BG, LIGHT_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function BackgroundSettingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? DARK_BG : LIGHT_BG }]}>
      <AnimatedBackground />
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={[styles.logoCard, { backgroundColor: isDark ? "rgba(13,20,40,0.80)" : "rgba(255,255,255,0.88)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h4" style={{ fontWeight: "700", textAlign: "center" }}>
            ResqRide Design
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", lineHeight: 20 }}>
            The background adapts automatically to your device light or dark mode setting, reflecting the ResqRide logo colors.
          </ThemedText>
        </View>

        <View style={[styles.swatchRow]}>
          <View style={[styles.swatchCard, { backgroundColor: isDark ? "rgba(13,20,40,0.80)" : "rgba(255,255,255,0.88)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}>
            <View style={styles.swatchPreview}>
              <View style={[styles.swatchBg, { backgroundColor: "#04060E" }]}>
                <View style={[styles.swatchGlow, { backgroundColor: "#CC1B1B", left: 4, top: 6 }]} />
                <View style={[styles.swatchGlow, { backgroundColor: "#1A7CC7", right: 4, top: 6 }]} />
              </View>
            </View>
            <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.sm }}>Dark Mode</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12, textAlign: "center" }}>
              Deep navy with fire and ice glows
            </ThemedText>
          </View>

          <View style={[styles.swatchCard, { backgroundColor: isDark ? "rgba(13,20,40,0.80)" : "rgba(255,255,255,0.88)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}>
            <View style={styles.swatchPreview}>
              <View style={[styles.swatchBg, { backgroundColor: "#F0F4F8" }]}>
                <View style={[styles.swatchGlow, { backgroundColor: "#CC1B1B", left: 4, top: 6, opacity: 0.5 }]} />
                <View style={[styles.swatchGlow, { backgroundColor: "#1A7CC7", right: 4, top: 6, opacity: 0.5 }]} />
              </View>
            </View>
            <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.sm }}>Light Mode</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12, textAlign: "center" }}>
              Clean silver with subtle accents
            </ThemedText>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: isDark ? "rgba(13,20,40,0.75)" : "rgba(255,255,255,0.80)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm, lineHeight: 19 }}>
            Change your device appearance in system settings to switch between dark and light mode.
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoCard: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  logo: { width: 100, height: 100, marginBottom: Spacing.sm },
  swatchRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  swatchCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  swatchPreview: {
    width: "100%",
    height: 72,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  swatchBg: {
    flex: 1,
    position: "relative",
  },
  swatchGlow: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0.8,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
