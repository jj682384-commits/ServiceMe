import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput, Alert, FlatList, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, Vehicle, TireType, FuelType, DrivetrainType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { VEHICLE_MAKES, VEHICLE_MAKES_MODELS, VEHICLE_COLORS } from "@/constants/vehicleData";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TIRE_TYPES: { value: TireType; label: string }[] = [
  { value: "spare", label: "Full-Size Spare" },
  { value: "run_flat", label: "Run-Flat Tires" },
  { value: "none", label: "No Spare" },
];

const FUEL_TYPES: { value: FuelType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "regular", label: "Regular", icon: "droplet" },
  { value: "premium", label: "Premium", icon: "droplet" },
  { value: "diesel", label: "Diesel", icon: "droplet" },
  { value: "electric", label: "Electric", icon: "battery-charging" },
];

const DRIVETRAIN_TYPES: { value: DrivetrainType; label: string }[] = [
  { value: "fwd", label: "FWD" },
  { value: "rwd", label: "RWD" },
  { value: "awd", label: "AWD" },
  { value: "4wd", label: "4WD" },
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
              { backgroundColor: theme.cardAnimatedBg, borderColor: theme.border },
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
                onPress={() => {
                  setSearch("");
                  onSelect(item);
                }}
                style={({ pressed }) => [
                  styles.pickerItem,
                  { backgroundColor: pressed ? theme.cardAnimatedBg : "transparent" },
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

function PickerButton({
  label,
  value,
  placeholder,
  onPress,
  disabled,
  sectionBg,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  sectionBg?: string;
}) {
  const { theme } = useTheme();
  const bg = sectionBg ?? theme.backgroundDefault;

  return (
    <>
      <ThemedText style={styles.sectionLabel}>
        {label.toUpperCase()}
      </ThemedText>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.pickerButton,
          {
            backgroundColor: bg,
            borderColor: value ? theme.primary : theme.border,
            opacity: disabled ? 0.5 : 1,
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

function ColorPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (hex: string) => void;
}) {
  const { theme } = useTheme();
  const isLight = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  };

  return (
    <>
      <View style={styles.colorHeaderRow}>
        <ThemedText style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>
          COLOR
        </ThemedText>
        {selected ? (
          <View style={styles.colorSelectedTag}>
            <View
              style={[
                styles.colorSelectedDot,
                {
                  backgroundColor: selected,
                  borderWidth: isLight(selected) ? 1 : 0,
                  borderColor: theme.border,
                },
              ]}
            />
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
              {VEHICLE_COLORS.find((c) => c.hex === selected)?.label ?? "Custom"}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.colorGrid}>
        {VEHICLE_COLORS.map((c) => {
          const active = selected === c.hex;
          const light = isLight(c.hex);
          return (
            <Pressable
              key={c.hex}
              onPress={() => onSelect(c.hex)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c.hex },
                light ? { borderWidth: 1, borderColor: theme.border } : null,
                active ? styles.colorSwatchActive : null,
              ]}
            >
              {active ? (
                <Feather name="check" size={14} color={light ? "#000" : "#FFF"} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function VehicleCard({
  vehicle,
  onSetDefault,
  onEdit,
  onRemove,
}: {
  vehicle: Vehicle;
  onSetDefault: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const colorEntry = vehicle.color
    ? VEHICLE_COLORS.find((c) => c.hex === vehicle.color)
    : null;

  const isEV = vehicle.fuelType === "electric";
  const iconBg = vehicle.isDefault ? "#0066FF22" : isEV ? "#00AA5522" : "#60A5FA18";
  const iconColor = vehicle.isDefault ? "#60A5FA" : isEV ? "#34D399" : "#94A3B8";

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 150 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 150 }); }}
      style={[
        styles.vehicleCard,
        {
          backgroundColor: theme.cardAnimatedBg,
          borderColor: vehicle.isDefault ? "#0066FF55" : "transparent",
          borderWidth: 1.5,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.vehicleCardHeader}>
        <View style={styles.vehicleIconWrap}>
          <View style={[styles.vehicleIconBox, { backgroundColor: iconBg }]}>
            <Feather
              name={isEV ? "battery-charging" : "truck"}
              size={20}
              color={iconColor}
            />
          </View>
          {vehicle.color ? (
            <View
              style={[
                styles.colorDot,
                { backgroundColor: vehicle.color, borderColor: theme.backgroundDefault },
              ]}
            />
          ) : null}
        </View>
        <View style={styles.vehicleCardInfo}>
          <ThemedText type="body" style={{ fontWeight: "700", color: "#FFFFFF" }}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </ThemedText>
          <View style={styles.vehicleMetaRow}>
            {colorEntry ? (
              <>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {colorEntry.label}
                </ThemedText>
                <View style={[styles.metaDot, { backgroundColor: theme.textSecondary }]} />
              </>
            ) : null}
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1)}
            </ThemedText>
            <View style={[styles.metaDot, { backgroundColor: theme.textSecondary }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {vehicle.tireType === "run_flat" ? "Run-Flat" : vehicle.tireType === "spare" ? "Has Spare" : "No Spare"}
            </ThemedText>
            {vehicle.drivetrain ? (
              <>
                <View style={[styles.metaDot, { backgroundColor: theme.textSecondary }]} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {vehicle.drivetrain.toUpperCase()}
                </ThemedText>
              </>
            ) : null}
          </View>
        </View>
        {vehicle.isDefault ? (
          <View style={[styles.defaultBadge, { backgroundColor: "#0066FF" }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 10 }}>
              DEFAULT
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={[styles.vehicleCardDivider, { backgroundColor: theme.border }]} />
      <View style={styles.vehicleActions}>
        {!vehicle.isDefault ? (
          <Pressable onPress={onSetDefault} style={[styles.actionButton, { borderColor: "#0066FF55" }]}>
            <Feather name="check-circle" size={13} color="#60A5FA" />
            <ThemedText type="small" style={{ color: "#60A5FA", marginLeft: 4, fontSize: 12 }}>
              Set Default
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable onPress={onEdit} style={[styles.actionButton, { borderColor: theme.border }]}>
          <Feather name="edit-2" size={13} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4, fontSize: 12 }}>
            Edit
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => {
            Alert.alert("Remove Vehicle", `Remove ${vehicle.year} ${vehicle.make} ${vehicle.model}?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: onRemove },
            ]);
          }}
          style={[styles.actionButton, { borderColor: "#D9222255" }]}
        >
          <Feather name="trash-2" size={13} color="#EF4444" />
          <ThemedText type="small" style={{ color: "#EF4444", marginLeft: 4, fontSize: 12 }}>
            Remove
          </ThemedText>
        </Pressable>
      </View>
    </AnimatedPressable>
  );
}

function VehicleForm({
  make, model, year, color, tireType, fuelType, drivetrain,
  onMakePress, onModelPress,
  setYear, setColor, setTireType, setFuelType, setDrivetrain,
  onCancel, onSave,
  saveLabel,
}: {
  make: string; model: string; year: number; color: string;
  tireType: TireType; fuelType: FuelType; drivetrain: DrivetrainType;
  onMakePress: () => void; onModelPress: () => void;
  setYear: (y: number) => void; setColor: (c: string) => void;
  setTireType: (t: TireType) => void; setFuelType: (f: FuelType) => void;
  setDrivetrain: (d: DrivetrainType) => void;
  onCancel: () => void; onSave: () => void;
  saveLabel: string;
}) {
  const { theme } = useTheme();
  const sectionBg = theme.cardAnimatedBg;

  return (
    <>
      <PickerButton label="Make" value={make} placeholder="Select make..." onPress={onMakePress} sectionBg={sectionBg} />
      <PickerButton
        label="Model"
        value={model}
        placeholder={make ? "Select model..." : "Select a make first"}
        onPress={onModelPress}
        disabled={!make}
        sectionBg={sectionBg}
      />

      <ThemedText style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>YEAR</ThemedText>
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
              styles.yearChip,
              {
                backgroundColor: year === y ? "#0066FF" : sectionBg,
                borderColor: year === y ? "#0066FF" : theme.border,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: year === y ? "#FFFFFF" : theme.text, fontWeight: year === y ? "700" : "400" }}
            >
              {y}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ marginTop: Spacing.md }}>
        <ColorPicker selected={color} onSelect={setColor} />
      </View>

      <ThemedText style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>TIRE TYPE</ThemedText>
      <View style={styles.optionRow}>
        {TIRE_TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTireType(t.value)}
            style={[
              styles.optionChip,
              {
                backgroundColor: tireType === t.value ? "#0066FF22" : sectionBg,
                borderColor: tireType === t.value ? "#0066FF" : theme.border,
                flex: 1,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: tireType === t.value ? "#60A5FA" : theme.text,
                fontWeight: tireType === t.value ? "700" : "400",
                textAlign: "center",
              }}
            >
              {t.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>FUEL TYPE</ThemedText>
      <View style={styles.optionRow}>
        {FUEL_TYPES.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFuelType(f.value)}
            style={[
              styles.optionChip,
              {
                backgroundColor: fuelType === f.value ? "#0066FF22" : sectionBg,
                borderColor: fuelType === f.value ? "#0066FF" : theme.border,
                flex: 1,
              },
            ]}
          >
            <Feather
              name={f.icon}
              size={13}
              color={fuelType === f.value ? "#60A5FA" : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{
                color: fuelType === f.value ? "#60A5FA" : theme.text,
                fontWeight: fuelType === f.value ? "700" : "400",
                marginLeft: 4,
              }}
            >
              {f.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>DRIVETRAIN</ThemedText>
      <View style={styles.optionRow}>
        {DRIVETRAIN_TYPES.map((d) => (
          <Pressable
            key={d.value}
            onPress={() => setDrivetrain(d.value)}
            style={[
              styles.optionChip,
              {
                backgroundColor: drivetrain === d.value ? "#0066FF22" : sectionBg,
                borderColor: drivetrain === d.value ? "#0066FF" : theme.border,
                flex: 1,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: drivetrain === d.value ? "#60A5FA" : theme.text,
                fontWeight: drivetrain === d.value ? "700" : "400",
                textAlign: "center",
              }}
            >
              {d.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={[styles.cancelButton, { borderColor: theme.border }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>Cancel</ThemedText>
        </Pressable>
        <Pressable onPress={onSave} style={styles.saveButtonWrap}>
          <LinearGradient
            colors={["#0055CC", "#0066FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Feather name="check" size={16} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.xs }}>
              {saveLabel}
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </>
  );
}

export default function VehicleManagementScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { vehicles, addVehicle, updateVehicle, removeVehicle, setDefaultVehicle } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(currentYear);
  const [color, setColor] = useState("");
  const [tireType, setTireType] = useState<TireType>("spare");
  const [fuelType, setFuelType] = useState<FuelType>("regular");
  const [drivetrain, setDrivetrain] = useState<DrivetrainType>("fwd");

  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState(currentYear);
  const [editColor, setEditColor] = useState("");
  const [editTireType, setEditTireType] = useState<TireType>("spare");
  const [editFuelType, setEditFuelType] = useState<FuelType>("regular");
  const [editDrivetrain, setEditDrivetrain] = useState<DrivetrainType>("fwd");
  const [showEditMakePicker, setShowEditMakePicker] = useState(false);
  const [showEditModelPicker, setShowEditModelPicker] = useState(false);

  const availableModels = useMemo(() => {
    if (!make) return [];
    return VEHICLE_MAKES_MODELS[make] || [];
  }, [make]);

  const editAvailableModels = useMemo(() => {
    if (!editMake) return [];
    return VEHICLE_MAKES_MODELS[editMake] || [];
  }, [editMake]);

  const openEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditMake(vehicle.make);
    setEditModel(vehicle.model);
    setEditYear(vehicle.year);
    setEditColor(vehicle.color || "");
    setEditTireType(vehicle.tireType);
    setEditFuelType(vehicle.fuelType);
    setEditDrivetrain(vehicle.drivetrain || "fwd");
  };

  const closeEdit = () => {
    setEditingVehicle(null);
    setShowEditMakePicker(false);
    setShowEditModelPicker(false);
  };

  const handleSaveEdit = () => {
    if (!editingVehicle) return;
    if (!editMake.trim() || !editModel.trim()) {
      Alert.alert("Missing Info", "Please select a make and model.");
      return;
    }
    updateVehicle(editingVehicle.id, {
      make: editMake.trim(),
      model: editModel.trim(),
      year: editYear,
      color: editColor || undefined,
      tireType: editTireType,
      fuelType: editFuelType,
      drivetrain: editDrivetrain,
    });
    closeEdit();
  };

  const resetForm = () => {
    setMake(""); setModel(""); setYear(currentYear); setColor("");
    setTireType("spare"); setFuelType("regular"); setDrivetrain("fwd");
    setShowAddForm(false);
  };

  const handleAdd = () => {
    if (!make.trim() || !model.trim()) {
      Alert.alert("Missing Info", "Please select a make and model for your vehicle.");
      return;
    }
    addVehicle({
      make: make.trim(), model: model.trim(), year,
      color: color || undefined, tireType, fuelType, drivetrain,
      isDefault: vehicles.length === 0,
    });
    resetForm();
  };

  const defaultVehicle = vehicles.find((v) => v.isDefault);

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
        {/* Hero card */}
        <LinearGradient
          colors={["#0A1F3A", "#0F2855", "#14124A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroLeft}>
            <View style={styles.heroIconCircle}>
              <Feather name="truck" size={28} color="#60A5FA" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 2 }}>
                My Vehicles
              </ThemedText>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.55)" }}>
                {vehicles.length === 0
                  ? "No vehicles saved yet"
                  : `${vehicles.length} vehicle${vehicles.length > 1 ? "s" : ""} saved`}
              </ThemedText>
            </View>
          </View>
          {defaultVehicle ? (
            <View style={styles.heroDefaultTag}>
              <Feather name="star" size={11} color="#60A5FA" />
              <ThemedText style={{ color: "#60A5FA", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
                {defaultVehicle.make} {defaultVehicle.model}
              </ThemedText>
            </View>
          ) : null}
        </LinearGradient>

        {/* Vehicle list */}
        {vehicles.length > 0 ? (
          <Animated.View entering={FadeIn.delay(80).duration(300)}>
            <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>
              SAVED VEHICLES
            </ThemedText>
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onSetDefault={() => setDefaultVehicle(vehicle.id)}
                onEdit={() => openEdit(vehicle)}
                onRemove={() => removeVehicle(vehicle.id)}
              />
            ))}
          </Animated.View>
        ) : !showAddForm ? (
          <Animated.View entering={FadeIn.delay(80).duration(300)}>
            <View style={[styles.emptyState, { backgroundColor: theme.cardAnimatedBg }]}>
              <View style={[styles.emptyIconBox, { backgroundColor: "#0066FF18" }]}>
                <Feather name="truck" size={28} color="#60A5FA" />
              </View>
              <ThemedText type="h4" style={{ marginTop: Spacing.md, color: "#FFFFFF" }}>
                No Vehicles Saved
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                Add a vehicle so providers know what you drive
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        {/* Add form */}
        {showAddForm ? (
          <Animated.View entering={FadeInDown.duration(280).springify().damping(20)}>
            <ThemedText style={[styles.sectionLabel, { marginBottom: Spacing.sm }]}>
              ADD VEHICLE
            </ThemedText>
            <View style={[styles.addForm, { backgroundColor: theme.cardAnimatedBg }]}>
              <VehicleForm
                make={make} model={model} year={year} color={color}
                tireType={tireType} fuelType={fuelType} drivetrain={drivetrain}
                onMakePress={() => setShowMakePicker(true)}
                onModelPress={() => setShowModelPicker(true)}
                setYear={setYear} setColor={setColor}
                setTireType={setTireType} setFuelType={setFuelType} setDrivetrain={setDrivetrain}
                onCancel={resetForm} onSave={handleAdd} saveLabel="Save Vehicle"
              />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.delay(160).duration(280)}>
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={[styles.addButton, { borderColor: "#0066FF55" }]}
            >
              <View style={[styles.addIconBox, { backgroundColor: "#0066FF22" }]}>
                <Feather name="plus" size={18} color="#60A5FA" />
              </View>
              <ThemedText type="body" style={{ color: "#60A5FA", fontWeight: "600", marginLeft: Spacing.sm }}>
                Add a Vehicle
              </ThemedText>
            </Pressable>
          </Animated.View>
        )}
      </KeyboardAwareScrollViewCompat>

      {/* Modals */}
      <SearchablePicker
        visible={showMakePicker}
        onClose={() => setShowMakePicker(false)}
        onSelect={(m) => { setMake(m); setModel(""); setShowMakePicker(false); }}
        items={VEHICLE_MAKES}
        title="Select Make"
        searchPlaceholder="Search makes..."
      />
      <SearchablePicker
        visible={showModelPicker}
        onClose={() => setShowModelPicker(false)}
        onSelect={(m) => { setModel(m); setShowModelPicker(false); }}
        items={availableModels}
        title={`${make} Models`}
        searchPlaceholder="Search models..."
      />

      <Modal visible={!!editingVehicle} animationType="slide" transparent>
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
              <ThemedText type="h3">Edit Vehicle</ThemedText>
              <Pressable onPress={closeEdit} hitSlop={12}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <KeyboardAwareScrollViewCompat
              contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl }}
              keyboardShouldPersistTaps="handled"
            >
              <VehicleForm
                make={editMake} model={editModel} year={editYear} color={editColor}
                tireType={editTireType} fuelType={editFuelType} drivetrain={editDrivetrain}
                onMakePress={() => setShowEditMakePicker(true)}
                onModelPress={() => setShowEditModelPicker(true)}
                setYear={setEditYear} setColor={setEditColor}
                setTireType={setEditTireType} setFuelType={setEditFuelType} setDrivetrain={setEditDrivetrain}
                onCancel={closeEdit} onSave={handleSaveEdit} saveLabel="Save Changes"
              />
            </KeyboardAwareScrollViewCompat>
          </View>
        </View>
      </Modal>

      <SearchablePicker
        visible={showEditMakePicker}
        onClose={() => setShowEditMakePicker(false)}
        onSelect={(m) => { setEditMake(m); setEditModel(""); setShowEditMakePicker(false); }}
        items={VEHICLE_MAKES}
        title="Select Make"
        searchPlaceholder="Search makes..."
      />
      <SearchablePicker
        visible={showEditModelPicker}
        onClose={() => setShowEditModelPicker(false)}
        onSelect={(m) => { setEditModel(m); setShowEditModelPicker(false); }}
        items={editAvailableModels}
        title={`${editMake} Models`}
        searchPlaceholder="Search models..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  // Hero
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(96,165,250,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroDefaultTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(96,165,250,0.1)",
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "rgba(148,163,184,0.8)",
    marginBottom: Spacing.sm,
  },
  // Vehicle card
  vehicleCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  vehicleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  vehicleIconWrap: {
    position: "relative",
  },
  vehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  vehicleCardInfo: {
    flex: 1,
    gap: 3,
  },
  vehicleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  defaultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  vehicleCardDivider: {
    height: 1,
    marginVertical: Spacing.md,
    opacity: 0.4,
  },
  vehicleActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  // Add form
  addForm: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  // Field elements
  sectionLabelInForm: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "rgba(148,163,184,0.8)",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  yearChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  colorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  colorSelectedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  colorSelectedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: "rgba(192,192,192,0.5)",
  },
  optionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
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
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  saveButtonWrap: {
    flex: 2,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  saveButtonGradient: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  // Add button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: Spacing.xs,
  },
  addIconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: "82%",
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
  separator: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  emptySearch: {
    padding: Spacing.xl,
    alignItems: "center",
  },
});
