import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const radiusOptions = [5, 10, 15, 20, 25, 30, 50];

interface RadiusOptionProps {
  value: number;
  isSelected: boolean;
  onSelect: () => void;
}

function RadiusOption({ value, isSelected, onSelect }: RadiusOptionProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={() => { scale.value = withSpring(0.93); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={[
        styles.radiusOption,
        {
          backgroundColor: isSelected ? theme.primary : theme.cardAnimatedBg,
          borderColor: isSelected ? theme.primary : "transparent",
        },
        animatedStyle,
      ]}
    >
      <ThemedText
        style={{ fontSize: 22, fontWeight: "800", color: isSelected ? "#FFFFFF" : theme.text }}
      >
        {value}
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: isSelected ? "rgba(255,255,255,0.75)" : theme.textSecondary, marginTop: 2 }}
      >
        miles
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function SearchRadiusScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { userRole, searchRadius, setSearchRadius, serviceRadius, setServiceRadius } = useApp();
  const navigation = useNavigation();

  const isProvider = userRole === "provider";
  const currentRadius = isProvider ? serviceRadius : searchRadius;
  const setRadius = isProvider ? setServiceRadius : setSearchRadius;

  const [selectedRadius, setSelectedRadius] = useState(currentRadius);
  const sectionBg = theme.cardAnimatedBg;

  const scale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSave = () => {
    setRadius(selectedRadius);
    if (!isProvider) {
      apiRequest("PATCH", "/api/auth/preferences", { searchRadius: selectedRadius }).catch(() => {});
    }
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
      <AnimatedBackground />
      <View
        style={{
          flex: 1,
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
      >
        {/* Hero card */}
        <LinearGradient
          colors={isProvider ? ["#1A2E1A", "#0F3020", "#082010"] : ["#0A1F3A", "#0F2855", "#081840"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={[styles.heroBadge, { backgroundColor: isProvider ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)" }]}>
            <Feather name={isProvider ? "navigation" : "map-pin"} size={26} color={isProvider ? "#10B981" : "#93C5FD"} />
          </View>
          <ThemedText style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: Spacing.md, marginBottom: Spacing.xs }}>
            {isProvider ? "Service Radius" : "Search Radius"}
          </ThemedText>
          <ThemedText type="small" style={{ color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
            {isProvider
              ? "Set how far you're willing to travel to help drivers"
              : "Set how far to search for nearby service providers"}
          </ThemedText>
          <View style={[styles.currentBadge, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <ThemedText type="small" style={{ color: "#93C5FD", fontWeight: "700" }}>
              Currently {selectedRadius} miles
            </ThemedText>
          </View>
        </LinearGradient>

        {/* Radius grid */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          SELECT DISTANCE
        </ThemedText>
        <View style={[styles.gridSection, { backgroundColor: sectionBg }]}>
          <View style={styles.optionsGrid}>
            {radiusOptions.map((value) => (
              <RadiusOption
                key={value}
                value={value}
                isSelected={selectedRadius === value}
                onSelect={() => setSelectedRadius(value)}
              />
            ))}
          </View>
        </View>

        {/* Info row */}
        <View style={[styles.infoRow, { backgroundColor: sectionBg }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.textSecondary + "20" }]}>
            <Feather name="info" size={16} color={theme.textSecondary} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            {isProvider
              ? "A larger radius means more potential jobs, but longer travel times."
              : "A larger radius shows more providers, but they may take longer to arrive."}
          </ThemedText>
        </View>

        <View style={{ flex: 1 }} />

        {/* Save button */}
        <AnimatedPressable
          onPress={handleSave}
          onPressIn={() => { scale.value = withSpring(0.97); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          style={[styles.saveButton, { backgroundColor: theme.primary }, animatedButtonStyle]}
        >
          <Feather name="check" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
            Save Changes
          </ThemedText>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  currentBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  sectionLabel: {
    paddingBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  gridSection: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  radiusOption: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    minHeight: 54,
  },
});
