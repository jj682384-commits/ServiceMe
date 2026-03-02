import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { useApp, Vehicle, TireType, FuelType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

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

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - i);

function VehicleCard({
  vehicle,
  onSetDefault,
  onRemove,
}: {
  vehicle: Vehicle;
  onSetDefault: () => void;
  onRemove: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 150 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 150 }); }}
      style={[
        styles.vehicleCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: vehicle.isDefault ? theme.primary : "transparent",
          borderWidth: 2,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.vehicleCardHeader}>
        <View style={[styles.vehicleIcon, { backgroundColor: vehicle.isDefault ? theme.primary + "20" : theme.backgroundTertiary }]}>
          <Feather
            name={vehicle.fuelType === "electric" ? "battery-charging" : "truck"}
            size={24}
            color={vehicle.isDefault ? theme.primary : theme.textSecondary}
          />
        </View>
        <View style={styles.vehicleCardInfo}>
          <ThemedText type="body" style={{ fontWeight: "700" }}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </ThemedText>
          <View style={styles.vehicleMetaRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1)}
            </ThemedText>
            <View style={[styles.metaDot, { backgroundColor: theme.textSecondary }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {vehicle.tireType === "run_flat" ? "Run-Flat" : vehicle.tireType === "spare" ? "Has Spare" : "No Spare"}
            </ThemedText>
          </View>
        </View>
        {vehicle.isDefault ? (
          <View style={[styles.defaultBadge, { backgroundColor: theme.primary }]}>
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 10 }}>
              DEFAULT
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.vehicleActions}>
        {!vehicle.isDefault ? (
          <Pressable onPress={onSetDefault} style={[styles.actionButton, { borderColor: theme.primary }]}>
            <Feather name="check-circle" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>
              Set Default
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            Alert.alert("Remove Vehicle", `Remove ${vehicle.year} ${vehicle.make} ${vehicle.model}?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: onRemove },
            ]);
          }}
          style={[styles.actionButton, { borderColor: theme.error }]}
        >
          <Feather name="trash-2" size={14} color={theme.error} />
          <ThemedText type="small" style={{ color: theme.error, marginLeft: 4 }}>
            Remove
          </ThemedText>
        </Pressable>
      </View>
    </AnimatedPressable>
  );
}

export default function VehicleManagementScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { vehicles, addVehicle, removeVehicle, setDefaultVehicle } = useApp();
  const navigation = useNavigation();

  const [showAddForm, setShowAddForm] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(currentYear);
  const [tireType, setTireType] = useState<TireType>("spare");
  const [fuelType, setFuelType] = useState<FuelType>("regular");

  const resetForm = () => {
    setMake("");
    setModel("");
    setYear(currentYear);
    setTireType("spare");
    setFuelType("regular");
    setShowAddForm(false);
  };

  const handleAdd = () => {
    if (!make.trim() || !model.trim()) {
      Alert.alert("Missing Info", "Please enter a make and model for your vehicle.");
      return;
    }
    addVehicle({
      make: make.trim(),
      model: model.trim(),
      year,
      tireType,
      fuelType,
      isDefault: vehicles.length === 0,
    });
    resetForm();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
          Save your vehicles for faster service when you need help.
        </ThemedText>

        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            onSetDefault={() => setDefaultVehicle(vehicle.id)}
            onRemove={() => removeVehicle(vehicle.id)}
          />
        ))}

        {vehicles.length === 0 && !showAddForm ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="truck" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.md }}>
              No Vehicles Saved
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Add a vehicle so providers know what you drive
            </ThemedText>
          </View>
        ) : null}

        {showAddForm ? (
          <View style={[styles.addForm, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>
              Add Vehicle
            </ThemedText>

            <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Make
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. Toyota"
              placeholderTextColor={theme.textSecondary}
              value={make}
              onChangeText={setMake}
            />

            <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Model
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. Camry"
              placeholderTextColor={theme.textSecondary}
              value={model}
              onChangeText={setModel}
            />

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
                    styles.yearChip,
                    {
                      backgroundColor: year === y ? theme.primary : theme.backgroundDefault,
                      borderColor: year === y ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: year === y ? "#FFFFFF" : theme.text, fontWeight: year === y ? "600" : "400" }}
                  >
                    {y}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Tire Type
            </ThemedText>
            <View style={styles.optionRow}>
              {TIRE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setTireType(t.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: tireType === t.value ? theme.primary + "15" : theme.backgroundDefault,
                      borderColor: tireType === t.value ? theme.primary : theme.border,
                      flex: 1,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: tireType === t.value ? theme.primary : theme.text,
                      fontWeight: tireType === t.value ? "600" : "400",
                      textAlign: "center",
                    }}
                  >
                    {t.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Fuel Type
            </ThemedText>
            <View style={styles.optionRow}>
              {FUEL_TYPES.map((f) => (
                <Pressable
                  key={f.value}
                  onPress={() => setFuelType(f.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: fuelType === f.value ? theme.primary + "15" : theme.backgroundDefault,
                      borderColor: fuelType === f.value ? theme.primary : theme.border,
                      flex: 1,
                    },
                  ]}
                >
                  <Feather
                    name={f.icon}
                    size={14}
                    color={fuelType === f.value ? theme.primary : theme.textSecondary}
                  />
                  <ThemedText
                    type="small"
                    style={{
                      color: fuelType === f.value ? theme.primary : theme.text,
                      fontWeight: fuelType === f.value ? "600" : "400",
                      marginLeft: 4,
                    }}
                  >
                    {f.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.formActions}>
              <Pressable
                onPress={resetForm}
                style={[styles.cancelButton, { borderColor: theme.border }]}
              >
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAdd}
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
              >
                <Feather name="plus" size={18} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.xs }}>
                  Save Vehicle
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowAddForm(true)}
            style={[styles.addButton, { borderColor: theme.primary }]}
          >
            <Feather name="plus-circle" size={20} color={theme.primary} />
            <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600", marginLeft: Spacing.sm }}>
              Add a Vehicle
            </ThemedText>
          </Pressable>
        )}
      </KeyboardAwareScrollViewCompat>
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
  vehicleCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  vehicleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleCardInfo: {
    flex: 1,
    gap: 2,
  },
  vehicleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  defaultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  vehicleActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  addForm: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  fieldLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  yearChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
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
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    marginTop: Spacing.md,
  },
});
