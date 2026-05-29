import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const PRESETS = [5, 10, 15, 25, 40, 50, 75, 100];

function getZoneLabel(miles: number): string {
  if (miles <= 10) return "Neighborhood";
  if (miles <= 25) return "City";
  if (miles <= 50) return "Metro Area";
  if (miles <= 100) return "Regional";
  return "Statewide";
}

function getZoneColor(miles: number): string {
  if (miles <= 10) return "#10B981";
  if (miles <= 25) return "#3B82F6";
  if (miles <= 50) return "#F59E0B";
  if (miles <= 100) return "#EF4444";
  return "#A855F7";
}

export default function ServiceTerritoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { currentProvider, setCurrentProvider } = useApp();

  const [radius, setRadius] = useState(currentProvider?.serviceRadiusMiles ?? 25);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!currentProvider?.id) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/providers/${currentProvider.id}/service-radius`, {
        serviceRadiusMiles: radius,
      });
      setCurrentProvider({ ...currentProvider, serviceRadiusMiles: radius });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert("Error", "Could not save service territory. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const zoneColor = getZoneColor(radius);
  const zoneLabel = getZoneLabel(radius);
  const sectionBg = theme.backgroundSecondary;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Visual radius display */}
        <View style={[styles.radiusDisplay, { backgroundColor: sectionBg }]}>
          <View style={[styles.radiusRing, styles.outerRing, { borderColor: zoneColor + "18" }]} />
          <View style={[styles.radiusRing, styles.midRing, { borderColor: zoneColor + "30" }]} />
          <View style={[styles.radiusRing, styles.innerRing, { borderColor: zoneColor + "50" }]} />
          <View style={[styles.radiusCenter, { backgroundColor: zoneColor }]}>
            <Feather name="map-pin" size={24} color="#FFF" />
          </View>
          <ThemedText style={[styles.radiusNumber, { color: zoneColor }]}>{radius}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>miles radius</ThemedText>
          <View style={[styles.zoneBadge, { backgroundColor: zoneColor + "20" }]}>
            <ThemedText type="small" style={{ color: zoneColor, fontWeight: "800" }}>{zoneLabel}</ThemedText>
          </View>
        </View>

        {/* Slider */}
        <View style={[styles.sliderCard, { backgroundColor: sectionBg }]}>
          <View style={styles.sliderLabelRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>1 mi</ThemedText>
            <ThemedText type="h4" style={{ color: zoneColor }}>{radius} miles</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>200 mi</ThemedText>
          </View>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={1}
            maximumValue={200}
            step={1}
            value={radius}
            onValueChange={(v) => { setRadius(Math.round(v)); setSaved(false); }}
            minimumTrackTintColor={zoneColor}
            maximumTrackTintColor={theme.border}
            thumbTintColor={zoneColor}
          />
        </View>

        {/* Quick preset chips */}
        <ThemedText type="small" style={[styles.presetLabel, { color: theme.textSecondary }]}>QUICK PRESETS</ThemedText>
        <View style={styles.presetGrid}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => { setRadius(p); setSaved(false); }}
              style={[
                styles.presetChip,
                {
                  backgroundColor: radius === p ? getZoneColor(p) : sectionBg,
                  borderColor: radius === p ? getZoneColor(p) : theme.border,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{ fontWeight: "700", color: radius === p ? "#FFF" : theme.text }}
              >
                {p} mi
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Coverage info */}
        <View style={[styles.infoCard, { backgroundColor: sectionBg }]}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
            Jobs within {radius} miles of your current location will be visible to you. A larger territory means more job opportunities.
          </ThemedText>
        </View>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: saved ? "#10B981" : zoneColor,
              opacity: pressed || saving ? 0.85 : 1,
            },
          ]}
        >
          <Feather name={saved ? "check" : "save"} size={20} color="#FFF" />
          <ThemedText style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: Spacing.sm }}>
            {saving ? "Saving..." : saved ? "Saved!" : "Save Territory"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  radiusDisplay: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    borderRadius: BorderRadius.md,
    position: "relative",
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  radiusRing: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 1000,
    top: "50%",
    left: "50%",
    transform: [{ translateX: -80 }, { translateY: -80 }],
  },
  outerRing: { width: 160, height: 160 },
  midRing: {
    width: 120, height: 120,
    transform: [{ translateX: -60 }, { translateY: -60 }],
  },
  innerRing: {
    width: 80, height: 80,
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  radiusCenter: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.md,
  },
  radiusNumber: { fontSize: 48, fontWeight: "900", lineHeight: 54 },
  zoneBadge: { marginTop: Spacing.sm, paddingVertical: 4, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full },
  sliderCard: { borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
  sliderLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs },
  presetLabel: { fontWeight: "700", letterSpacing: 0.8, marginBottom: Spacing.sm },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.lg },
  presetChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.xl, gap: Spacing.xs },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
});
