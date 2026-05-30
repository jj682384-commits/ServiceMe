import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  FadeInUp,
  cancelAnimation,
} from "react-native-reanimated";
import { useApp, TireType, DrivetrainType } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { VEHICLE_MAKES, VEHICLE_MAKES_MODELS, VEHICLE_COLORS } from "@/constants/vehicleData";
import { getEVColors, type EVColors } from "@/constants/evColors";
import EVAnimatedBackground from "@/components/EVAnimatedBackground";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const { width: SW } = Dimensions.get("window");

const TIRE_TYPES: { value: TireType; label: string }[] = [
  { value: "spare", label: "Full-Size Spare" },
  { value: "run_flat", label: "Run-Flat Tires" },
  { value: "none", label: "No Spare" },
];

const DRIVETRAIN_TYPES: { value: DrivetrainType; label: string }[] = [
  { value: "fwd", label: "FWD" },
  { value: "rwd", label: "RWD" },
  { value: "awd", label: "AWD" },
  { value: "4wd", label: "4WD" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(currentYear - i));

const COLOR_GROUPS: { label: string; colors: typeof VEHICLE_COLORS }[] = [
  {
    label: "NEUTRAL",
    colors: VEHICLE_COLORS.filter((c) =>
      ["White", "Pearl White", "Champagne", "Silver", "Gray", "Dark Gray", "Black"].includes(c.label)
    ),
  },
  {
    label: "WARM",
    colors: VEHICLE_COLORS.filter((c) =>
      ["Red", "Dark Red", "Maroon", "Orange", "Yellow", "Gold", "Brown", "Tan / Beige"].includes(c.label)
    ),
  },
  {
    label: "COOL",
    colors: VEHICLE_COLORS.filter((c) =>
      ["Blue", "Dark Blue", "Navy", "Green", "Dark Green", "Teal", "Purple"].includes(c.label)
    ),
  },
];

// ── Intro animation ──────────────────────────────────────────────────────────

function ScanLine({ ev }: { ev: EVColors }) {
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(translateY);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(translateY.value, [0, 1], [-20, 20]) }],
    opacity: interpolate(translateY.value, [0, 0.5, 1], [0.3, 1, 0.3]),
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, height: 2, top: "50%" }, style]}>
      <LinearGradient
        colors={["transparent", ev.neonCyan, ev.neonGreen, ev.neonCyan, "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

function IntroAnimation({ onComplete, ev, isDark }: { onComplete: () => void; ev: EVColors; isDark: boolean }) {
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(1);
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withTiming(3, { duration: 600, easing: Easing.out(Easing.cubic) });
    ringOpacity.value = withDelay(400, withTiming(0, { duration: 200 }));
    iconScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 120 }));
    iconOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    textOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    const timeout = setTimeout(() => onComplete(), 1400);
    return () => clearTimeout(timeout);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }], opacity: ringOpacity.value }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }], opacity: iconOpacity.value }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [20, 0]) }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: ev.bg, zIndex: 100, alignItems: "center", justifyContent: "center" }]}>
      <EVAnimatedBackground isDark={isDark} />
      <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: ev.neonGreen }, ringStyle]} />
        <Animated.View style={iconStyle}>
          <LinearGradient
            colors={[ev.neonGreen + "25", ev.bgCard]}
            style={{ width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="battery-charging" size={44} color={ev.neonGreen} />
          </LinearGradient>
        </Animated.View>
      </View>
      <Animated.Text style={[{ fontSize: 14, fontWeight: "700", letterSpacing: 6, marginTop: 24, color: ev.neonGreen }, textStyle]}>
        INITIALIZING
      </Animated.Text>
      <Animated.Text style={[{ fontSize: 22, fontWeight: "600", marginTop: 8, color: ev.white }, textStyle]}>
        EV Profile Setup
      </Animated.Text>
      <ScanLine ev={ev} />
    </View>
  );
}

// ── Searchable Picker Modal ───────────────────────────────────────────────────

function SearchablePicker({
  visible, onClose, onSelect, items, title, searchPlaceholder, ev,
}: {
  visible: boolean; onClose: () => void; onSelect: (item: string) => void;
  items: string[]; title: string; searchPlaceholder: string; ev: EVColors;
}) {
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
        <View style={[styles.modalSheet, { backgroundColor: ev.bgCard, paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Animated.Text style={{ color: ev.white, fontSize: 18, fontWeight: "700" }}>{title}</Animated.Text>
            <Pressable onPress={() => { setSearch(""); onClose(); }} hitSlop={12}>
              <Feather name="x" size={24} color={ev.white} />
            </Pressable>
          </View>
          <View style={[styles.searchBar, { backgroundColor: ev.bg, borderColor: ev.border }]}>
            <Feather name="search" size={18} color={ev.whiteDim} />
            <TextInput
              style={[styles.searchInput, { color: ev.white }]}
              placeholder={searchPlaceholder}
              placeholderTextColor={ev.whiteGhost}
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCorrect={false}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x-circle" size={16} color={ev.whiteDim} />
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
                style={({ pressed }) => [styles.pickerItem, { backgroundColor: pressed ? ev.bgCardLight : "transparent" }]}
              >
                <Animated.Text style={{ color: ev.white, fontSize: 16 }}>{item}</Animated.Text>
                <Feather name="chevron-right" size={16} color={ev.whiteDim} />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Animated.Text style={{ color: ev.whiteDim, fontSize: 15 }}>No results for "{search}"</Animated.Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: ev.border, marginHorizontal: Spacing.lg }} />}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Color Picker Modal ────────────────────────────────────────────────────────

function ColorPickerModal({
  visible, onClose, selected, onSelect, ev,
}: {
  visible: boolean; onClose: () => void; selected: string; onSelect: (hex: string) => void; ev: EVColors;
}) {
  const insets = useSafeAreaInsets();
  const isLightColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalOverlay, { justifyContent: "flex-end" }]}>
        <View style={[styles.colorModalSheet, { backgroundColor: ev.bgCard, paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Animated.Text style={{ color: ev.white, fontSize: 18, fontWeight: "700" }}>Vehicle Color</Animated.Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={24} color={ev.white} />
            </Pressable>
          </View>

          {selected ? (
            <View style={[styles.colorSelectedBanner, { backgroundColor: ev.bgCardLight }]}>
              <View style={[styles.colorBannerSwatch, { backgroundColor: selected, borderWidth: isLightColor(selected) ? 1 : 0, borderColor: "rgba(255,255,255,0.2)" }]} />
              <Animated.Text style={{ color: ev.white, fontWeight: "600", flex: 1 }}>
                {VEHICLE_COLORS.find((c) => c.hex === selected)?.label ?? "Custom"}
              </Animated.Text>
              <Pressable onPress={() => { onSelect(""); onClose(); }} hitSlop={8}>
                <Animated.Text style={{ color: ev.whiteDim, fontSize: 13 }}>Clear</Animated.Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
            {COLOR_GROUPS.map((group) => (
              <View key={group.label} style={{ marginBottom: Spacing.lg }}>
                <Animated.Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.2, color: ev.neonCyan, marginBottom: Spacing.md, textTransform: "uppercase" }}>
                  {group.label}
                </Animated.Text>
                <View style={styles.colorSwatchGrid}>
                  {group.colors.map((c) => {
                    const active = selected === c.hex;
                    const light = isLightColor(c.hex);
                    return (
                      <Pressable key={c.hex} onPress={() => { onSelect(c.hex); onClose(); }} style={styles.colorSwatchItem}>
                        <View style={[
                          styles.colorSwatchBox,
                          { backgroundColor: c.hex },
                          light ? { borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" } : null,
                          active ? { borderWidth: 3, borderColor: ev.neonCyan } : null,
                        ]}>
                          {active ? <Feather name="check" size={15} color={light ? "#000" : "#FFF"} /> : null}
                        </View>
                        <Animated.Text style={[styles.colorSwatchLabel, { color: active ? ev.neonCyan : ev.whiteDim, fontWeight: active ? "700" : "400" }]} numberOfLines={2}>
                          {c.label}
                        </Animated.Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Field sub-components ──────────────────────────────────────────────────────

function SectionLabel({ text, ev }: { text: string; ev: EVColors }) {
  return (
    <Animated.Text style={[styles.sectionLabel, { color: ev.neonCyan }]}>{text}</Animated.Text>
  );
}

function PickerButton({
  label, value, placeholder, onPress, disabled, ev,
}: {
  label: string; value: string; placeholder: string; onPress: () => void; disabled?: boolean; ev: EVColors;
}) {
  return (
    <>
      <SectionLabel text={label.toUpperCase()} ev={ev} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.pickerButton,
          {
            backgroundColor: ev.bgCardLight,
            borderColor: value ? ev.neonGreen + "80" : ev.border,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        <Animated.Text style={{ color: value ? ev.white : ev.whiteGhost, fontSize: 16, flex: 1 }}>
          {value || placeholder}
        </Animated.Text>
        <Feather name="chevron-down" size={18} color={ev.whiteDim} />
      </Pressable>
    </>
  );
}

function ColorButton({ selected, onPress, ev }: { selected: string; onPress: () => void; ev: EVColors }) {
  const colorEntry = selected ? VEHICLE_COLORS.find((c) => c.hex === selected) : null;
  const isLight = selected
    ? (parseInt(selected.slice(1, 3), 16) * 299 + parseInt(selected.slice(3, 5), 16) * 587 + parseInt(selected.slice(5, 7), 16) * 114) / 1000 > 180
    : false;
  return (
    <>
      <SectionLabel text="COLOR" ev={ev} />
      <Pressable
        onPress={onPress}
        style={[styles.pickerButton, { backgroundColor: ev.bgCardLight, borderColor: selected ? ev.neonGreen + "80" : ev.border }]}
      >
        {selected ? (
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: Spacing.sm }}>
            <View style={[styles.colorBtnSwatch, { backgroundColor: selected, borderWidth: isLight ? 1 : 0, borderColor: "rgba(0,0,0,0.1)" }]} />
            <Animated.Text style={{ color: ev.white, fontSize: 16, flex: 1 }}>{colorEntry?.label ?? "Custom"}</Animated.Text>
          </View>
        ) : (
          <Animated.Text style={{ color: ev.whiteGhost, fontSize: 16, flex: 1 }}>Select color...</Animated.Text>
        )}
        <Feather name="chevron-down" size={18} color={ev.whiteDim} />
      </Pressable>
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EVAddVehicleScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { vehicles, addVehicle } = useApp();
  const { isDark } = useTheme();
  const ev = getEVColors(isDark);

  const [showIntro, setShowIntro] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(currentYear);
  const [color, setColor] = useState("");
  const [tireType, setTireType] = useState<TireType>("run_flat");
  const [drivetrain, setDrivetrain] = useState<DrivetrainType>("awd");

  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const availableModels = useMemo(() => (!make ? [] : VEHICLE_MAKES_MODELS[make] || []), [make]);

  const handleAdd = () => {
    if (!make.trim() || !model.trim()) {
      Alert.alert("Missing Info", "Please select a make and model for your EV.");
      return;
    }
    addVehicle({
      make: make.trim(), model: model.trim(), year,
      color: color || undefined, tireType, fuelType: "electric", drivetrain,
      isDefault: vehicles.length === 0,
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: ev.bg }]}>
      <EVAnimatedBackground isDark={isDark} />
      <LinearGradient
        colors={[...ev.topGradient]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      {showIntro ? <IntroAnimation onComplete={() => { setShowIntro(false); setShowForm(true); }} ev={ev} isDark={isDark} /> : null}

      {showForm ? (
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"] }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Animated.View entering={FadeInUp.duration(400)}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
              <Feather name="arrow-left" size={22} color={ev.white} />
              <Animated.Text style={[styles.backText, { color: ev.white }]}>Back</Animated.Text>
            </Pressable>
          </Animated.View>

          {/* Header */}
          <Animated.View entering={FadeInUp.duration(500).delay(60)} style={styles.headerSection}>
            <LinearGradient
              colors={[ev.neonGreen + "30", ev.bgCard]}
              style={styles.headerIcon}
            >
              <Feather name="battery-charging" size={28} color={ev.neonGreen} />
            </LinearGradient>
            <Animated.Text style={[styles.formTitle, { color: ev.white }]}>Add Your EV</Animated.Text>
            <Animated.Text style={[styles.formSubtitle, { color: ev.whiteDim }]}>
              Set up your electric vehicle profile to unlock the full EV experience
            </Animated.Text>
          </Animated.View>

          {/* Vehicle Info card */}
          <Animated.View entering={FadeInUp.duration(500).delay(120)} style={[styles.formCard, { backgroundColor: ev.bgCard + "CC", borderColor: ev.border }]}>
            <View style={styles.cardSectionHeader}>
              <Feather name="truck" size={14} color={ev.neonCyan} />
              <Animated.Text style={[styles.cardSectionTitle, { color: ev.neonCyan }]}>VEHICLE INFO</Animated.Text>
            </View>

            <PickerButton label="Make" value={make} placeholder="Select make..." onPress={() => setShowMakePicker(true)} ev={ev} />
            <PickerButton
              label="Model"
              value={model}
              placeholder={make ? "Select model..." : "Select a make first"}
              onPress={() => setShowModelPicker(true)}
              disabled={!make}
              ev={ev}
            />
            <PickerButton
              label="Year"
              value={year ? String(year) : ""}
              placeholder="Select year..."
              onPress={() => setShowYearPicker(true)}
              ev={ev}
            />
            <ColorButton selected={color} onPress={() => setShowColorPicker(true)} ev={ev} />
          </Animated.View>

          {/* Tire Type card */}
          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={[styles.formCard, { backgroundColor: ev.bgCard + "CC", borderColor: ev.border }]}>
            <View style={styles.cardSectionHeader}>
              <Feather name="disc" size={14} color={ev.neonPurple} />
              <Animated.Text style={[styles.cardSectionTitle, { color: ev.neonPurple }]}>TIRE TYPE</Animated.Text>
            </View>
            <View style={styles.optionRow}>
              {TIRE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setTireType(t.value)}
                  style={[
                    styles.optionChip,
                    {
                      flex: 1,
                      backgroundColor: tireType === t.value ? ev.neonPurple + "22" : ev.bgCardLight,
                      borderColor: tireType === t.value ? ev.neonPurple : ev.border,
                    },
                  ]}
                >
                  <Animated.Text style={{ color: tireType === t.value ? ev.neonPurple : ev.whiteDim, fontWeight: tireType === t.value ? "700" : "400", fontSize: 13, textAlign: "center" }}>
                    {t.label}
                  </Animated.Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Drivetrain card */}
          <Animated.View entering={FadeInUp.duration(500).delay(280)} style={[styles.formCard, { backgroundColor: ev.bgCard + "CC", borderColor: ev.border }]}>
            <View style={styles.cardSectionHeader}>
              <Feather name="settings" size={14} color={ev.neonCyan} />
              <Animated.Text style={[styles.cardSectionTitle, { color: ev.neonCyan }]}>DRIVETRAIN</Animated.Text>
            </View>
            <View style={styles.optionRow}>
              {DRIVETRAIN_TYPES.map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => setDrivetrain(d.value)}
                  style={[
                    styles.optionChip,
                    {
                      flex: 1,
                      backgroundColor: drivetrain === d.value ? ev.neonCyan + "20" : ev.bgCardLight,
                      borderColor: drivetrain === d.value ? ev.neonCyan : ev.border,
                    },
                  ]}
                >
                  <Animated.Text style={{ color: drivetrain === d.value ? ev.neonCyan : ev.whiteDim, fontWeight: drivetrain === d.value ? "700" : "400", fontSize: 13, textAlign: "center" }}>
                    {d.label}
                  </Animated.Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* EV note */}
          <Animated.View entering={FadeInUp.duration(500).delay(340)} style={[styles.evNote, { backgroundColor: ev.neonGreen + "10", borderColor: ev.neonGreen + "22" }]}>
            <Feather name="zap" size={15} color={ev.neonGreen} />
            <Animated.Text style={{ color: ev.neonGreen, fontSize: 13, flex: 1, lineHeight: 18 }}>
              Fuel type is automatically set to Electric for EV Mode vehicles
            </Animated.Text>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.formActions}>
            <Pressable onPress={() => navigation.goBack()} style={[styles.cancelButton, { borderColor: ev.border }]}>
              <Animated.Text style={{ color: ev.whiteDim, fontSize: 16, fontWeight: "500" }}>Cancel</Animated.Text>
            </Pressable>
            <Pressable onPress={handleAdd} style={styles.saveButtonWrap}>
              <LinearGradient
                colors={[ev.neonGreen, ev.neonCyan]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.saveButton}
              >
                <Feather name="plus" size={20} color="#000" />
                <Animated.Text style={styles.saveButtonText}>Add EV</Animated.Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </KeyboardAwareScrollViewCompat>
      ) : null}

      <SearchablePicker
        visible={showMakePicker}
        onClose={() => setShowMakePicker(false)}
        onSelect={(m) => { setMake(m); setModel(""); setShowMakePicker(false); }}
        items={VEHICLE_MAKES}
        title="Select Make"
        searchPlaceholder="Search makes..."
        ev={ev}
      />
      <SearchablePicker
        visible={showModelPicker}
        onClose={() => setShowModelPicker(false)}
        onSelect={(m) => { setModel(m); setShowModelPicker(false); }}
        items={availableModels}
        title={`${make || "Vehicle"} Models`}
        searchPlaceholder="Search models..."
        ev={ev}
      />
      <SearchablePicker
        visible={showYearPicker}
        onClose={() => setShowYearPicker(false)}
        onSelect={(y) => { setYear(parseInt(y)); setShowYearPicker(false); }}
        items={YEARS}
        title="Select Year"
        searchPlaceholder="Search years..."
        ev={ev}
      />
      <ColorPickerModal
        visible={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        selected={color}
        onSelect={setColor}
        ev={ev}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.lg, alignSelf: "flex-start" },
  backText: { fontSize: 16, fontWeight: "500" },
  headerSection: { alignItems: "center", marginBottom: Spacing.xl },
  headerIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  formTitle: { fontSize: 28, fontWeight: "800" },
  formSubtitle: { fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 21, paddingHorizontal: Spacing.md },
  formCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md },
  cardSectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: Spacing.lg },
  cardSectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: Spacing.sm, marginTop: Spacing.md },
  pickerButton: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderRadius: BorderRadius.md, borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  colorBtnSwatch: { width: 24, height: 24, borderRadius: 6 },
  optionRow: { flexDirection: "row", gap: Spacing.sm },
  optionChip: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1,
  },
  evNote: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.xl },
  formActions: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xl },
  cancelButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  saveButtonWrap: { flex: 2, borderRadius: BorderRadius.md, overflow: "hidden" },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, gap: 8 },
  saveButtonText: { color: "#000", fontSize: 17, fontWeight: "700" },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { height: "82%", borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  colorModalSheet: { maxHeight: "82%", borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginTop: Spacing.sm, marginBottom: Spacing.md },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  emptySearch: { padding: Spacing.xl, alignItems: "center" },
  // Color picker
  colorSelectedBanner: { flexDirection: "row", alignItems: "center", borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm, marginHorizontal: Spacing.lg },
  colorBannerSwatch: { width: 28, height: 28, borderRadius: 6 },
  colorSwatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorSwatchItem: { alignItems: "center", width: 56 },
  colorSwatchBox: { width: 48, height: 48, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  colorSwatchLabel: { fontSize: 10, textAlign: "center", lineHeight: 13 },
});
