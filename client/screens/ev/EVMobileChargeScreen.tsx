import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
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
import { useStripe } from "@/lib/stripe";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const CHARGE_LEVELS = [
  { label: "Quick Boost", kwh: "10 kWh", time: "~15 min", price: 10, desc: "Get enough charge to reach the nearest station" },
  { label: "Half Charge", kwh: "25 kWh", time: "~35 min", price: 24, desc: "Enough for about 80 miles of range" },
  { label: "Full Charge", kwh: "50 kWh", time: "~60 min", price: 44, desc: "Top off your battery to near full capacity" },
];

const SERVICE_FEE = 3.99;

export default function EVMobileChargeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getDefaultVehicle, userLocation, currentDriver, setActiveRequest, addToHistory, addPendingJob } = useApp();
  const { isDark } = useTheme();
  const EV = getEVColors(isDark);
  const defaultVehicle = getDefaultVehicle();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [selectedLevel, setSelectedLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const level = CHARGE_LEVELS[selectedLevel];
  const total = level.price + SERVICE_FEE;

  const handleReviewAndPay = async () => {
    if (isProcessing) return;
    if (!userLocation) {
      Alert.alert("Location Unavailable", "Enable location access in your device settings to request mobile charging.");
      return;
    }
    setIsProcessing(true);

    const jobId = `req-${Date.now()}`;
    const coords = userLocation;

    // Step 1 — Create payment intent on server
    try {
      const piRes = await fetch(
        new URL("/api/create-payment-intent", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: total, jobId, serviceType: "fuel" }),
        }
      );
      const piData = await piRes.json();
      if (!piData.clientSecret) throw new Error("Payment setup failed");

      // Step 2 — Init Stripe PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: piData.clientSecret,
        merchantDisplayName: "ResqRide",
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);

      // Step 3 — Present the native Stripe payment sheet
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        setIsProcessing(false);
        if (payError.code !== "Canceled") {
          Alert.alert("Payment Failed", payError.message);
        }
        return;
      }
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert("Payment Error", err.message || "Could not process payment. Please try again.");
      return;
    }

    // Step 4 — Payment succeeded — dispatch the job
    const pendingJob: ServiceRequest = {
      id: jobId,
      serviceType: "fuel",
      notes: `EV Mobile Charge — ${level.label} (${level.kwh}, ${level.time})`,
      location: { address: "Current Location", latitude: coords.latitude, longitude: coords.longitude },
      status: "pending",
      estimatedCost: level.price,
      serviceFee: SERVICE_FEE,
      totalCost: total,
      createdAt: new Date(),
      isEV: true,
      driver: currentDriver
        ? { id: currentDriver.id, name: currentDriver.name, phone: currentDriver.phone, email: currentDriver.email, avatarPreset: currentDriver.avatarPreset }
        : undefined,
    };

    addPendingJob(pendingJob);
    setActiveRequest(pendingJob);
    addToHistory(pendingJob);

    const evPayload = { ...pendingJob, createdAt: pendingJob.createdAt.toISOString() };
    try { await apiRequest("POST", "/api/jobs", evPayload); } catch {
      await new Promise((r) => setTimeout(r, 1500));
      apiRequest("POST", "/api/jobs", evPayload).catch(() => {});
    }

    setIsProcessing(false);
    navigation.replace("ActiveService");
  };

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

        {CHARGE_LEVELS.map((lv, index) => {
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
                  {lv.label}
                </Animated.Text>
                <Animated.Text style={[styles.levelPrice, { color }]}>${lv.price}</Animated.Text>
              </View>
              <Animated.Text style={[styles.levelDesc, { color: EV.whiteDim }]}>{lv.desc}</Animated.Text>
              <View style={styles.levelMeta}>
                <View style={styles.levelMetaItem}>
                  <Feather name="battery-charging" size={12} color={EV.whiteDim} />
                  <Animated.Text style={[styles.levelMetaText, { color: EV.whiteDim }]}>{lv.kwh}</Animated.Text>
                </View>
                <View style={styles.levelMetaItem}>
                  <Feather name="clock" size={12} color={EV.whiteDim} />
                  <Animated.Text style={[styles.levelMetaText, { color: EV.whiteDim }]}>{lv.time}</Animated.Text>
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

        {/* Price summary */}
        <View style={[styles.priceSummary, { backgroundColor: EV.bgCard, borderColor: EV.border }]}>
          <View style={styles.priceRow}>
            <Animated.Text style={[styles.priceLabel, { color: EV.whiteDim }]}>
              {level.label} ({level.kwh})
            </Animated.Text>
            <Animated.Text style={[styles.priceValue, { color: EV.white }]}>${level.price.toFixed(2)}</Animated.Text>
          </View>
          <View style={[styles.priceDivider, { backgroundColor: EV.border }]} />
          <View style={styles.priceRow}>
            <Animated.Text style={[styles.priceLabel, { color: EV.whiteDim }]}>Service fee</Animated.Text>
            <Animated.Text style={[styles.priceValue, { color: EV.whiteDim }]}>${SERVICE_FEE.toFixed(2)}</Animated.Text>
          </View>
          <View style={[styles.priceDivider, { backgroundColor: EV.border }]} />
          <View style={styles.priceRow}>
            <Animated.Text style={[styles.priceLabel, { color: EV.neonGreen, fontWeight: "700" }]}>Total</Animated.Text>
            <Animated.Text style={[styles.priceValue, { color: EV.neonGreen, fontWeight: "800", fontSize: 18 }]}>
              ${total.toFixed(2)}
            </Animated.Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Feather name="shield" size={14} color={EV.neonGreen} />
          <Animated.Text style={[styles.infoText, { color: EV.whiteGhost }]}>
            Certified EV charging technicians only. All units are Level 2 / CCS compatible.
          </Animated.Text>
        </View>

        <Pressable
          onPress={handleReviewAndPay}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.requestButton,
            { opacity: pressed || isProcessing ? 0.7 : 1 },
          ]}
        >
          <LinearGradient
            colors={[EV.neonCyan, EV.neonBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.requestButtonGradient}
          >
            <Feather name={isProcessing ? "loader" : "lock"} size={20} color="#000" />
            <Animated.Text style={styles.requestButtonText}>
              {isProcessing ? "Processing..." : "Pay & Request Charge"}
            </Animated.Text>
            <View style={styles.requestButtonBadge}>
              <Animated.Text style={styles.requestButtonBadgeText}>${total.toFixed(2)}</Animated.Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.secureRow}>
          <Feather name="lock" size={11} color={EV.whiteGhost} />
          <Animated.Text style={[styles.secureText, { color: EV.whiteGhost }]}>
            Secured by Stripe — charged only when a provider is dispatched
          </Animated.Text>
        </View>
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
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24,
  },
  vehicleName: { fontSize: 15, fontWeight: "600" },
  vehicleMeta: { fontSize: 12, marginTop: 2 },
  batteryMini: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  batteryMiniText: { fontSize: 13, fontWeight: "700" },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14, letterSpacing: 0.2 },
  levelCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  levelHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  levelName: { fontSize: 16, fontWeight: "700", flex: 1 },
  levelPrice: { fontSize: 18, fontWeight: "800" },
  levelDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  levelMeta: { flexDirection: "row", gap: 20 },
  levelMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  levelMetaText: { fontSize: 12 },
  locationCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 12, marginBottom: 20,
  },
  locationTitle: { fontSize: 14, fontWeight: "600" },
  locationAddr: { fontSize: 12, marginTop: 2 },
  priceSummary: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  priceLabel: { fontSize: 14 },
  priceValue: { fontSize: 14, fontWeight: "600" },
  priceDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 20, paddingHorizontal: 4 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 17 },
  requestButton: { borderRadius: 16, overflow: "hidden", marginBottom: 10 },
  requestButtonGradient: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 18, paddingHorizontal: 20, borderRadius: 16, gap: 10,
  },
  requestButtonText: { color: "#000", fontSize: 17, fontWeight: "800", letterSpacing: 0.3, flex: 1 },
  requestButtonBadge: {
    backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  requestButtonBadgeText: { color: "#000", fontSize: 15, fontWeight: "800" },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 20 },
  secureText: { fontSize: 11 },
});
