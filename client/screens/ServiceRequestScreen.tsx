import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, TextInput, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
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
import { ScreenDecoration } from "@/components/ScreenDecoration";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, ServiceRequest } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { COMPETITOR_PRICES, SERVICE_FEE, EXPRESS_FEE } from "@/constants/pricing";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PREMIUM_DISCOUNT = 0.20;

const serviceTypes: { type: ServiceType; label: string; icon: keyof typeof Feather.glyphMap; price: number }[] = [
  { type: "flat_tire", label: "Flat Tire", icon: "disc", price: 51 },
  { type: "jump_start", label: "Jump Start", icon: "battery-charging", price: 38 },
  { type: "fuel", label: "Fuel Delivery", icon: "droplet", price: 0 },
  { type: "lockout", label: "Lockout", icon: "key", price: 47 },
  { type: "obd_diagnostic", label: "OBD Diagnostic", icon: "cpu", price: 21 },
  { type: "other", label: "Other", icon: "more-horizontal", price: 55 },
];

const FUEL_AMOUNTS: { label: string; desc: string; price: number }[] = [
  { label: "$10", desc: "Just enough to reach a station", price: 10 },
  { label: "$15", desc: "Short trip covered", price: 15 },
  { label: "$20", desc: "About 60-90 miles of range", price: 20 },
  { label: "$25", desc: "A solid fill for most cars", price: 25 },
  { label: "$30", desc: "Comfortable fill for most cars", price: 30 },
  { label: "$35", desc: "More than enough for the day", price: 35 },
  { label: "$40", desc: "Half tank for most vehicles", price: 40 },
  { label: "$45", desc: "Nearly a full tank", price: 45 },
  { label: "$50", desc: "Get back on the road worry-free", price: 50 },
];

const TIME_SLOTS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
  "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM",
];

function generateDateOptions(): { date: Date; label: string; dayLabel: string }[] {
  const options: { date: Date; label: string; dayLabel: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const dayLabel = i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    options.push({ date: d, label, dayLabel });
  }
  return options;
}

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

function ServiceTypeCard({ type, label, icon, price, discountedPrice, isPremium, isSelected, onPress }: ServiceTypeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const isFuel = type === "fuel";

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
      {isFuel ? (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          From $10
        </ThemedText>
      ) : isPremium && discountedPrice ? (
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
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { nearbyProviders, getProvidersWithDistance, setActiveRequest, addToHistory, currentDriver, getDefaultVehicle } = useApp();
  const defaultVehicle = getDefaultVehicle();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ServiceRequest">>();

  const selectedProviderId = route.params?.providerId;
  const initialServiceType = route.params?.serviceType as ServiceType | undefined;
  const initialNotes = route.params?.notes || "";
  const allProviders = getProvidersWithDistance();
  const selectedProvider = selectedProviderId
    ? allProviders.find((p) => p.id === selectedProviderId)
    : undefined;

  const [selectedService, setSelectedService] = useState<ServiceType | null>(initialServiceType || null);
  const [notes, setNotes] = useState(initialNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpress, setIsExpress] = useState(false);
  const [selectedFuelIndex, setSelectedFuelIndex] = useState(2);
  const [useCustomFuel, setUseCustomFuel] = useState(false);
  const [customFuelAmount, setCustomFuelAmount] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | null>(null);
  const dateOptions = useMemo(() => generateDateOptions(), []);

  const isPremium = currentDriver?.membership === "premium";
  const selectedServiceData = serviceTypes.find((s) => s.type === selectedService);
  const isFuelSelected = selectedService === "fuel";
  const parsedCustom = parseFloat(customFuelAmount);
  const customFuelValid = useCustomFuel && !isNaN(parsedCustom) && parsedCustom > 0;
  const fuelPrice = useCustomFuel ? (customFuelValid ? parsedCustom : 0) : (FUEL_AMOUNTS[selectedFuelIndex]?.price || 0);
  const basePrice = isFuelSelected ? fuelPrice : (selectedServiceData?.price || 0);
  const discountAmount = isPremium ? basePrice * PREMIUM_DISCOUNT : 0;
  const discountedBasePrice = basePrice - discountAmount;
  const expressFee = isExpress ? EXPRESS_FEE : 0;
  const totalCost = discountedBasePrice + SERVICE_FEE + expressFee;

  const isScheduled = scheduleMode === "later";
  const scheduleValid = !isScheduled || selectedTimeIndex !== null;
  const canSubmit = selectedService && !(isFuelSelected && useCustomFuel && !customFuelValid) && scheduleValid;

  const getScheduledDate = (): Date | undefined => {
    if (!isScheduled || selectedTimeIndex === null) return undefined;
    const selectedDate = dateOptions[selectedDateIndex].date;
    const timeStr = TIME_SLOTS[selectedTimeIndex];
    const [time, period] = timeStr.split(" ");
    const [hourStr, minStr] = time.split(":");
    let hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    const scheduled = new Date(selectedDate);
    scheduled.setHours(hour, min, 0, 0);
    return scheduled;
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    const provider = selectedProvider || nearbyProviders[0];
    const scheduledDate = getScheduledDate();
    const newRequest: ServiceRequest = {
      id: `req-${Date.now()}`,
      serviceType: selectedService,
      location: {
        address: "Current Location",
        latitude: 37.7849,
        longitude: -122.4094,
      },
      notes,
      status: isScheduled ? "pending" : "accepted",
      estimatedCost: discountedBasePrice,
      createdAt: new Date(),
      provider,
      eta: isScheduled ? undefined : (isExpress ? 4 : 8),
      isExpress: isScheduled ? false : isExpress,
      expressFee: isExpress && !isScheduled ? EXPRESS_FEE : 0,
      serviceFee: SERVICE_FEE,
      totalCost: isScheduled ? (discountedBasePrice + SERVICE_FEE) : totalCost,
      receiptNumber: `SM-${Date.now().toString(36).toUpperCase()}`,
      timeSaved: isScheduled ? undefined : Math.floor(Math.random() * 30) + 15,
      scheduledDate,
    };

    setTimeout(() => {
      if (isScheduled) {
        addToHistory(newRequest);
        setIsSubmitting(false);
        navigation.goBack();
      } else {
        setActiveRequest(newRequest);
        addToHistory(newRequest);
        setIsSubmitting(false);
        navigation.goBack();
        navigation.navigate("ActiveService");
      }
    }, 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl + 80 },
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

        {isFuelSelected ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>
              How much fuel do you need?
            </ThemedText>
            <View style={styles.fuelToggleRow}>
              <Pressable
                onPress={() => setUseCustomFuel(false)}
                style={[
                  styles.fuelToggleTab,
                  {
                    backgroundColor: !useCustomFuel ? theme.primary + "15" : theme.backgroundSecondary,
                    borderColor: !useCustomFuel ? theme.primary : "transparent",
                  },
                ]}
              >
                <Feather name="list" size={16} color={!useCustomFuel ? theme.primary : theme.textSecondary} />
                <ThemedText type="small" style={{ fontWeight: "600", color: !useCustomFuel ? theme.primary : theme.textSecondary }}>
                  Choose Amount
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setUseCustomFuel(true)}
                style={[
                  styles.fuelToggleTab,
                  {
                    backgroundColor: useCustomFuel ? theme.primary + "15" : theme.backgroundSecondary,
                    borderColor: useCustomFuel ? theme.primary : "transparent",
                  },
                ]}
              >
                <Feather name="edit-3" size={16} color={useCustomFuel ? theme.primary : theme.textSecondary} />
                <ThemedText type="small" style={{ fontWeight: "600", color: useCustomFuel ? theme.primary : theme.textSecondary }}>
                  Enter Custom
                </ThemedText>
              </Pressable>
            </View>
            {useCustomFuel ? (
              <View style={[styles.customFuelCard, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={[styles.fuelIconWrap, { backgroundColor: theme.primary + "20" }]}>
                  <Feather name="dollar-sign" size={20} color={theme.primary} />
                </View>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                  Enter your fuel amount
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                  Type any dollar amount for your fuel delivery
                </ThemedText>
                <View style={styles.customFuelInputRow}>
                  <ThemedText type="h3" style={{ color: theme.primary }}>$</ThemedText>
                  <TextInput
                    style={[
                      styles.customFuelInput,
                      {
                        backgroundColor: theme.backgroundDefault,
                        color: theme.text,
                        borderColor: customFuelValid ? theme.primary : theme.border,
                      },
                    ]}
                    value={customFuelAmount}
                    onChangeText={setCustomFuelAmount}
                    placeholder="0.00"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                </View>
                {customFuelValid && isPremium ? (
                  <View style={[styles.priceContainer, { marginTop: Spacing.sm }]}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Premium price:
                    </ThemedText>
                    <ThemedText type="small" style={[styles.originalPrice, { color: theme.textSecondary }]}>
                      ${parsedCustom.toFixed(2)}
                    </ThemedText>
                    <ThemedText type="body" style={{ color: theme.success, fontWeight: "700" }}>
                      ${(parsedCustom * (1 - PREMIUM_DISCOUNT)).toFixed(2)}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fuelScrollContent}
              >
                {FUEL_AMOUNTS.map((fuel, index) => {
                  const isActive = selectedFuelIndex === index;
                  const fuelDiscounted = isPremium ? fuel.price * (1 - PREMIUM_DISCOUNT) : fuel.price;
                  return (
                    <Pressable
                      key={fuel.price}
                      onPress={() => setSelectedFuelIndex(index)}
                      style={[
                        styles.fuelCard,
                        {
                          backgroundColor: isActive ? theme.primary + "15" : theme.backgroundSecondary,
                          borderColor: isActive ? theme.primary : "transparent",
                        },
                      ]}
                    >
                      <View style={[styles.fuelIconWrap, { backgroundColor: isActive ? theme.primary + "20" : theme.backgroundDefault }]}>
                        <Feather name="droplet" size={20} color={isActive ? theme.primary : theme.textSecondary} />
                      </View>
                      <ThemedText type="body" style={{ fontWeight: "700", color: isActive ? theme.primary : theme.text, fontSize: 17 }}>
                        {fuel.label}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", lineHeight: 16, marginTop: 2 }} numberOfLines={2}>
                        {fuel.desc}
                      </ThemedText>
                      {isPremium ? (
                        <View style={[styles.priceContainer, { marginTop: 4 }]}>
                          <ThemedText type="small" style={[styles.originalPrice, { color: theme.textSecondary }]}>
                            ${fuel.price}
                          </ThemedText>
                          <ThemedText type="body" style={{ color: theme.success, fontWeight: "700" }}>
                            ${fuelDiscounted.toFixed(0)}
                          </ThemedText>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </>
        ) : null}

        {selectedService && (() => {
          const comp = COMPETITOR_PRICES[selectedService];
          return (
            <View style={[styles.priceAnchorCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.priceAnchorHeader}>
                <Feather name="info" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs, flex: 1 }}>
                  Traditional roadside services typically charge
                </ThemedText>
              </View>
              <View style={styles.priceAnchorCompare}>
                <View style={styles.priceAnchorOld}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Others
                  </ThemedText>
                  <ThemedText type="body" style={{ color: theme.textSecondary, textDecorationLine: "line-through" }}>
                    ${comp.low}-${comp.high}
                  </ThemedText>
                </View>
                <View style={[styles.priceAnchorArrow, { backgroundColor: theme.success + "20" }]}>
                  <Feather name="arrow-right" size={16} color={theme.success} />
                </View>
                <View style={styles.priceAnchorNew}>
                  <ThemedText type="small" style={{ color: theme.success, fontWeight: "600" }}>
                    ServiceMe
                  </ThemedText>
                  <ThemedText type="h4" style={{ color: theme.success }}>
                    ${discountedBasePrice.toFixed(0)}
                  </ThemedText>
                </View>
              </View>
            </View>
          );
        })()}

        {defaultVehicle ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Your Vehicle
            </ThemedText>
            <View style={[styles.vehicleInfoCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather
                name={defaultVehicle.fuelType === "electric" ? "battery-charging" : "truck"}
                size={20}
                color={theme.primary}
              />
              <View style={styles.vehicleInfoContent}>
                <ThemedText type="body" style={{ fontWeight: "500" }}>
                  {defaultVehicle.year} {defaultVehicle.make} {defaultVehicle.model}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {defaultVehicle.fuelType.charAt(0).toUpperCase() + defaultVehicle.fuelType.slice(1)} •{" "}
                  {defaultVehicle.tireType === "run_flat" ? "Run-Flat Tires" : defaultVehicle.tireType === "spare" ? "Has Spare" : "No Spare"}
                </ThemedText>
              </View>
              <View style={[styles.vehicleDefaultTag, { backgroundColor: theme.primary + "15" }]}>
                <ThemedText type="small" style={{ color: theme.primary, fontSize: 10, fontWeight: "600" }}>
                  DEFAULT
                </ThemedText>
              </View>
            </View>
          </>
        ) : null}

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
          When do you need service?
        </ThemedText>
        <View style={styles.scheduleToggleRow}>
          <Pressable
            onPress={() => setScheduleMode("now")}
            style={[
              styles.scheduleToggleTab,
              {
                backgroundColor: scheduleMode === "now" ? theme.primary + "15" : theme.backgroundSecondary,
                borderColor: scheduleMode === "now" ? theme.primary : "transparent",
              },
            ]}
          >
            <Feather name="zap" size={18} color={scheduleMode === "now" ? theme.primary : theme.textSecondary} />
            <ThemedText type="body" style={{ fontWeight: "600", color: scheduleMode === "now" ? theme.primary : theme.text }}>
              Now
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Get help ASAP
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setScheduleMode("later")}
            style={[
              styles.scheduleToggleTab,
              {
                backgroundColor: scheduleMode === "later" ? theme.primary + "15" : theme.backgroundSecondary,
                borderColor: scheduleMode === "later" ? theme.primary : "transparent",
              },
            ]}
          >
            <Feather name="calendar" size={18} color={scheduleMode === "later" ? theme.primary : theme.textSecondary} />
            <ThemedText type="body" style={{ fontWeight: "600", color: scheduleMode === "later" ? theme.primary : theme.text }}>
              Schedule
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Pick a date & time
            </ThemedText>
          </Pressable>
        </View>

        {isScheduled ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Pick a Date
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateScrollContent}
            >
              {dateOptions.map((opt, index) => {
                const isActive = selectedDateIndex === index;
                return (
                  <Pressable
                    key={index}
                    onPress={() => setSelectedDateIndex(index)}
                    style={[
                      styles.dateCard,
                      {
                        backgroundColor: isActive ? theme.primary + "15" : theme.backgroundSecondary,
                        borderColor: isActive ? theme.primary : "transparent",
                      },
                    ]}
                  >
                    <ThemedText type="small" style={{ color: isActive ? theme.primary : theme.textSecondary, fontWeight: "600" }}>
                      {opt.dayLabel}
                    </ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "700", color: isActive ? theme.primary : theme.text, fontSize: 16 }}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ThemedText type="h4" style={styles.sectionTitle}>
              Pick a Time
            </ThemedText>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((slot, index) => {
                const isActive = selectedTimeIndex === index;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedTimeIndex(index)}
                    style={[
                      styles.timeChip,
                      {
                        backgroundColor: isActive ? theme.primary + "15" : theme.backgroundSecondary,
                        borderColor: isActive ? theme.primary : "transparent",
                      },
                    ]}
                  >
                    <ThemedText type="small" style={{ fontWeight: "600", color: isActive ? theme.primary : theme.text }}>
                      {slot}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {selectedTimeIndex !== null ? (
              <View style={[styles.scheduleSummary, { backgroundColor: theme.success + "10", borderColor: theme.success + "30" }]}>
                <Feather name="check-circle" size={16} color={theme.success} />
                <ThemedText type="body" style={{ color: theme.success, fontWeight: "600", marginLeft: Spacing.sm, flex: 1 }}>
                  Scheduled for {dateOptions[selectedDateIndex].dayLabel}, {dateOptions[selectedDateIndex].label} at {TIME_SLOTS[selectedTimeIndex]}
                </ThemedText>
              </View>
            ) : null}
          </>
        ) : null}

        {!isScheduled ? (
          <>
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
          </>
        ) : null}

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
                  {isFuelSelected ? (useCustomFuel ? `Fuel Delivery (Custom)` : `Fuel Delivery (${FUEL_AMOUNTS[selectedFuelIndex]?.label})`) : (selectedServiceData?.label || "Service")}
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
          disabled={!canSubmit || isSubmitting}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: theme.primary,
              opacity: !canSubmit || isSubmitting ? 0.5 : pressed ? 0.9 : 1,
              ...(!(!canSubmit || isSubmitting) && { elevation: 4 }),
            },
          ]}
        >
          {isSubmitting ? (
            <ThemedText type="body" style={styles.submitButtonText}>
              {isScheduled ? "Scheduling..." : "Finding Provider..."}
            </ThemedText>
          ) : (
            <>
              <Feather name={isScheduled ? "calendar" : "zap"} size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.submitButtonText}>
                {isScheduled ? "Schedule Service" : "Connect Nearby Provider"}
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
  priceAnchorCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  priceAnchorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  priceAnchorCompare: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  priceAnchorOld: {
    alignItems: "center",
    gap: 2,
  },
  priceAnchorArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  priceAnchorNew: {
    alignItems: "center",
    gap: 2,
  },
  vehicleInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  vehicleInfoContent: {
    flex: 1,
  },
  vehicleDefaultTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
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
  fuelScrollContent: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  fuelCard: {
    width: 140,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  fuelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  fuelToggleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fuelToggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
  },
  customFuelCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
  },
  customFuelInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  customFuelInput: {
    height: 52,
    width: 140,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 22,
    fontWeight: "700",
    borderWidth: 2,
    textAlign: "center",
  },
  scheduleToggleRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  scheduleToggleTab: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  dateScrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  dateCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
    gap: 2,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
  },
  scheduleSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
