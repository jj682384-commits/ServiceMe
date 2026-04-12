import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useApp, ServiceRequest } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { getEVColors } from "@/constants/evColors";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const TOW_OPTIONS = [
  {
    label: "Flatbed Transport",
    desc: "Safest option for EVs. Vehicle loaded on a flatbed trailer — no wheel contact with road.",
    icon: "truck" as const,
    price: "$127",
    eta: "20-35 min",
    recommended: true,
  },
  {
    label: "Wheel-Lift Tow",
    desc: "Front or rear wheels lifted. Suitable for short-distance tows to nearby charging or service.",
    icon: "arrow-up-circle" as const,
    price: "$84",
    eta: "15-25 min",
    recommended: false,
  },
];

const DESTINATIONS = [
  { label: "Nearest Charging Station", icon: "battery-charging" as const, distance: "0.4 mi" },
  { label: "Nearest EV Service Center", icon: "tool" as const, distance: "2.1 mi" },
  { label: "My Home Address", icon: "home" as const, distance: "8.3 mi" },
  { label: "Custom Destination", icon: "map-pin" as const, distance: "" },
];

export default function EVTowScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getDefaultVehicle, userLocation, currentDriver, setActiveRequest, addToHistory, addPendingJob } = useApp();
  const { isDark } = useTheme();
  const EV = getEVColors(isDark);
  const defaultVehicle = getDefaultVehicle();

  const [selectedTow, setSelectedTow] = useState(0);
  const [selectedDest, setSelectedDest] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  const pulseAnim = useSharedValue(0.5);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulseAnim);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  const handleRequest = async () => {
    setIsRequesting(true);
    const towOpt = TOW_OPTIONS[selectedTow];
    const dest   = DESTINATIONS[selectedDest];
    const cost   = parseFloat(towOpt.price.replace("$", ""));
    const jobId  = `req-${Date.now()}`;
    const coords = userLocation ?? { latitude: 37.7849, longitude: -122.4094 };

    const pendingJob: ServiceRequest = {
      id: jobId,
      serviceType: "tow",
      notes: `EV Tow — ${towOpt.label} to ${dest.label}`,
      location: { address: "Current Location", latitude: coords.latitude, longitude: coords.longitude },
      status: "pending",
      estimatedCost: cost,
      createdAt: new Date(),
      isEV: true,
      driver: currentDriver ? { id: currentDriver.id, name: currentDriver.name, phone: currentDriver.phone, email: currentDriver.email } : undefined,
    };

    // POST to server first so the job exists before polling starts
    try {
      await apiRequest("POST", "/api/jobs", {
        id: jobId,
        serviceType: "tow",
        notes: pendingJob.notes,
        location: pendingJob.location,
        estimatedCost: cost,
        driver: pendingJob.driver,
        isEV: true,
      });
    } catch { /* proceed — server may already have it or will catch up */ }

    addPendingJob(pendingJob);
    setActiveRequest(pendingJob);
    addToHistory(pendingJob);
    setIsRequesting(false);
    navigation.replace("ActiveService");
  };

  return (
    <View style={[styles.container, { backgroundColor: EV.bg }]}>
      <LinearGradient
        colors={[EV.neonPurple + "08", EV.neonBlue + "05", "transparent"]}
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
          <Animated.Text style={[styles.headerLabel, { color: EV.neonPurple }]}>EV TOW SERVICE</Animated.Text>
          <View style={styles.headerTitleRow}>
            <Animated.View style={pulseStyle}>
              <Feather name="truck" size={22} color={EV.neonPurple} />
            </Animated.View>
            <Animated.Text style={[styles.headerTitle, { color: EV.white }]}>Safe EV Transport</Animated.Text>
          </View>
          <Animated.Text style={[styles.headerSub, { color: EV.whiteDim }]}>
            EV-certified tow operators protect your battery and drivetrain
          </Animated.Text>
        </View>

        {defaultVehicle ? (
          <View style={[styles.vehicleCard, { borderColor: EV.neonPurple + "25", backgroundColor: EV.bgCard }]}>
            <Feather name="battery-charging" size={18} color={EV.neonPurple} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Animated.Text style={[styles.vehicleName, { color: EV.white }]}>
                {defaultVehicle.year} {defaultVehicle.make} {defaultVehicle.model}
              </Animated.Text>
              <Animated.Text style={[styles.vehicleMeta, { color: EV.whiteDim }]}>Electric Vehicle</Animated.Text>
            </View>
          </View>
        ) : null}

        <View style={styles.warningCard}>
          <Feather name="alert-triangle" size={16} color="#FFB300" />
          <Animated.Text style={styles.warningText}>
            EVs should not be towed with drive wheels on the ground. Flatbed transport is strongly recommended.
          </Animated.Text>
        </View>

        <Animated.Text style={[styles.sectionTitle, { color: EV.white }]}>Tow Method</Animated.Text>

        {TOW_OPTIONS.map((option, index) => {
          const isSelected = selectedTow === index;
          const color = index === 0 ? EV.neonPurple : EV.neonBlue;
          return (
            <Pressable
              key={index}
              onPress={() => setSelectedTow(index)}
              style={[
                styles.optionCard,
                {
                  borderColor: isSelected ? color + "60" : EV.border,
                  backgroundColor: isSelected ? color + "08" : EV.bgCard,
                },
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={[styles.optionDot, { backgroundColor: isSelected ? color : EV.whiteGhost }]} />
                <Feather name={option.icon} size={18} color={isSelected ? color : EV.whiteDim} />
                <Animated.Text style={[styles.optionName, { color: isSelected ? color : EV.white }]}>
                  {option.label}
                </Animated.Text>
                {option.recommended ? (
                  <View style={[styles.recoBadge, { backgroundColor: EV.neonGreen + "20" }]}>
                    <Animated.Text style={[styles.recoText, { color: EV.neonGreen }]}>RECOMMENDED</Animated.Text>
                  </View>
                ) : null}
              </View>
              <Animated.Text style={[styles.optionDesc, { color: EV.whiteDim }]}>{option.desc}</Animated.Text>
              <View style={styles.optionMeta}>
                <View style={styles.optionMetaItem}>
                  <Feather name="clock" size={12} color={EV.whiteDim} />
                  <Animated.Text style={[styles.optionMetaText, { color: EV.whiteDim }]}>{option.eta}</Animated.Text>
                </View>
                <Animated.Text style={[styles.optionPrice, { color }]}>{option.price}</Animated.Text>
              </View>
            </Pressable>
          );
        })}

        <Animated.Text style={[styles.sectionTitle, { color: EV.white }]}>Destination</Animated.Text>

        {DESTINATIONS.map((dest, index) => {
          const isSelected = selectedDest === index;
          return (
            <Pressable
              key={index}
              onPress={() => setSelectedDest(index)}
              style={[
                styles.destCard,
                {
                  borderColor: isSelected ? EV.neonCyan + "50" : EV.border,
                  backgroundColor: isSelected ? EV.neonCyan + "06" : EV.bgCard,
                },
              ]}
            >
              <View style={[styles.destDot, { backgroundColor: isSelected ? EV.neonCyan : EV.whiteGhost }]} />
              <Feather name={dest.icon} size={16} color={isSelected ? EV.neonCyan : EV.whiteDim} />
              <Animated.Text style={[styles.destName, { color: isSelected ? EV.neonCyan : EV.white }]}>
                {dest.label}
              </Animated.Text>
              {dest.distance ? (
                <Animated.Text style={[styles.destDist, { color: EV.whiteDim }]}>{dest.distance}</Animated.Text>
              ) : null}
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleRequest}
          disabled={isRequesting}
          style={({ pressed }) => [
            styles.requestButton,
            { opacity: pressed || isRequesting ? 0.7 : 1 },
          ]}
        >
          <LinearGradient
            colors={[EV.neonPurple, EV.neonBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.requestButtonGradient}
          >
            <Feather name="truck" size={20} color="#FFF" />
            <Animated.Text style={styles.requestButtonText}>
              {isRequesting ? "Dispatching..." : "Request EV Tow"}
            </Animated.Text>
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
  headerLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 4, marginBottom: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  headerSub: { fontSize: 14, marginTop: 4 },
  vehicleCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  vehicleName: { fontSize: 15, fontWeight: "600" },
  vehicleMeta: { fontSize: 12, marginTop: 2 },
  warningCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFB30010", borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: "#FFB30020",
  },
  warningText: { color: "#FFB300", fontSize: 13, flex: 1, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14, letterSpacing: 0.2 },
  optionCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  optionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionName: { fontSize: 16, fontWeight: "700", flex: 1 },
  recoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  recoText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  optionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  optionMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  optionMetaText: { fontSize: 12 },
  optionPrice: { fontSize: 18, fontWeight: "800" },
  destCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  destDot: { width: 8, height: 8, borderRadius: 4 },
  destName: { fontSize: 14, fontWeight: "600", flex: 1 },
  destDist: { fontSize: 12 },
  requestButton: { borderRadius: 16, overflow: "hidden", marginTop: 12, marginBottom: 16 },
  requestButtonGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 18, borderRadius: 16,
  },
  requestButtonText: { color: "#FFF", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  confirmedContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  confirmedIconWrap: { marginBottom: 24 },
  confirmedIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  confirmedTitle: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  confirmedSub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 28 },
  confirmedCard: {
    borderRadius: 16, borderWidth: 1, padding: 18, width: "100%", marginBottom: 20,
  },
  confirmedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  confirmedLabel: { fontSize: 14 },
  confirmedValue: { fontSize: 14, fontWeight: "600" },
  confirmedDivider: { height: StyleSheet.hairlineWidth },
  confirmedPin: { fontSize: 16, fontWeight: "700", letterSpacing: 2, marginBottom: 28 },
  backButton2: { borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  backButton2Text: { fontSize: 15, fontWeight: "700" },
});
