import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { useApp } from "@/context/AppContext";

const EV = {
  bg: "#050510",
  bgCard: "#0C0C1E",
  neonGreen: "#00FF88",
  neonCyan: "#00E5FF",
  neonBlue: "#4D7CFF",
  neonPurple: "#B44DFF",
  neonPink: "#FF4DA6",
  neonYellow: "#FFD600",
  white: "#F0F4FF",
  whiteDim: "#8892A8",
  whiteGhost: "#4A5068",
  border: "#1A1A3A",
};

const RANGE_PRESETS = [20, 30, 50, 75];

const ALERT_TYPES = [
  { id: "low_battery", label: "Low Battery Alert", desc: "Notify when battery drops below threshold", icon: "battery" as const, color: EV.neonPink },
  { id: "charger_nearby", label: "Charger Proximity", desc: "Alert when passing near a compatible charger", icon: "map-pin" as const, color: EV.neonCyan },
  { id: "range_destination", label: "Destination Range Check", desc: "Warn if range may not reach your destination", icon: "navigation" as const, color: EV.neonPurple },
  { id: "charge_complete", label: "Charge Complete", desc: "Notify when vehicle finishes charging", icon: "check-circle" as const, color: EV.neonGreen },
];

export default function EVRangeAlertScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { getDefaultVehicle } = useApp();
  const defaultVehicle = getDefaultVehicle();

  const [rangeThreshold, setRangeThreshold] = useState(30);
  const [customRange, setCustomRange] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState<Record<string, boolean>>({
    low_battery: true,
    charger_nearby: false,
    range_destination: true,
    charge_complete: true,
  });
  const [saved, setSaved] = useState(false);

  const ringPulse = useSharedValue(0);
  useEffect(() => {
    ringPulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(ringPulse);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringPulse.value, [0, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(ringPulse.value, [0, 1], [0.95, 1.05]) }],
  }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const currentRange = 218;
  const batteryPercent = 73;
  const thresholdPercent = Math.round((rangeThreshold / currentRange) * 100);
  const isAboveThreshold = currentRange > rangeThreshold;

  return (
    <View style={[styles.container, { backgroundColor: EV.bg }]}>
      <LinearGradient
        colors={["#FFD60008", "#FF4DA605", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={EV.white} />
        </Pressable>

        <View style={styles.header}>
          <Animated.Text style={styles.headerLabel}>RANGE ALERT</Animated.Text>
          <View style={styles.headerTitleRow}>
            <Feather name="shield" size={22} color={EV.neonYellow} />
            <Animated.Text style={styles.headerTitle}>Range Monitor</Animated.Text>
          </View>
          <Animated.Text style={styles.headerSub}>
            Stay informed about your battery range at all times
          </Animated.Text>
        </View>

        <View style={[styles.gaugeCard, { borderColor: isAboveThreshold ? EV.neonGreen + "25" : EV.neonPink + "25" }]}>
          <View style={styles.gaugeCenter}>
            <Animated.View style={[styles.gaugeRing, ringStyle, { borderColor: isAboveThreshold ? EV.neonGreen + "40" : EV.neonPink + "40" }]} />
            <View style={styles.gaugeInner}>
              <Animated.Text style={[styles.gaugeValue, { color: isAboveThreshold ? EV.neonGreen : EV.neonPink }]}>
                {currentRange}
              </Animated.Text>
              <Animated.Text style={styles.gaugeUnit}>miles</Animated.Text>
            </View>
          </View>
          <View style={styles.gaugeStats}>
            <View style={styles.gaugeStat}>
              <Animated.Text style={styles.gaugeStatLabel}>Current Range</Animated.Text>
              <Animated.Text style={[styles.gaugeStatValue, { color: EV.neonGreen }]}>{currentRange} mi</Animated.Text>
            </View>
            <View style={[styles.gaugeDivider, { backgroundColor: EV.border }]} />
            <View style={styles.gaugeStat}>
              <Animated.Text style={styles.gaugeStatLabel}>Alert Threshold</Animated.Text>
              <Animated.Text style={[styles.gaugeStatValue, { color: EV.neonYellow }]}>{rangeThreshold} mi</Animated.Text>
            </View>
            <View style={[styles.gaugeDivider, { backgroundColor: EV.border }]} />
            <View style={styles.gaugeStat}>
              <Animated.Text style={styles.gaugeStatLabel}>Battery</Animated.Text>
              <Animated.Text style={[styles.gaugeStatValue, { color: EV.neonCyan }]}>{batteryPercent}%</Animated.Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isAboveThreshold ? EV.neonGreen : EV.neonPink }]} />
            <Animated.Text style={[styles.statusText, { color: isAboveThreshold ? EV.neonGreen : EV.neonPink }]}>
              {isAboveThreshold ? "Range is healthy" : "Below alert threshold"}
            </Animated.Text>
          </View>
        </View>

        <Animated.Text style={styles.sectionTitle}>Set Range Threshold</Animated.Text>
        <Animated.Text style={styles.sectionSub}>
          Get notified when your estimated range drops below this limit
        </Animated.Text>

        <View style={styles.presetsRow}>
          {RANGE_PRESETS.map((preset) => {
            const isSelected = rangeThreshold === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => { setRangeThreshold(preset); setCustomRange(""); }}
                style={[
                  styles.presetChip,
                  {
                    borderColor: isSelected ? EV.neonYellow + "60" : EV.border,
                    backgroundColor: isSelected ? EV.neonYellow + "12" : EV.bgCard,
                  },
                ]}
              >
                <Animated.Text style={[styles.presetText, { color: isSelected ? EV.neonYellow : EV.white }]}>
                  {preset} mi
                </Animated.Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.customRow, { borderColor: EV.border }]}>
          <Animated.Text style={styles.customLabel}>Custom</Animated.Text>
          <TextInput
            style={[styles.customInput, { borderColor: EV.border, color: EV.white }]}
            placeholder="e.g. 40"
            placeholderTextColor={EV.whiteGhost}
            keyboardType="number-pad"
            value={customRange}
            onChangeText={(text) => {
              setCustomRange(text);
              const num = parseInt(text, 10);
              if (num > 0 && num < 500) setRangeThreshold(num);
            }}
          />
          <Animated.Text style={styles.customUnit}>miles</Animated.Text>
        </View>

        <Animated.Text style={[styles.sectionTitle, { marginTop: 28 }]}>Alert Types</Animated.Text>

        {ALERT_TYPES.map((alertType) => {
          const isOn = alertsEnabled[alertType.id] ?? false;
          return (
            <View
              key={alertType.id}
              style={[
                styles.alertCard,
                { borderColor: isOn ? alertType.color + "30" : EV.border, backgroundColor: isOn ? alertType.color + "06" : EV.bgCard },
              ]}
            >
              <View style={[styles.alertIcon, { backgroundColor: alertType.color + "15" }]}>
                <Feather name={alertType.icon} size={18} color={alertType.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Animated.Text style={styles.alertLabel}>{alertType.label}</Animated.Text>
                <Animated.Text style={styles.alertDesc}>{alertType.desc}</Animated.Text>
              </View>
              <Switch
                value={isOn}
                onValueChange={(val) => setAlertsEnabled((prev) => ({ ...prev, [alertType.id]: val }))}
                trackColor={{ false: EV.whiteGhost, true: alertType.color + "60" }}
                thumbColor={isOn ? alertType.color : EV.whiteDim}
                ios_backgroundColor={EV.whiteGhost}
              />
            </View>
          );
        })}

        <View style={[styles.tipsCard, { borderColor: EV.neonCyan + "15" }]}>
          <View style={styles.tipsHeader}>
            <Feather name="info" size={16} color={EV.neonCyan} />
            <Animated.Text style={styles.tipsTitle}>Smart Range Tips</Animated.Text>
          </View>
          <View style={styles.tipItem}>
            <Animated.Text style={styles.tipBullet}>1</Animated.Text>
            <Animated.Text style={styles.tipText}>Set your threshold above the distance to the nearest charger for safety</Animated.Text>
          </View>
          <View style={styles.tipItem}>
            <Animated.Text style={styles.tipBullet}>2</Animated.Text>
            <Animated.Text style={styles.tipText}>Cold weather can reduce range by 20-40% — set a higher threshold in winter</Animated.Text>
          </View>
          <View style={styles.tipItem}>
            <Animated.Text style={styles.tipBullet}>3</Animated.Text>
            <Animated.Text style={styles.tipText}>Highway driving uses more energy than city — account for your route type</Animated.Text>
          </View>
        </View>

        <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveButton, { opacity: pressed ? 0.7 : 1 }]}>
          <LinearGradient
            colors={[EV.neonYellow, "#FF9500"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {saved ? (
              <>
                <Feather name="check" size={20} color="#000" />
                <Animated.Text style={styles.saveButtonText}>Alerts Saved</Animated.Text>
              </>
            ) : (
              <>
                <Feather name="shield" size={20} color="#000" />
                <Animated.Text style={styles.saveButtonText}>Save Alert Settings</Animated.Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { marginBottom: 12 },
  header: { marginBottom: 24 },
  headerLabel: { color: "#FFD600", fontSize: 11, fontWeight: "800", letterSpacing: 4, marginBottom: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  headerTitle: { color: "#F0F4FF", fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  headerSub: { color: "#8892A8", fontSize: 14, marginTop: 4 },
  gaugeCard: {
    backgroundColor: "#0C0C1E", borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 28, alignItems: "center",
  },
  gaugeCenter: { alignItems: "center", justifyContent: "center", marginBottom: 20, width: 120, height: 120 },
  gaugeRing: {
    position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 2,
  },
  gaugeInner: { alignItems: "center", justifyContent: "center" },
  gaugeValue: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  gaugeUnit: { color: "#8892A8", fontSize: 12, fontWeight: "600", letterSpacing: 2, marginTop: -2 },
  gaugeStats: { flexDirection: "row", width: "100%", justifyContent: "space-around", marginBottom: 14 },
  gaugeStat: { alignItems: "center", flex: 1 },
  gaugeStatLabel: { color: "#8892A8", fontSize: 11, marginBottom: 4 },
  gaugeStatValue: { fontSize: 15, fontWeight: "700" },
  gaugeDivider: { width: 1, height: 30 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { color: "#F0F4FF", fontSize: 17, fontWeight: "700", marginBottom: 6, letterSpacing: 0.2 },
  sectionSub: { color: "#8892A8", fontSize: 13, marginBottom: 16 },
  presetsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  presetChip: {
    flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  presetText: { fontSize: 14, fontWeight: "700" },
  customRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#0C0C1E", borderRadius: 14, borderWidth: 1, padding: 14,
  },
  customLabel: { color: "#8892A8", fontSize: 14, fontWeight: "600" },
  customInput: {
    flex: 1, backgroundColor: "#12122A", borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, textAlign: "center",
  },
  customUnit: { color: "#8892A8", fontSize: 14 },
  alertCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10,
  },
  alertIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  alertLabel: { color: "#F0F4FF", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  alertDesc: { color: "#8892A8", fontSize: 12, lineHeight: 16 },
  tipsCard: {
    backgroundColor: "#0C0C1E", borderRadius: 16, borderWidth: 1, padding: 18, marginTop: 20, marginBottom: 24,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  tipsTitle: { color: "#00E5FF", fontSize: 15, fontWeight: "700" },
  tipItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  tipBullet: {
    color: "#00E5FF", fontSize: 11, fontWeight: "800", width: 20, height: 20,
    textAlign: "center", lineHeight: 20, backgroundColor: "#00E5FF15", borderRadius: 10, overflow: "hidden",
  },
  tipText: { color: "#8892A8", fontSize: 13, flex: 1, lineHeight: 18 },
  saveButton: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  saveButtonGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 18, borderRadius: 16,
  },
  saveButtonText: { color: "#000", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
});
