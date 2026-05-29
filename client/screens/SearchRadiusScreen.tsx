import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import { Svg, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Driver presets (miles)
const DRIVER_PRESETS = [5, 10, 15, 25, 35, 50];
const DRIVER_MAX = 50;

// Provider presets (miles) — wider range since providers travel to jobs
const PROVIDER_PRESETS = [10, 25, 40, 60, 75, 100];
const PROVIDER_MAX = 100;

interface CoverageVisualProps {
  radius: number;
  maxRadius: number;
  color: string;
}

function CoverageVisual({ radius, maxRadius, color }: CoverageVisualProps) {
  const size = 180;
  const center = size / 2;
  const maxR = center - 14;

  const pct = Math.min(radius / maxRadius, 1);
  const activeR = pct * maxR;

  // Reference rings at 25%, 50%, 75%, 100% of max
  const refRings = [0.25, 0.5, 0.75, 1.0];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Reference rings */}
      {refRings.map((f, i) => (
        <Circle
          key={i}
          cx={center}
          cy={center}
          r={f * maxR}
          stroke={color + "25"}
          strokeWidth={1}
          fill="none"
          strokeDasharray="4 6"
        />
      ))}

      {/* Active fill */}
      <Circle
        cx={center}
        cy={center}
        r={activeR}
        fill={color + "12"}
        stroke={color + "60"}
        strokeWidth={2}
      />

      {/* Active ring highlight */}
      <Circle
        cx={center}
        cy={center}
        r={activeR}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray="0"
      />

      {/* Center dot with glow */}
      <Circle cx={center} cy={center} r={10} fill={color + "20"} />
      <Circle cx={center} cy={center} r={5} fill={color} />
    </Svg>
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
  const maxRadius = isProvider ? PROVIDER_MAX : DRIVER_MAX;
  const presets = isProvider ? PROVIDER_PRESETS : DRIVER_PRESETS;

  const [selectedRadius, setSelectedRadius] = useState(currentRadius);
  const sectionBg = theme.cardAnimatedBg;
  const accentColor = isProvider ? "#10B981" : "#3B82F6";

  const saveScale = useSharedValue(1);
  const saveButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const handleSave = () => {
    setRadius(selectedRadius);
    if (!isProvider) {
      apiRequest("PATCH", "/api/auth/preferences", { searchRadius: selectedRadius }).catch(() => {});
    }
    navigation.goBack();
  };

  // Estimate coverage area in sq miles (pi * r^2)
  const areaSqMiles = Math.round(Math.PI * selectedRadius * selectedRadius);
  const areaLabel = areaSqMiles >= 1000
    ? `${(areaSqMiles / 1000).toFixed(1)}k sq mi`
    : `${areaSqMiles} sq mi`;

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
          {/* Coverage visual + big number side by side */}
          <View style={styles.heroInner}>
            <CoverageVisual radius={selectedRadius} maxRadius={maxRadius} color={accentColor} />
            <View style={styles.heroStats}>
              <ThemedText style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
                {isProvider ? "SERVICE RADIUS" : "SEARCH RADIUS"}
              </ThemedText>
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4, marginBottom: 2 }}>
                <ThemedText style={{ color: "#FFFFFF", fontSize: 48, fontWeight: "900", lineHeight: 52 }}>
                  {selectedRadius}
                </ThemedText>
                <ThemedText style={{ color: accentColor, fontSize: 16, fontWeight: "700", marginBottom: 8, marginLeft: 4 }}>
                  mi
                </ThemedText>
              </View>
              <ThemedText style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                {areaLabel} coverage
              </ThemedText>
              <View style={[styles.qualityBadge, { backgroundColor: accentColor + "25", marginTop: Spacing.md }]}>
                <ThemedText style={{ color: accentColor, fontSize: 11, fontWeight: "700" }}>
                  {selectedRadius <= (maxRadius * 0.2) ? "LOCAL" :
                   selectedRadius <= (maxRadius * 0.5) ? "REGIONAL" :
                   selectedRadius <= (maxRadius * 0.8) ? "WIDE" : "EXTENDED"}
                </ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Slider section */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          DRAG TO ADJUST
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={styles.sliderContainer}>
            <ThemedText type="small" style={{ color: theme.textSecondary, minWidth: 28 }}>1</ThemedText>
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={1}
              maximumValue={maxRadius}
              step={1}
              value={selectedRadius}
              onValueChange={(v) => setSelectedRadius(Math.round(v))}
              minimumTrackTintColor={accentColor}
              maximumTrackTintColor={theme.border}
              thumbTintColor={accentColor}
            />
            <ThemedText type="small" style={{ color: theme.textSecondary, minWidth: 36, textAlign: "right" }}>
              {maxRadius}
            </ThemedText>
          </View>

          <View style={[styles.sliderTicks, { borderTopColor: theme.border }]}>
            {[0.25, 0.5, 0.75, 1.0].map((f) => {
              const val = Math.round(maxRadius * f);
              const isActive = selectedRadius >= val - (maxRadius * 0.1) && selectedRadius <= val + (maxRadius * 0.1);
              return (
                <Pressable key={val} onPress={() => setSelectedRadius(val)} style={styles.tickItem}>
                  <ThemedText
                    type="small"
                    style={{ color: isActive ? accentColor : theme.textSecondary, fontWeight: isActive ? "700" : "400" }}
                  >
                    {val}mi
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Quick select presets */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          QUICK SELECT
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg, padding: Spacing.lg }]}>
          <View style={styles.presetsRow}>
            {presets.map((val) => {
              const isSelected = selectedRadius === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => setSelectedRadius(val)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected ? accentColor : theme.border + "40",
                      borderColor: isSelected ? accentColor : "transparent",
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: isSelected ? "#FFFFFF" : theme.textSecondary, fontWeight: isSelected ? "700" : "500" }}
                  >
                    {val} mi
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Context info */}
        <View style={[styles.infoRow, { backgroundColor: sectionBg }]}>
          <View style={[styles.iconBox, { backgroundColor: accentColor + "20" }]}>
            <Feather name="info" size={16} color={accentColor} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            {isProvider
              ? selectedRadius > 50
                ? "Extended range — you'll see many jobs but travel times may be long."
                : "A comfortable range balancing job availability and travel time."
              : selectedRadius > 25
                ? "Wide search — more providers but response times may vary."
                : "Focused search — faster response times from nearby providers."}
          </ThemedText>
        </View>

        <View style={{ flex: 1 }} />

        {/* Save */}
        <AnimatedPressable
          onPress={handleSave}
          onPressIn={() => { saveScale.value = withSpring(0.97); }}
          onPressOut={() => { saveScale.value = withSpring(1); }}
          style={[styles.saveButton, { backgroundColor: accentColor }, saveButtonStyle]}
        >
          <Feather name="check" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
            Save — {selectedRadius} miles
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
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  heroStats: {
    flex: 1,
    justifyContent: "center",
  },
  qualityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  sectionLabel: {
    paddingBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sliderTicks: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tickItem: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
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
