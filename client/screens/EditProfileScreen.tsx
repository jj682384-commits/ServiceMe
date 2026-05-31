import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator, Keyboard, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, EVService } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

// ─── Service definitions ──────────────────────────────────────────────────────
const SERVICE_META: { value: ServiceType; label: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { value: "flat_tire",      label: "Flat Tire",      icon: "disc",             color: "#F87171" },
  { value: "jump_start",     label: "Jump Start",     icon: "zap",              color: "#FBBF24" },
  { value: "tow",            label: "Tow Service",    icon: "truck",            color: "#60A5FA" },
  { value: "fuel",           label: "Fuel Delivery",  icon: "droplet",          color: "#34D399" },
  { value: "lockout",        label: "Lockout",        icon: "lock",             color: "#A78BFA" },
  { value: "obd_diagnostic", label: "OBD Diagnostic", icon: "activity",         color: "#FB923C" },
];

// Sub-services that appear under a parent when that parent is selected
type SubServiceEntry = { value: ServiceType; label: string; icon: keyof typeof Feather.glyphMap };
const SUB_SERVICES: Partial<Record<ServiceType, SubServiceEntry[]>> = {
  flat_tire: [
    { value: "tire_replacement",  label: "Tire Replacement",     icon: "disc" },
    { value: "mobile_inflation",  label: "Mobile Tire Inflation", icon: "wind" },
    { value: "tire_check",        label: "Tire Inspection",       icon: "search" },
  ],
  jump_start: [
    { value: "battery_check",     label: "Battery Check",         icon: "battery-charging" },
  ],
};

const EV_SERVICE_META: { key: EVService; label: string; sub: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "ev_charging",  label: "Mobile EV Charging",       sub: "Portable DC fast charge or Level 2 unit",    icon: "battery-charging" },
  { key: "ev_towing",    label: "EV-Safe Towing",           sub: "Flatbed only, no drivetrain contact",        icon: "truck" },
  { key: "hv_certified", label: "High-Voltage Certified",   sub: "Trained to work around EV battery packs",   icon: "shield" },
];

// ─── Input Field ──────────────────────────────────────────────────────────────
function InputField({
  label, value, onChangeText, placeholder, icon, keyboardType = "default", autoCapitalize = "sentences",
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string;
  icon: keyof typeof Feather.glyphMap;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <ThemedText style={styles.fieldLabel}>{label.toUpperCase()}</ThemedText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.backgroundDefault, borderColor: focused ? "#0066FF" : theme.border },
        ]}
      >
        <View style={[styles.inputIconBox, { backgroundColor: focused ? "#0066FF18" : theme.cardAnimatedBg }]}>
          <Feather name={icon} size={16} color={focused ? "#60A5FA" : theme.textSecondary} />
        </View>
        <TextInput
          style={[styles.inputText, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          blurOnSubmit
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { userRole, currentDriver, currentProvider, setCurrentDriver, setCurrentProvider, authUser, setAuthUser } = useApp();
  const navigation = useNavigation();

  const isProvider = userRole === "provider";

  const [name, setName]   = useState(isProvider ? currentProvider?.name  || "" : currentDriver?.name  || "");
  const [phone, setPhone] = useState(isProvider ? currentProvider?.phone || "" : currentDriver?.phone || "");
  const [email, setEmail] = useState(isProvider ? currentProvider?.email || "" : currentDriver?.email || "");
  const [servicesOffered, setServicesOffered] = useState<ServiceType[]>(currentProvider?.servicesOffered || []);
  const [evCapable, setEvCapable] = useState<boolean>(currentProvider?.evCapable ?? false);
  const [evServices, setEvServices]     = useState<EVService[]>(currentProvider?.evServices || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleService = (service: ServiceType) => {
    setServicesOffered((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleToggleEVService = (key: EVService) => {
    setEvServices((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
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
    try {
      await apiRequest("PATCH", "/api/auth/profile", { name: name.trim(), phone: phone.trim(), email: email.trim() });
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert("Save Failed", err?.message?.includes("409") ? "That email is already in use." : "Could not save your profile. Please try again.");
      return;
    }

    if (authUser) {
      setAuthUser({ ...authUser, name: name.trim(), email: email.trim(), phone: phone.trim() });
    }

    if (isProvider && currentProvider) {
      const updatedProvider = {
        ...currentProvider,
        name: name.trim(), phone: phone.trim(), email: email.trim(),
        servicesOffered, evCapable, evServices: evCapable ? evServices : [],
      };
      setCurrentProvider(updatedProvider);
      try {
        await apiRequest("POST", "/api/providers/register", updatedProvider);
      } catch (err: any) {
        setIsSaving(false);
        Alert.alert("Save Failed", "Profile saved but provider details could not be updated. Please try again.");
        return;
      }
    } else {
      const base = currentDriver ?? { id: authUser?.id ?? "", avatarPreset: 1, membership: "free" as const };
      setCurrentDriver({ ...base, name: name.trim(), phone: phone.trim(), email: email.trim() });
    }

    setIsSaving(false);
    Alert.alert("Profile Updated", "Your changes have been saved.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  const sectionBg = theme.cardAnimatedBg;
  const displayName = isProvider ? (currentProvider?.name || "Provider") : (currentDriver?.name || "Driver");

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#000000" : theme.backgroundRoot }]}>
      <AnimatedBackground />

      <KeyboardAwareScrollViewCompat
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing["2xl"] }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <LinearGradient
          colors={isProvider ? ["#1A0A0E", "#2D0F16", "#1A0A0E"] : ["#0A1F3A", "#0F2855", "#14124A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={[styles.heroAvatar, { backgroundColor: isProvider ? "rgba(248,113,113,0.15)" : "rgba(96,165,250,0.15)" }]}>
              <Feather name="user" size={26} color={isProvider ? "#F87171" : "#60A5FA"} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "600", letterSpacing: 0.8 }}>
                EDITING PROFILE
              </ThemedText>
              <ThemedText style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 2 }}>
                {displayName}
              </ThemedText>
            </View>
            <View style={[styles.rolePill, { backgroundColor: isProvider ? "#4A9CC618" : "#0066FF18", borderColor: isProvider ? "#4A9CC640" : "#0066FF40" }]}>
              <ThemedText style={{ color: isProvider ? "#4A9CC6" : "#60A5FA", fontSize: 11, fontWeight: "700" }}>
                {isProvider ? "PROVIDER" : "DRIVER"}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Personal Information */}
        <Animated.View entering={FadeIn.delay(60).duration(280)}>
          <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>PERSONAL INFORMATION</ThemedText>
          <View style={[styles.sectionCard, { backgroundColor: sectionBg }]}>
            <InputField label="Full Name"     value={name}  onChangeText={setName}  placeholder="Enter your name"  icon="user"  autoCapitalize="words" />
            <InputField label="Phone Number"  value={phone} onChangeText={setPhone} placeholder="Enter your phone" icon="phone" keyboardType="phone-pad" />
            <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" icon="mail"  keyboardType="email-address" autoCapitalize="none" />
          </View>
        </Animated.View>

        {/* Provider-only sections */}
        {isProvider ? (
          <>
            {/* Services */}
            <Animated.View entering={FadeInDown.delay(100).duration(280).springify().damping(20)}>
              <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>SERVICES YOU OFFER</ThemedText>
              <View style={[styles.sectionCard, { backgroundColor: sectionBg }]}>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                  Select all the services you can perform for drivers.
                </ThemedText>
                <View style={styles.servicesGrid}>
                  {SERVICE_META.map(({ value, label, icon, color }) => {
                    const active = servicesOffered.includes(value);
                    return (
                      <Pressable
                        key={value}
                        onPress={() => handleToggleService(value)}
                        style={[
                          styles.serviceCard,
                          {
                            backgroundColor: active ? color + "18" : theme.backgroundDefault,
                            borderColor: active ? color + "60" : theme.border,
                          },
                        ]}
                      >
                        <View style={[styles.serviceIconBox, { backgroundColor: active ? color + "22" : theme.cardAnimatedBg }]}>
                          <Feather name={icon} size={18} color={active ? color : theme.textSecondary} />
                        </View>
                        <ThemedText
                          type="small"
                          style={{ color: active ? color : theme.text, fontWeight: active ? "700" : "400", marginTop: 6, textAlign: "center", lineHeight: 16 }}
                          numberOfLines={2}
                        >
                          {label}
                        </ThemedText>
                        {active ? (
                          <View style={[styles.serviceCheck, { backgroundColor: color }]}>
                            <Feather name="check" size={10} color="#FFFFFF" />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                {servicesOffered.length === 0 ? (
                  <ThemedText type="small" style={{ color: "#F87171", marginTop: Spacing.sm, fontSize: 11 }}>
                    Select at least one service to continue
                  </ThemedText>
                ) : (
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, fontSize: 11 }}>
                    {servicesOffered.length} service{servicesOffered.length !== 1 ? "s" : ""} selected
                  </ThemedText>
                )}

                {/* Sub-services — shown when parent is selected */}
                {(Object.entries(SUB_SERVICES) as [ServiceType, SubServiceEntry[]][])
                  .filter(([parent]) => servicesOffered.includes(parent))
                  .map(([parent, subs]) => {
                    const parentMeta = SERVICE_META.find(s => s.value === parent)!;
                    return (
                      <View key={parent} style={{ marginTop: Spacing.md }}>
                        <View style={[styles.subDivider, { backgroundColor: theme.border }]} />
                        <ThemedText style={[styles.fieldLabel, { marginTop: Spacing.sm, marginBottom: Spacing.xs }]}>
                          {parentMeta.label.toUpperCase()} SPECIALTIES
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm, fontSize: 11 }}>
                          Select the specific {parentMeta.label.toLowerCase()} services you offer.
                        </ThemedText>
                        <View style={styles.subServiceList}>
                          {subs.map(({ value, label, icon }) => {
                            const active = servicesOffered.includes(value);
                            return (
                              <Pressable
                                key={value}
                                onPress={() => handleToggleService(value)}
                                style={[
                                  styles.subChip,
                                  {
                                    backgroundColor: active ? parentMeta.color + "20" : theme.backgroundDefault,
                                    borderColor: active ? parentMeta.color + "70" : theme.border,
                                  },
                                ]}
                              >
                                <View style={[styles.subChipIcon, { backgroundColor: active ? parentMeta.color + "25" : theme.cardAnimatedBg }]}>
                                  <Feather name={icon} size={14} color={active ? parentMeta.color : theme.textSecondary} />
                                </View>
                                <ThemedText type="small" style={{ color: active ? parentMeta.color : theme.text, fontWeight: active ? "700" : "400", flex: 1 }}>
                                  {label}
                                </ThemedText>
                                {active ? (
                                  <View style={[styles.subChipCheck, { backgroundColor: parentMeta.color }]}>
                                    <Feather name="check" size={9} color="#FFFFFF" />
                                  </View>
                                ) : null}
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                }
              </View>
            </Animated.View>

            {/* EV Services */}
            <Animated.View entering={FadeInDown.delay(160).duration(280).springify().damping(20)}>
              <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>EV SERVICES</ThemedText>
              <View style={[styles.sectionCard, { backgroundColor: sectionBg }]}>
                {/* EV Capable toggle */}
                <View style={styles.evToggleRow}>
                  <View style={[styles.evIconBox, { backgroundColor: evCapable ? "#34D39922" : theme.backgroundDefault }]}>
                    <Feather name="battery-charging" size={20} color={evCapable ? "#34D399" : theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: "700" }}>EV Capable</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 1 }}>
                      Accept EV-specific service requests
                    </ThemedText>
                  </View>
                  <Switch
                    value={evCapable}
                    onValueChange={setEvCapable}
                    trackColor={{ false: theme.border, true: "#34D399" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {evCapable ? (
                  <View style={{ marginTop: Spacing.md, gap: Spacing.xs }}>
                    <View style={[styles.evDivider, { backgroundColor: theme.border }]} />
                    <ThemedText style={[styles.fieldLabel, { marginTop: Spacing.sm, marginBottom: Spacing.sm }]}>
                      WHICH EV SERVICES CAN YOU PROVIDE?
                    </ThemedText>
                    {EV_SERVICE_META.map(({ key, label, sub, icon }) => {
                      const active = evServices.includes(key);
                      return (
                        <Pressable
                          key={key}
                          onPress={() => handleToggleEVService(key)}
                          style={[
                            styles.evServiceRow,
                            { backgroundColor: active ? "#34D39912" : "transparent", borderColor: active ? "#34D39940" : "transparent" },
                          ]}
                        >
                          <View style={[styles.evServiceIcon, { backgroundColor: active ? "#34D39922" : theme.backgroundDefault }]}>
                            <Feather name={icon} size={16} color={active ? "#34D399" : theme.textSecondary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <ThemedText type="body" style={{ fontWeight: active ? "700" : "400" }}>{label}</ThemedText>
                            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 1 }}>{sub}</ThemedText>
                          </View>
                          <View style={[styles.evCheck, { borderColor: active ? "#34D399" : theme.border, backgroundColor: active ? "#34D399" : "transparent" }]}>
                            {active ? <Feather name="check" size={11} color="#FFF" /> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </Animated.View>
          </>
        ) : null}

        {/* Save Button */}
        <Animated.View entering={FadeIn.delay(200).duration(280)} style={{ marginTop: Spacing.sm }}>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={{ borderRadius: BorderRadius.md, overflow: "hidden", opacity: isSaving ? 0.7 : 1 }}
          >
            <LinearGradient
              colors={isProvider ? ["#2C7BAF", "#4A9CC6"] : ["#0055CC", "#0066FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#FFFFFF" />
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
                    Save Changes
                  </ThemedText>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scrollContent: { paddingHorizontal: Spacing.lg },
  // Hero
  heroCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  heroRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  heroAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  rolePill: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  // Section
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.9, textTransform: "uppercase", color: "rgba(148,163,184,0.8)" },
  sectionCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, overflow: "hidden" },
  // Input
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.9, textTransform: "uppercase", color: "rgba(148,163,184,0.8)", marginBottom: Spacing.sm },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: BorderRadius.md, borderWidth: 1.5, overflow: "hidden" },
  inputIconBox: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  inputText: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm, paddingRight: Spacing.md },
  // Services grid
  servicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  serviceCard: { width: "30.5%", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5, position: "relative" },
  serviceIconBox: { width: 40, height: 40, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  serviceCheck: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  subDivider: { height: 1, marginBottom: Spacing.xs },
  subServiceList: { gap: Spacing.xs },
  subChip: { flexDirection: "row", alignItems: "center", borderRadius: BorderRadius.md, borderWidth: 1.5, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  subChipIcon: { width: 30, height: 30, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  subChipCheck: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  // EV
  evToggleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  evIconBox: { width: 44, height: 44, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  evDivider: { height: 1 },
  evServiceRow: { flexDirection: "row", alignItems: "center", padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.md },
  evServiceIcon: { width: 36, height: 36, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  evCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  // Save
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.lg },
});
