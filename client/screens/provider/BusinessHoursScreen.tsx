import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Half-hour increments from 12:00 AM to 11:30 PM
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "AM" : "PM";
    const min = m === 0 ? "00" : "30";
    TIMES.push(`${hour}:${min} ${ampm}`);
  }
}

const DEFAULT_HOURS = () =>
  Object.fromEntries(
    DAYS.map((d, i) => [
      d,
      { open: i < 5, from: "8:00 AM", to: "6:00 PM" },
    ])
  );

type DayHours = { open: boolean; from: string; to: string };

export default function BusinessHoursScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { currentProvider, setCurrentProvider } = useApp();

  const [hours, setHours] = useState<Record<string, DayHours>>(
    currentProvider?.businessHours ?? DEFAULT_HOURS()
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Time picker modal state
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [pickerField, setPickerField] = useState<"from" | "to">("from");

  const toggleDay = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], open: !prev[day].open },
    }));
    setSaved(false);
  };

  const setTime = (day: string, field: "from" | "to", time: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: time } }));
    setSaved(false);
  };

  const openPicker = (day: string, field: "from" | "to") => {
    setPickerDay(day);
    setPickerField(field);
  };

  const handleSave = async () => {
    if (!currentProvider?.id) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/providers/${currentProvider.id}/business-data`, {
        businessHours: hours,
      });
      setCurrentProvider({ ...currentProvider, businessHours: hours });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert("Error", "Could not save business hours. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetAllWeekdays = () => {
    const updated = { ...hours };
    ["Monday","Tuesday","Wednesday","Thursday","Friday"].forEach((d) => {
      updated[d] = { open: true, from: "8:00 AM", to: "6:00 PM" };
    });
    setHours(updated);
    setSaved(false);
  };

  const handleSet247 = () => {
    const updated = { ...hours };
    DAYS.forEach((d) => { updated[d] = { open: true, from: "12:00 AM", to: "11:30 PM" }; });
    setHours(updated);
    setSaved(false);
  };

  const openCount = DAYS.filter((d) => hours[d]?.open).length;
  const sectionBg = theme.backgroundSecondary;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: sectionBg }]}>
          <View style={styles.summaryRow}>
            {DAYS.map((d, i) => (
              <View key={d} style={[
                styles.dayDot,
                {
                  backgroundColor: hours[d]?.open ? "#10B981" : theme.border,
                },
              ]}>
                <ThemedText style={{ fontSize: 9, fontWeight: "800", color: hours[d]?.open ? "#FFF" : theme.textSecondary }}>
                  {DAY_SHORT[i][0]}
                </ThemedText>
              </View>
            ))}
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            Open {openCount} day{openCount !== 1 ? "s" : ""} per week
          </ThemedText>
        </View>

        {/* Quick presets */}
        <View style={styles.presetsRow}>
          <Pressable
            onPress={handleSetAllWeekdays}
            style={[styles.presetBtn, { backgroundColor: sectionBg, borderColor: theme.border }]}
          >
            <Feather name="briefcase" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.text, marginLeft: 5, fontWeight: "600" }}>Weekdays 8–6</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleSet247}
            style={[styles.presetBtn, { backgroundColor: sectionBg, borderColor: theme.border }]}
          >
            <Feather name="zap" size={14} color="#10B981" />
            <ThemedText type="small" style={{ color: "#10B981", marginLeft: 5, fontWeight: "600" }}>24/7 Always Open</ThemedText>
          </Pressable>
        </View>

        {/* Day rows */}
        <View style={{ gap: Spacing.sm }}>
          {DAYS.map((day) => {
            const h = hours[day] ?? { open: false, from: "8:00 AM", to: "6:00 PM" };
            return (
              <View
                key={day}
                style={[
                  styles.dayRow,
                  {
                    backgroundColor: sectionBg,
                    opacity: h.open ? 1 : 0.6,
                  },
                ]}
              >
                <Switch
                  value={h.open}
                  onValueChange={() => toggleDay(day)}
                  trackColor={{ false: theme.border, true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
                <ThemedText type="body" style={{ width: 90, fontWeight: h.open ? "700" : "400" }}>
                  {day}
                </ThemedText>
                {h.open ? (
                  <View style={styles.timeRange}>
                    <Pressable
                      onPress={() => openPicker(day, "from")}
                      style={[styles.timeChip, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
                    >
                      <Feather name="clock" size={12} color={theme.textSecondary} />
                      <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", marginLeft: 4 }}>{h.from}</ThemedText>
                    </Pressable>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>–</ThemedText>
                    <Pressable
                      onPress={() => openPicker(day, "to")}
                      style={[styles.timeChip, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
                    >
                      <ThemedText type="small" style={{ color: theme.text, fontWeight: "600" }}>{h.to}</ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, textAlign: "right" }}>Closed</ThemedText>
                )}
              </View>
            );
          })}
        </View>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: saved ? "#10B981" : "#10B981",
              opacity: pressed || saving ? 0.85 : 1,
              marginTop: Spacing.xl,
            },
          ]}
        >
          <Feather name={saved ? "check" : "save"} size={20} color="#FFF" />
          <ThemedText style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: Spacing.sm }}>
            {saving ? "Saving..." : saved ? "Hours Saved!" : "Save Hours"}
          </ThemedText>
        </Pressable>
      </ScrollView>

      {/* Time picker modal */}
      <Modal
        visible={!!pickerDay}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.timePickerCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">
                {pickerDay} {pickerField === "from" ? "Opens" : "Closes"}
              </ThemedText>
              <Pressable onPress={() => setPickerDay(null)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {TIMES.map((t) => {
                const selected = pickerDay ? hours[pickerDay]?.[pickerField] === t : false;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      if (pickerDay) setTime(pickerDay, pickerField, t);
                      setPickerDay(null);
                    }}
                    style={[
                      styles.timeOption,
                      {
                        backgroundColor: selected ? "#10B981" : "transparent",
                        borderRadius: BorderRadius.sm,
                      },
                    ]}
                  >
                    <ThemedText
                      type="body"
                      style={{ fontWeight: selected ? "800" : "400", color: selected ? "#FFF" : theme.text }}
                    >
                      {t}
                    </ThemedText>
                    {selected ? <Feather name="check" size={16} color="#FFF" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: { borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: "center", marginBottom: Spacing.md },
  summaryRow: { flexDirection: "row", gap: Spacing.sm },
  dayDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  presetsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  presetBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  dayRow: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm },
  timeRange: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: Spacing.xs },
  timeChip: { flexDirection: "row", alignItems: "center", paddingVertical: 5, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  timePickerCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: Spacing["2xl"] },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  timeOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: Spacing.md },
});
