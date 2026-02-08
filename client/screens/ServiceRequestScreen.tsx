import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, ServiceRequest } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SERVICE_FEE = 2.95;
const EXPRESS_FEE = 19.95;
const PREMIUM_DISCOUNT = 0.20;

const serviceTypes: { type: ServiceType; label: string; icon: keyof typeof Feather.glyphMap; price: number }[] = [
  { type: "flat_tire", label: "Flat Tire", icon: "disc", price: 60 },
  { type: "jump_start", label: "Jump Start", icon: "battery-charging", price: 45 },
  { type: "fuel", label: "Fuel Delivery", icon: "droplet", price: 35 },
  { type: "lockout", label: "Lockout", icon: "key", price: 55 },
  { type: "obd_diagnostic", label: "OBD Diagnostic", icon: "cpu", price: 25 },
  { type: "other", label: "Other", icon: "more-horizontal", price: 65 },
];

interface ServiceTypeCardProps {
  type: ServiceType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  price: number;
  discountedPrice?: number;
  isPremium: boolean;
  isSelected: boolean;
  onPress: () => void;
}

function ServiceTypeCard({ label, icon, price, discountedPrice, isPremium, isSelected, onPress }: ServiceTypeCardProps) {
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
        styles.serviceCard,
        {
          backgroundColor: isSelected ? theme.primary + "15" : theme.backgroundSecondary,
          borderColor: isSelected ? theme.primary : "transparent",
          borderWidth: 2,
        },
        animatedStyle,
      ]}
    >
      <Feather name={icon} size={28} color={isSelected ? theme.primary : theme.textSecondary} />
      <ThemedText
        type="body"
        style={[styles.serviceLabel, isSelected ? { color: theme.primary, fontWeight: "600" } : null]}
      >
        {label}
      </ThemedText>
      {isPremium && discountedPrice ? (
        <View style={styles.priceContainer}>
          <ThemedText type="small" style={[styles.originalPrice, { color: theme.textSecondary }]}>
            ${price}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.success, fontWeight: "600" }}>
            ${discountedPrice.toFixed(0)}
          </ThemedText>
        </View>
      ) : (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          ${price}
        </ThemedText>
      )}
    </AnimatedPressable>
  );
}

export default function ServiceRequestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { nearbyProviders, getProvidersWithDistance, setActiveRequest, addToHistory, currentDriver } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ServiceRequest">>();

  const selectedProviderId = route.params?.providerId;
  const allProviders = getProvidersWithDistance();
  const selectedProvider = selectedProviderId
    ? allProviders.find((p) => p.id === selectedProviderId)
    : undefined;

  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpress, setIsExpress] = useState(false);

  const isPremium = currentDriver?.membership === "premium";
  const selectedServiceData = serviceTypes.find((s) => s.type === selectedService);
  const basePrice = selectedServiceData?.price || 0;
  const discountAmount = isPremium ? basePrice * PREMIUM_DISCOUNT : 0;
  const discountedBasePrice = basePrice - discountAmount;
  const expressFee = isExpress ? EXPRESS_FEE : 0;
  const totalCost = discountedBasePrice + SERVICE_FEE + expressFee;

  const handleSubmit = () => {
    if (!selectedService) return;

    setIsSubmitting(true);

    const provider = selectedProvider || nearbyProviders[0];
    const newRequest: ServiceRequest = {
      id: `req-${Date.now()}`,
      serviceType: selectedService,
      location: {
        address: "Current Location",
        latitude: 37.7849,
        longitude: -122.4094,
      },
      notes,
      status: "accepted",
      estimatedCost: discountedBasePrice,
      createdAt: new Date(),
      provider,
      eta: isExpress ? 4 : 8,
      isExpress,
      expressFee: isExpress ? EXPRESS_FEE : 0,
      serviceFee: SERVICE_FEE,
      totalCost,
    };

    setTimeout(() => {
      setActiveRequest(newRequest);
      addToHistory(newRequest);
      setIsSubmitting(false);
      navigation.goBack();
      navigation.navigate("ActiveService");
    }, 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl + 80 },
        ]}
      >
        {selectedProvider ? (
          <View style={[styles.selectedProviderBanner, { backgroundColor: theme.secondary + "15", borderColor: theme.secondary }]}>
            <View style={styles.selectedProviderRow}>
              <Feather name="user-check" size={18} color={theme.secondary} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Requesting from {selectedProvider.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {selectedProvider.rating.toFixed(1)} rating
                  {selectedProvider.distance !== undefined ? ` \u2022 ${selectedProvider.distance} mi away` : ""}
                </ThemedText>
              </View>
            </View>
          </View>
        ) : null}

        {isPremium && (
          <View style={[styles.premiumBanner, { backgroundColor: theme.success + "15" }]}>
            <Feather name="star" size={16} color={theme.success} />
            <ThemedText type="small" style={{ color: theme.success, fontWeight: "600", marginLeft: Spacing.sm }}>
              Premium Member - 20% off all services
            </ThemedText>
          </View>
        )}

        <ThemedText type="h4" style={styles.sectionTitle}>
          What do you need? {nearbyProviders.length}+ providers nearby
        </ThemedText>
        <View style={styles.serviceGrid}>
          {serviceTypes.map((service) => (
            <ServiceTypeCard
              key={service.type}
              {...service}
              discountedPrice={isPremium ? service.price * (1 - PREMIUM_DISCOUNT) : undefined}
              isPremium={isPremium}
              isSelected={selectedService === service.type}
              onPress={() => setSelectedService(service.type)}
            />
          ))}
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Your Exact Location
        </ThemedText>
        <View style={[styles.locationCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="map-pin" size={20} color={theme.primary} />
          <View style={styles.locationInfo}>
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              Current Location
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Sharing GPS • Average response: 8 min
            </ThemedText>
          </View>
          <Feather name="edit-2" size={18} color={theme.textSecondary} />
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Priority Service
        </ThemedText>
        <Pressable
          onPress={() => setIsExpress(!isExpress)}
          style={[
            styles.expressCard,
            {
              backgroundColor: isExpress ? theme.warning + "15" : theme.backgroundSecondary,
              borderColor: isExpress ? theme.warning : "transparent",
              borderWidth: 2,
            },
          ]}
        >
          <View style={[styles.expressIcon, { backgroundColor: isExpress ? theme.warning : theme.backgroundDefault }]}>
            <Feather name="zap" size={20} color={isExpress ? "#FFFFFF" : theme.warning} />
          </View>
          <View style={styles.expressContent}>
            <View style={styles.expressHeader}>
              <ThemedText type="body" style={{ fontWeight: "600", color: isExpress ? theme.warning : theme.text }}>
                Express Service
              </ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600", color: theme.warning }}>
                +${EXPRESS_FEE.toFixed(2)}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Get help ~50% faster • Average arrival: 4 min
            </ThemedText>
          </View>
          <View
            style={[
              styles.expressCheckbox,
              {
                backgroundColor: isExpress ? theme.warning : "transparent",
                borderColor: isExpress ? theme.warning : theme.border,
              },
            ]}
          >
            {isExpress ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
          </View>
        </Pressable>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Additional Notes
        </ThemedText>
        <TextInput
          style={[
            styles.notesInput,
            {
              backgroundColor: theme.backgroundSecondary,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Describe your situation (optional)"
          placeholderTextColor={theme.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {selectedService ? (
          <View style={[styles.costCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.costBreakdown}>
              <View style={styles.costRow}>
                <ThemedText type="body" style={{ color: theme.text }}>
                  {selectedServiceData?.label || "Service"}
                </ThemedText>
                {isPremium ? (
                  <View style={styles.priceWithDiscount}>
                    <ThemedText type="small" style={[styles.strikethrough, { color: theme.textSecondary }]}>
                      ${basePrice.toFixed(2)}
                    </ThemedText>
                    <ThemedText type="body" style={{ color: theme.success }}>
                      ${discountedBasePrice.toFixed(2)}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText type="body" style={{ color: theme.text }}>
                    ${basePrice.toFixed(2)}
                  </ThemedText>
                )}
              </View>
              {isPremium && (
                <View style={styles.costRow}>
                  <ThemedText type="small" style={{ color: theme.success }}>
                    Premium Discount (20%)
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.success }}>
                    -${discountAmount.toFixed(2)}
                  </ThemedText>
                </View>
              )}
              <View style={styles.costRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Service Fee
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  ${SERVICE_FEE.toFixed(2)}
                </ThemedText>
              </View>
              {isExpress ? (
                <View style={styles.costRow}>
                  <ThemedText type="small" style={{ color: theme.warning }}>
                    Express Service
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.warning }}>
                    ${EXPRESS_FEE.toFixed(2)}
                  </ThemedText>
                </View>
              ) : null}
              <View style={[styles.costDivider, { backgroundColor: theme.border }]} />
              <View style={styles.costRow}>
                <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
                  Estimated Total
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.success }}>
                  ${totalCost.toFixed(2)}
                </ThemedText>
              </View>
            </View>
            {isPremium ? (
              <View style={[styles.savingsBanner, { backgroundColor: theme.success + "15" }]}>
                <Feather name="tag" size={14} color={theme.success} />
                <ThemedText type="small" style={{ color: theme.success, fontWeight: "600", marginLeft: Spacing.xs }}>
                  You're saving ${discountAmount.toFixed(2)} with Premium
                </ThemedText>
              </View>
            ) : (
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                Final cost may vary based on actual service
              </ThemedText>
            )}
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!selectedService || isSubmitting}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: theme.primary,
              opacity: !selectedService || isSubmitting ? 0.5 : pressed ? 0.9 : 1,
              ...(!(!selectedService || isSubmitting) && { elevation: 4 }),
            },
          ]}
        >
          {isSubmitting ? (
            <ThemedText type="body" style={styles.submitButtonText}>
              Finding Provider...
            </ThemedText>
          ) : (
            <>
              <Feather name="zap" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.submitButtonText}>
                Connect Nearby Provider
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
    padding: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  serviceCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
  },
  serviceLabel: {
    marginTop: Spacing.sm,
    textAlign: "center",
    fontSize: 13,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  originalPrice: {
    textDecorationLine: "line-through",
    fontSize: 11,
  },
  selectedProviderBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  selectedProviderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  priceWithDiscount: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
  savingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  notesInput: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    minHeight: 100,
    fontSize: 16,
  },
  expressCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  expressIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  expressContent: {
    flex: 1,
    gap: 2,
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
    justifyContent: "center",
    alignItems: "center",
  },
  costCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
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
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
