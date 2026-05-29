import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Platform, ScrollView, Keyboard, FlatList, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, CommonActions, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeInDown,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import AnimatedBackground, { DARK_BG, LIGHT_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, EVService } from "@/context/AppContext";
import { apiRequest, setAuthToken } from "@/lib/query-client";
import { saveAuthToken } from "@/lib/secureStorage";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  VEHICLE_MAKES,
  VEHICLE_MAKES_MODELS,
  SERVICE_VAN_MAKES,
  SERVICE_VAN_MAKES_MODELS,
  TOW_TRUCK_MAKES,
  TOW_TRUCK_MAKES_MODELS,
  TOW_TRUCK_CLASSES,
} from "@/constants/vehicleData";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ProviderSignUpRouteProp = RouteProp<RootStackParamList, "ProviderSignUp">;

const TOTAL_STEPS = 4;

const SERVICE_OPTIONS: { key: ServiceType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "flat_tire",        label: "Flat Tire",             icon: "disc" },
  { key: "tire_replacement", label: "Tire Replacement",      icon: "disc" },
  { key: "mobile_inflation", label: "Mobile Tire Inflation", icon: "wind" },
  { key: "tire_check",       label: "Tire Inspection",       icon: "search" },
  { key: "jump_start",       label: "Jump Start",            icon: "battery-charging" },
  { key: "battery_check",    label: "Battery Check",         icon: "battery-charging" },
  { key: "tow",              label: "Towing",                icon: "truck" },
  { key: "fuel",             label: "Fuel Delivery",         icon: "droplet" },
  { key: "lockout",          label: "Lockout",               icon: "key" },
  { key: "obd_diagnostic",   label: "OBD Diagnostic",        icon: "cpu" },
];

const LEGAL_DOCUMENTS = [
  {
    key: "privacy" as const,
    title: "Privacy Policy",
    icon: "shield" as const,
    summary: "How we collect, use, and protect your personal information including location data, payment details, and service history.",
  },
  {
    key: "terms" as const,
    title: "Terms of Service",
    icon: "file-text" as const,
    summary: "Rules governing your use of ResqRide, including your responsibilities, payment terms, and dispute resolution procedures.",
  },
  {
    key: "liability" as const,
    title: "Liability Disclaimer",
    icon: "alert-triangle" as const,
    summary: "Important limitations on ResqRide's liability and your assumption of risks when providing roadside assistance services.",
  },
];

function InputField({
  label, value, onChangeText, placeholder, icon,
  secureTextEntry, keyboardType = "default", autoCapitalize = "sentences", multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputBg      = isDark ? "rgba(255,255,255,0.06)" : theme.backgroundDefault;
  const inputBorder  = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const focusBg      = isDark ? "rgba(192,192,192,0.05)" : theme.backgroundSecondary;
  const focusBorder  = isDark ? "rgba(192,192,192,0.35)" : "#555555";
  const iconColor    = isFocused ? (isDark ? "#C0C0C0" : "#333333") : (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)");
  const labelColor   = isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary;
  const textColor    = isDark ? "#FFFFFF" : theme.text;
  const phColor      = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)";
  const eyeColor     = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";

  return (
    <View style={styles.inputContainer}>
      <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13, marginBottom: 6 }}>{label}</ThemedText>
      <View style={[
        styles.inputWrapper,
        { backgroundColor: isFocused ? focusBg : inputBg, borderColor: isFocused ? focusBorder : inputBorder },
        multiline ? { minHeight: 80, alignItems: "flex-start", paddingTop: 12 } : null,
      ]}>
        <Feather name={icon} size={18} color={iconColor} style={multiline ? { marginTop: 2 } : undefined} />
        <TextInput
          style={[styles.input, { color: textColor }, multiline ? { textAlignVertical: "top", minHeight: 60 } : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={phColor}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={multiline ? "default" : "done"}
          onSubmitEditing={multiline ? undefined : () => Keyboard.dismiss()}
          blurOnSubmit={!multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={eyeColor} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const { theme, isDark } = useTheme();
  const stepLabels = ["Personal Info", "Provider Details", "ID Verification", "Legal"];
  const dotDefaultBg     = isDark ? "rgba(255,255,255,0.08)" : theme.backgroundSecondary;
  const dotDefaultBorder = isDark ? "rgba(255,255,255,0.1)"  : theme.border;
  const lineDefault      = isDark ? "rgba(255,255,255,0.1)"  : theme.border;
  const numColorDefault  = isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.3)";
  const labelColor       = isDark ? "rgba(255,255,255,0.5)"  : theme.textSecondary;

  return (
    <View style={styles.stepIndicator}>
      <View style={styles.stepRow}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isActive    = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <View key={i} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                { backgroundColor: dotDefaultBg, borderColor: dotDefaultBorder },
                isCompleted ? { borderColor: "#00E676", backgroundColor: "#00E676" } : null,
                isActive    ? { borderColor: "rgba(192,192,192,0.6)", backgroundColor: isDark ? "rgba(192,192,192,0.10)" : "rgba(0,0,0,0.07)" } : null,
              ]}>
                {isCompleted ? <Feather name="check" size={12} color="#FFF" /> : (
                  <ThemedText type="small" style={{ color: isActive ? (isDark ? "#FFF" : theme.text) : numColorDefault, fontSize: 11, fontWeight: "700" }}>
                    {i + 1}
                  </ThemedText>
                )}
              </View>
              {i < totalSteps - 1 ? (
                <View style={[styles.stepLine, { backgroundColor: isCompleted ? "#00E676" : lineDefault }]} />
              ) : null}
            </View>
          );
        })}
      </View>
      <ThemedText type="small" style={{ color: labelColor, fontWeight: "500" }}>
        Step {currentStep + 1}: {stepLabels[currentStep]}
      </ThemedText>
    </View>
  );
}

function UploadArea({ label, isUploaded, onPress, icon }: { label: string; isUploaded: boolean; onPress: () => void; icon: keyof typeof Feather.glyphMap }) {
  const { theme, isDark } = useTheme();
  const cardBg      = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const cardBorder  = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const iconBg      = isDark ? "rgba(255,255,255,0.06)" : theme.backgroundSecondary;
  const iconColor   = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
  const labelColor  = isDark ? "#FFF" : theme.text;
  const hintDefault = isDark ? "rgba(255,255,255,0.4)" : theme.textSecondary;
  const uploadIcon  = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.uploadArea,
        { backgroundColor: isUploaded ? (isDark ? "rgba(0,230,118,0.05)" : "rgba(0,180,90,0.06)") : cardBg,
          borderColor: isUploaded ? "rgba(0,230,118,0.3)" : cardBorder,
          borderStyle: isUploaded ? "solid" : "dashed" },
      ]}
    >
      <View style={[styles.uploadIcon, { backgroundColor: isUploaded ? "#00E676" : iconBg }]}>
        <Feather name={isUploaded ? "check" : icon} size={24} color={isUploaded ? "#FFF" : iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="body" style={{ color: labelColor, fontWeight: "600", fontSize: 14 }}>{label}</ThemedText>
        <ThemedText type="small" style={{ color: isUploaded ? "#00E676" : hintDefault, marginTop: 2 }}>
          {isUploaded ? "Uploaded successfully" : "Tap to upload"}
        </ThemedText>
      </View>
      <Feather name={isUploaded ? "check-circle" : "upload"} size={20} color={isUploaded ? "#00E676" : uploadIcon} />
    </Pressable>
  );
}

function ServiceSelector({ selected, onToggle }: { selected: ServiceType[]; onToggle: (s: ServiceType) => void }) {
  const { theme, isDark } = useTheme();
  const chipBg       = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const chipBorder   = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const chipSelBg    = isDark ? "rgba(192,192,192,0.10)" : "rgba(0,0,0,0.08)";
  const chipSelBorder= isDark ? "rgba(192,192,192,0.40)" : "rgba(0,0,0,0.25)";

  return (
    <View style={styles.serviceGrid}>
      {SERVICE_OPTIONS.map((svc) => {
        const isSelected = selected.includes(svc.key);
        return (
          <Pressable
            key={svc.key}
            onPress={() => onToggle(svc.key)}
            style={[
              styles.serviceChip,
              { backgroundColor: isSelected ? chipSelBg : chipBg, borderColor: isSelected ? chipSelBorder : chipBorder },
            ]}
          >
            <Feather name={svc.icon} size={16} color={isSelected ? (isDark ? "#C0C0C0" : "#333") : (isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)")} />
            <ThemedText type="small" style={{ color: isSelected ? (isDark ? "#FFF" : theme.text) : (isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary), fontWeight: isSelected ? "600" : "400" }}>
              {svc.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const EV_SERVICES: { key: EVService; label: string; desc: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "ev_charging", label: "Mobile EV Charging", desc: "Portable DC fast charge or Level 2 equipment", icon: "zap" },
  { key: "ev_towing",   label: "EV-Safe Towing",     desc: "Flatbed only — no drivetrain contact",        icon: "truck" },
  { key: "hv_certified",label: "High-Voltage Certified", desc: "Trained to work safely around EV battery packs", icon: "shield" },
];

const FLAT_TIRE_ADDONS: { key: "replacement" | "inflation" | "tireCheck"; label: string; desc: string }[] = [
  { key: "replacement", label: "Tire Replacement", desc: "Can physically swap out a flat with a spare" },
  { key: "inflation",   label: "Mobile Inflation",  desc: "Portable air compressor / inflator" },
  { key: "tireCheck",  label: "Tire Pressure Check", desc: "Inspect & report pressure on all tires" },
];
const JUMP_START_ADDONS: { key: "batteryCheck"; label: string; desc: string }[] = [
  { key: "batteryCheck", label: "Battery Health Check", desc: "Diagnose battery condition with a tester" },
];

function ServiceAddonsSection({
  selectedServices,
  flatTireAddons, setFlatTireAddons,
  jumpStartAddons, setJumpStartAddons,
}: {
  selectedServices: ServiceType[];
  flatTireAddons: { replacement: boolean; inflation: boolean; tireCheck: boolean };
  setFlatTireAddons: React.Dispatch<React.SetStateAction<{ replacement: boolean; inflation: boolean; tireCheck: boolean }>>;
  jumpStartAddons: { batteryCheck: boolean };
  setJumpStartAddons: React.Dispatch<React.SetStateAction<{ batteryCheck: boolean }>>;
}) {
  const { theme, isDark } = useTheme();
  const hasFlatTire = selectedServices.includes("flat_tire");
  const hasJumpStart = selectedServices.includes("jump_start");
  if (!hasFlatTire && !hasJumpStart) return null;

  const cardBg    = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const cardBorder= isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const titleColor= isDark ? "#FFF" : theme.text;
  const subColor  = isDark ? "rgba(255,255,255,0.45)" : theme.textSecondary;
  const labelColor= isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary;
  const divColor  = isDark ? "rgba(255,255,255,0.06)" : theme.border;

  const renderAddonRow = (label: string, desc: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} style={[
      styles.evServiceRow,
      active ? styles.evServiceRowActive : { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : theme.backgroundSecondary, borderColor: isDark ? "rgba(255,255,255,0.06)" : theme.border },
    ]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="small" style={{ color: active ? (isDark ? "#FFF" : theme.text) : (isDark ? "rgba(255,255,255,0.7)" : theme.textSecondary), fontWeight: active ? "600" : "400", fontSize: 13 }}>{label}</ThemedText>
        <ThemedText type="small" style={{ color: active ? "rgba(0,170,255,0.7)" : (isDark ? "rgba(255,255,255,0.35)" : theme.textSecondary), fontSize: 11, marginTop: 1 }}>{desc}</ThemedText>
      </View>
      <View style={[styles.evCheckbox, active ? { backgroundColor: "#0066FF", borderColor: "#0066FF" } : { borderColor: isDark ? "rgba(255,255,255,0.2)" : theme.border }]}>
        {active ? <Feather name="check" size={12} color="#FFF" /> : null}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.inputContainer}>
      <View style={styles.evSectionHeader}>
        <View style={[styles.evSectionIconWrap, { backgroundColor: isDark ? "rgba(0,102,255,0.15)" : "rgba(0,102,255,0.1)" }]}>
          <Feather name="sliders" size={16} color="#0066FF" />
        </View>
        <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13 }}>Service Capabilities</ThemedText>
      </View>
      <ThemedText type="small" style={{ color: subColor, fontSize: 12, marginBottom: 8 }}>Select the specific add-ons you can offer for each service</ThemedText>
      {hasFlatTire ? (
        <View style={[styles.evPromptCard, { backgroundColor: cardBg, borderColor: cardBorder, marginBottom: 10 }]}>
          <View style={[styles.evPromptRow, { paddingBottom: 8 }]}>
            <Feather name="disc" size={16} color={isDark ? "rgba(255,255,255,0.6)" : "#555"} />
            <ThemedText type="body" style={{ fontSize: 13, fontWeight: "700", color: titleColor, marginLeft: 8, flex: 1 }}>Flat Tire Add-ons</ThemedText>
          </View>
          <View style={[styles.evDivider, { backgroundColor: divColor, marginBottom: 8 }]} />
          {FLAT_TIRE_ADDONS.map((a) => renderAddonRow(a.label, a.desc, flatTireAddons[a.key], () => setFlatTireAddons((p) => ({ ...p, [a.key]: !p[a.key] }))))}
        </View>
      ) : null}
      {hasJumpStart ? (
        <View style={[styles.evPromptCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={[styles.evPromptRow, { paddingBottom: 8 }]}>
            <Feather name="battery-charging" size={16} color={isDark ? "rgba(255,255,255,0.6)" : "#555"} />
            <ThemedText type="body" style={{ fontSize: 13, fontWeight: "700", color: titleColor, marginLeft: 8, flex: 1 }}>Jump Start Add-ons</ThemedText>
          </View>
          <View style={[styles.evDivider, { backgroundColor: divColor, marginBottom: 8 }]} />
          {JUMP_START_ADDONS.map((a) => renderAddonRow(a.label, a.desc, jumpStartAddons[a.key], () => setJumpStartAddons((p) => ({ ...p, [a.key]: !p[a.key] }))))}
        </View>
      ) : null}
    </View>
  );
}

function PriorityToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { theme, isDark } = useTheme();
  const cardBg    = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const cardBorder= isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const titleColor= isDark ? "#FFF" : theme.text;
  const subColor  = isDark ? "rgba(255,255,255,0.45)" : theme.textSecondary;
  const labelColor= isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary;
  return (
    <View style={styles.inputContainer}>
      <View style={styles.evSectionHeader}>
        <View style={[styles.evSectionIconWrap, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)" }]}>
          <Feather name="star" size={16} color="#F59E0B" />
        </View>
        <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13 }}>Priority Requests</ThemedText>
      </View>
      <View style={[styles.evPromptCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.evPromptRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontSize: 14, fontWeight: "600", color: titleColor }}>Accept priority job requests?</ThemedText>
            <ThemedText type="small" style={{ fontSize: 12, color: subColor, marginTop: 2 }}>Priority jobs pay more but require faster response times</ThemedText>
          </View>
          <Pressable onPress={() => onChange(!value)} style={[styles.evToggle, value ? { backgroundColor: "#F59E0B" } : styles.evToggleOff]}>
            <View style={[styles.evToggleThumb, value ? styles.evToggleThumbOn : styles.evToggleThumbOff]} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function EVCapabilitySection({ evCapable, setEvCapable, evServices, toggleEvService }: {
  evCapable: boolean;
  setEvCapable: (v: boolean) => void;
  evServices: EVService[];
  toggleEvService: (s: EVService) => void;
}) {
  const { theme, isDark } = useTheme();
  const cardBg     = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const titleColor = isDark ? "#FFF" : theme.text;
  const subColor   = isDark ? "rgba(255,255,255,0.45)" : theme.textSecondary;
  const labelColor = isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary;
  const divColor   = isDark ? "rgba(255,255,255,0.06)" : theme.border;
  const svcLabel   = isDark ? "rgba(255,255,255,0.5)" : theme.textSecondary;

  return (
    <View style={styles.inputContainer}>
      <View style={styles.evSectionHeader}>
        <View style={styles.evSectionIconWrap}>
          <Feather name="zap" size={16} color="#00E676" />
        </View>
        <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13 }}>EV Services</ThemedText>
      </View>
      <View style={[styles.evPromptCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.evPromptRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontSize: 14, fontWeight: "600", color: titleColor }}>Can you service electric vehicles?</ThemedText>
            <ThemedText type="small" style={{ fontSize: 12, color: subColor, marginTop: 2 }}>Unlock EV job requests from drivers using EV Mode</ThemedText>
          </View>
          <Pressable onPress={() => setEvCapable(!evCapable)} style={[styles.evToggle, evCapable ? styles.evToggleOn : styles.evToggleOff]}>
            <View style={[styles.evToggleThumb, evCapable ? styles.evToggleThumbOn : styles.evToggleThumbOff]} />
          </Pressable>
        </View>
        {evCapable ? (
          <View style={styles.evServicesWrap}>
            <View style={[styles.evDivider, { backgroundColor: divColor }]} />
            <ThemedText type="small" style={{ fontSize: 12, color: svcLabel, marginBottom: 8 }}>Select the EV services you can provide:</ThemedText>
            {EV_SERVICES.map((s) => {
              const active = evServices.includes(s.key);
              return (
                <Pressable
                  key={s.key}
                  onPress={() => toggleEvService(s.key)}
                  style={[
                    styles.evServiceRow,
                    active ? styles.evServiceRowActive : { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : theme.backgroundSecondary, borderColor: isDark ? "rgba(255,255,255,0.06)" : theme.border },
                  ]}
                >
                  <View style={[styles.evServiceIcon, active ? styles.evServiceIconActive : { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : theme.backgroundTertiary }]}>
                    <Feather name={s.icon} size={14} color={active ? "#00E676" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)")} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ color: active ? (isDark ? "#FFF" : theme.text) : (isDark ? "rgba(255,255,255,0.7)" : theme.textSecondary), fontWeight: active ? "600" : "400", fontSize: 13 }}>
                      {s.label}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: active ? "rgba(0,230,118,0.7)" : (isDark ? "rgba(255,255,255,0.35)" : theme.textSecondary), fontSize: 11, marginTop: 1 }}>
                      {s.desc}
                    </ThemedText>
                  </View>
                  <View style={[styles.evCheckbox, active ? styles.evCheckboxActive : { borderColor: isDark ? "rgba(255,255,255,0.2)" : theme.border }]}>
                    {active ? <Feather name="check" size={12} color="#FFF" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function ProviderSignUpScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ProviderSignUpRouteProp>();
  const { setIsAuthenticated, setAuthUser, setUserRole, setCurrentProvider } = useApp();
  const providerType = route.params.providerType;
  const isIndependent = providerType === "independent";

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [vehicleType, setVehicleType] = useState<"pickup" | "service_van" | "tow_truck">("pickup");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [towClass, setTowClass] = useState("");
  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showTowClassPicker, setShowTowClassPicker] = useState(false);
  const [yearsExperience, setYearsExperience] = useState("");
  const [bio, setBio] = useState("");
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [evCapable, setEvCapable] = useState(false);
  const [evServices, setEvServices] = useState<EVService[]>([]);
  const [acceptsPriority, setAcceptsPriority] = useState(false);
  const [flatTireAddons, setFlatTireAddons] = useState({ replacement: false, inflation: false, tireCheck: false });
  const [jumpStartAddons, setJumpStartAddons] = useState({ batteryCheck: false });

  const toggleEvService = useCallback((service: EVService) => {
    setEvServices((prev) => prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]);
  }, []);

  const [companyName, setCompanyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [numVehicles, setNumVehicles] = useState("");
  const [numEmployees, setNumEmployees] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [acceptedDocs, setAcceptedDocs] = useState<Record<string, boolean>>({ privacy: false, terms: false, liability: false });
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const allAccepted = acceptedDocs.privacy && acceptedDocs.terms && acceptedDocs.liability;
  const scale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isTowTruck = vehicleType === "tow_truck";
  const isServiceVan = vehicleType === "service_van";
  const activeMakes = isTowTruck ? TOW_TRUCK_MAKES : isServiceVan ? SERVICE_VAN_MAKES : VEHICLE_MAKES;
  const activeMakesModels = isTowTruck ? TOW_TRUCK_MAKES_MODELS : isServiceVan ? SERVICE_VAN_MAKES_MODELS : VEHICLE_MAKES_MODELS;
  const availableSignupModels = useMemo(() => {
    if (!vehicleMake) return [];
    return activeMakesModels[vehicleMake] || [];
  }, [vehicleMake, activeMakesModels]);

  const handleVehicleTypeChange = (type: "pickup" | "service_van" | "tow_truck") => {
    setVehicleType(type);
    setVehicleMake("");
    setVehicleModel("");
    setTowClass("");
  };

  const toggleService = useCallback((service: ServiceType) => {
    setSelectedServices((prev) => prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]);
  }, []);

  const handleUpload = useCallback(async (docKey: string) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Allow access to your photo library to upload documents.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        const dataUri = `data:image/jpeg;base64,${compressed.base64}`;
        setUploadedDocs((prev) => ({ ...prev, [docKey]: dataUri }));
      }
    } catch {
      Alert.alert("Upload Failed", "Could not open photo library. Please try again.");
    }
  }, []);

  const toggleAccept = useCallback((key: string) => {
    setAcceptedDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
        Alert.alert("Missing Information", "Please fill in all fields."); return false;
      }
      if (password !== confirmPassword) { Alert.alert("Password Mismatch", "Passwords do not match."); return false; }
      if (password.length < 6) { Alert.alert("Weak Password", "Password must be at least 6 characters."); return false; }
      return true;
    }
    if (step === 1) {
      if (isIndependent && (!vehicleMake.trim() || !vehicleModel.trim())) {
        Alert.alert("Missing Information", "Please enter your vehicle details."); return false;
      }
      if (!isIndependent && (!companyName.trim() || !businessAddress.trim() || !licenseNumber.trim())) {
        Alert.alert("Missing Information", "Please fill in all required business information."); return false;
      }
      if (selectedServices.length === 0) {
        Alert.alert("No Services", "Please select at least one service you can provide."); return false;
      }
      return true;
    }
    if (step === 2) {
      const requiredDocs = isIndependent ? ["photoId", "selfie"] : ["businessLicense", "ownerId", "insurance"];
      if (!requiredDocs.every((doc) => uploadedDocs[doc])) {
        Alert.alert("Documents Required", "Please upload all required documents for identity verification."); return false;
      }
      return true;
    }
    if (step === 3) {
      if (!allAccepted) { Alert.alert("Agreement Required", "Please accept all legal agreements to continue."); return false; }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let signupData: { userId: string; token: string; role: string; name: string; email: string; phone: string };
      try {
        const signupRes = await apiRequest("POST", "/api/auth/signup", {
          email: email.trim(), name: fullName.trim(), phone: phone.trim(), password, role: "provider",
        });
        signupData = await signupRes.json();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        Alert.alert(msg.includes("409") ? "Account Exists" : "Sign Up Failed",
          msg.includes("409") ? "An account with this email already exists. Please sign in instead." : "Could not create account. Please check your connection and try again.");
        return;
      }
      const { userId, token } = signupData;
      setAuthToken(token);
      await saveAuthToken(token);
      const providerProfile = {
        id: userId, name: isIndependent ? fullName.trim() : companyName.trim(),
        phone: isIndependent ? phone.trim() : businessPhone.trim() || phone.trim(),
        email: email.trim().toLowerCase(), rating: 5.0, reviewCount: 0,
        vehicleType, vehicleMake: vehicleMake.trim() || "TBD", vehicleModel: vehicleModel.trim() || "TBD",
        licensePlate: "NEW-001", servicesOffered: selectedServices, isAvailable: true,
        providerType, verificationStatus: "pending", evCapable, evServices: evCapable ? evServices : [],
        acceptsPriority,
        serviceCapabilities: {
          flatTire: selectedServices.includes("flat_tire") ? flatTireAddons : null,
          jumpStart: selectedServices.includes("jump_start") ? jumpStartAddons : null,
        },
        location: { latitude: 0, longitude: 0 },
      };
      await apiRequest("POST", "/api/providers/register", providerProfile).catch(() => {});
      apiRequest("POST", `/api/providers/${userId}/verification`, {
        verificationDocuments: uploadedDocs,
        verificationSubmittedAt: new Date().toISOString(),
      }).catch(() => {});
      setAuthUser({ id: userId, name: fullName.trim(), email: email.trim(), phone: phone.trim() });
      setIsAuthenticated(true);
      setUserRole("provider");
      setCurrentProvider(providerProfile as any);
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderTabs" }] }));
    } catch {
      Alert.alert("Sign Up Failed", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // — Derived colors —
  const backBg         = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const backIcon       = isDark ? "#FFF" : theme.text;
  const accentLabel    = isDark ? "#C0C0C0" : theme.textSecondary;
  const stepTitleColor = isDark ? "#FFF" : theme.text;
  const stepSubColor   = isDark ? "rgba(255,255,255,0.5)" : theme.textSecondary;
  const cardBg         = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const cardBorder     = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const iconBg         = isDark ? "rgba(192,192,192,0.10)" : theme.backgroundSecondary;
  const iconBgBiz      = isDark ? "rgba(192,192,192,0.10)" : theme.backgroundSecondary;
  const iconBgLegal    = isDark ? "rgba(16,185,129,0.15)"  : "rgba(16,185,129,0.12)";
  const verInfoBg      = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const verInfoBorder  = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const verInfoText    = isDark ? "rgba(255,255,255,0.6)"  : theme.textSecondary;
  const verLockColor   = isDark ? "rgba(192,192,192,0.7)"  : "rgba(0,0,0,0.35)";
  const uploadHintColor= isDark ? "rgba(255,255,255,0.35)" : theme.textSecondary;
  const bannerBg       = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundSecondary;
  const bannerBorder   = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const bannerText     = isDark ? "rgba(192,192,192,0.7)"  : theme.textSecondary;
  const pickerBg       = isDark ? "rgba(255,255,255,0.06)" : theme.backgroundDefault;
  const pickerBorder   = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const pickerFilledBorder = isDark ? "rgba(192,192,192,0.40)" : "rgba(0,0,0,0.25)";
  const pickerText     = isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.35)";
  const pickerFilledText = isDark ? "#FFF" : theme.text;
  const chevronColor   = isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.3)";
  const vehOptBg       = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const vehOptBorder   = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const vehSelBg       = isDark ? "rgba(192,192,192,0.08)" : "rgba(0,0,0,0.07)";
  const vehSelBorder   = isDark ? "rgba(192,192,192,0.40)" : "rgba(0,0,0,0.25)";
  const vehOptText     = isDark ? "rgba(255,255,255,0.5)"  : theme.textSecondary;
  const vehSelText     = isDark ? "#FFF" : theme.text;
  const legalProgressColor = isDark ? "rgba(255,255,255,0.5)" : theme.textSecondary;
  const acceptAllBg    = isDark ? "rgba(192,192,192,0.10)" : theme.backgroundSecondary;
  const acceptAllBorder= isDark ? "rgba(192,192,192,0.25)" : theme.border;
  const legalCardBg    = isDark ? "rgba(255,255,255,0.04)" : theme.backgroundDefault;
  const legalCardBorder= isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const legalIconWrapBg= isDark ? "rgba(255,255,255,0.06)" : theme.backgroundSecondary;
  const legalTitleColor= isDark ? "#FFF" : theme.text;
  const legalSubDef    = isDark ? "rgba(255,255,255,0.4)"  : theme.textSecondary;
  const legalSumColor  = isDark ? "rgba(255,255,255,0.5)"  : theme.textSecondary;
  const expandBtnColor = isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.3)";
  const acceptHintColor= isDark ? "rgba(255,255,255,0.4)"  : theme.textSecondary;
  const hintIconColor  = isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.35)";

  // Modal colors
  const modalBg     = isDark ? "#0D0D0D" : theme.backgroundDefault;
  const modalHeader = isDark ? "#FFF"    : theme.text;
  const modalXColor = isDark ? "#FFF"    : theme.text;
  const modalItemPressedBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const modalItemText = isDark ? "#FFF"  : theme.text;
  const modalItemSub  = isDark ? "rgba(255,255,255,0.5)" : theme.textSecondary;
  const modalChevron  = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  const modalSepColor = isDark ? "rgba(255,255,255,0.06)" : theme.border;

  const isLastStep = step === TOTAL_STEPS - 1;
  const canProceed = step === 3 ? allAccepted : true;
  const btnColors: [string, string] = canProceed
    ? (isDark ? ["#2A2A2A", "#181818"] : ["#1A1A1A", "#0A0A0A"])
    : (isDark ? ["rgba(255,255,255,0.10)", "rgba(255,255,255,0.05)"] : ["rgba(0,0,0,0.08)", "rgba(0,0,0,0.04)"]);
  const btnTextColor = canProceed ? "#FFF" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)");

  const renderStep0 = () => (
    <Animated.View entering={FadeInDown.duration(400)} key="step0" style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: iconBg }]}>
          <Feather name="user" size={24} color={isDark ? "#C0C0C0" : "#555555"} />
        </View>
        <ThemedText type="h3" style={{ color: stepTitleColor, marginBottom: 4 }}>Personal Information</ThemedText>
        <ThemedText type="small" style={{ color: stepSubColor, textAlign: "center", paddingHorizontal: 20 }}>
          {isIndependent ? "Tell us about yourself" : "Owner/manager information"}
        </ThemedText>
      </View>
      <View style={styles.form}>
        <InputField label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Enter your full name" icon="user" autoCapitalize="words" />
        <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" icon="mail" keyboardType="email-address" autoCapitalize="none" />
        <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Enter your phone number" icon="phone" keyboardType="phone-pad" />
        <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" icon="lock" secureTextEntry autoCapitalize="none" />
        <InputField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm your password" icon="lock" secureTextEntry autoCapitalize="none" />
      </View>
    </Animated.View>
  );

  const renderStep1Independent = () => (
    <Animated.View entering={FadeInDown.duration(400)} key="step1-ind" style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: iconBg }]}>
          <Feather name="tool" size={24} color={isDark ? "#C0C0C0" : "#555555"} />
        </View>
        <ThemedText type="h3" style={{ color: stepTitleColor, marginBottom: 4 }}>Your Setup</ThemedText>
        <ThemedText type="small" style={{ color: stepSubColor, textAlign: "center", paddingHorizontal: 20 }}>Tell us about your vehicle and skills</ThemedText>
      </View>
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <ThemedText type="small" style={{ fontWeight: "500", color: isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary, fontSize: 13, marginBottom: 6 }}>Vehicle Type</ThemedText>
          <View style={styles.vehicleTypeRow}>
            {([["pickup", "Personal Car", "navigation"], ["service_van", "Service Van", "package"], ["tow_truck", "Tow Truck", "truck"]] as const).map(([type, label, icon]) => (
              <Pressable key={type} onPress={() => handleVehicleTypeChange(type)}
                style={[styles.vehicleTypeOption,
                  { backgroundColor: vehicleType === type ? vehSelBg : vehOptBg, borderColor: vehicleType === type ? vehSelBorder : vehOptBorder }]}>
                <Feather name={icon} size={18} color={vehicleType === type ? (isDark ? "#C0C0C0" : "#333") : (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)")} />
                <ThemedText type="small" style={{ color: vehicleType === type ? vehSelText : vehOptText, fontSize: 12 }}>{label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {(isTowTruck || isServiceVan) ? (
          <View style={[styles.signupTowBanner, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
            <Feather name="info" size={13} color={bannerText} />
            <ThemedText type="small" style={{ color: bannerText, flex: 1, marginLeft: 8, fontSize: 12 }}>
              {isTowTruck
                ? "Commercial tow truck makes & models are loaded. Select your chassis below."
                : "Commercial service van makes & models are loaded. Select your van below."}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <ThemedText type="small" style={{ fontWeight: "500", color: isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary, fontSize: 13, marginBottom: 6 }}>
            {isTowTruck ? "Tow Truck Make" : isServiceVan ? "Van Make" : "Vehicle Make"}
          </ThemedText>
          <Pressable onPress={() => setShowMakePicker(true)}
            style={[styles.signupPickerBtn, { backgroundColor: vehicleMake ? (isDark ? "rgba(192,192,192,0.08)" : theme.backgroundSecondary) : pickerBg, borderColor: vehicleMake ? pickerFilledBorder : pickerBorder }]}>
            <Feather name={isTowTruck ? "truck" : isServiceVan ? "package" : "navigation"} size={16} color={vehicleMake ? (isDark ? "#C0C0C0" : "#333") : (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)")} />
            <ThemedText type="small" style={{ color: vehicleMake ? pickerFilledText : pickerText, flex: 1, marginLeft: 10, fontSize: 14 }}>
              {vehicleMake || (isTowTruck ? "Select tow truck make..." : isServiceVan ? "Select van make..." : "Select make...")}
            </ThemedText>
            <Feather name="chevron-down" size={16} color={chevronColor} />
          </Pressable>
        </View>

        <View style={styles.inputContainer}>
          <ThemedText type="small" style={{ fontWeight: "500", color: isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary, fontSize: 13, marginBottom: 6 }}>
            {isTowTruck ? "Tow Truck Model" : isServiceVan ? "Van Model" : "Vehicle Model"}
          </ThemedText>
          <Pressable onPress={() => vehicleMake ? setShowModelPicker(true) : null}
            style={[styles.signupPickerBtn, { backgroundColor: vehicleModel ? (isDark ? "rgba(192,192,192,0.08)" : theme.backgroundSecondary) : pickerBg, borderColor: vehicleModel ? pickerFilledBorder : pickerBorder, opacity: !vehicleMake ? 0.5 : 1 }]}>
            <Feather name={isTowTruck ? "truck" : isServiceVan ? "package" : "navigation"} size={16} color={vehicleModel ? (isDark ? "#C0C0C0" : "#333") : (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)")} />
            <ThemedText type="small" style={{ color: vehicleModel ? pickerFilledText : pickerText, flex: 1, marginLeft: 10, fontSize: 14 }}>
              {vehicleModel || (vehicleMake ? "Select model..." : "Select a make first")}
            </ThemedText>
            <Feather name="chevron-down" size={16} color={chevronColor} />
          </Pressable>
        </View>

        {isTowTruck ? (
          <View style={styles.inputContainer}>
            <ThemedText type="small" style={{ fontWeight: "500", color: isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary, fontSize: 13, marginBottom: 6 }}>Tow Truck Class</ThemedText>
            <Pressable onPress={() => setShowTowClassPicker(true)}
              style={[styles.signupPickerBtn, { backgroundColor: towClass ? (isDark ? "rgba(192,192,192,0.08)" : theme.backgroundSecondary) : pickerBg, borderColor: towClass ? pickerFilledBorder : pickerBorder }]}>
              <Feather name="layers" size={16} color={towClass ? (isDark ? "#C0C0C0" : "#333") : (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)")} />
              <ThemedText type="small" style={{ color: towClass ? pickerFilledText : pickerText, flex: 1, marginLeft: 10, fontSize: 14 }}>
                {towClass || "Select wrecker class..."}
              </ThemedText>
              <Feather name="chevron-down" size={16} color={chevronColor} />
            </Pressable>
          </View>
        ) : null}

        <InputField label="Years of Experience (optional)" value={yearsExperience} onChangeText={setYearsExperience} placeholder="How many years?" icon="clock" keyboardType="number-pad" />
        <View style={styles.inputContainer}>
          <ThemedText type="small" style={{ fontWeight: "500", color: isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary, fontSize: 13, marginBottom: 6 }}>Services You Can Provide</ThemedText>
          <ServiceSelector selected={selectedServices} onToggle={toggleService} />
        </View>
        <ServiceAddonsSection selectedServices={selectedServices} flatTireAddons={flatTireAddons} setFlatTireAddons={setFlatTireAddons} jumpStartAddons={jumpStartAddons} setJumpStartAddons={setJumpStartAddons} />
        <EVCapabilitySection evCapable={evCapable} setEvCapable={setEvCapable} evServices={evServices} toggleEvService={toggleEvService} />
        <PriorityToggle value={acceptsPriority} onChange={setAcceptsPriority} />
        <InputField label="Brief Bio (optional)" value={bio} onChangeText={setBio} placeholder="Tell drivers about yourself..." icon="edit-3" multiline />
      </View>
    </Animated.View>
  );

  const renderStep1Business = () => (
    <Animated.View entering={FadeInDown.duration(400)} key="step1-biz" style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: iconBgBiz }]}>
          <Feather name="briefcase" size={24} color={isDark ? "#C0C0C0" : "#555555"} />
        </View>
        <ThemedText type="h3" style={{ color: stepTitleColor, marginBottom: 4 }}>Business Information</ThemedText>
        <ThemedText type="small" style={{ color: stepSubColor, textAlign: "center", paddingHorizontal: 20 }}>Register your company details</ThemedText>
      </View>
      <View style={styles.form}>
        <InputField label="Company / Business Name" value={companyName} onChangeText={setCompanyName} placeholder="Enter your business name" icon="briefcase" autoCapitalize="words" />
        <InputField label="Business Address" value={businessAddress} onChangeText={setBusinessAddress} placeholder="Full business address" icon="map-pin" autoCapitalize="words" />
        <InputField label="Business Phone" value={businessPhone} onChangeText={setBusinessPhone} placeholder="Business phone number" icon="phone" keyboardType="phone-pad" />
        <InputField label="Business License Number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="License or registration number" icon="file-text" autoCapitalize="characters" />
        <InputField label="Number of Vehicles" value={numVehicles} onChangeText={setNumVehicles} placeholder="How many service vehicles?" icon="truck" keyboardType="number-pad" />
        <InputField label="Number of Employees" value={numEmployees} onChangeText={setNumEmployees} placeholder="Total team members" icon="users" keyboardType="number-pad" />
        <View style={styles.inputContainer}>
          <ThemedText type="small" style={{ fontWeight: "500", color: isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary, fontSize: 13, marginBottom: 6 }}>Services Offered</ThemedText>
          <ServiceSelector selected={selectedServices} onToggle={toggleService} />
        </View>
        <ServiceAddonsSection selectedServices={selectedServices} flatTireAddons={flatTireAddons} setFlatTireAddons={setFlatTireAddons} jumpStartAddons={jumpStartAddons} setJumpStartAddons={setJumpStartAddons} />
        <EVCapabilitySection evCapable={evCapable} setEvCapable={setEvCapable} evServices={evServices} toggleEvService={toggleEvService} />
        <PriorityToggle value={acceptsPriority} onChange={setAcceptsPriority} />
        <InputField label="Company Description (optional)" value={companyDescription} onChangeText={setCompanyDescription} placeholder="Describe your business..." icon="edit-3" multiline />
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInDown.duration(400)} key="step2" style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: iconBg }]}>
          <Feather name="shield" size={24} color={isDark ? "#C0C0C0" : "#555555"} />
        </View>
        <ThemedText type="h3" style={{ color: stepTitleColor, marginBottom: 4 }}>Identity Verification</ThemedText>
        <ThemedText type="small" style={{ color: stepSubColor, textAlign: "center", paddingHorizontal: 20 }}>
          {isIndependent ? "Upload your ID for driver safety and trust" : "Upload business and personal identification documents"}
        </ThemedText>
      </View>
      <View style={[styles.verificationInfo, { backgroundColor: verInfoBg, borderColor: verInfoBorder }]}>
        <Feather name="lock" size={16} color={verLockColor} />
        <ThemedText type="small" style={{ flex: 1, color: verInfoText, lineHeight: 18 }}>
          Your documents are encrypted and stored securely. Verification typically takes 1-2 business days.
        </ThemedText>
      </View>
      <View style={styles.uploadSection}>
        {isIndependent ? (
          <>
            <UploadArea label="Government-Issued Photo ID" isUploaded={!!uploadedDocs.photoId} onPress={() => handleUpload("photoId")} icon="credit-card" />
            <ThemedText type="small" style={{ color: uploadHintColor, fontSize: 12, marginLeft: 62, marginBottom: 8 }}>Driver's license, passport, or state ID</ThemedText>
            <UploadArea label="Selfie for Face Match" isUploaded={!!uploadedDocs.selfie} onPress={() => handleUpload("selfie")} icon="camera" />
            <ThemedText type="small" style={{ color: uploadHintColor, fontSize: 12, marginLeft: 62, marginBottom: 8 }}>Clear photo of your face for identity verification</ThemedText>
          </>
        ) : (
          <>
            <UploadArea label="Business License / Registration" isUploaded={!!uploadedDocs.businessLicense} onPress={() => handleUpload("businessLicense")} icon="file-text" />
            <ThemedText type="small" style={{ color: uploadHintColor, fontSize: 12, marginLeft: 62, marginBottom: 8 }}>Valid business license or registration certificate</ThemedText>
            <UploadArea label="Owner's Government-Issued Photo ID" isUploaded={!!uploadedDocs.ownerId} onPress={() => handleUpload("ownerId")} icon="credit-card" />
            <ThemedText type="small" style={{ color: uploadHintColor, fontSize: 12, marginLeft: 62, marginBottom: 8 }}>Driver's license, passport, or state ID of the business owner</ThemedText>
            <UploadArea label="Proof of Insurance" isUploaded={!!uploadedDocs.insurance} onPress={() => handleUpload("insurance")} icon="shield" />
            <ThemedText type="small" style={{ color: uploadHintColor, fontSize: 12, marginLeft: 62, marginBottom: 8 }}>General liability insurance certificate (min $1M recommended)</ThemedText>
          </>
        )}
      </View>
      <View style={styles.verificationStatus}>
        <View style={styles.verificationBadge}>
          <Feather name="clock" size={16} color="#F59E0B" />
          <ThemedText type="small" style={{ color: "#F59E0B", fontWeight: "600" }}>Verification will be pending after submission</ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => {
    const acceptedCount = Object.values(acceptedDocs).filter(Boolean).length;
    return (
      <Animated.View entering={FadeInDown.duration(400)} key="step3" style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepHeaderIcon, { backgroundColor: iconBgLegal }]}>
            <Feather name="file-text" size={24} color="#10B981" />
          </View>
          <ThemedText type="h3" style={{ color: stepTitleColor, marginBottom: 4 }}>Legal Agreements</ThemedText>
          <ThemedText type="small" style={{ color: stepSubColor, textAlign: "center", paddingHorizontal: 20 }}>Tap each agreement to read and accept</ThemedText>
        </View>
        <View style={styles.legalProgressRow}>
          <Feather name="check-circle" size={16} color={allAccepted ? "#00E676" : (isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)")} />
          <ThemedText type="small" style={{ flex: 1, color: allAccepted ? "#00E676" : legalProgressColor }}>
            {acceptedCount} of {LEGAL_DOCUMENTS.length} accepted
          </ThemedText>
          {!allAccepted ? (
            <Pressable onPress={() => setAcceptedDocs({ privacy: true, terms: true, liability: true })}
              style={[styles.acceptAllBtn, { backgroundColor: acceptAllBg, borderColor: acceptAllBorder }]}>
              <ThemedText type="small" style={{ color: isDark ? "#C0C0C0" : theme.textSecondary, fontWeight: "600", fontSize: 12 }}>Accept All</ThemedText>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.legalSection}>
          {LEGAL_DOCUMENTS.map((doc) => {
            const isExpanded = expandedDoc === doc.key;
            const isAccepted = !!acceptedDocs[doc.key];
            const iconColor = isAccepted ? "#00E676" : (doc.key === "liability" ? "#F59E0B" : (isDark ? "#C0C0C0" : "#555555"));
            return (
              <Pressable key={doc.key} onPress={() => toggleAccept(doc.key)}
                style={[styles.legalCard,
                  { backgroundColor: isAccepted ? (isDark ? "rgba(0,230,118,0.05)" : "rgba(0,180,90,0.06)") : legalCardBg,
                    borderColor: isAccepted ? "rgba(0,230,118,0.25)" : legalCardBorder }]}>
                <View style={styles.legalCardHeader}>
                  <View style={[styles.legalIconWrap, { backgroundColor: isAccepted ? "rgba(0,230,118,0.12)" : legalIconWrapBg }]}>
                    <Feather name={isAccepted ? "check" : doc.icon} size={18} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: "600", color: isAccepted ? "#00E676" : legalTitleColor, fontSize: 15 }}>
                      {doc.title}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: isAccepted ? "rgba(0,230,118,0.7)" : legalSubDef, fontSize: 11 }}>
                      {isAccepted ? "Accepted" : "Tap to read and accept"}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => setExpandedDoc(isExpanded ? null : doc.key)} hitSlop={12} style={styles.expandBtn}>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={expandBtnColor} />
                  </Pressable>
                </View>
                {isExpanded ? (
                  <View style={styles.legalCardBody}>
                    <ThemedText type="small" style={{ color: legalSumColor, lineHeight: 20 }}>{doc.summary}</ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? DARK_BG : LIGHT_BG }]}>
      <AnimatedBackground />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }]}
        bottomOffset={80}
      >
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <View style={[styles.backButtonBg, { backgroundColor: backBg }]}>
              <Feather name="arrow-left" size={20} color={backIcon} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ color: accentLabel, fontWeight: "700", fontSize: 13 }}>
              {isIndependent ? "INDEPENDENT PROVIDER" : "BUSINESS ACCOUNT"}
            </ThemedText>
          </View>
        </View>

        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

        {step === 0 ? renderStep0() : null}
        {step === 1 ? (isIndependent ? renderStep1Independent() : renderStep1Business()) : null}
        {step === 2 ? renderStep2() : null}
        {step === 3 ? renderStep3() : null}

        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.nextButton, animatedButtonStyle, { opacity: isLoading || !canProceed ? 0.6 : 1 }]}
            onPress={handleNext}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            disabled={isLoading || !canProceed}
          >
            <LinearGradient colors={btnColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            <ThemedText type="body" style={{ color: btnTextColor, fontWeight: "700", fontSize: 16 }}>
              {isLoading ? "Creating Account..." : isLastStep ? "Create Provider Account" : "Continue"}
            </ThemedText>
            {!isLastStep && !isLoading ? <Feather name="arrow-right" size={18} color="#FFF" /> : null}
          </AnimatedPressable>
          {step === 3 && !allAccepted ? (
            <View style={styles.acceptHint}>
              <Feather name="info" size={14} color={hintIconColor} />
              <ThemedText type="small" style={{ color: acceptHintColor, marginLeft: Spacing.xs }}>Accept all agreements to create your account</ThemedText>
            </View>
          ) : null}
        </View>
      </KeyboardAwareScrollViewCompat>

      {/* Make/Model/Class pickers */}
      {[
        { visible: showMakePicker, onClose: () => setShowMakePicker(false), title: isTowTruck ? "Select Tow Truck Make" : "Select Make", data: activeMakes, onSelect: (item: string) => { setVehicleMake(item); setVehicleModel(""); setShowMakePicker(false); }, renderSub: null },
        { visible: showModelPicker, onClose: () => setShowModelPicker(false), title: `${vehicleMake} Models`, data: availableSignupModels, onSelect: (item: string) => { setVehicleModel(item); setShowModelPicker(false); }, renderSub: null },
      ].map((picker, idx) => (
        <Modal key={idx} visible={picker.visible} animationType="slide" transparent>
          <View style={styles.signupModalOverlay}>
            <View style={[styles.signupModalContent, { backgroundColor: modalBg, paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
              <View style={styles.signupModalHeader}>
                <ThemedText type="h3" style={{ color: modalHeader }}>{picker.title}</ThemedText>
                <Pressable onPress={picker.onClose} hitSlop={12}>
                  <Feather name="x" size={24} color={modalXColor} />
                </Pressable>
              </View>
              <FlatList
                data={picker.data}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable onPress={() => picker.onSelect(item)}
                    style={({ pressed }) => [styles.signupPickerItem, { backgroundColor: pressed ? modalItemPressedBg : "transparent" }]}>
                    <ThemedText type="body" style={{ color: modalItemText }}>{item}</ThemedText>
                    <Feather name="chevron-right" size={16} color={modalChevron} />
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={[styles.signupSeparator, { backgroundColor: modalSepColor }]} />}
              />
            </View>
          </View>
        </Modal>
      ))}

      <Modal visible={showTowClassPicker} animationType="slide" transparent>
        <View style={styles.signupModalOverlay}>
          <View style={[styles.signupModalContent, { backgroundColor: modalBg, paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.signupModalHeader}>
              <ThemedText type="h3" style={{ color: modalHeader }}>Tow Truck Class</ThemedText>
              <Pressable onPress={() => setShowTowClassPicker(false)} hitSlop={12}>
                <Feather name="x" size={24} color={modalXColor} />
              </Pressable>
            </View>
            <FlatList
              data={TOW_TRUCK_CLASSES}
              keyExtractor={(item) => item.label}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => { setTowClass(item.label); setShowTowClassPicker(false); }}
                  style={({ pressed }) => [styles.signupPickerItem, styles.signupClassItem, { backgroundColor: pressed ? modalItemPressedBg : "transparent" }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ color: modalItemText, fontWeight: "600" }}>{item.label}</ThemedText>
                    <ThemedText type="small" style={{ color: modalItemSub, marginTop: 2 }}>{item.description}</ThemedText>
                  </View>
                  <Feather name="chevron-right" size={16} color={modalChevron} />
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={[styles.signupSeparator, { backgroundColor: modalSepColor }]} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.md },
  backButton: {},
  backButtonBg: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stepIndicator: { marginBottom: Spacing.lg, alignItems: "center" },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },
  stepContent: { marginBottom: Spacing.xl },
  stepHeader: { alignItems: "center", marginBottom: Spacing.xl },
  stepHeaderIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  form: { gap: 16 },
  inputContainer: { gap: 0 },
  inputWrapper: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 10, borderRadius: 14, gap: 10, borderWidth: 1 },
  input: { flex: 1, fontSize: 16 },
  vehicleTypeRow: { flexDirection: "row", gap: 8 },
  vehicleTypeOption: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  signupTowBanner: { flexDirection: "row", alignItems: "flex-start", padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  signupPickerBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 10, borderRadius: 14, borderWidth: 1 },
  uploadSection: { gap: 8 },
  uploadArea: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  uploadIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  verificationInfo: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: Spacing.lg },
  verificationStatus: { marginTop: Spacing.lg },
  verificationBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.08)" },
  evSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  evSectionIconWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,230,118,0.12)", alignItems: "center", justifyContent: "center" },
  evPromptCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  evPromptRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  evToggle: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: "center" },
  evToggleOn: { backgroundColor: "#00E676" },
  evToggleOff: { backgroundColor: "#B0B0B8", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
  evToggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF" },
  evToggleThumbOn: { alignSelf: "flex-end" },
  evToggleThumbOff: { alignSelf: "flex-start" },
  evServicesWrap: { marginTop: 12 },
  evDivider: { height: 1, marginBottom: 12 },
  evServiceRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  evServiceRowActive: { backgroundColor: "rgba(0,230,118,0.08)", borderColor: "rgba(0,230,118,0.25)" },
  evServiceIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  evServiceIconActive: { backgroundColor: "rgba(0,230,118,0.15)" },
  evCheckbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  evCheckboxActive: { borderColor: "#00E676", backgroundColor: "#00E676" },
  legalProgressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingHorizontal: 2 },
  acceptAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  legalSection: { gap: 10 },
  legalCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  legalCardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  legalIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  legalCardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  expandBtn: { padding: 4 },
  footer: { marginTop: Spacing.xl, gap: Spacing.md },
  nextButton: { paddingVertical: 16, borderRadius: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, overflow: "hidden" },
  acceptHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs },
  signupModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  signupModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", paddingHorizontal: 20 },
  signupModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
  signupPickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 4 },
  signupClassItem: { paddingVertical: 12 },
  signupSeparator: { height: StyleSheet.hairlineWidth },
});
