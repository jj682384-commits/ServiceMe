import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, FlatList, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  VEHICLE_MAKES, VEHICLE_MAKES_MODELS,
  TOW_TRUCK_MAKES, TOW_TRUCK_MAKES_MODELS, TOW_TRUCK_CLASSES,
  SERVICE_VAN_MAKES, SERVICE_VAN_MAKES_MODELS,
} from "@/constants/vehicleData";

type ProviderVehicleType = "tow_truck" | "service_van" | "pickup";

const VEHICLE_TYPES: { value: ProviderVehicleType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "pickup", label: "Personal Car", icon: "navigation" },
  { value: "service_van", label: "Service Van", icon: "package" },
  { value: "tow_truck", label: "Tow Truck", icon: "truck" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1969 }, (_, i) => currentYear - i);
const YEAR_STRINGS = YEARS.map(String);

// ─── Searchable Picker ────────────────────────────────────────────────────────
function SearchablePicker({
  visible, onClose, onSelect, items, title, searchPlaceholder,
}: {
  visible: boolean; onClose: () => void; onSelect: (item: string) => void;
  items: string[]; title: string; searchPlaceholder: string;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">{title}</ThemedText>
            <Pressable onPress={() => { setSearch(""); onClose(); }} hitSlop={12}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <View style={[styles.searchBar, { backgroundColor: theme.cardAnimatedBg, borderColor: theme.border }]}>
            <Feather name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCorrect={false}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x-circle" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setSearch(""); onSelect(item); }}
                style={({ pressed }) => [styles.pickerItem, { backgroundColor: pressed ? theme.cardAnimatedBg : "transparent" }]}
              >
                <ThemedText type="body">{item}</ThemedText>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>No results for "{search}"</ThemedText>
              </View>
            }
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Tow Class Picker ─────────────────────────────────────────────────────────
function TowClassPicker({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (cls: string) => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">Tow Truck Class</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <FlatList
            data={TOW_TRUCK_CLASSES}
            keyExtractor={(item) => item.label}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item.label)}
                style={({ pressed }) => [styles.classPickerItem, { backgroundColor: pressed ? theme.cardAnimatedBg : "transparent" }]}
              >
                <View style={[styles.classIconBox, { backgroundColor: "#0066FF18" }]}>
                  <Feather name="truck" size={16} color="#60A5FA" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{item.label}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>{item.description}</ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Picker Button ────────────────────────────────────────────────────────────
function PickerButton({
  label, value, placeholder, onPress, disabled, badge, sectionBg,
}: {
  label: string; value: string; placeholder: string; onPress: () => void;
  disabled?: boolean; badge?: string; sectionBg?: string;
}) {
  const { theme } = useTheme();
  const bg = sectionBg ?? theme.backgroundDefault;

  return (
    <View style={{ marginBottom: Spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
        <ThemedText style={[styles.sectionLabel, { marginBottom: 0, flex: 1 }]}>{label.toUpperCase()}</ThemedText>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: "#0066FF22" }]}>
            <ThemedText type="small" style={{ color: "#60A5FA", fontSize: 10, fontWeight: "700" }}>{badge}</ThemedText>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.pickerButton, { backgroundColor: bg, borderColor: value ? theme.primary : theme.border, opacity: disabled ? 0.5 : 1 }]}
      >
        <ThemedText type="body" style={{ color: value ? theme.text : theme.textSecondary, flex: 1 }}>
          {value || placeholder}
        </ThemedText>
        <Feather name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProviderVehicleScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { currentProvider, setCurrentProvider } = useApp();

  const [make, setMake] = useState(currentProvider?.vehicleMake || "");
  const [model, setModel] = useState(currentProvider?.vehicleModel || "");
  const [year, setYear] = useState(currentYear);
  const [vehicleType, setVehicleType] = useState<ProviderVehicleType>(currentProvider?.vehicleType || "pickup");
  const [licensePlate, setLicensePlate] = useState(currentProvider?.licensePlate || "");
  const [towClass, setTowClass] = useState("");
  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showTowClassPicker, setShowTowClassPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isTowTruck = vehicleType === "tow_truck";
  const isServiceVan = vehicleType === "service_van";

  const activeMakes = isTowTruck ? TOW_TRUCK_MAKES : isServiceVan ? SERVICE_VAN_MAKES : VEHICLE_MAKES;
  const activeMakesModels = isTowTruck ? TOW_TRUCK_MAKES_MODELS : isServiceVan ? SERVICE_VAN_MAKES_MODELS : VEHICLE_MAKES_MODELS;

  const availableModels = useMemo(() => (!make ? [] : activeMakesModels[make] || []), [make, activeMakesModels]);

  const handleChangeVehicleType = (type: ProviderVehicleType) => {
    setVehicleType(type);
    setMake("");
    setModel("");
    setTowClass("");
  };

  const handleSave = async () => {
    if (!make.trim() || !model.trim()) {
      Alert.alert("Missing Info", "Please select a make and model for your vehicle.");
      return;
    }
    if (isTowTruck && !towClass.trim()) {
      Alert.alert("Missing Info", "Please select your tow truck class.");
      return;
    }
    if (!currentProvider) return;

    const vehicleModel = towClass ? `${model.trim()} (${towClass})` : model.trim();
    const updatedProvider = {
      ...currentProvider,
      vehicleMake: make.trim(),
      vehicleModel,
      vehicleType,
      licensePlate: licensePlate.trim().toUpperCase(),
    };

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/providers/register", updatedProvider);
    } catch {
      // Falls through — save locally regardless
    } finally {
      setCurrentProvider(updatedProvider);
      setIsSaving(false);
      Alert.alert("Saved", "Your vehicle information has been updated.");
    }
  };

  const heroIcon: keyof typeof Feather.glyphMap = isTowTruck ? "truck" : isServiceVan ? "package" : "navigation";
  const hasVehicle = make && model;
  const sectionBg = theme.cardAnimatedBg;

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <KeyboardAwareScrollViewCompat
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <LinearGradient
          colors={["#1A0A0E", "#2D0F16", "#1A0A0E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroLeft}>
            <View style={styles.heroIconCircle}>
              <Feather name={heroIcon} size={28} color="#F87171" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 2 }}>
                Work Vehicle
              </ThemedText>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.55)" }}>
                {hasVehicle ? `${make} ${model}` : "No vehicle set yet"}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
            Drivers see this vehicle when you arrive
          </ThemedText>
        </LinearGradient>

        {/* Vehicle Type */}
        <Animated.View entering={FadeIn.delay(60).duration(280)}>
          <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>VEHICLE TYPE</ThemedText>
          <View style={[styles.formCard, { backgroundColor: sectionBg }]}>
            <View style={styles.typeRow}>
              {VEHICLE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => handleChangeVehicleType(t.value)}
                  style={[
                    styles.typeChip,
                    { backgroundColor: vehicleType === t.value ? "#D9222222" : "transparent", borderColor: vehicleType === t.value ? "#D92222" : theme.border },
                  ]}
                >
                  <Feather name={t.icon} size={14} color={vehicleType === t.value ? "#F87171" : theme.textSecondary} />
                  <ThemedText
                    type="small"
                    style={{ color: vehicleType === t.value ? "#F87171" : theme.text, fontWeight: vehicleType === t.value ? "700" : "400", marginLeft: 5, textAlign: "center" }}
                  >
                    {t.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {isTowTruck ? (
              <View style={[styles.infoBanner, { backgroundColor: "#0066FF12", borderColor: "#0066FF30" }]}>
                <Feather name="info" size={13} color="#60A5FA" />
                <ThemedText type="small" style={{ color: "#60A5FA", flex: 1, marginLeft: Spacing.sm }}>
                  Showing commercial tow truck manufacturers. Select your chassis make and model.
                </ThemedText>
              </View>
            ) : null}
            {isServiceVan ? (
              <View style={[styles.infoBanner, { backgroundColor: "#D9222212", borderColor: "#D9222230" }]}>
                <Feather name="info" size={13} color="#F87171" />
                <ThemedText type="small" style={{ color: "#F87171", flex: 1, marginLeft: Spacing.sm }}>
                  Showing commercial service van manufacturers. Select your van make and model.
                </ThemedText>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Vehicle Details */}
        <Animated.View entering={FadeInDown.delay(120).duration(280).springify().damping(20)}>
          <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>VEHICLE DETAILS</ThemedText>
          <View style={[styles.formCard, { backgroundColor: sectionBg }]}>
            <PickerButton
              label="Make"
              value={make}
              placeholder={isTowTruck ? "Select tow truck make..." : "Select make..."}
              onPress={() => setShowMakePicker(true)}
              badge={isTowTruck ? "TOW" : isServiceVan ? "VAN" : undefined}
              sectionBg={sectionBg}
            />
            <PickerButton
              label="Model"
              value={model}
              placeholder={make ? "Select model..." : "Select a make first"}
              onPress={() => setShowModelPicker(true)}
              disabled={!make}
              sectionBg={sectionBg}
            />
            {isTowTruck ? (
              <PickerButton
                label="Tow Truck Class"
                value={towClass}
                placeholder="Select wrecker class..."
                onPress={() => setShowTowClassPicker(true)}
                sectionBg={sectionBg}
              />
            ) : null}
            <PickerButton
              label="Year"
              value={year ? String(year) : ""}
              placeholder="Select year..."
              onPress={() => setShowYearPicker(true)}
              sectionBg={sectionBg}
            />
          </View>
        </Animated.View>

        {/* License Plate */}
        <Animated.View entering={FadeIn.delay(200).duration(280)}>
          <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>LICENSE PLATE</ThemedText>
          <View style={[styles.plateCard, { backgroundColor: sectionBg }]}>
            <View style={[styles.plateIconBox, { backgroundColor: "#D9222218" }]}>
              <Feather name="credit-card" size={20} color="#F87171" />
            </View>
            <TextInput
              style={[styles.plateInput, { color: theme.text }]}
              value={licensePlate}
              onChangeText={setLicensePlate}
              placeholder="e.g. ABC-1234"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeIn.delay(260).duration(280)} style={{ marginTop: Spacing.lg }}>
          <Pressable onPress={handleSave} disabled={isSaving} style={{ borderRadius: BorderRadius.md, overflow: "hidden", opacity: isSaving ? 0.7 : 1 }}>
            <LinearGradient
              colors={["#AA1818", "#D92222"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Feather name={isSaving ? "loader" : "check"} size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
                {isSaving ? "Saving..." : "Save Vehicle"}
              </ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <SearchablePicker visible={showMakePicker} onClose={() => setShowMakePicker(false)} onSelect={(m) => { setMake(m); setModel(""); setShowMakePicker(false); }} items={activeMakes} title={isTowTruck ? "Select Tow Truck Make" : "Select Make"} searchPlaceholder="Search makes..." />
      <SearchablePicker visible={showModelPicker} onClose={() => setShowModelPicker(false)} onSelect={(m) => { setModel(m); setShowModelPicker(false); }} items={availableModels} title={`${make} Models`} searchPlaceholder="Search models..." />
      <SearchablePicker visible={showYearPicker} onClose={() => setShowYearPicker(false)} onSelect={(y) => { setYear(parseInt(y)); setShowYearPicker(false); }} items={YEAR_STRINGS} title="Select Year" searchPlaceholder="Search years..." />
      <TowClassPicker visible={showTowClassPicker} onClose={() => setShowTowClassPicker(false)} onSelect={(cls) => { setTowClass(cls); setShowTowClassPicker(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scrollContent: { paddingHorizontal: Spacing.lg },
  // Hero
  heroCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.sm },
  heroLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  heroIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(248,113,113,0.15)", alignItems: "center", justifyContent: "center" },
  // Section label
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.9, textTransform: "uppercase", color: "rgba(148,163,184,0.8)", marginBottom: Spacing.sm },
  // Cards
  formCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, overflow: "hidden" },
  // Type selector
  typeRow: { flexDirection: "row", gap: Spacing.sm },
  typeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, borderRadius: BorderRadius.sm, borderWidth: 1 },
  // Info banner
  infoBanner: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.md },
  // Picker button
  pickerButton: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.xs },
  // License plate card
  plateCard: { flexDirection: "row", alignItems: "center", borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.md, overflow: "hidden" },
  plateIconBox: { width: 44, height: 44, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  plateInput: { flex: 1, fontSize: 18, fontWeight: "700", letterSpacing: 2, padding: 0 },
  // Save
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, height: "75%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  classPickerItem: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  classIconBox: { width: 36, height: 36, borderRadius: BorderRadius.xs, alignItems: "center", justifyContent: "center" },
  separator: { height: 1, marginHorizontal: Spacing.lg },
  emptySearch: { padding: Spacing.xl, alignItems: "center" },
});
