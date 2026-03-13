import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground, { DARK_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import {
  useApp,
  BACKGROUND_SCHEMES,
  BackgroundColorScheme,
} from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";


function SchemePreview({ schemeKey, isSelected, onPress }: {
  schemeKey: BackgroundColorScheme;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { theme, isDark } = useTheme();
  const scheme = BACKGROUND_SCHEMES[schemeKey];

  const previewBg = isDark ? scheme.bgColor : scheme.bgColorLight;
  const previewColors = isDark ? scheme.colors : scheme.colorsLight;
  const previewOpacity = isDark ? scheme.opacityBoost : scheme.opacityBoostLight;
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.schemeCard,
        {
          backgroundColor: isDark ? "rgba(20,25,45,0.75)" : "rgba(255,255,255,0.85)",
          borderColor: isSelected ? theme.primary : cardBorder,
          borderWidth: isSelected ? 2 : 1,
          opacity: pressed ? 0.8 : 1,
          overflow: "hidden",
        },
      ]}
    >
      <View style={[styles.schemePreviewBg, { backgroundColor: previewBg }]}>
        {previewColors.slice(0, 4).map((colorPair, i) => (
          <LinearGradient
            key={i}
            colors={colorPair as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.schemeOrbLarge,
              {
                left: [4, 42, 16, 52][i],
                top: [6, 20, 40, 8][i],
                opacity: 0.55 * previewOpacity,
              },
            ]}
          />
        ))}
      </View>
      <ThemedText type="body" style={{ marginTop: Spacing.sm, fontWeight: "600" }}>
        {scheme.label}
      </ThemedText>
      {isSelected ? (
        <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
          <Feather name="check" size={12} color="#FFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function BackgroundSettingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const {
    backgroundPreferences,
    setBackgroundMode,
    setBackgroundColorScheme,
  } = useApp();

  const isAnimated = backgroundPreferences.mode === "animated";
  const scheme = BACKGROUND_SCHEMES[backgroundPreferences.colorScheme];
  const cardBg = isDark ? "rgba(20, 25, 45, 0.75)" : "rgba(255, 255, 255, 0.82)";
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  return (
    <View style={[styles.container, { backgroundColor: isAnimated ? (isDark ? scheme.bgColor : scheme.bgColorLight) : (isDark ? DARK_BG : theme.backgroundRoot) }]}>
      {isAnimated ? <AnimatedBackground customColors={isDark ? scheme.colors : scheme.colorsLight} opacityBoost={isDark ? scheme.opacityBoost : scheme.opacityBoostLight} flashColor={isDark ? scheme.flashColor : scheme.flashColorLight} isDark={isDark} /> : null}
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          BACKGROUND STYLE
        </ThemedText>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setBackgroundMode("animated")}
            style={({ pressed }) => [
              styles.modeOption,
              {
                backgroundColor: isAnimated ? theme.primary + "20" : cardBg,
                borderColor: isAnimated ? theme.primary : borderColor,
                borderWidth: isAnimated ? 2 : 1,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="activity" size={28} color={isAnimated ? theme.primary : theme.textSecondary} />
            <ThemedText
              type="body"
              style={{ marginTop: Spacing.sm, fontWeight: "600", color: isAnimated ? theme.primary : theme.text }}
            >
              Motion
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 2 }}>
              Animated orbs
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setBackgroundMode("solid")}
            style={({ pressed }) => [
              styles.modeOption,
              {
                backgroundColor: !isAnimated ? theme.primary + "20" : cardBg,
                borderColor: !isAnimated ? theme.primary : borderColor,
                borderWidth: !isAnimated ? 2 : 1,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="square" size={28} color={!isAnimated ? theme.primary : theme.textSecondary} />
            <ThemedText
              type="body"
              style={{ marginTop: Spacing.sm, fontWeight: "600", color: !isAnimated ? theme.primary : theme.text }}
            >
              Solid
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 2 }}>
              Clean, no motion
            </ThemedText>
          </Pressable>
        </View>

        {isAnimated ? (
          <>
            <ThemedText
              type="small"
              style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing["2xl"] }]}
            >
              COLOR SCHEME
            </ThemedText>
            <View style={styles.schemeGrid}>
              {(Object.keys(BACKGROUND_SCHEMES) as BackgroundColorScheme[]).map((key) => (
                <SchemePreview
                  key={key}
                  schemeKey={key}
                  isSelected={backgroundPreferences.colorScheme === key}
                  onPress={() => setBackgroundColorScheme(key)}
                />
              ))}
            </View>
          </>
        ) : null}

        <View style={[styles.infoCard, { backgroundColor: isDark ? "rgba(20, 25, 45, 0.75)" : "rgba(0, 0, 0, 0.12)", borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)", borderWidth: 1 }]}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: isDark ? theme.textSecondary : theme.text, flex: 1, marginLeft: Spacing.sm }}>
            {isAnimated
              ? "Motion backgrounds apply to the History, Messages, and Profile screens."
              : "A solid background will be used on all screens."}
          </ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  modeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  schemeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  schemeCard: {
    width: "47%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    position: "relative",
  },
  schemePreviewBg: {
    width: "100%",
    height: 70,
    borderRadius: BorderRadius.md,
    position: "relative",
    overflow: "hidden",
  },
  schemeOrbLarge: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing["2xl"],
  },
});
