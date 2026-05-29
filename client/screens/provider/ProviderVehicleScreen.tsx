import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ScreenDecoration } from "@/components/ScreenDecoration";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  VEHICLE_MAKES,
  VEHICLE_MAKES_MODELS,
  TOW_TRUCK_MAKES,
  TOW_TRUCK_MAKES_MODELS,
  TOW_TRUCK_CLASSES,
  SERVICE_VAN_MAKES,
  SERVICE_VAN_MAKES_MODELS,
} from "@/constants/vehicleData";

type ProviderVehicleType = "tow_truck" | "service_van" | "pickup";

const VEHICLE_TYPES: { value: ProviderVehicleType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "tow_truck", label: "Tow Truck", icon: "truck" },
  { value: "service_van", label: "Service Van", icon: "package" },
  { value: "pickup", label: "Pickup Truck", icon: "navigation" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - i);

function SearchablePicker({
  visible,
  onClose,
  onSelect,
  items,
  title,
  searchPlaceholder,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: string) => void;
  items: string[];
  title: string;
  searchPlaceholder: string;
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
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgroundDefault,
              paddingTop: insets.top + Spacing.md,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <ThemedText type="h3">{title}</ThemedText>
            <Pressable onPress={() => { setSearch(""); onClose(); }} hitSlop={12}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
            ]}
          >
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
                style={({ pressed }) => [
                  styles.pickerItem,
                  { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
                ]}
              >
                <ThemedText type="body">{item}</ThemedText>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  No results for "{search}"
                </ThemedText>
              </View>
            }
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function TowClassPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (cls: string) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgroundDefault,
              paddingTop: insets.top + Spacing.md,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
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
                style={({ pressed }) => [
                  styles.classPickerItem,
                  { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{item.label}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {item.description}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function PickerButton({
  label,
  value,
  placeholder,
  onPress,
  disabled,
  badge,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  const { theme } = useTheme();

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
        <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 0, marginBottom: 0, flex: 1 }]}>
          {label}
        </ThemedText>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText type="small" style={{ color: theme.primary, fontSize: 10, fontWeight: "700" }}>
              {badge}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.pickerButton,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: value ? theme.primary : theme.border,
            opacity: disabled ? 0.5 : 1,
            marginTop: Spacing.sm,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={{ color: value ? theme.text : theme.textSecondary, flex: 1 }}
        >
          {value || placeholder}
        </ThemedText>
        <Feather name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>
    </>
  );
}

export default function ProviderVehicleScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { currentProvider, setCurrentProvider } = useApp();

  const [make, setMake] = useState(currentProvider?.vehicleMake || "");
  const [model, setModel] = useState(currentProvider?.vehicleModel || "");
  const [year, setYear] = useState(currentYear);
  const [vehicleType, setVehicleType] = useState<ProviderVehicleType>(
    currentProvider?.vehicleType || "pickup"
  );
  const [licensePlate, setLicensePlate] = useState(currentProvider?.licensePlate || "");
  const [towClass, setTowClass] = useState("");

  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showTowClassPicker, setShowTowClassPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isTowTruck = vehicleType === "tow_truck";
  const isServiceVan = vehicleType === "service_van";

  const activeMakes = isTowTruck ? TOW_TRUCK_MAKES : isServiceVan ? SERVICE_VAN_MAKES : VEHICLE_MAKES;
  const activeMakesModels = isTowTruck ? TOW_TRUCK_MAKES_MODELS : isServiceVan ? SERVICE_VAN_MAKES_MODELS : VEHICLE_MAKES_MODELS;

  const availableModels = useMemo(() => {
    if (!make) return [];
    return activeMakesModels[make] || [];
  }, [make, activeMakesModels]);

  const handleChangeVehicleType = (type: ProviderVehicleType) => {
    setVehicleType(type);
    setMake("");
    setModel("");
    setTowClass("");
  };

  const handleSelectMake = (selectedMake: string) => {
    setMake(selectedMake);
    setModel("");
    setShowMakePicker(false);
  };

  const handleSelectModel = (selectedModel: string) => {
    setModel(selectedModel);
    setShowModelPicker(false);
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

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
          Update your work vehicle information so drivers know what to look for when you arrive.
        </ThemedText>

        <View style={[styles.formCard, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Vehicle Type
          </ThemedText>
          <View style={styles.optionRow}>
            {VEHICLE_TYPES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => handleChangeVehicleType(t.value)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: vehicleType === t.value ? theme.primary + "15" : theme.backgroundDefault,
                    borderColor: vehicleType === t.value ? theme.primary : theme.border,
                    flex: 1,
                  },
                ]}
              >
                <Feather
                  name={t.icon}
                  size={14}
                  color={vehicleType === t.value ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{
                    color: vehicleType === t.value ? theme.primary : theme.text,
                    fontWeight: vehicleType === t.value ? "600" : "400",
                    marginLeft: 4,
                    textAlign: "center",
                  }}
                >
                  {t.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {isTowTruck ? (
            <View style={[styles.towBanner, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" }]}>
              <Feather name="info" size={14} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, flex: 1, marginLeft: Spacing.sm }}>
                Showing commercial tow truck manufacturers. Select your chassis make and model.
              </ThemedText>
            </View>
          ) : null}
          {isServiceVan ? (
            <View style={[styles.towBanner, { backgroundColor: theme.secondary + "10", borderColor: theme.secondary + "30" }]}>
              <Feather name="info" size={14} color={theme.secondary} />
              <ThemedText type="small" style={{ color: theme.secondary, flex: 1, marginLeft: Spacing.sm }}>
                Showing commercial service van manufacturers. Select your van make and model.
              </ThemedText>
            </View>
          ) : null}

          <View style={{ marginTop: Spacing.md }}>
            <PickerButton
              label="Make"
              value={make}
              placeholder={isTowTruck ? "Select tow truck make..." : "Select make..."}
              onPress={() => setShowMakePicker(true)}
              badge={isTowTruck ? "TOW" : undefined}
            />
          </View>

          <View style={{ marginTop: Spacing.md }}>
            <PickerButton
              label="Model"
              value={model}
              placeholder={make ? "Select model..." : "Select a make first"}
              onPress={() => setShowModelPicker(true)}
              disabled={!make}
            />
          </View>

          {isTowTruck ? (
            <View style={{ marginTop: Spacing.md }}>
              <PickerButton
                label="Tow Truck Class"
                value={towClass}
                placeholder="Select wrecker class..."
                onPress={() => setShowTowClassPicker(true)}
              />
            </View>
          ) : null}

          <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Year
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.sm }}
          >
            {YEARS.slice(0, 15).map((y) => (
              <Pressable
                key={y}
                onPress={() => setYear(y)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: year === y ? theme.primary : theme.backgroundDefault,
                    borderColor: year === y ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: year === y ? "#FFFFFF" : theme.text,
                    fontWeight: year === y ? "600" : "400",
                  }}
                >
                  {y}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            License Plate
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: licensePlate ? theme.primary : theme.border,
                color: theme.text,
              },
            ]}
            value={licensePlate}
            onChangeText={setLicensePlate}
            placeholder="e.g. ABC-1234"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: theme.primary, opacity: pressed || isSaving ? 0.7 : 1 },
          ]}
        >
          <Feather name={isSaving ? "loader" : "check"} size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
            {isSaving ? "Saving..." : "Save Vehicle"}
          </ThemedText>
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      <SearchablePicker
        visible={showMakePicker}
        onClose={() => setShowMakePicker(false)}
        onSelect={handleSelectMake}
        items={activeMakes}
        title={isTowTruck ? "Select Tow Truck Make" : "Select Make"}
        searchPlaceholder="Search makes..."
      />

      <SearchablePicker
        visible={showModelPicker}
        onClose={() => setShowModelPicker(false)}
        onSelect={handleSelectModel}
        items={availableModels}
        title={`${make} Models`}
        searchPlaceholder="Search models..."
      />

      <TowClassPicker
        visible={showTowClassPicker}
        onClose={() => setShowTowClassPicker(false)}
        onSelect={(cls) => { setTowClass(cls); setShowTowClassPicker(false); }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  formCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  optionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  towBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    gap: 0,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  classPickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  separator: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  emptySearch: {
    padding: Spacing.xl,
    alignItems: "center",
  },
});
