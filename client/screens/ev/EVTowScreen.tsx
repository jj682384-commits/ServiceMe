import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Animated as RNAnimated,
  Dimensions,
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
import { useApp, ServiceRequest, PaymentMethod } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { getEVColors } from "@/constants/evColors";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { height: SCREEN_H } = Dimensions.get("window");

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

const SERVICE_FEE = 4.99;

function cardLabel(type: PaymentMethod["type"]) {
  const labels: Record<PaymentMethod["type"], string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
  };
  return labels[type];
}

export default function EVTowScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getDefaultVehicle, userLocation, currentDriver, setActiveRequest, addToHistory, addPendingJob, paymentMethods } = useApp();
  const { isDark } = useTheme();
  const EV = getEVColors(isDark);
  const defaultVehicle = getDefaultVehicle();

  const [selectedTow, setSelectedTow] = useState(0);
  const [selectedDest, setSelectedDest] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sheetAnim = useRef(new RNAnimated.Value(SCREEN_H)).current;

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

  useEffect(() => {
    if (showPayment) {
      const def = paymentMethods.find((p) => p.isDefault) ?? paymentMethods[0] ?? null;
      setSelectedPaymentId(def?.id ?? null);
      RNAnimated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 60,
      }).start();
    } else {
      RNAnimated.timing(sheetAnim, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showPayment]);

  const towOpt = TOW_OPTIONS[selectedTow];
  const dest = DESTINATIONS[selectedDest];
  const cost = parseFloat(towOpt.price.replace("$", ""));
  const total = cost + SERVICE_FEE;

  const handleDispatch = async () => {
    setIsProcessing(true);
    const jobId = `req-${Date.now()}`;
    const coords = userLocation ?? { latitude: 37.7849, longitude: -122.4094 };

    const pendingJob: ServiceRequest = {
      id: jobId,
      serviceType: "tow",
      notes: `EV Tow — ${towOpt.label} to ${dest.label}`,
      location: { address: "Current Location", latitude: coords.latitude, longitude: coords.longitude },
      status: "pending",
      estimatedCost: total,
      createdAt: new Date(),
      isEV: true,
      driver: currentDriver
        ? { id: currentDriver.id, name: currentDriver.name, phone: currentDriver.phone, email: currentDriver.email }
        : undefined,
    };

    try {
      await apiRequest("POST", "/api/jobs", {
        id: jobId,
        serviceType: "tow",
        notes: pendingJob.notes,
        location: pendingJob.location,
        estimatedCost: total,
        driver: pendingJob.driver,
        isEV: true,
      });
    } catch { /* proceed */ }

    addPendingJob(pendingJob);
    setActiveRequest(pendingJob);
    addToHistory(pendingJob);
    setIsProcessing(false);
    setShowPayment(false);
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
              {d.distance ? (
                <Animated.Text style={[styles.destDist, { color: EV.whiteDim }]}>{d.distance}</Animated.Text>
              ) : null}
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => setShowPayment(true)}
          style={({ pressed }) => [styles.requestButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <LinearGradient
            colors={[EV.neonPurple, EV.neonBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.requestButtonGradient}
          >
            <Feather name="truck" size={20} color="#FFF" />
            <Animated.Text style={styles.requestButtonText}>Review & Pay</Animated.Text>
            <Animated.Text style={[styles.requestButtonPrice, { color: "#FFF" }]}>{towOpt.price}</Animated.Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>

      {/* Payment checkout sheet */}
      <Modal
        visible={showPayment}
        transparent
        animationType="none"
        onRequestClose={() => setShowPayment(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPayment(false)}>
          <RNAnimated.View
            style={[
              styles.sheet,
              { backgroundColor: EV.bgCard, paddingBottom: insets.bottom + 12 },
              { transform: [{ translateY: sheetAnim }] },
            ]}
          >
            <Pressable onPress={() => {}}>
              <View style={[styles.sheetHandle, { backgroundColor: EV.border }]} />

              <View style={styles.sheetHeader}>
                <Animated.Text style={[styles.sheetTitle, { color: EV.white }]}>Order Summary</Animated.Text>
                <Pressable onPress={() => setShowPayment(false)} hitSlop={12}>
                  <Feather name="x" size={22} color={EV.whiteDim} />
                </Pressable>
              </View>

              {/* Service details */}
              <View style={[styles.summaryCard, { backgroundColor: EV.bg, borderColor: EV.border }]}>
                <View style={styles.summaryRow}>
                  <Feather name="truck" size={16} color={EV.neonPurple} />
                  <Animated.Text style={[styles.summaryLabel, { color: EV.white }]}>
                    {towOpt.label} to {dest.label}
                  </Animated.Text>
                  <Animated.Text style={[styles.summaryValue, { color: EV.white }]}>{towOpt.price}</Animated.Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: EV.border }]} />
                <View style={styles.summaryRow}>
                  <Feather name="server" size={16} color={EV.whiteDim} />
                  <Animated.Text style={[styles.summaryLabel, { color: EV.whiteDim }]}>Service fee</Animated.Text>
                  <Animated.Text style={[styles.summaryValue, { color: EV.whiteDim }]}>
                    ${SERVICE_FEE.toFixed(2)}
                  </Animated.Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: EV.border }]} />
                <View style={styles.summaryRow}>
                  <Feather name="check-circle" size={16} color={EV.neonGreen} />
                  <Animated.Text style={[styles.summaryLabel, { color: EV.neonGreen, fontWeight: "700" }]}>
                    Total
                  </Animated.Text>
                  <Animated.Text style={[styles.summaryValue, { color: EV.neonGreen, fontWeight: "800", fontSize: 17 }]}>
                    ${total.toFixed(2)}
                  </Animated.Text>
                </View>
              </View>

              <Animated.Text style={[styles.sheetSection, { color: EV.whiteDim }]}>Payment Method</Animated.Text>

              {paymentMethods.length === 0 ? (
                <View style={[styles.noCardBox, { borderColor: EV.border, backgroundColor: EV.bg }]}>
                  <Feather name="credit-card" size={22} color={EV.whiteDim} />
                  <Animated.Text style={[styles.noCardText, { color: EV.whiteDim }]}>
                    No saved payment methods
                  </Animated.Text>
                  <Pressable
                    onPress={() => {
                      setShowPayment(false);
                      navigation.navigate("PaymentMethods" as any);
                    }}
                    style={[styles.addCardBtn, { borderColor: EV.neonPurple + "50", backgroundColor: EV.neonPurple + "10" }]}
                  >
                    <Animated.Text style={[styles.addCardText, { color: EV.neonPurple }]}>Add Payment Method</Animated.Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardScroll}
                >
                  {paymentMethods.map((pm) => {
                    const isChosen = selectedPaymentId === pm.id;
                    return (
                      <Pressable
                        key={pm.id}
                        onPress={() => setSelectedPaymentId(pm.id)}
                        style={[
                          styles.cardChip,
                          {
                            borderColor: isChosen ? EV.neonPurple + "80" : EV.border,
                            backgroundColor: isChosen ? EV.neonPurple + "12" : EV.bg,
                          },
                        ]}
                      >
                        <Feather name="credit-card" size={18} color={isChosen ? EV.neonPurple : EV.whiteDim} />
                        <View style={{ marginLeft: 8 }}>
                          <Animated.Text style={[styles.cardChipLabel, { color: isChosen ? EV.white : EV.whiteDim }]}>
                            {cardLabel(pm.type)} •••• {pm.last4}
                          </Animated.Text>
                          <Animated.Text style={[styles.cardChipSub, { color: EV.whiteGhost }]}>
                            {pm.expiryMonth}/{pm.expiryYear}
                          </Animated.Text>
                        </View>
                        {isChosen ? (
                          <View style={[styles.cardChosen, { backgroundColor: EV.neonPurple }]}>
                            <Feather name="check" size={10} color="#FFF" />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <Pressable
                onPress={handleDispatch}
                disabled={isProcessing || (paymentMethods.length > 0 && !selectedPaymentId)}
                style={({ pressed }) => [
                  styles.payButton,
                  {
                    opacity:
                      pressed || isProcessing || (paymentMethods.length > 0 && !selectedPaymentId) ? 0.6 : 1,
                  },
                ]}
              >
                <LinearGradient
                  colors={[EV.neonPurple, EV.neonBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.payButtonGradient}
                >
                  <Feather name={isProcessing ? "loader" : "lock"} size={18} color="#FFF" />
                  <Animated.Text style={styles.payButtonText}>
                    {isProcessing ? "Processing..." : `Pay $${total.toFixed(2)} & Request`}
                  </Animated.Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.secureRow}>
                <Feather name="shield" size={12} color={EV.whiteGhost} />
                <Animated.Text style={[styles.secureText, { color: EV.whiteGhost }]}>
                  Secured payment — charged only when a provider is dispatched
                </Animated.Text>
              </View>
            </Pressable>
          </RNAnimated.View>
        </Pressable>
      </Modal>
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
  requestButtonText: { color: "#FFF", fontSize: 17, fontWeight: "800", letterSpacing: 0.3, flex: 1 },
  requestButtonPrice: { fontSize: 17, fontWeight: "800" },

  // Modal / sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  summaryLabel: { flex: 1, fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  sheetSection: { fontSize: 12, fontWeight: "700", letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" },
  noCardBox: {
    borderRadius: 16, borderWidth: 1, padding: 20,
    alignItems: "center", gap: 10, marginBottom: 20,
  },
  noCardText: { fontSize: 14 },
  addCardBtn: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  addCardText: { fontSize: 14, fontWeight: "700" },
  cardScroll: { paddingBottom: 16, gap: 10 },
  cardChip: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 12,
    minWidth: 180,
  },
  cardChipLabel: { fontSize: 14, fontWeight: "600" },
  cardChipSub: { fontSize: 11, marginTop: 2 },
  cardChosen: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    marginLeft: "auto",
  },
  payButton: { borderRadius: 16, overflow: "hidden", marginTop: 8, marginBottom: 10 },
  payButtonGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 18, borderRadius: 16,
  },
  payButtonText: { color: "#FFF", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 },
  secureText: { fontSize: 11, textAlign: "center" },
});
