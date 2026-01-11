import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const avatarColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6", "#EC4899", "#EF4444", "#6366F1"];

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
  other: "Other",
};

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon: keyof typeof Feather.glyphMap;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: InputFieldProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isFocused ? theme.primary : theme.border,
          },
        ]}
      >
        <Feather name={icon} size={20} color={isFocused ? theme.primary : theme.textSecondary} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
    </View>
  );
}

interface AvatarSelectorProps {
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function AvatarSelector({ selectedIndex, onSelect }: AvatarSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.avatarSection}>
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        Avatar Color
      </ThemedText>
      <View style={styles.avatarGrid}>
        {avatarColors.map((color, index) => (
          <Pressable
            key={index}
            onPress={() => onSelect(index)}
            style={[
              styles.avatarOption,
              {
                backgroundColor: color,
                borderColor: selectedIndex === index ? theme.primary : "transparent",
                borderWidth: selectedIndex === index ? 3 : 0,
              },
            ]}
          >
            <Feather name="user" size={24} color="#FFFFFF" />
            {selectedIndex === index ? (
              <View style={[styles.avatarCheck, { backgroundColor: theme.primary }]}>
                <Feather name="check" size={12} color="#FFFFFF" />
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface ServiceToggleProps {
  services: ServiceType[];
  selectedServices: ServiceType[];
  onToggle: (service: ServiceType) => void;
}

function ServiceToggle({ services, selectedServices, onToggle }: ServiceToggleProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.servicesSection}>
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        Services You Offer
      </ThemedText>
      <View style={styles.servicesGrid}>
        {services.map((service) => {
          const isSelected = selectedServices.includes(service);
          return (
            <Pressable
              key={service}
              onPress={() => onToggle(service)}
              style={[
                styles.serviceChip,
                {
                  backgroundColor: isSelected ? theme.secondary + "20" : theme.backgroundDefault,
                  borderColor: isSelected ? theme.secondary : theme.border,
                },
              ]}
            >
              {isSelected ? (
                <Feather name="check" size={14} color={theme.secondary} />
              ) : null}
              <ThemedText
                type="small"
                style={{ color: isSelected ? theme.secondary : theme.textSecondary, fontWeight: isSelected ? "600" : "400" }}
              >
                {serviceTypeLabels[service]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { userRole, currentDriver, currentProvider, setCurrentDriver, setCurrentProvider, authUser, setAuthUser } = useApp();
  const navigation = useNavigation();

  const isProvider = userRole === "provider";

  const [name, setName] = useState(isProvider ? currentProvider?.name || "" : currentDriver?.name || "");
  const [phone, setPhone] = useState(isProvider ? currentProvider?.phone || "" : currentDriver?.phone || "");
  const [email, setEmail] = useState(isProvider ? currentProvider?.email || "" : currentDriver?.email || "");
  const [avatarPreset, setAvatarPreset] = useState(currentDriver?.avatarPreset || 0);

  const [vehicleMake, setVehicleMake] = useState(currentProvider?.vehicleMake || "");
  const [vehicleModel, setVehicleModel] = useState(currentProvider?.vehicleModel || "");
  const [licensePlate, setLicensePlate] = useState(currentProvider?.licensePlate || "");
  const [servicesOffered, setServicesOffered] = useState<ServiceType[]>(currentProvider?.servicesOffered || []);

  const [isSaving, setIsSaving] = useState(false);

  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const allServices: ServiceType[] = ["flat_tire", "jump_start", "tow", "fuel", "lockout", "obd_diagnostic", "other"];

  const handleToggleService = (service: ServiceType) => {
    setServicesOffered((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !email.trim()) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    if (isProvider && servicesOffered.length === 0) {
      Alert.alert("Services Required", "Please select at least one service you offer.");
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);

      if (authUser) {
        setAuthUser({
          ...authUser,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        });
      }

      if (isProvider && currentProvider) {
        setCurrentProvider({
          ...currentProvider,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          vehicleMake: vehicleMake.trim(),
          vehicleModel: vehicleModel.trim(),
          licensePlate: licensePlate.trim().toUpperCase(),
          servicesOffered,
        });
      } else if (currentDriver) {
        setCurrentDriver({
          ...currentDriver,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          avatarPreset,
        });
      }

      Alert.alert("Profile Updated", "Your changes have been saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }, 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Personal Information
          </ThemedText>

          <InputField
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            icon="user"
            autoCapitalize="words"
          />

          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone"
            icon="phone"
            keyboardType="phone-pad"
          />

          <InputField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {!isProvider ? (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Appearance
            </ThemedText>
            <AvatarSelector selectedIndex={avatarPreset} onSelect={setAvatarPreset} />
          </View>
        ) : null}

        {isProvider ? (
          <>
            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Vehicle Information
              </ThemedText>

              <InputField
                label="Vehicle Make"
                value={vehicleMake}
                onChangeText={setVehicleMake}
                placeholder="e.g., Ford, Toyota"
                icon="truck"
                autoCapitalize="words"
              />

              <InputField
                label="Vehicle Model"
                value={vehicleModel}
                onChangeText={setVehicleModel}
                placeholder="e.g., Transit, Tacoma"
                icon="truck"
                autoCapitalize="words"
              />

              <InputField
                label="License Plate"
                value={licensePlate}
                onChangeText={(text) => setLicensePlate(text.toUpperCase())}
                placeholder="e.g., ABC-1234"
                icon="hash"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Services
              </ThemedText>
              <ServiceToggle
                services={allServices}
                selectedServices={servicesOffered}
                onToggle={handleToggleService}
              />
            </View>
          </>
        ) : null}

        <AnimatedPressable
          onPress={handleSave}
          onPressIn={() => { scale.value = withSpring(0.97); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          disabled={isSaving}
          style={[
            styles.saveButton,
            {
              backgroundColor: theme.primary,
              opacity: isSaving ? 0.7 : 1,
            },
            animatedButtonStyle,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="check" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.saveButtonText}>
                Save Changes
              </ThemedText>
            </>
          )}
        </AnimatedPressable>
      </KeyboardAwareScrollViewCompat>
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  avatarSection: {
    marginTop: Spacing.sm,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCheck: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  servicesSection: {
    marginTop: Spacing.sm,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
