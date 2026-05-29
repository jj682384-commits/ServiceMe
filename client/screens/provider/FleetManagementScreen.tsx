import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const VEHICLE_TYPES = ["Tow Truck", "Flatbed", "Service Van", "Pickup Truck", "Heavy Wrecker", "Motorcycle Rescue"];

const TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  "Tow Truck": "truck",
  "Flatbed": "minus",
  "Service Van": "box",
  "Pickup Truck": "chevrons-right",
  "Heavy Wrecker": "anchor",
  "Motorcycle Rescue": "wind",
};

type FleetVehicle = { id: string; year: string; make: string; model: string; plate: string; type: string };

export default function FleetManagementScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { currentProvider, setCurrentProvider } = useApp();

  const [vehicles, setVehicles] = useState<FleetVehicle[]>(
    currentProvider?.fleetVehicles ?? []
  );
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newType, setNewType] = useState("Tow Truck");

  const saveToServer = async (updated: FleetVehicle[]) => {
    if (!currentProvider?.id) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/providers/${currentProvider.id}/business-data`, {
        fleetVehicles: updated,
      });
      setCurrentProvider({ ...currentProvider, fleetVehicles: updated });
    } catch {
      Alert.alert("Error", "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newMake.trim() || !newModel.trim()) {
      Alert.alert("Required", "Please enter make and model.");
      return;
    }
    const v: FleetVehicle = {
      id: Date.now().toString(),
      year: newYear.trim(),
      make: newMake.trim(),
      model: newModel.trim(),
      plate: newPlate.trim().toUpperCase(),
      type: newType,
    };
    const updated = [...vehicles, v];
    setVehicles(updated);
    setShowModal(false);
    setNewMake(""); setNewModel(""); setNewPlate(""); setNewYear(new Date().getFullYear().toString()); setNewType("Tow Truck");
    await saveToServer(updated);
  };

  const handleRemove = (id: string) => {
    Alert.alert("Remove Vehicle", "Remove this vehicle from your fleet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const updated = vehicles.filter((v) => v.id !== id);
          setVehicles(updated);
          await saveToServer(updated);
        },
      },
    ]);
  };

  const sectionBg = theme.backgroundSecondary;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: sectionBg }]}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statVal}>{vehicles.length}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Vehicles</ThemedText>
          </View>
          {["Tow Truck", "Flatbed", "Service Van"].map((t) => (
            <View key={t} style={styles.statItem}>
              <ThemedText style={styles.statVal}>{vehicles.filter((v) => v.type === t).length}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                {t.split(" ")[0]}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Vehicle list */}
        {vehicles.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: sectionBg }]}>
            <Feather name="truck" size={40} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.md }}>No fleet vehicles</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Add vehicles your team uses for service jobs
            </ThemedText>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
            {vehicles.map((v) => (
              <View key={v.id} style={[styles.vehicleCard, { backgroundColor: sectionBg }]}>
                <View style={[styles.vehicleIcon, { backgroundColor: "#3B82F620" }]}>
                  <Feather name={TYPE_ICONS[v.type] ?? "truck"} size={22} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h4">{v.year} {v.make} {v.model}</ThemedText>
                  <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: 3, alignItems: "center" }}>
                    <View style={[styles.typePill, { backgroundColor: "#3B82F620" }]}>
                      <ThemedText type="small" style={{ color: "#3B82F6", fontWeight: "700" }}>{v.type}</ThemedText>
                    </View>
                    {v.plate ? (
                      <ThemedText type="small" style={{ color: theme.textSecondary, fontFamily: "monospace" }}>
                        {v.plate}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={() => handleRemove(v.id)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: Spacing.sm }]}
                >
                  <Feather name="trash-2" size={18} color={theme.danger ?? "#EF4444"} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => setShowModal(true)}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: "#3B82F6", opacity: pressed ? 0.85 : 1, marginTop: Spacing.xl },
          ]}
        >
          <Feather name="plus-circle" size={20} color="#FFF" />
          <ThemedText style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: Spacing.sm }}>
            Add Vehicle
          </ThemedText>
        </Pressable>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollViewCompat>
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3">Add Fleet Vehicle</ThemedText>
                <Pressable onPress={() => setShowModal(false)}>
                  <Feather name="x" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>

              <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>VEHICLE TYPE *</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                  {VEHICLE_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setNewType(t)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: newType === t ? "#3B82F6" : theme.backgroundDefault,
                          borderColor: newType === t ? "#3B82F6" : theme.border,
                        },
                      ]}
                    >
                      <Feather name={TYPE_ICONS[t] ?? "truck"} size={14} color={newType === t ? "#FFF" : theme.textSecondary} />
                      <ThemedText type="small" style={{ color: newType === t ? "#FFF" : theme.text, fontWeight: "600", marginLeft: 4 }}>{t}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                <View style={{ width: 80 }}>
                  <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>YEAR</ThemedText>
                  <TextInput
                    value={newYear}
                    onChangeText={setNewYear}
                    placeholder="2024"
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>MAKE *</ThemedText>
                  <TextInput
                    value={newMake}
                    onChangeText={setNewMake}
                    placeholder="Ford"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  />
                </View>
              </View>

              <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>MODEL *</ThemedText>
              <TextInput
                value={newModel}
                onChangeText={setNewModel}
                placeholder="F-450"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              />

              <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>LICENSE PLATE</ThemedText>
              <TextInput
                value={newPlate}
                onChangeText={setNewPlate}
                placeholder="ABC-1234"
                autoCapitalize="characters"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border, fontFamily: "monospace" }]}
              />

              <Pressable
                onPress={handleAdd}
                disabled={saving}
                style={({ pressed }) => [styles.addBtn, { backgroundColor: "#3B82F6", opacity: pressed || saving ? 0.7 : 1, marginTop: Spacing.lg }]}
              >
                <ThemedText style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                  {saving ? "Adding..." : "Add to Fleet"}
                </ThemedText>
              </Pressable>
            </View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: "row", borderRadius: BorderRadius.md, padding: Spacing.lg, gap: Spacing.md },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "900", lineHeight: 26 },
  emptyState: { alignItems: "center", padding: Spacing["2xl"], borderRadius: BorderRadius.md, marginTop: Spacing.xl },
  vehicleCard: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.md },
  vehicleIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  typePill: { paddingVertical: 2, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.full },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: Spacing["2xl"] },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl },
  fieldLabel: { fontWeight: "700", letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  input: { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.md, fontSize: 16, marginBottom: Spacing.xs },
  typeChip: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1 },
});
