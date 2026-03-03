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
import { useApp } from "@/context/AppContext";

const EV = {
  bg: "#050510",
  bgCard: "#0C0C1E",
  neonGreen: "#00FF88",
  neonCyan: "#00E5FF",
  neonBlue: "#4D7CFF",
  neonPurple: "#B44DFF",
  neonPink: "#FF4DA6",
  white: "#F0F4FF",
  whiteDim: "#8892A8",
  whiteGhost: "#4A5068",
  border: "#1A1A3A",
};

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
  const navigation = useNavigation();
  const { getDefaultVehicle, userLocation } = useApp();
  const defaultVehicle = getDefaultVehicle();

  const [selectedTow, setSelectedTow] = useState(0);
  const [selectedDest, setSelectedDest] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

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

  const handleRequest = () => {
    setIsRequesting(true);
    setTimeout(() => {
      setIsRequesting(false);
      setRequested(true);
    }, 2000);
  };

  if (requested) {
    return (
      <View style={[styles.container, { backgroundColor: EV.bg }]}>
        <LinearGradient
          colors={["#B44DFF10", "#4D7CFF08", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.confirmedContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.confirmedIconWrap}>
            <LinearGradient
              colors={[EV.neonPurple + "30", EV.bgCard]}
              style={styles.confirmedIconBg}
            >
              <Feather name="truck" size={48} color={EV.neonPurple} />
            </LinearGradient>
          </View>
          <Animated.Text style={styles.confirmedTitle}>Flatbed Dispatched</Animated.Text>
          <Animated.Text style={styles.confirmedSub}>
            An EV-certified flatbed tow truck is on the way. Your vehicle will be safely transported.
          </Animated.Text>
          <View style={[styles.confirmedCard, { borderColor: EV.neonPurple + "20" }]}>
            <View style={styles.confirmedRow}>
              <Animated.Text style={styles.confirmedLabel}>Tow Type</Animated.Text>
              <Animated.Text style={styles.confirmedValue}>{TOW_OPTIONS[selectedTow].label}</Animated.Text>
            </View>
            <View style={[styles.confirmedDivider, { backgroundColor: EV.border }]} />
            <View style={styles.confirmedRow}>
              <Animated.Text style={styles.confirmedLabel}>Destination</Animated.Text>
              <Animated.Text style={styles.confirmedValue}>{DESTINATIONS[selectedDest].label}</Animated.Text>
            </View>
            <View style={[styles.confirmedDivider, { backgroundColor: EV.border }]} />
            <View style={styles.confirmedRow}>
              <Animated.Text style={styles.confirmedLabel}>Est. Arrival</Animated.Text>
              <Animated.Text style={styles.confirmedValue}>{TOW_OPTIONS[selectedTow].eta}</Animated.Text>
            </View>
            <View style={[styles.confirmedDivider, { backgroundColor: EV.border }]} />
            <View style={styles.confirmedRow}>
              <Animated.Text style={styles.confirmedLabel}>Cost</Animated.Text>
              <Animated.Text style={[styles.confirmedValue, { color: EV.neonPurple }]}>{TOW_OPTIONS[selectedTow].price}</Animated.Text>
            </View>
          </View>
          <Animated.Text style={styles.confirmedPin}>
            Verification PIN: 6391
          </Animated.Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton2}>
            <Animated.Text style={styles.backButton2Text}>Back to EV Hub</Animated.Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: EV.bg }]}>
      <LinearGradient
        colors={["#B44DFF08", "#4D7CFF05", "transparent"]}
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
          <Animated.Text style={styles.headerLabel}>EV TOW SERVICE</Animated.Text>
          <View style={styles.headerTitleRow}>
            <Animated.View style={pulseStyle}>
              <Feather name="truck" size={22} color={EV.neonPurple} />
            </Animated.View>
            <Animated.Text style={styles.headerTitle}>Safe EV Transport</Animated.Text>
          </View>
          <Animated.Text style={styles.headerSub}>
            EV-certified tow operators protect your battery and drivetrain
          </Animated.Text>
        </View>

        {defaultVehicle ? (
          <View style={[styles.vehicleCard, { borderColor: EV.neonPurple + "25" }]}>
            <Feather name="battery-charging" size={18} color={EV.neonPurple} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Animated.Text style={styles.vehicleName}>
                {defaultVehicle.year} {defaultVehicle.make} {defaultVehicle.model}
              </Animated.Text>
              <Animated.Text style={styles.vehicleMeta}>Electric Vehicle</Animated.Text>
            </View>
          </View>
        ) : null}

        <View style={styles.warningCard}>
          <Feather name="alert-triangle" size={16} color="#FFB300" />
          <Animated.Text style={styles.warningText}>
            EVs should not be towed with drive wheels on the ground. Flatbed transport is strongly recommended.
          </Animated.Text>
        </View>

        <Animated.Text style={styles.sectionTitle}>Tow Method</Animated.Text>

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
                    <Animated.Text style={styles.recoText}>RECOMMENDED</Animated.Text>
                  </View>
                ) : null}
              </View>
              <Animated.Text style={styles.optionDesc}>{option.desc}</Animated.Text>
              <View style={styles.optionMeta}>
                <View style={styles.optionMetaItem}>
                  <Feather name="clock" size={12} color={EV.whiteDim} />
                  <Animated.Text style={styles.optionMetaText}>{option.eta}</Animated.Text>
                </View>
                <Animated.Text style={[styles.optionPrice, { color }]}>{option.price}</Animated.Text>
              </View>
            </Pressable>
          );
        })}

        <Animated.Text style={styles.sectionTitle}>Destination</Animated.Text>

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
                <Animated.Text style={styles.destDist}>{dest.distance}</Animated.Text>
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
  headerLabel: { color: "#B44DFF", fontSize: 11, fontWeight: "800", letterSpacing: 4, marginBottom: 4 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  headerTitle: { color: "#F0F4FF", fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  headerSub: { color: "#8892A8", fontSize: 14, marginTop: 4 },
  vehicleCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#0C0C1E",
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  vehicleName: { color: "#F0F4FF", fontSize: 15, fontWeight: "600" },
  vehicleMeta: { color: "#8892A8", fontSize: 12, marginTop: 2 },
  warningCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFB30010", borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: "#FFB30020",
  },
  warningText: { color: "#FFB300", fontSize: 13, flex: 1, lineHeight: 18 },
  sectionTitle: { color: "#F0F4FF", fontSize: 17, fontWeight: "700", marginBottom: 14, letterSpacing: 0.2 },
  optionCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  optionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionName: { fontSize: 16, fontWeight: "700", flex: 1 },
  recoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  recoText: { color: "#00FF88", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  optionDesc: { color: "#8892A8", fontSize: 13, lineHeight: 18, marginBottom: 10 },
  optionMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  optionMetaText: { color: "#8892A8", fontSize: 12 },
  optionPrice: { fontSize: 18, fontWeight: "800" },
  destCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  destDot: { width: 8, height: 8, borderRadius: 4 },
  destName: { fontSize: 14, fontWeight: "600", flex: 1 },
  destDist: { color: "#8892A8", fontSize: 12 },
  requestButton: { borderRadius: 16, overflow: "hidden", marginTop: 12, marginBottom: 16 },
  requestButtonGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 18, borderRadius: 16,
  },
  requestButtonText: { color: "#FFF", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  confirmedContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  confirmedIconWrap: { marginBottom: 24 },
  confirmedIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  confirmedTitle: { color: "#F0F4FF", fontSize: 24, fontWeight: "800", marginBottom: 8 },
  confirmedSub: { color: "#8892A8", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 28 },
  confirmedCard: {
    backgroundColor: "#0C0C1E", borderRadius: 16, borderWidth: 1, padding: 18, width: "100%", marginBottom: 20,
  },
  confirmedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  confirmedLabel: { color: "#8892A8", fontSize: 14 },
  confirmedValue: { color: "#F0F4FF", fontSize: 14, fontWeight: "600" },
  confirmedDivider: { height: StyleSheet.hairlineWidth },
  confirmedPin: { color: "#B44DFF", fontSize: 16, fontWeight: "700", letterSpacing: 2, marginBottom: 28 },
  backButton2: { borderWidth: 1, borderColor: "#B44DFF40", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  backButton2Text: { color: "#B44DFF", fontSize: 15, fontWeight: "700" },
});
