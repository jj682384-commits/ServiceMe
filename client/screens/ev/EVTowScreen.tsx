import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
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
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useApp, ServiceRequest } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { getEVColors } from "@/constants/evColors";
import { useStripe } from "@/lib/stripe";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const FLATBED_HOOKUP  = 85;   // EV-certified flatbed premium
const WHEELLIFT_HOOKUP = 65;  // Same as standard tow hookup
const FREE_MILES      = 5;
const RATE_PER_MILE   = 3.50;
const SERVICE_FEE     = 3.99;

const TOW_OPTIONS = [
  {
    label: "Flatbed Transport",
    desc: "Safest option for EVs. Vehicle loaded on a flatbed trailer — no wheel contact with road.",
    icon: "truck" as const,
    hookup: FLATBED_HOOKUP,
    eta: "20-35 min",
    recommended: true,
  },
  {
    label: "Wheel-Lift Tow",
    desc: "Front or rear wheels lifted. Suitable for short-distance tows to nearby charging or service.",
    icon: "arrow-up-circle" as const,
    hookup: WHEELLIFT_HOOKUP,
    eta: "15-25 min",
    recommended: false,
  },
];

const DESTINATIONS = [
  { label: "Nearest Charging Station", icon: "battery-charging" as const, miles: 0.4 },
  { label: "Nearest EV Service Center", icon: "tool" as const, miles: 2.1 },
  { label: "My Home Address", icon: "home" as const, miles: 8.3 },
  { label: "Custom Destination", icon: "map-pin" as const, miles: null },
];

function calcEVTowPrice(hookup: number, miles: number) {
  const billable = Math.max(0, miles - FREE_MILES);
  const mileageCharge = billable * RATE_PER_MILE;
  const base = hookup + mileageCharge;
  return { base, mileageCharge, billable, total: base + SERVICE_FEE };
}

export default function EVTowScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getDefaultVehicle, userLocation, currentDriver, setActiveRequest, addToHistory, addPendingJob } = useApp();
  const { isDark } = useTheme();
  const EV = getEVColors(isDark);
  const defaultVehicle = getDefaultVehicle();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [selectedTow, setSelectedTow] = useState(0);
  const [selectedDest, setSelectedDest] = useState(0);
  const [customMiles, setCustomMiles] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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

  const towOpt = TOW_OPTIONS[selectedTow];
  const dest = DESTINATIONS[selectedDest];

  // Resolve tow distance from selected destination or custom input
  const towMiles: number = dest.miles !== null
    ? dest.miles
    : parseFloat(customMiles) || 0;

  const { base, mileageCharge, billable, total } = calcEVTowPrice(towOpt.hookup, towMiles);

  const handleReviewAndPay = async () => {
    if (isProcessing) return;
    if (dest.miles === null && (!customMiles || parseFloat(customMiles) <= 0)) {
      Alert.alert("Enter Distance", "Please enter the estimated distance to your destination.");
      return;
    }
    if (!userLocation) {
      Alert.alert("Location Unavailable", "Enable location access in your device settings to submit a tow request.");
      return;
    }
    setIsProcessing(true);

    const jobId = `req-${Date.now()}`;
    const coords = userLocation;

    try {
      const piRes = await apiRequest("POST", "/api/create-payment-intent", { amount: total, jobId, serviceType: "tow" });
      const piData = await piRes.json();
      if (!piData.clientSecret) throw new Error("Payment setup failed");

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: piData.clientSecret,
        merchantDisplayName: "ResqRide",
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);

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

    const pendingJob: ServiceRequest = {
      id: jobId,
      serviceType: "tow",
      notes: `EV Tow — ${towOpt.label} to ${dest.label} (${towMiles} mi)`,
      location: { address: "Current Location", latitude: coords.latitude, longitude: coords.longitude },
      status: "pending",
      estimatedCost: base,
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

    const evTowPayload = { ...pendingJob, createdAt: pendingJob.createdAt.toISOString() };
    try { await apiRequest("POST", "/api/jobs", evTowPayload); } catch {
      await new Promise((r) => setTimeout(r, 1500));
      apiRequest("POST", "/api/jobs", evTowPayload).catch(() => {});
    }

    setIsProcessing(false);
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
      <KeyboardAwareScrollViewCompat
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

        {/* Pricing formula pill */}
        <View style={[styles.formulaRow, { backgroundColor: EV.bgCard, borderColor: EV.border }]}>
          <View style={styles.formulaPill}>
            <Animated.Text style={[styles.formulaAmount, { color: EV.white }]}>
              ${towOpt.hookup}
            </Animated.Text>
            <Animated.Text style={[styles.formulaLabel, { color: EV.whiteDim }]}>
              hookup{"\n"}
              <Animated.Text style={{ color: EV.whiteGhost, fontSize: 10 }}>first 5 mi free</Animated.Text>
            </Animated.Text>
          </View>
          <Animated.Text style={[styles.formulaOp, { color: EV.whiteGhost }]}>+</Animated.Text>
          <View style={styles.formulaPill}>
            <Animated.Text style={[styles.formulaAmount, { color: EV.white }]}>$3.50</Animated.Text>
            <Animated.Text style={[styles.formulaLabel, { color: EV.whiteDim }]}>
              per mile{"\n"}
              <Animated.Text style={{ color: EV.whiteGhost, fontSize: 10 }}>after 5 mi</Animated.Text>
            </Animated.Text>
          </View>
          <Animated.Text style={[styles.formulaOp, { color: EV.whiteGhost }]}>=</Animated.Text>
          <View style={styles.formulaPill}>
            <Animated.Text style={[styles.formulaAmount, { color: EV.neonPurple }]}>
              ${total.toFixed(2)}
            </Animated.Text>
            <Animated.Text style={[styles.formulaLabel, { color: EV.whiteDim }]}>your total</Animated.Text>
          </View>
        </View>

        <Animated.Text style={[styles.sectionTitle, { color: EV.white }]}>Tow Method</Animated.Text>

        {TOW_OPTIONS.map((option, index) => {
          const isSelected = selectedTow === index;
          const color = index === 0 ? EV.neonPurple : EV.neonBlue;
          const { total: optTotal } = calcEVTowPrice(option.hookup, towMiles);
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
                <View style={styles.optionPriceCol}>
                  <Animated.Text style={[styles.optionPrice, { color }]}>${optTotal.toFixed(2)}</Animated.Text>
                  <Animated.Text style={[styles.optionPriceSub, { color: EV.whiteGhost }]}>
                    ${option.hookup} hookup + dist.
                  </Animated.Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        <Animated.Text style={[styles.sectionTitle, { color: EV.white }]}>Destination</Animated.Text>

        {DESTINATIONS.map((d, index) => {
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
              <Feather name={d.icon} size={16} color={isSelected ? EV.neonCyan : EV.whiteDim} />
              <Animated.Text style={[styles.destName, { color: isSelected ? EV.neonCyan : EV.white }]}>
                {d.label}
              </Animated.Text>
            </Pressable>
          );
        })}

        {selectedDest === DESTINATIONS.length - 1 ? (
          <View style={[styles.customMilesRow, { borderColor: EV.border, backgroundColor: EV.bgCard }]}>
            <Feather name="navigation" size={15} color={EV.whiteDim} />
            <TextInput
              style={[styles.customMilesInput, { color: EV.white }]}
              placeholder="Estimated miles to destination"
              placeholderTextColor={EV.whiteGhost}
              keyboardType="decimal-pad"
              value={customMiles}
              onChangeText={setCustomMiles}
            />
            <Animated.Text style={[styles.customMilesUnit, { color: EV.whiteDim }]}>mi</Animated.Text>
          </View>
        ) : null}

        {/* Price breakdown */}
        <View style={[styles.priceSummary, { backgroundColor: EV.bgCard, borderColor: EV.border }]}>
          <View style={styles.priceRow}>
            <Animated.Text style={[styles.priceLabel, { color: EV.whiteDim }]}>
              {towOpt.label} hookup
            </Animated.Text>
            <Animated.Text style={[styles.priceValue, { color: EV.white }]}>${towOpt.hookup.toFixed(2)}</Animated.Text>
          </View>
          <View style={styles.priceRow}>
            <Animated.Text style={[styles.priceLabel, { color: EV.whiteDim }]}>
              {billable > 0
                ? `${billable.toFixed(1)} mi × $3.50 (after 5 free)`
                : `${towMiles.toFixed(1)} mi (within 5 free mi)`}
            </Animated.Text>
            <Animated.Text style={[styles.priceValue, { color: EV.white }]}>
              {mileageCharge > 0 ? `+$${mileageCharge.toFixed(2)}` : "$0.00"}
            </Animated.Text>
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

        <Pressable
          onPress={handleReviewAndPay}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.requestButton,
            { opacity: pressed || isProcessing ? 0.7 : 1 },
          ]}
        >
          <LinearGradient
            colors={[EV.neonPurple, EV.neonBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.requestButtonGradient}
          >
            <Feather name={isProcessing ? "loader" : "lock"} size={20} color="#FFF" />
            <Animated.Text style={styles.requestButtonText}>
              {isProcessing ? "Processing..." : "Pay & Request Tow"}
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
      </KeyboardAwareScrollViewCompat>
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
    backgroundColor: "#FFB30010", borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: "#FFB30020",
  },
  warningText: { color: "#FFB300", fontSize: 13, flex: 1, lineHeight: 18 },
  formulaRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20, gap: 6,
  },
  formulaPill: { alignItems: "center", gap: 2, flex: 1 },
  formulaAmount: { fontSize: 18, fontWeight: "800", lineHeight: 22 },
  formulaLabel: { fontSize: 11, textAlign: "center", lineHeight: 14 },
  formulaOp: { fontSize: 18, fontWeight: "700", paddingHorizontal: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14, letterSpacing: 0.2 },
  optionCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  optionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionName: { fontSize: 16, fontWeight: "700", flex: 1 },
  recoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  recoText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  optionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  optionMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  optionMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  optionMetaText: { fontSize: 12 },
  optionPriceCol: { alignItems: "flex-end" },
  optionPrice: { fontSize: 18, fontWeight: "800" },
  optionPriceSub: { fontSize: 10, marginTop: 1 },
  destCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  destDot: { width: 8, height: 8, borderRadius: 4 },
  destName: { fontSize: 14, fontWeight: "600", flex: 1 },
  destDist: { fontSize: 12 },
  customMilesRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  customMilesInput: { flex: 1, fontSize: 15, fontWeight: "500" },
  customMilesUnit: { fontSize: 14, fontWeight: "600" },
  priceSummary: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8, marginBottom: 16,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  priceLabel: { fontSize: 13, flex: 1, marginRight: 8 },
  priceValue: { fontSize: 14, fontWeight: "600" },
  priceDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  requestButton: { borderRadius: 16, overflow: "hidden", marginBottom: 10 },
  requestButtonGradient: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 18, paddingHorizontal: 20, borderRadius: 16, gap: 10,
  },
  requestButtonText: { color: "#FFF", fontSize: 17, fontWeight: "800", letterSpacing: 0.3, flex: 1 },
  requestButtonBadge: {
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  requestButtonBadgeText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 20 },
  secureText: { fontSize: 11 },
});
