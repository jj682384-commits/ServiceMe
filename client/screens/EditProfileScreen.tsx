import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator, Keyboard, Switch } from "react-native";
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
import { useApp, ServiceType, EVService, EmergencyContact } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const avatarColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6", "#EC4899", "#EF4444", "#6366F1"];

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
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
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          blurOnSubmit
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
  const {
    userRole, currentDriver, currentProvider,
    setCurrentDriver, setCurrentProvider, authUser, setAuthUser,
    emergencyContacts, addEmergencyContact, removeEmergencyContact,
  } = useApp();
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
  const [evCapable, setEvCapable] = useState<boolean>(currentProvider?.evCapable ?? false);
  const [evServices, setEvServices] = useState<EVService[]>(currentProvider?.evServices || []);

  const [isSaving, setIsSaving] = useState(false);

  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelationship, setNewContactRelationship] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);

  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const allServices: ServiceType[] = ["flat_tire", "jump_start", "tow", "fuel", "lockout", "obd_diagnostic"];

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert("Missing Info", "Please enter a name and phone number.");
      return;
    }
    addEmergencyContact({
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRelationship.trim() || "Contact",
    });
    setNewContactName("");
    setNewContactPhone("");
    setNewContactRelationship("");
    setShowAddContact(false);
  };

  const handleRemoveContact = (index: number) => {
    Alert.alert(
      "Remove Contact",
      `Remove ${emergencyContacts[index].name} from your emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeEmergencyContact(index) },
      ]
    );
  };

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
    try {
      await apiRequest("PATCH", "/api/auth/profile", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
    } catch {}

    if (authUser) {
      setAuthUser({ ...authUser, name: name.trim(), email: email.trim(), phone: phone.trim() });
    }

    if (isProvider && currentProvider) {
      const updatedProvider = {
        ...currentProvider,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        licensePlate: licensePlate.trim().toUpperCase(),
        servicesOffered,
        evCapable,
        evServices: evCapable ? evServices : [],
      };
      setCurrentProvider(updatedProvider);
      try {
        await apiRequest("POST", "/api/providers/register", updatedProvider);
      } catch {}
    } else {
      const base = currentDriver ?? { id: authUser?.id ?? "", avatarPreset: 1, membership: "free" as const };
      setCurrentDriver({
        ...base,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        avatarPreset,
      });
    }

    setIsSaving(false);
    Alert.alert("Profile Updated", "Your changes have been saved.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
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

        {!isProvider ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="shield" size={18} color={theme.error} />
              <ThemedText type="h4" style={styles.sectionTitle}>
                Emergency Contacts
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              These contacts receive an SMS with your location when SOS is activated.
            </ThemedText>

            {emergencyContacts.map((contact, index) => (
              <View
                key={index}
                style={[styles.contactCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              >
                <View style={[styles.contactAvatar, { backgroundColor: theme.error + "20" }]}>
                  <Feather name="user" size={20} color={theme.error} />
                </View>
                <View style={styles.contactInfo}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {contact.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {contact.phone}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {contact.relationship}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => handleRemoveContact(index)}
                  style={[styles.removeButton, { backgroundColor: theme.error + "15" }]}
                >
                  <Feather name="trash-2" size={16} color={theme.error} />
                </Pressable>
              </View>
            ))}

            {emergencyContacts.length === 0 ? (
              <View style={[styles.emptyContacts, { borderColor: theme.border }]}>
                <Feather name="user-x" size={28} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                  No emergency contacts added yet.{"\n"}Add at least one so SOS can alert them.
                </ThemedText>
              </View>
            ) : null}

            {showAddContact ? (
              <View style={[styles.addContactForm, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>Full Name *</ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, marginBottom: Spacing.sm }]}>
                  <Feather name="user" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={newContactName}
                    onChangeText={setNewContactName}
                    placeholder="e.g., Jane Doe"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit
                  />
                </View>

                <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>Phone Number *</ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, marginBottom: Spacing.sm }]}>
                  <Feather name="phone" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={newContactPhone}
                    onChangeText={setNewContactPhone}
                    placeholder="+1 555-000-0000"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit
                  />
                </View>

                <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>Relationship</ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, marginBottom: Spacing.md }]}>
                  <Feather name="heart" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={newContactRelationship}
                    onChangeText={setNewContactRelationship}
                    placeholder="e.g., Spouse, Parent, Friend"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit
                  />
                </View>

                <View style={styles.addContactActions}>
                  <Pressable
                    onPress={() => setShowAddContact(false)}
                    style={[styles.cancelContactButton, { borderColor: theme.border }]}
                  >
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleAddContact}
                    style={[styles.saveContactButton, { backgroundColor: theme.error }]}
                  >
                    <Feather name="check" size={16} color="#FFF" />
                    <ThemedText type="small" style={{ color: "#FFF", fontWeight: "600" }}>Add Contact</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {!showAddContact ? (
              <Pressable
                onPress={() => setShowAddContact(true)}
                style={[styles.addContactButton, { borderColor: theme.error + "60", backgroundColor: theme.error + "10" }]}
              >
                <Feather name="plus" size={18} color={theme.error} />
                <ThemedText type="body" style={{ color: theme.error, fontWeight: "600" }}>
                  Add Emergency Contact
                </ThemedText>
              </Pressable>
            ) : null}
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

            <View style={styles.section}>
              <ThemedText type="h4" style={styles.sectionTitle}>EV Services</ThemedText>
              <View style={[styles.evCard, { backgroundColor: theme.backgroundDefault, borderColor: evCapable ? "#00C853" : theme.border }]}>
                <View style={styles.evCardRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>Electric Vehicle Capable</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      Accept EV-specific service requests from EV Mode
                    </ThemedText>
                  </View>
                  <Switch
                    value={evCapable}
                    onValueChange={setEvCapable}
                    trackColor={{ false: theme.border, true: "#00C853" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {evCapable ? (
                  <View style={styles.evServiceList}>
                    <View style={[styles.evDividerEdit, { backgroundColor: theme.border }]} />
                    <ThemedText type="small" style={[styles.evServicesLabelEdit, { color: theme.textSecondary }]}>
                      Which EV services can you provide?
                    </ThemedText>
                    {([
                      { key: "ev_charging" as EVService, label: "Mobile EV Charging", sub: "Portable DC fast charge or Level 2 unit" },
                      { key: "ev_towing" as EVService, label: "EV-Safe Towing", sub: "Flatbed only, no drivetrain contact" },
                      { key: "hv_certified" as EVService, label: "High-Voltage Certified", sub: "Trained to work around EV battery packs" },
                    ]).map((s) => {
                      const active = evServices.includes(s.key);
                      return (
                        <Pressable
                          key={s.key}
                          onPress={() => setEvServices((prev) => active ? prev.filter((x) => x !== s.key) : [...prev, s.key])}
                          style={({ pressed }) => [styles.evServiceItem, { opacity: pressed ? 0.7 : 1, backgroundColor: active ? "#00C85310" : "transparent" }]}
                        >
                          <View style={{ flex: 1 }}>
                            <ThemedText type="body" style={{ fontWeight: active ? "600" : "400" }}>{s.label}</ThemedText>
                            <ThemedText type="small" style={{ color: theme.textSecondary }}>{s.sub}</ThemedText>
                          </View>
                          <View style={[styles.evCheckEdit, { borderColor: active ? "#00C853" : theme.border, backgroundColor: active ? "#00C853" : "transparent" }]}>
                            {active ? <Feather name="check" size={12} color="#FFF" /> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContacts: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: Spacing.md,
  },
  addContactForm: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  addContactActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cancelContactButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  saveContactButton: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  addContactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  evCard: { borderWidth: 1.5, borderRadius: BorderRadius.lg, overflow: "hidden" },
  evCardRow: { flexDirection: "row", alignItems: "center", padding: Spacing.md, gap: Spacing.md },
  evServiceList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  evDividerEdit: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.sm },
  evServicesLabelEdit: { marginBottom: Spacing.sm, fontSize: 12 },
  evServiceItem: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, borderRadius: BorderRadius.sm, gap: Spacing.md },
  evCheckEdit: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
