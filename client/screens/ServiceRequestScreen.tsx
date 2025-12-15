import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
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

const serviceTypes: { type: ServiceType; label: string; icon: keyof typeof Feather.glyphMap; price: number }[] = [
  { type: "flat_tire", label: "Flat Tire", icon: "disc", price: 85 },
  { type: "jump_start", label: "Jump Start", icon: "battery-charging", price: 55 },
  { type: "tow", label: "Tow Truck", icon: "truck", price: 150 },
  { type: "fuel", label: "Fuel Delivery", icon: "droplet", price: 45 },
  { type: "lockout", label: "Lockout", icon: "key", price: 65 },
  { type: "other", label: "Other", icon: "more-horizontal", price: 75 },
];

interface ServiceTypeCardProps {
  type: ServiceType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  price: number;
  isSelected: boolean;
  onPress: () => void;
}

function ServiceTypeCard({ label, icon, price, isSelected, onPress }: ServiceTypeCardProps) {
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
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        ${price}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function ServiceRequestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { nearbyProviders, setActiveRequest, addToHistory } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedServiceData = serviceTypes.find((s) => s.type === selectedService);
  const estimatedCost = selectedServiceData?.price || 0;

  const handleSubmit = () => {
    if (!selectedService) return;

    setIsSubmitting(true);

    const provider = nearbyProviders[0];
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
      estimatedCost,
      createdAt: new Date(),
      provider,
      eta: 8,
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
        <ThemedText type="h4" style={styles.sectionTitle}>
          What do you need help with?
        </ThemedText>
        <View style={styles.serviceGrid}>
          {serviceTypes.map((service) => (
            <ServiceTypeCard
              key={service.type}
              {...service}
              isSelected={selectedService === service.type}
              onPress={() => setSelectedService(service.type)}
            />
          ))}
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Your Location
        </ThemedText>
        <View style={[styles.locationCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="map-pin" size={20} color={theme.primary} />
          <View style={styles.locationInfo}>
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              Current Location
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Using your GPS location
            </ThemedText>
          </View>
          <Feather name="edit-2" size={18} color={theme.textSecondary} />
        </View>

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
            <View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Estimated Cost
              </ThemedText>
              <ThemedText type="h3" style={{ color: theme.success }}>
                ${estimatedCost}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, textAlign: "right" }}>
              Final cost may vary based on actual service
            </ThemedText>
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
              opacity: !selectedService || isSubmitting ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
        >
          {isSubmitting ? (
            <ThemedText type="body" style={styles.submitButtonText}>
              Finding Provider...
            </ThemedText>
          ) : (
            <>
              <Feather name="alert-circle" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.submitButtonText}>
                Request Service Now
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
  costCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
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
