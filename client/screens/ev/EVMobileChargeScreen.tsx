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

const CHARGE_LEVELS = [
  { label: "Quick Boost", kwh: "10 kWh", time: "~15 min", price: "$10", desc: "Get enough charge to reach the nearest station" },
  { label: "Half Charge", kwh: "25 kWh", time: "~35 min", price: "$24", desc: "Enough for about 80 miles of range" },
  { label: "Full Charge", kwh: "50 kWh", time: "~60 min", price: "$44", desc: "Top off your battery to near full capacity" },
];

const SERVICE_FEE = 2.99;

function cardIcon(type: PaymentMethod["type"]) {
  const icons: Record<PaymentMethod["type"], "credit-card"> = {
    visa: "credit-card",
    mastercard: "credit-card",
    amex: "credit-card",
    discover: "credit-card",
  };
  return icons[type];
}

function cardLabel(type: PaymentMethod["type"]) {
  const labels: Record<PaymentMethod["type"], string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
  };
  return labels[type];
}

export default function EVMobileChargeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getDefaultVehicle, userLocation, currentDriver, setActiveRequest, addToHistory, addPendingJob, paymentMethods } = useApp();
  const { isDark } = useTheme();
  const EV = getEVColors(isDark);
  const defaultVehicle = getDefaultVehicle();

  const [selectedLevel, setSelectedLevel] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sheetAnim = useRef(new RNAnimated.Value(SCREEN_H)).current;

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

  // Auto-select default payment method when modal opens
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

  const level = CHARGE_LEVELS[selectedLevel];
  const cost = parseFloat(level.price.replace("$", ""));
  const total = cost + SERVICE_FEE;

  const handleDispatch = async () => {
    setIsProcessing(true);
    const jobId = `req-${Date.now()}`;
    const coords = userLocation ?? { latitude: 37.7849, longitude: -122.4094 };

    const pendingJob: ServiceRequest = {
      id: jobId,
      serviceType: "fuel",
      notes: `EV Mobile Charge — ${level.label} (${level.kwh}, ${level.time})`,
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
        serviceType: "fuel",
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

  const selectedCard = paymentMethods.find((p) => p.id === selectedPaymentId) ?? null;

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
                <Animated.Text style={[styles.levelPrice, { color }]}>{lv.price}</Animated.Text>
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

        <View style={styles.infoRow}>
          <Feather name="shield" size={14} color={EV.neonGreen} />
          <Animated.Text style={[styles.infoText, { color: EV.whiteGhost }]}>
            Certified EV charging technicians only. All units are Level 2 / CCS compatible.
          </Animated.Text>
        </View>

        <Pressable
          onPress={() => setShowPayment(true)}
          style={({ pressed }) => [styles.requestButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <LinearGradient
            colors={[EV.neonCyan, EV.neonBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.requestButtonGradient}
          >
            <Feather name="zap" size={20} color="#000" />
            <Animated.Text style={styles.requestButtonText}>Review & Pay</Animated.Text>
            <Animated.Text style={[styles.requestButtonPrice, { color: "#000" }]}>{level.price}</Animated.Text>
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
              {/* drag handle */}
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
                  <Feather name="zap" size={16} color={EV.neonCyan} />
                  <Animated.Text style={[styles.summaryLabel, { color: EV.white }]}>
                    Mobile Charge — {level.label}
                  </Animated.Text>
                  <Animated.Text style={[styles.summaryValue, { color: EV.white }]}>{level.price}</Animated.Text>
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

              {/* Payment method */}
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
                    style={[styles.addCardBtn, { borderColor: EV.neonCyan + "50", backgroundColor: EV.neonCyan + "10" }]}
                  >
                    <Animated.Text style={[styles.addCardText, { color: EV.neonCyan }]}>Add Payment Method</Animated.Text>
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
                            borderColor: isChosen ? EV.neonCyan + "80" : EV.border,
                            backgroundColor: isChosen ? EV.neonCyan + "12" : EV.bg,
                          },
                        ]}
                      >
                        <Feather name={cardIcon(pm.type)} size={18} color={isChosen ? EV.neonCyan : EV.whiteDim} />
                        <View style={{ marginLeft: 8 }}>
                          <Animated.Text style={[styles.cardChipLabel, { color: isChosen ? EV.white : EV.whiteDim }]}>
                            {cardLabel(pm.type)} •••• {pm.last4}
                          </Animated.Text>
                          <Animated.Text style={[styles.cardChipSub, { color: EV.whiteGhost }]}>
                            {pm.expiryMonth}/{pm.expiryYear}
                          </Animated.Text>
                        </View>
                        {isChosen ? (
                          <View style={[styles.cardChosen, { backgroundColor: EV.neonCyan }]}>
                            <Feather name="check" size={10} color="#000" />
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
                  colors={[EV.neonCyan, EV.neonBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.payButtonGradient}
                >
                  <Feather name={isProcessing ? "loader" : "lock"} size={18} color="#000" />
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
    borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 12, marginBottom: 16,
  },
  locationTitle: { fontSize: 14, fontWeight: "600" },
  locationAddr: { fontSize: 12, marginTop: 2 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 24, paddingHorizontal: 4 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 17 },
  requestButton: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  requestButtonGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 18, borderRadius: 16,
  },
  requestButtonText: { color: "#000", fontSize: 17, fontWeight: "800", letterSpacing: 0.3, flex: 1 },
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
  payButtonText: { color: "#000", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 },
  secureText: { fontSize: 11, textAlign: "center" },
});
