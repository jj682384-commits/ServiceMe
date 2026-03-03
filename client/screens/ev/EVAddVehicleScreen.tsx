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
import { useApp, TireType, FuelType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { VEHICLE_MAKES, VEHICLE_MAKES_MODELS } from "@/constants/vehicleData";
import EVAnimatedBackground from "@/components/EVAnimatedBackground";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const { width: SW } = Dimensions.get("window");

const EV = {
  bg: "#050510",
  bgCard: "#0C0C1E",
  bgCardLight: "#12122A",
  neonGreen: "#00FF88",
  neonCyan: "#00E5FF",
  neonBlue: "#4D7CFF",
  neonPurple: "#B44DFF",
  white: "#F0F4FF",
  whiteDim: "#8892A8",
  whiteGhost: "#4A5068",
  border: "#1A1A3A",
};

const TIRE_TYPES: { value: TireType; label: string }[] = [
  { value: "spare", label: "Full-Size Spare" },
  { value: "run_flat", label: "Run-Flat Tires" },
  { value: "none", label: "No Spare" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - i);

function ScanLine() {
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
        colors={["transparent", EV.neonCyan, EV.neonGreen, EV.neonCyan, "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

function HexGrid() {
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
          backgroundColor: EV.neonCyan,
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
          backgroundColor: EV.neonCyan,
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

function IntroAnimation({ onComplete }: { onComplete: () => void }) {
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
    <View style={[StyleSheet.absoluteFill, { backgroundColor: EV.bg, zIndex: 100 }]}>
      <EVAnimatedBackground />
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
                borderColor: EV.neonGreen,
              },
              ringStyle,
            ]}
          />
          <Animated.View style={iconStyle}>
            <LinearGradient
              colors={[EV.neonGreen + "25", EV.bgCard]}
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="battery-charging" size={44} color={EV.neonGreen} />
            </LinearGradient>
          </Animated.View>
        </View>
        <Animated.Text style={[styles.introTitle, textStyle]}>
          INITIALIZING
        </Animated.Text>
        <Animated.Text style={[styles.introSub, textStyle]}>
          EV Profile Setup
        </Animated.Text>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, wipeStyle]}>
        <HexGrid />
        <ScanLine />
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
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: string) => void;
  items: string[];
  title: string;
  searchPlaceholder: string;
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
              backgroundColor: EV.bgCard,
              paddingTop: insets.top + Spacing.md,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Animated.Text style={{ color: EV.white, fontSize: 20, fontWeight: "700" }}>
              {title}
            </Animated.Text>
            <Pressable onPress={() => { setSearch(""); onClose(); }} hitSlop={12}>
              <Feather name="x" size={24} color={EV.white} />
            </Pressable>
          </View>
          <View style={[styles.searchBar, { backgroundColor: EV.bg, borderColor: EV.border }]}>
            <Feather name="search" size={18} color={EV.whiteDim} />
            <TextInput
              style={[styles.searchInput, { color: EV.white }]}
              placeholder={searchPlaceholder}
              placeholderTextColor={EV.whiteGhost}
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCorrect={false}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x-circle" size={16} color={EV.whiteDim} />
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
                  { backgroundColor: pressed ? EV.bgCardLight : "transparent" },
                ]}
              >
                <Animated.Text style={{ color: EV.white, fontSize: 16 }}>{item}</Animated.Text>
                <Feather name="chevron-right" size={16} color={EV.whiteDim} />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Animated.Text style={{ color: EV.whiteDim, fontSize: 16 }}>
                  No results for "{search}"
                </Animated.Text>
              </View>
            }
            ItemSeparatorComponent={() => (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: EV.border, marginHorizontal: Spacing.md }} />
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
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <Animated.Text style={styles.fieldLabel}>{label}</Animated.Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.pickerButton,
          {
            borderColor: value ? EV.neonGreen + "60" : EV.border,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <Animated.Text
          style={{
            color: value ? EV.white : EV.whiteGhost,
            fontSize: 16,
            flex: 1,
          }}
        >
          {value || placeholder}
        </Animated.Text>
        <Feather name="chevron-down" size={18} color={EV.whiteDim} />
      </Pressable>
    </>
  );
}

export default function EVAddVehicleScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { vehicles, addVehicle } = useApp();

  const [showIntro, setShowIntro] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(currentYear);
  const [tireType, setTireType] = useState<TireType>("run_flat");

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
      isDefault: vehicles.length === 0,
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: EV.bg }]}>
      <EVAnimatedBackground />
      <LinearGradient
        colors={["#00FF8808", "#00E5FF05", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      {showIntro ? <IntroAnimation onComplete={handleIntroComplete} /> : null}

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
              <Feather name="arrow-left" size={22} color={EV.white} />
              <Animated.Text style={styles.backText}>Back</Animated.Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.headerSection}>
            <View style={styles.headerIconRow}>
              <LinearGradient
                colors={[EV.neonGreen + "25", EV.bgCard]}
                style={styles.headerIcon}
              >
                <Feather name="battery-charging" size={28} color={EV.neonGreen} />
              </LinearGradient>
            </View>
            <Animated.Text style={styles.formTitle}>Add Your EV</Animated.Text>
            <Animated.Text style={styles.formSubtitle}>
              Set up your electric vehicle profile to unlock the full EV experience
            </Animated.Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <Feather name="truck" size={16} color={EV.neonCyan} />
              <Animated.Text style={styles.sectionTitle}>VEHICLE INFO</Animated.Text>
            </View>

            <PickerButton
              label="Make"
              value={make}
              placeholder="Select make..."
              onPress={() => setShowMakePicker(true)}
            />

            <PickerButton
              label="Model"
              value={model}
              placeholder={make ? "Select model..." : "Select a make first"}
              onPress={() => setShowModelPicker(true)}
              disabled={!make}
            />

            <Animated.Text style={styles.fieldLabel}>Year</Animated.Text>
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
                      backgroundColor: year === y ? EV.neonGreen : EV.bgCardLight,
                      borderColor: year === y ? EV.neonGreen : EV.border,
                    },
                  ]}
                >
                  <Animated.Text
                    style={{
                      color: year === y ? "#000" : EV.white,
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

          <Animated.View entering={FadeInUp.duration(500).delay(350)} style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <Feather name="disc" size={16} color={EV.neonPurple} />
              <Animated.Text style={styles.sectionTitle}>TIRE TYPE</Animated.Text>
            </View>

            <View style={styles.optionRow}>
              {TIRE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setTireType(t.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: tireType === t.value ? EV.neonPurple + "20" : EV.bgCardLight,
                      borderColor: tireType === t.value ? EV.neonPurple : EV.border,
                      flex: 1,
                    },
                  ]}
                >
                  <Animated.Text
                    style={{
                      color: tireType === t.value ? EV.neonPurple : EV.whiteDim,
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

          <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.evNote}>
            <Feather name="zap" size={16} color={EV.neonGreen} />
            <Animated.Text style={styles.evNoteText}>
              Fuel type is automatically set to Electric for EV Mode vehicles
            </Animated.Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.formActions}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            >
              <Animated.Text style={{ color: EV.whiteDim, fontSize: 16, fontWeight: "500" }}>
                Cancel
              </Animated.Text>
            </Pressable>
            <Pressable onPress={handleAdd} style={styles.saveButtonWrap}>
              <LinearGradient
                colors={[EV.neonGreen, EV.neonCyan]}
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
    color: EV.neonGreen,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 6,
    marginTop: 24,
  },
  introSub: {
    color: EV.white,
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
    color: EV.white,
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
    color: EV.white,
    fontSize: 28,
    fontWeight: "800",
  },
  formSubtitle: {
    color: EV.whiteDim,
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  formCard: {
    backgroundColor: EV.bgCard + "CC",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: EV.border,
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
    color: EV.whiteDim,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  fieldLabel: {
    color: EV.whiteDim,
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
    backgroundColor: EV.bgCardLight,
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
    backgroundColor: EV.neonGreen + "10",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: EV.neonGreen + "20",
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  evNoteText: {
    color: EV.neonGreen,
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
    borderColor: EV.border,
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
