import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Location from "expo-location";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceRequest } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useStripe } from "@/lib/stripe";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HOOKUP_FEE   = 65;
const FREE_MILES   = 5;
const RATE_PER_MILE = 3.50;
const WINCH_FEE    = 35;
const EXPRESS_FEE  = 9.99;
const SERVICE_FEE  = 3.99;

type VehicleSize = "compact" | "sedan" | "suv" | "truck" | "commercial";

const vehicleSizes: {
  type: VehicleSize;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  surcharge: number;
  desc: string;
}[] = [
  { type: "compact", label: "Compact / Small",   icon: "circle",  surcharge: 0,  desc: "Hatchback, Mini, Smart car" },
  { type: "sedan",   label: "Sedan / Coupe",      icon: "minus",   surcharge: 0,  desc: "Most standard passenger cars" },
  { type: "suv",     label: "SUV / Crossover",    icon: "square",  surcharge: 15, desc: "CRV, RAV4, Explorer, Tahoe" },
  { type: "truck",   label: "Pickup Truck",        icon: "truck",   surcharge: 25, desc: "F-150, Silverado, Ram, Tundra" },
  { type: "commercial", label: "Commercial Van",   icon: "box",     surcharge: 50, desc: "Transit, Sprinter, work vans" },
];

function calcPrice(miles: number, surcharge: number, winch: boolean, express: boolean) {
  const billableMiles = Math.max(0, miles - FREE_MILES);
  const mileageCost   = billableMiles * RATE_PER_MILE;
  const base          = HOOKUP_FEE + mileageCost + surcharge;
  const total         = base + (winch ? WINCH_FEE : 0) + SERVICE_FEE + (express ? EXPRESS_FEE : 0);
  return { billableMiles, mileageCost, base, total };
}

interface SizeCardProps {
  type: VehicleSize;
  label: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
  surcharge: number;
  isSelected: boolean;
  onPress: () => void;
}

function SizeCard({ label, desc, icon, surcharge, isSelected, onPress }: SizeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 200 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
      style={[
        styles.sizeCard,
        {
          backgroundColor: isSelected ? theme.secondary + "18" : theme.backgroundSecondary,
          borderColor: isSelected ? theme.secondary : "transparent",
          borderWidth: 2,
        },
        animatedStyle,
      ]}
    >
      <Feather name={icon} size={22} color={isSelected ? theme.secondary : theme.textSecondary} />
      <View style={styles.sizeCardContent}>
        <ThemedText type="body" style={[styles.sizeLabel, isSelected ? { color: theme.secondary, fontWeight: "600" } : null]}>
          {label}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>{desc}</ThemedText>
      </View>
      <View style={styles.surchargeCol}>
        <ThemedText type="small" style={{ color: surcharge > 0 ? theme.warning : theme.success, fontWeight: "700" }}>
          {surcharge > 0 ? `+$${surcharge}` : "No surcharge"}
        </ThemedText>
      </View>
      {isSelected ? (
        <View style={[styles.checkCircle, { backgroundColor: theme.secondary }]}>
          <Feather name="check" size={13} color="#FFFFFF" />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

export default function TowRequestScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { setActiveRequest, addToHistory, addPendingJob, currentDriver } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const mountedRef = useRef(true);

  const [selectedSize, setSelectedSize] = useState<VehicleSize | null>(null);
  const [destination, setDestination]   = useState("");
  const [milesText, setMilesText]       = useState("");
  const [needsWinch, setNeedsWinch]     = useState(false);
  const [notes, setNotes]               = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpress, setIsExpress]       = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (mountedRef.current) {
            setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          }
        }
      } catch {}
    })();
    return () => { mountedRef.current = false; };
  }, []);

  const selectedSizeData = vehicleSizes.find((s) => s.type === selectedSize);
  const surcharge        = selectedSizeData?.surcharge ?? 0;
  const distanceMiles    = parseFloat(milesText) || 0;
  const hasDistance      = milesText.trim().length > 0 && distanceMiles > 0;
  const pricing          = calcPrice(distanceMiles, surcharge, needsWinch, isExpress);

  const handleSubmit = async () => {
    if (!selectedSize || isSubmitting) return;
    if (!userLocation) {
      Alert.alert("Location Unavailable", "Enable location access in your device settings to submit a tow request.");
      return;
    }

    setIsSubmitting(true);

    const driverInfo = currentDriver
      ? { id: currentDriver.id, name: currentDriver.name, phone: currentDriver.phone, email: currentDriver.email, avatarPreset: currentDriver.avatarPreset }
      : undefined;

    const estimatedCost = hasDistance ? pricing.base : HOOKUP_FEE + surcharge;
    const totalCost     = hasDistance ? pricing.total : HOOKUP_FEE + surcharge + SERVICE_FEE + (needsWinch ? WINCH_FEE : 0) + (isExpress ? EXPRESS_FEE : 0);
    const requestId     = `tow-${Date.now()}`;

    // ── Stripe payment sheet ───────────────────────────────────────────────
    try {
      const piRes = await apiRequest("POST", "/api/create-payment-intent", {
        amount: totalCost,
        jobId: requestId,
        serviceType: "tow",
      });
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
        if (mountedRef.current) setIsSubmitting(false);
        if (payError.code !== "Canceled") {
          Alert.alert("Payment Failed", payError.message);
        }
        return;
      }
    } catch (err: any) {
      if (mountedRef.current) setIsSubmitting(false);
      Alert.alert("Payment Error", err.message || "Could not process payment. Please try again.");
      return;
    }
    // ──────────────────────────────────────────────────────────────────────

    const pendingJob: ServiceRequest = {
      id: requestId,
      serviceType: "tow",
      location: {
        address: "Current Location",
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      },
      notes: [
        `Vehicle: ${selectedSizeData?.label}`,
        destination ? `Destination: ${destination}` : null,
        hasDistance ? `Distance: ~${distanceMiles} miles` : null,
        needsWinch ? "Winch required" : null,
        notes || null,
      ].filter(Boolean).join(" | "),
      status: "pending",
      estimatedCost,
      createdAt: new Date(),
      driver: driverInfo,
      eta: isExpress ? 6 : 12,
      isExpress,
      expressFee: isExpress ? EXPRESS_FEE : 0,
      serviceFee: SERVICE_FEE,
      totalCost,
    };

    addPendingJob(pendingJob);
    setActiveRequest(pendingJob);
    addToHistory(pendingJob);

    const payload = { ...pendingJob, createdAt: pendingJob.createdAt.toISOString() };
    try {
      await apiRequest("POST", "/api/jobs", payload);
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
      apiRequest("POST", "/api/jobs", payload).catch(() => {});
    }

    if (mountedRef.current) {
      setIsSubmitting(false);
      navigation.replace("ActiveService");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <LinearGradient
          colors={["#0055CC", "#0077FF", "#00AAFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroGlowRing1} />
          <View style={styles.heroGlowRing2} />
          <View style={styles.heroIconWrapper}>
            <View style={styles.heroIconOuter}>
              <View style={styles.heroIconInner}>
                <Feather name="truck" size={38} color="#FFFFFF" />
              </View>
            </View>
          </View>
          <ThemedText type="h2" style={styles.heroTitle}>Tow Service</ThemedText>
          <ThemedText type="body" style={styles.heroSubtitle}>
            Professional towing with certified operators
          </ThemedText>
          <View style={styles.heroBadges}>
            {(["Insured", "24/7 Available", "Elite Partners"] as const).map((b, i) => (
              <View key={i} style={styles.heroBadge}>
                <Feather name={i === 0 ? "shield" : i === 1 ? "clock" : "award"} size={13} color="#FFFFFF" />
                <ThemedText type="small" style={styles.heroBadgeText}>{b}</ThemedText>
              </View>
            ))}
          </View>
        </LinearGradient>

        <LinearGradient
          colors={[theme.secondary + "22", theme.secondary + "08"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.pricingCard, { borderColor: theme.secondary + "50" }]}
        >
          <View style={styles.pricingCardRow}>
            <View style={[styles.pricingCardIcon, { backgroundColor: theme.secondary + "25" }]}>
              <Feather name="tag" size={14} color={theme.secondary} />
            </View>
            <ThemedText type="body" style={[styles.pricingCardTitle, { color: theme.secondary }]}>
              How Tow Pricing Works
            </ThemedText>
          </View>
          <View style={styles.pricingSteps}>
            <View style={[styles.pricingPill, { backgroundColor: theme.secondary + "18" }]}>
              <Feather name="anchor" size={15} color={theme.secondary} />
              <ThemedText type="h3" style={{ color: "#FFFFFF", fontWeight: "800" }}>${HOOKUP_FEE}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                hookup{"\n"}(+{FREE_MILES} mi free)
              </ThemedText>
            </View>
            <ThemedText type="h4" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>+</ThemedText>
            <View style={[styles.pricingPill, { backgroundColor: theme.secondary + "18" }]}>
              <Feather name="navigation" size={15} color={theme.secondary} />
              <ThemedText type="h3" style={{ color: "#FFFFFF", fontWeight: "800" }}>${RATE_PER_MILE}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                per mile{"\n"}after {FREE_MILES} mi
              </ThemedText>
            </View>
            <ThemedText type="h4" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>+</ThemedText>
            <View style={[styles.pricingPill, { backgroundColor: theme.secondary + "18" }]}>
              <Feather name="truck" size={15} color={theme.secondary} />
              <ThemedText type="h3" style={{ color: "#FFFFFF", fontWeight: "800" }}>Size</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                surcharge{"\n"}if applicable
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        <ThemedText type="h4" style={styles.sectionTitle}>Vehicle Size</ThemedText>
        <View style={styles.sizeGrid}>
          {vehicleSizes.map((size) => (
            <SizeCard
              key={size.type}
              {...size}
              isSelected={selectedSize === size.type}
              onPress={() => setSelectedSize(size.type)}
            />
          ))}
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>Drop-off Location</ThemedText>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="Enter destination address or mechanic name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.textInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
        />

        <ThemedText type="h4" style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
          Estimated Distance
        </ThemedText>
        <View style={[styles.milesRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="map-pin" size={18} color={theme.textSecondary} />
          <TextInput
            value={milesText}
            onChangeText={(t) => setMilesText(t.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.milesInput, { color: theme.text }]}
          />
          <ThemedText type="body" style={{ color: theme.textSecondary }}>miles</ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          First {FREE_MILES} miles are included free. Not sure? Leave blank — your provider will confirm.
        </ThemedText>

        {hasDistance ? (
          <View style={[styles.exampleRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <Feather name="navigation" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
              {distanceMiles <= FREE_MILES
                ? `${distanceMiles} miles — fully covered in your hookup fee`
                : `${distanceMiles} mi = ${FREE_MILES} free + ${pricing.billableMiles.toFixed(1)} billable × $${RATE_PER_MILE} = $${pricing.mileageCost.toFixed(2)} mileage`
              }
            </ThemedText>
          </View>
        ) : null}

        <ThemedText type="h4" style={styles.sectionTitle}>Special Requirements</ThemedText>
        <Pressable
          onPress={() => setNeedsWinch(!needsWinch)}
          style={[
            styles.optionCard,
            {
              backgroundColor: needsWinch ? theme.secondary + "15" : theme.backgroundSecondary,
              borderColor: needsWinch ? theme.secondary : theme.border,
            },
          ]}
        >
          <View style={[styles.optionIcon, { backgroundColor: needsWinch ? theme.secondary : theme.backgroundTertiary }]}>
            <Feather name="anchor" size={20} color={needsWinch ? "#FFFFFF" : theme.textSecondary} />
          </View>
          <View style={styles.optionContent}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Winch-Out Service</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Vehicle stuck in ditch, mud, or off-road
            </ThemedText>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <ThemedText type="body" style={{ color: theme.secondary, fontWeight: "600" }}>+${WINCH_FEE}</ThemedText>
            <View style={[styles.checkbox, { borderColor: needsWinch ? theme.secondary : theme.border, backgroundColor: needsWinch ? theme.secondary : "transparent" }]}>
              {needsWinch ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
            </View>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setIsExpress(!isExpress)}
          style={[
            styles.expressCard,
            {
              backgroundColor: isExpress ? theme.warning + "15" : theme.backgroundSecondary,
              borderColor: isExpress ? theme.warning : theme.border,
            },
          ]}
        >
          <View style={[styles.expressIcon, { backgroundColor: theme.warning }]}>
            <Feather name="zap" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.expressContent}>
            <View style={styles.expressHeader}>
              <ThemedText type="body" style={{ fontWeight: "700" }}>Express Tow</ThemedText>
              <ThemedText type="body" style={{ color: theme.warning, fontWeight: "700" }}>
                +${EXPRESS_FEE.toFixed(2)}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Priority dispatch — avg. 6 min vs 12 min
            </ThemedText>
          </View>
          <View style={[styles.expressCheckbox, { borderColor: isExpress ? theme.warning : theme.border, backgroundColor: isExpress ? theme.warning : "transparent" }]}>
            {isExpress ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
          </View>
        </Pressable>

        <ThemedText type="h4" style={styles.sectionTitle}>Additional Notes</ThemedText>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions for the tow operator..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={3}
          style={[styles.notesInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
        />

        {selectedSize ? (
          <View style={[styles.costCard, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              {hasDistance ? "Price Breakdown" : "Estimated Price"}
            </ThemedText>
            <View style={styles.costBreakdown}>
              <View style={styles.costRow}>
                <ThemedText type="body">Hookup fee (incl. {FREE_MILES} mi)</ThemedText>
                <ThemedText type="body">${HOOKUP_FEE}.00</ThemedText>
              </View>
              {hasDistance && pricing.billableMiles > 0 ? (
                <View style={styles.costRow}>
                  <ThemedText type="body">
                    {pricing.billableMiles.toFixed(1)} mi × ${RATE_PER_MILE.toFixed(2)}
                  </ThemedText>
                  <ThemedText type="body">${pricing.mileageCost.toFixed(2)}</ThemedText>
                </View>
              ) : null}
              {surcharge > 0 ? (
                <View style={styles.costRow}>
                  <ThemedText type="body">Size surcharge ({selectedSizeData?.label})</ThemedText>
                  <ThemedText type="body">${surcharge.toFixed(2)}</ThemedText>
                </View>
              ) : null}
              {needsWinch ? (
                <View style={styles.costRow}>
                  <ThemedText type="body">Winch-out service</ThemedText>
                  <ThemedText type="body">${WINCH_FEE.toFixed(2)}</ThemedText>
                </View>
              ) : null}
              <View style={styles.costRow}>
                <ThemedText type="body">Service fee</ThemedText>
                <ThemedText type="body">${SERVICE_FEE.toFixed(2)}</ThemedText>
              </View>
              {isExpress ? (
                <View style={styles.costRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                    <Feather name="zap" size={13} color={theme.warning} />
                    <ThemedText type="body" style={{ color: theme.warning }}>Express tow</ThemedText>
                  </View>
                  <ThemedText type="body" style={{ color: theme.warning }}>${EXPRESS_FEE.toFixed(2)}</ThemedText>
                </View>
              ) : null}
              <View style={[styles.costDivider, { backgroundColor: theme.border }]} />
              <View style={styles.costRow}>
                <ThemedText type="h4">{hasDistance ? "Total" : "Starting at"}</ThemedText>
                <ThemedText type="h3" style={{ color: theme.success }}>
                  ${(hasDistance ? pricing.total : HOOKUP_FEE + surcharge + SERVICE_FEE + (needsWinch ? WINCH_FEE : 0) + (isExpress ? EXPRESS_FEE : 0)).toFixed(2)}
                </ThemedText>
              </View>
            </View>
            {!hasDistance ? (
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                Enter your distance above for an exact price. Final cost calculated at $3.50/mile after {FREE_MILES} free miles.
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.bottomBar, { backgroundColor: theme.backgroundRoot, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={!selectedSize || isSubmitting}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: theme.secondary,
              opacity: !selectedSize || isSubmitting ? 0.5 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {isSubmitting ? (
            <ThemedText type="body" style={styles.submitButtonText}>Finding Tow Partner...</ThemedText>
          ) : (
            <>
              <Feather name="truck" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.submitButtonText}>Request Tow Service</ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  scrollContent:    { paddingHorizontal: Spacing.lg },
  heroSection: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["2xl"],
    paddingTop: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  heroGlowRing1: {
    position: "absolute",
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -80, right: -60,
  },
  heroGlowRing2: {
    position: "absolute",
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -60, left: -40,
  },
  heroIconWrapper: {
    marginBottom: Spacing.md,
  },
  heroIconOuter: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroIconInner: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  heroTitle:    { color: "#FFFFFF", marginBottom: Spacing.xs, fontWeight: "800" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", marginBottom: Spacing.lg },
  heroBadges:   { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap", justifyContent: "center" },
  heroBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 6, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    gap: 5,
  },
  heroBadgeText: { color: "#FFFFFF", fontWeight: "600" },
  pricingCard: {
    borderRadius: BorderRadius.lg, borderWidth: 1,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  pricingCardRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.lg },
  pricingCardIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  pricingCardTitle: { fontWeight: "700", fontSize: 15 },
  pricingSteps: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pricingPill: {
    flex: 1, alignItems: "center", gap: 4,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: { marginBottom: Spacing.md, marginTop: Spacing.lg },
  sizeGrid:     { gap: Spacing.sm },
  sizeCard: {
    flexDirection: "row", alignItems: "center",
    padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.md,
  },
  sizeCardContent: { flex: 1 },
  sizeLabel:    { marginBottom: 2 },
  surchargeCol: { alignItems: "flex-end", minWidth: 70 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  textInput: {
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, fontSize: 16,
  },
  milesRow: {
    flexDirection: "row", alignItems: "center",
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, gap: Spacing.sm,
  },
  milesInput: { flex: 1, fontSize: 22, fontWeight: "700" },
  exampleRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    padding: Spacing.sm, borderRadius: BorderRadius.sm,
    borderWidth: 1, marginTop: Spacing.sm,
  },
  optionCard: {
    flexDirection: "row", alignItems: "center",
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, gap: Spacing.md,
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  optionContent: { flex: 1 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginTop: Spacing.xs,
  },
  expressCard: {
    flexDirection: "row", alignItems: "center",
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, marginTop: Spacing.md, gap: Spacing.md,
  },
  expressIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  expressContent: { flex: 1 },
  expressHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  expressCheckbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  notesInput: {
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
    minHeight: 80, fontSize: 16, textAlignVertical: "top",
  },
  costCard: {
    padding: Spacing.lg, borderRadius: BorderRadius.md, marginTop: Spacing.xl,
  },
  costBreakdown: { gap: Spacing.sm },
  costRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  costDivider: { height: 1, marginVertical: Spacing.sm },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: Spacing.lg, borderRadius: BorderRadius.md, gap: Spacing.sm,
  },
  submitButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
