import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
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
import { useApp, ServiceRequest, Provider } from "@/context/AppContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SERVICE_FEE = 2.95;
const EXPRESS_FEE = 19.95;

type VehicleSize = "compact" | "sedan" | "suv" | "truck" | "commercial";

const vehicleSizes: { type: VehicleSize; label: string; icon: keyof typeof Feather.glyphMap; basePrice: number }[] = [
  { type: "compact", label: "Compact Car", icon: "circle", basePrice: 64 },
  { type: "sedan", label: "Sedan / Coupe", icon: "minus", basePrice: 72 },
  { type: "suv", label: "SUV / Crossover", icon: "square", basePrice: 81 },
  { type: "truck", label: "Pickup Truck", icon: "truck", basePrice: 94 },
  { type: "commercial", label: "Commercial Van", icon: "box", basePrice: 128 },
];

interface SizeCardProps {
  type: VehicleSize;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  basePrice: number;
  isSelected: boolean;
  onPress: () => void;
}

function SizeCard({ label, icon, basePrice, isSelected, onPress }: SizeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.sizeCard,
        {
          backgroundColor: isSelected ? theme.secondary + "15" : theme.backgroundSecondary,
          borderColor: isSelected ? theme.secondary : "transparent",
          borderWidth: 2,
        },
        animatedStyle,
      ]}
    >
      <Feather name={icon} size={24} color={isSelected ? theme.secondary : theme.textSecondary} />
      <View style={styles.sizeCardContent}>
        <ThemedText
          type="body"
          style={[styles.sizeLabel, isSelected ? { color: theme.secondary, fontWeight: "600" } : null]}
        >
          {label}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          From ${basePrice}
        </ThemedText>
      </View>
      {isSelected ? (
        <View style={[styles.checkCircle, { backgroundColor: theme.secondary }]}>
          <Feather name="check" size={14} color="#FFFFFF" />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

export default function TowRequestScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { getTowProviders, setActiveRequest, addToHistory, addPendingJob, currentDriver } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const towProviders = getTowProviders();
  const mountedRef = useRef(true);

  const [selectedSize, setSelectedSize] = useState<VehicleSize | null>(null);
  const [destination, setDestination] = useState("");
  const [needsWinch, setNeedsWinch] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpress, setIsExpress] = useState(false);
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
  const basePrice = selectedSizeData?.basePrice || 0;
  const winchFee = needsWinch ? 30 : 0;
  const expressFee = isExpress ? EXPRESS_FEE : 0;
  const totalCost = basePrice + winchFee + SERVICE_FEE + expressFee;

  const handleSubmit = () => {
    if (!selectedSize || isSubmitting) return;

    setIsSubmitting(true);

    const coords = userLocation ?? { latitude: 37.7849, longitude: -122.4094 };
    const driverInfo = currentDriver
      ? { id: currentDriver.id, name: currentDriver.name, phone: currentDriver.phone, email: currentDriver.email, avatarPreset: currentDriver.avatarPreset }
      : undefined;

    const pendingJob: ServiceRequest = {
      id: `tow-${Date.now()}`,
      serviceType: "tow",
      location: {
        address: "Current Location",
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      notes: `Vehicle: ${selectedSizeData?.label}${destination ? ` | Destination: ${destination}` : ""}${needsWinch ? " | Winch required" : ""}${notes ? ` | ${notes}` : ""}`,
      status: "pending",
      estimatedCost: basePrice + winchFee,
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

    // Register with server in background so providers on other devices see the job
    apiRequest("POST", "/api/jobs", { ...pendingJob, createdAt: pendingJob.createdAt.toISOString() }).catch(() => {});

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
        <View style={[styles.heroSection, { backgroundColor: theme.secondary }]}>
          <View style={styles.heroIconContainer}>
            <Feather name="truck" size={40} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={styles.heroTitle}>
            Tow Service
          </ThemedText>
          <ThemedText type="body" style={styles.heroSubtitle}>
            Professional towing with certified operators
          </ThemedText>
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Feather name="shield" size={14} color="#FFFFFF" />
              <ThemedText type="small" style={styles.heroBadgeText}>
                Insured
              </ThemedText>
            </View>
            <View style={styles.heroBadge}>
              <Feather name="clock" size={14} color="#FFFFFF" />
              <ThemedText type="small" style={styles.heroBadgeText}>
                24/7 Available
              </ThemedText>
            </View>
            <View style={styles.heroBadge}>
              <Feather name="award" size={14} color="#FFFFFF" />
              <ThemedText type="small" style={styles.heroBadgeText}>
                Elite Partners
              </ThemedText>
            </View>
          </View>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Vehicle Size
        </ThemedText>
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

        <ThemedText type="h4" style={styles.sectionTitle}>
          Drop-off Location (Optional)
        </ThemedText>
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="Enter destination address or 'My mechanic'"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.textInput,
            {
              backgroundColor: theme.backgroundSecondary,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
        />
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          We'll confirm distance-based pricing with you before dispatch
        </ThemedText>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Special Requirements
        </ThemedText>
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
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Winch-Out Service
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Vehicle stuck in ditch, mud, or off-road
            </ThemedText>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <ThemedText type="body" style={{ color: theme.secondary, fontWeight: "600" }}>
              +$35
            </ThemedText>
            <View style={[styles.checkbox, { borderColor: needsWinch ? theme.secondary : theme.border, backgroundColor: needsWinch ? theme.secondary : "transparent" }]}>
              {needsWinch ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
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
              <ThemedText type="body" style={{ fontWeight: "700" }}>
                Express Tow
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.warning, fontWeight: "700" }}>
                +${EXPRESS_FEE.toFixed(2)}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Priority dispatch - avg. 6 min vs 12 min
            </ThemedText>
          </View>
          <View style={[styles.expressCheckbox, { borderColor: isExpress ? theme.warning : theme.border, backgroundColor: isExpress ? theme.warning : "transparent" }]}>
            {isExpress ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
          </View>
        </Pressable>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Additional Notes
        </ThemedText>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions for the tow operator..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={3}
          style={[
            styles.notesInput,
            {
              backgroundColor: theme.backgroundSecondary,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
        />

        {selectedSize ? (
          <View style={[styles.costCard, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              Cost Estimate
            </ThemedText>
            <View style={styles.costBreakdown}>
              <View style={styles.costRow}>
                <ThemedText type="body">Base tow ({selectedSizeData?.label})</ThemedText>
                <ThemedText type="body">${basePrice.toFixed(2)}</ThemedText>
              </View>
              {needsWinch ? (
                <View style={styles.costRow}>
                  <ThemedText type="body">Winch-out service</ThemedText>
                  <ThemedText type="body">${winchFee.toFixed(2)}</ThemedText>
                </View>
              ) : null}
              <View style={styles.costRow}>
                <ThemedText type="body">Service fee</ThemedText>
                <ThemedText type="body">${SERVICE_FEE.toFixed(2)}</ThemedText>
              </View>
              {isExpress ? (
                <View style={styles.costRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                    <Feather name="zap" size={14} color={theme.warning} />
                    <ThemedText type="body" style={{ color: theme.warning }}>Express tow</ThemedText>
                  </View>
                  <ThemedText type="body" style={{ color: theme.warning }}>${expressFee.toFixed(2)}</ThemedText>
                </View>
              ) : null}
              <View style={[styles.costDivider, { backgroundColor: theme.border }]} />
              <View style={styles.costRow}>
                <ThemedText type="h4">Total</ThemedText>
                <ThemedText type="h3" style={{ color: theme.success }}>
                  ${totalCost.toFixed(2)}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Final price may vary based on distance traveled
            </ThemedText>
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
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
            <ThemedText type="body" style={styles.submitButtonText}>
              Finding Tow Partner...
            </ThemedText>
          ) : (
            <>
              <Feather name="truck" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.submitButtonText}>
                Request Tow Service
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  heroSection: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["2xl"],
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    marginBottom: Spacing.lg,
  },
  heroBadges: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sizeGrid: {
    gap: Spacing.sm,
  },
  sizeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  sizeCardContent: {
    flex: 1,
  },
  sizeLabel: {
    marginBottom: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  expressCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  expressIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  expressContent: {
    flex: 1,
  },
  expressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expressCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  notesInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: "top",
  },
  costCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  costBreakdown: {
    gap: Spacing.sm,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
