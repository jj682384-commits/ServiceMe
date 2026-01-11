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

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
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
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={[
        styles.radiusOption,
        {
          backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
          borderColor: isSelected ? theme.primary : theme.border,
        },
        animatedStyle,
      ]}
    >
      <ThemedText
        type="h4"
        style={{ color: isSelected ? "#FFFFFF" : theme.text }}
      >
        {value}
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary }}
      >
        miles
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function SearchRadiusScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { userRole, searchRadius, setSearchRadius, serviceRadius, setServiceRadius } = useApp();
  const navigation = useNavigation();

  const isProvider = userRole === "provider";
  const currentRadius = isProvider ? serviceRadius : searchRadius;
  const setRadius = isProvider ? setServiceRadius : setSearchRadius;

  const [selectedRadius, setSelectedRadius] = useState(currentRadius);

  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSave = () => {
    setRadius(selectedRadius);
    navigation.goBack();
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="map-pin" size={32} color={theme.primary} />
          </View>
          <ThemedText type="h3" style={styles.title}>
            {isProvider ? "Service Radius" : "Search Radius"}
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isProvider
              ? "Set how far you're willing to travel to help drivers"
              : "Set how far to search for nearby service providers"}
          </ThemedText>
        </View>

        <View style={styles.optionsContainer}>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            SELECT DISTANCE
          </ThemedText>
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

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
            {isProvider
              ? "A larger radius means more potential jobs, but longer travel times."
              : "A larger radius shows more providers, but they may take longer to arrive."}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <AnimatedPressable
            onPress={handleSave}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            style={[
              styles.saveButton,
              { backgroundColor: theme.primary },
              animatedButtonStyle,
            ]}
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <ThemedText type="body" style={styles.saveButtonText}>
              Save Changes
            </ThemedText>
          </AnimatedPressable>
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
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  optionsContainer: {
    flex: 1,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  radiusOption: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  footer: {
    marginTop: "auto",
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
