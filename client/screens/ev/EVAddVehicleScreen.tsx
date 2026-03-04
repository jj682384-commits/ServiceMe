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
  Platform,
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
  FadeIn,
  SlideInDown,
  FadeInUp,
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";
import { useApp, TireType, FuelType, DrivetrainType } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { VEHICLE_MAKES, VEHICLE_MAKES_MODELS } from "@/constants/vehicleData";
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
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - i);

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
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          height: 2,
          top: "50%",
        },
        style,
      ]}
    >
      <LinearGradient
        colors={["transparent", ev.neonCyan, ev.neonGreen, ev.neonCyan, "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

function HexGrid({ ev }: { ev: EVColors }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(300, withTiming(1, { duration: 800 }));
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value * 0.15 }));

  const lines = [];
  for (let i = 0; i < 8; i++) {
    lines.push(
      <View
        key={`h-${i}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: i * 80,
          height: StyleSheet.hairlineWidth,
          backgroundColor: ev.neonCyan,
        }}
      />
    );
  }
  for (let i = 0; i < 6; i++) {
    lines.push(
      <View
        key={`v-${i}`}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: i * (SW / 5),
          width: StyleSheet.hairlineWidth,
          backgroundColor: ev.neonCyan,
        }}
      />
    );
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {lines}
    </Animated.View>
  );
}

function IntroAnimation({ onComplete, ev, isDark }: { onComplete: () => void; ev: EVColors; isDark: boolean }) {
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(1);
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const wipeProgress = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withTiming(3, { duration: 600, easing: Easing.out(Easing.cubic) });
    ringOpacity.value = withDelay(400, withTiming(0, { duration: 200 }));
    iconScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 120 }));
    iconOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    textOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    wipeProgress.value = withDelay(900, withTiming(1, {
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
    }));

    const timeout = setTimeout(() => onComplete(), 1500);
    return () => clearTimeout(timeout);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [20, 0]) }],
  }));

  const wipeStyle = useAnimatedStyle(() => ({
    opacity: wipeProgress.value,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: ev.bg, zIndex: 100 }]}>
      <EVAnimatedBackground isDark={isDark} />
      <View style={styles.introCenter}>
        <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 2,
                borderColor: ev.neonGreen,
              },
              ringStyle,
            ]}
          />
          <Animated.View style={iconStyle}>
            <LinearGradient
              colors={[ev.neonGreen + "25", ev.bgCard]}
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="battery-charging" size={44} color={ev.neonGreen} />
            </LinearGradient>
          </Animated.View>
        </View>
        <Animated.Text style={[styles.introTitle, { color: ev.neonGreen }, textStyle]}>
          INITIALIZING
        </Animated.Text>
        <Animated.Text style={[styles.introSub, { color: ev.white }, textStyle]}>
          EV Profile Setup
        </Animated.Text>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, wipeStyle]}>
        <HexGrid ev={ev} />
        <ScanLine ev={ev} />
      </Animated.View>
    </View>
  );
}

function SearchablePicker({
  visible,
  onClose,
  onSelect,
  items,
  title,
  searchPlaceholder,
  ev,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: string) => void;
  items: string[];
  title: string;
  searchPlaceholder: string;
  ev: EVColors;
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
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: ev.bgCard,
              paddingTop: insets.top + Spacing.md,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Animated.Text style={{ color: ev.white, fontSize: 20, fontWeight: "700" }}>
              {title}
            </Animated.Text>
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
                style={({ pressed }) => [
                  styles.pickerItem,
                  { backgroundColor: pressed ? ev.bgCardLight : "transparent" },
                ]}
              >
                <Animated.Text style={{ color: ev.white, fontSize: 16 }}>{item}</Animated.Text>
                <Feather name="chevron-right" size={16} color={ev.whiteDim} />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Animated.Text style={{ color: ev.whiteDim, fontSize: 16 }}>
                  No results for "{search}"
                </Animated.Text>
              </View>
            }
            ItemSeparatorComponent={() => (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: ev.border, marginHorizontal: Spacing.md }} />
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
  ev,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  ev: EVColors;
}) {
  return (
    <>
      <Animated.Text style={[styles.fieldLabel, { color: ev.whiteDim }]}>{label}</Animated.Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.pickerButton,
          {
            borderColor: value ? ev.neonGreen + "60" : ev.border,
            backgroundColor: ev.bgCardLight,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <Animated.Text
          style={{
            color: value ? ev.white : ev.whiteGhost,
            fontSize: 16,
            flex: 1,
          }}
        >
          {value || placeholder}
        </Animated.Text>
        <Feather name="chevron-down" size={18} color={ev.whiteDim} />
      </Pressable>
    </>
  );
}

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
  const [tireType, setTireType] = useState<TireType>("run_flat");
  const [drivetrain, setDrivetrain] = useState<DrivetrainType>("awd");

  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const availableModels = useMemo(() => {
    if (!make) return [];
    return VEHICLE_MAKES_MODELS[make] || [];
  }, [make]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    setShowForm(true);
  };

  const handleAdd = () => {
    if (!make.trim() || !model.trim()) {
      Alert.alert("Missing Info", "Please select a make and model for your EV.");
      return;
    }
    addVehicle({
      make: make.trim(),
      model: model.trim(),
      year,
      tireType,
      fuelType: "electric",
      drivetrain,
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

      {showIntro ? <IntroAnimation onComplete={handleIntroComplete} ev={ev} isDark={isDark} /> : null}

      {showForm ? (
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.lg,
              paddingBottom: insets.bottom + Spacing["2xl"],
            },
          ]}
        >
          <Animated.View entering={FadeInUp.duration(400).delay(0)}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={22} color={ev.white} />
              <Animated.Text style={[styles.backText, { color: ev.white }]}>Back</Animated.Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.headerSection}>
            <View style={styles.headerIconRow}>
              <LinearGradient
                colors={[ev.neonGreen + "25", ev.bgCard]}
                style={styles.headerIcon}
              >
                <Feather name="battery-charging" size={28} color={ev.neonGreen} />
              </LinearGradient>
            </View>
            <Animated.Text style={[styles.formTitle, { color: ev.white }]}>Add Your EV</Animated.Text>
            <Animated.Text style={[styles.formSubtitle, { color: ev.whiteDim }]}>
              Set up your electric vehicle profile to unlock the full EV experience
            </Animated.Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={[styles.formCard, { backgroundColor: ev.bgCard + "CC", borderColor: ev.border }]}>
            <View style={styles.sectionHeader}>
              <Feather name="truck" size={16} color={ev.neonCyan} />
              <Animated.Text style={[styles.sectionTitle, { color: ev.whiteDim }]}>VEHICLE INFO</Animated.Text>
            </View>

            <PickerButton
              label="Make"
              value={make}
              placeholder="Select make..."
              onPress={() => setShowMakePicker(true)}
              ev={ev}
            />

            <PickerButton
              label="Model"
              value={model}
              placeholder={make ? "Select model..." : "Select a make first"}
              onPress={() => setShowModelPicker(true)}
              disabled={!make}
              ev={ev}
            />

            <Animated.Text style={[styles.fieldLabel, { color: ev.whiteDim }]}>Year</Animated.Text>
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
                      backgroundColor: year === y ? ev.neonGreen : ev.bgCardLight,
                      borderColor: year === y ? ev.neonGreen : ev.border,
                    },
                  ]}
                >
                  <Animated.Text
                    style={{
                      color: year === y ? "#000" : ev.white,
                      fontWeight: year === y ? "700" : "400",
                      fontSize: 14,
                    }}
                  >
                    {y}
                  </Animated.Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(350)} style={[styles.formCard, { backgroundColor: ev.bgCard + "CC", borderColor: ev.border }]}>
            <View style={styles.sectionHeader}>
              <Feather name="disc" size={16} color={ev.neonPurple} />
              <Animated.Text style={[styles.sectionTitle, { color: ev.whiteDim }]}>TIRE TYPE</Animated.Text>
            </View>

            <View style={styles.optionRow}>
              {TIRE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setTireType(t.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: tireType === t.value ? ev.neonPurple + "20" : ev.bgCardLight,
                      borderColor: tireType === t.value ? ev.neonPurple : ev.border,
                      flex: 1,
                    },
                  ]}
                >
                  <Animated.Text
                    style={{
                      color: tireType === t.value ? ev.neonPurple : ev.whiteDim,
                      fontWeight: tireType === t.value ? "600" : "400",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {t.label}
                  </Animated.Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(450)} style={[styles.formCard, { backgroundColor: ev.bgCard + "CC", borderColor: ev.border }]}>
            <View style={styles.sectionHeader}>
              <Feather name="settings" size={16} color={ev.neonCyan} />
              <Animated.Text style={[styles.sectionTitle, { color: ev.whiteDim }]}>DRIVETRAIN</Animated.Text>
            </View>

            <View style={styles.optionRow}>
              {DRIVETRAIN_TYPES.map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => setDrivetrain(d.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: drivetrain === d.value ? ev.neonCyan + "20" : ev.bgCardLight,
                      borderColor: drivetrain === d.value ? ev.neonCyan : ev.border,
                      flex: 1,
                    },
                  ]}
                >
                  <Animated.Text
                    style={{
                      color: drivetrain === d.value ? ev.neonCyan : ev.whiteDim,
                      fontWeight: drivetrain === d.value ? "600" : "400",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {d.label}
                  </Animated.Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(550)} style={[styles.evNote, { backgroundColor: ev.neonGreen + "10", borderColor: ev.neonGreen + "20" }]}>
            <Feather name="zap" size={16} color={ev.neonGreen} />
            <Animated.Text style={[styles.evNoteText, { color: ev.neonGreen }]}>
              Fuel type is automatically set to Electric for EV Mode vehicles
            </Animated.Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(650)} style={styles.formActions}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.cancelButton, { borderColor: ev.border }]}
            >
              <Animated.Text style={{ color: ev.whiteDim, fontSize: 16, fontWeight: "500" }}>
                Cancel
              </Animated.Text>
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
        onSelect={(selectedMake) => {
          setMake(selectedMake);
          setModel("");
          setShowMakePicker(false);
        }}
        items={VEHICLE_MAKES}
        title="Select Make"
        searchPlaceholder="Search makes..."
        ev={ev}
      />

      <SearchablePicker
        visible={showModelPicker}
        onClose={() => setShowModelPicker(false)}
        onSelect={(selectedModel) => {
          setModel(selectedModel);
          setShowModelPicker(false);
        }}
        items={availableModels}
        title={`${make} Models`}
        searchPlaceholder="Search models..."
        ev={ev}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  introCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 6,
    marginTop: 24,
  },
  introSub: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.lg,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  headerIconRow: {
    marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  formSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  formCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  fieldLabel: {
    fontSize: 13,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  evNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  evNoteText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  saveButtonWrap: {
    flex: 2,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: 8,
  },
  saveButtonText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    marginTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? Spacing.md : Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  emptySearch: {
    alignItems: "center",
    padding: Spacing["2xl"],
  },
});
