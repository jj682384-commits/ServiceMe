import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { getEVColors } from "@/constants/evColors";

const CHARGE_LEVELS = [
  { label: "Quick Boost", kwh: "10 kWh", time: "~15 min", price: "$10", desc: "Get enough charge to reach the nearest station" },
  { label: "Half Charge", kwh: "25 kWh", time: "~35 min", price: "$24", desc: "Enough for about 80 miles of range" },
  { label: "Full Charge", kwh: "50 kWh", time: "~60 min", price: "$44", desc: "Top off your battery to near full capacity" },
];

export default function EVMobileChargeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { getDefaultVehicle, userLocation } = useApp();
  const { isDark } = useTheme();
  const EV = getEVColors(isDark);
  const defaultVehicle = getDefaultVehicle();

  const [selectedLevel, setSelectedLevel] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const pulseAnim = useSharedValue(0.6);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
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
          colors={[EV.neonGreen + "10", EV.neonCyan + "08", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.confirmedContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.confirmedIconWrap}>
            <LinearGradient
              colors={[EV.neonGreen + "30", EV.bgCard]}
              style={styles.confirmedIconBg}
            >
              <Feather name="check-circle" size={56} color={EV.neonGreen} />
            </LinearGradient>
          </View>
          <Animated.Text style={[styles.confirmedTitle, { color: EV.white }]}>Charge Unit Dispatched</Animated.Text>
          <Animated.Text style={[styles.confirmedSub, { color: EV.whiteDim }]}>
            A mobile charging unit is heading to your location. Estimated arrival in 12-18 minutes.
          </Animated.Text>
          <View style={[styles.confirmedCard, { borderColor: EV.neonGreen + "20", backgroundColor: EV.bgCard }]}>
            <View style={styles.confirmedRow}>
              <Animated.Text style={[styles.confirmedLabel, { color: EV.whiteDim }]}>Charge Level</Animated.Text>
              <Animated.Text style={[styles.confirmedValue, { color: EV.white }]}>{CHARGE_LEVELS[selectedLevel].label}</Animated.Text>
            </View>
            <View style={[styles.confirmedDivider, { backgroundColor: EV.border }]} />
            <View style={styles.confirmedRow}>
              <Animated.Text style={[styles.confirmedLabel, { color: EV.whiteDim }]}>Energy</Animated.Text>
              <Animated.Text style={[styles.confirmedValue, { color: EV.white }]}>{CHARGE_LEVELS[selectedLevel].kwh}</Animated.Text>
            </View>
            <View style={[styles.confirmedDivider, { backgroundColor: EV.border }]} />
            <View style={styles.confirmedRow}>
              <Animated.Text style={[styles.confirmedLabel, { color: EV.whiteDim }]}>Est. Time</Animated.Text>
              <Animated.Text style={[styles.confirmedValue, { color: EV.white }]}>{CHARGE_LEVELS[selectedLevel].time}</Animated.Text>
            </View>
            <View style={[styles.confirmedDivider, { backgroundColor: EV.border }]} />
            <View style={styles.confirmedRow}>
              <Animated.Text style={[styles.confirmedLabel, { color: EV.whiteDim }]}>Cost</Animated.Text>
              <Animated.Text style={[styles.confirmedValue, { color: EV.neonGreen }]}>{CHARGE_LEVELS[selectedLevel].price}</Animated.Text>
            </View>
          </View>
          <Animated.Text style={[styles.confirmedPin, { color: EV.neonGreen }]}>
            Verification PIN: 8472
          </Animated.Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backToEvButton, { borderColor: EV.neonCyan + "40" }]}
          >
            <Animated.Text style={[styles.backToEvText, { color: EV.neonCyan }]}>Back to EV Hub</Animated.Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: EV.bg }]}>
      <LinearGradient
        colors={[EV.neonCyan + "08", EV.neonGreen + "05", "transparent"]}
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
          <Animated.Text style={[styles.headerLabel, { color: EV.neonCyan }]}>MOBILE CHARGING</Animated.Text>
          <View style={styles.headerTitleRow}>
            <Animated.View style={pulseStyle}>
              <Feather name="zap" size={24} color={EV.neonCyan} />
            </Animated.View>
            <Animated.Text style={[styles.headerTitle, { color: EV.white }]}>Charge On-Demand</Animated.Text>
          </View>
          <Animated.Text style={[styles.headerSub, { color: EV.whiteDim }]}>
            A mobile charging unit comes directly to you
          </Animated.Text>
        </View>

        {defaultVehicle ? (
          <View style={[styles.vehicleCard, { borderColor: EV.neonCyan + "25", backgroundColor: EV.bgCard }]}>
            <Feather name="battery-charging" size={20} color={EV.neonCyan} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Animated.Text style={[styles.vehicleName, { color: EV.white }]}>
                {defaultVehicle.year} {defaultVehicle.make} {defaultVehicle.model}
              </Animated.Text>
              <Animated.Text style={[styles.vehicleMeta, { color: EV.whiteDim }]}>Electric Vehicle</Animated.Text>
            </View>
            <View style={[styles.batteryMini, { backgroundColor: EV.neonGreen + "18" }]}>
              <Animated.Text style={[styles.batteryMiniText, { color: EV.neonGreen }]}>73%</Animated.Text>
            </View>
          </View>
        ) : null}

        <Animated.Text style={[styles.sectionTitle, { color: EV.white }]}>Select Charge Level</Animated.Text>

        {CHARGE_LEVELS.map((level, index) => {
          const isSelected = selectedLevel === index;
          const color = index === 0 ? EV.neonGreen : index === 1 ? EV.neonCyan : EV.neonPurple;
          return (
            <Pressable
              key={index}
              onPress={() => setSelectedLevel(index)}
              style={[
                styles.levelCard,
                {
                  borderColor: isSelected ? color + "60" : EV.border,
                  backgroundColor: isSelected ? color + "08" : EV.bgCard,
                },
              ]}
            >
              <View style={styles.levelHeader}>
                <View style={[styles.levelDot, { backgroundColor: isSelected ? color : EV.whiteGhost }]} />
                <Animated.Text style={[styles.levelName, { color: isSelected ? color : EV.white }]}>
                  {level.label}
                </Animated.Text>
                <Animated.Text style={[styles.levelPrice, { color }]}>{level.price}</Animated.Text>
              </View>
              <Animated.Text style={[styles.levelDesc, { color: EV.whiteDim }]}>{level.desc}</Animated.Text>
              <View style={styles.levelMeta}>
                <View style={styles.levelMetaItem}>
                  <Feather name="battery-charging" size={12} color={EV.whiteDim} />
                  <Animated.Text style={[styles.levelMetaText, { color: EV.whiteDim }]}>{level.kwh}</Animated.Text>
                </View>
                <View style={styles.levelMetaItem}>
                  <Feather name="clock" size={12} color={EV.whiteDim} />
                  <Animated.Text style={[styles.levelMetaText, { color: EV.whiteDim }]}>{level.time}</Animated.Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        <View style={[styles.locationCard, { borderColor: EV.border, backgroundColor: EV.bgCard }]}>
          <Feather name="map-pin" size={18} color={EV.neonGreen} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Animated.Text style={[styles.locationTitle, { color: EV.white }]}>Charge Location</Animated.Text>
            <Animated.Text style={[styles.locationAddr, { color: EV.whiteDim }]}>
              {userLocation ? "Using your current location" : "Location will be shared when requested"}
            </Animated.Text>
          </View>
          <Feather name="navigation" size={16} color={EV.neonGreen} />
        </View>

        <View style={styles.infoRow}>
          <Feather name="shield" size={14} color={EV.neonGreen} />
          <Animated.Text style={[styles.infoText, { color: EV.whiteGhost }]}>
            Certified EV charging technicians only. All units are Level 2 / CCS compatible.
          </Animated.Text>
        </View>

        <Pressable
          onPress={handleRequest}
          disabled={isRequesting}
          style={({ pressed }) => [
            styles.requestButton,
            { opacity: pressed || isRequesting ? 0.7 : 1 },
          ]}
        >
          <LinearGradient
            colors={[EV.neonCyan, EV.neonBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.requestButtonGradient}
          >
            <Feather name="zap" size={20} color="#000" />
            <Animated.Text style={styles.requestButtonText}>
              {isRequesting ? "Dispatching..." : "Request Mobile Charge"}
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
  headerLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 4,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  headerSub: { fontSize: 14, marginTop: 4 },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  vehicleName: { fontSize: 15, fontWeight: "600" },
  vehicleMeta: { fontSize: 12, marginTop: 2 },
  batteryMini: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  batteryMiniText: { fontSize: 13, fontWeight: "700" },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  levelCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  levelHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  levelName: { fontSize: 16, fontWeight: "700", flex: 1 },
  levelPrice: { fontSize: 18, fontWeight: "800" },
  levelDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  levelMeta: { flexDirection: "row", gap: 20 },
  levelMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  levelMetaText: { fontSize: 12 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  locationTitle: { fontSize: 14, fontWeight: "600" },
  locationAddr: { fontSize: 12, marginTop: 2 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  infoText: { fontSize: 12, flex: 1, lineHeight: 17 },
  requestButton: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  requestButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  requestButtonText: { color: "#000", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  confirmedContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  confirmedIconWrap: { marginBottom: 24 },
  confirmedIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmedTitle: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  confirmedSub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 28 },
  confirmedCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    width: "100%",
    marginBottom: 20,
  },
  confirmedRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  confirmedLabel: { fontSize: 14 },
  confirmedValue: { fontSize: 14, fontWeight: "600" },
  confirmedDivider: { height: StyleSheet.hairlineWidth },
  confirmedPin: { fontSize: 16, fontWeight: "700", letterSpacing: 2, marginBottom: 28 },
  backToEvButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  backToEvText: { fontSize: 15, fontWeight: "700" },
});
