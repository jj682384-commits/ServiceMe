import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform, Dimensions, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/hooks/useTheme";
import { getEVColors } from "@/constants/evColors";

const { width: SW } = Dimensions.get("window");

interface ChargerStation {
  id: string;
  name: string;
  distance: string;
  chargerCount: number;
  speed: string;
  available: number;
  latitude: number;
  longitude: number;
  network: string;
  address: string;
  pricePerKwh: string;
}

const MOCK_CHARGERS: ChargerStation[] = [
  { id: "1", name: "Volta Station - Downtown", distance: "0.4 mi", chargerCount: 8, speed: "DC Fast", available: 3, latitude: 37.7849, longitude: -122.4094, network: "Volta", address: "123 Market St", pricePerKwh: "$0.32" },
  { id: "2", name: "ChargePoint - Oak Plaza", distance: "1.2 mi", chargerCount: 4, speed: "Level 2", available: 2, latitude: 37.7799, longitude: -122.4134, network: "ChargePoint", address: "456 Oak Ave", pricePerKwh: "$0.28" },
  { id: "3", name: "Tesla Supercharger - Mall", distance: "2.8 mi", chargerCount: 12, speed: "DC Fast", available: 7, latitude: 37.7749, longitude: -122.4194, network: "Tesla", address: "789 Mission Blvd", pricePerKwh: "$0.36" },
  { id: "4", name: "EVgo - Gas Station", distance: "3.1 mi", chargerCount: 2, speed: "DC Fast", available: 0, latitude: 37.7899, longitude: -122.4044, network: "EVgo", address: "321 Howard St", pricePerKwh: "$0.35" },
  { id: "5", name: "Electrify America - Center", distance: "4.2 mi", chargerCount: 6, speed: "DC Fast", available: 4, latitude: 37.7719, longitude: -122.4244, network: "EA", address: "654 Folsom St", pricePerKwh: "$0.31" },
  { id: "6", name: "Blink - Parking Garage", distance: "1.8 mi", chargerCount: 3, speed: "Level 2", available: 1, latitude: 37.7829, longitude: -122.3994, network: "Blink", address: "987 3rd St", pricePerKwh: "$0.25" },
];

type FilterType = "all" | "available" | "fast" | "nearest";

function SpeedBadge({ speed, ev }: { speed: string; ev: ReturnType<typeof getEVColors> }) {
  const isFast = speed === "DC Fast";
  return (
    <View style={[styles.speedBadge, { backgroundColor: isFast ? ev.neonGreen + "20" : ev.neonCyan + "20" }]}>
      <Feather name="zap" size={10} color={isFast ? ev.neonGreen : ev.neonCyan} />
      <Animated.Text style={[styles.speedText, { color: isFast ? ev.neonGreen : ev.neonCyan }]}>{speed}</Animated.Text>
    </View>
  );
}

function AvailabilityDots({ available, total, ev }: { available: number; total: number; ev: ReturnType<typeof getEVColors> }) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    dots.push(
      <View
        key={i}
        style={[
          styles.dot,
          {
            backgroundColor: i < available ? ev.neonGreen : ev.whiteGhost + "40",
          },
        ]}
      />
    );
  }
  return <View style={styles.dotsRow}>{dots}</View>;
}

function ChargerCard({
  charger,
  ev,
  isSelected,
  onPress,
  onNavigate,
  index,
}: {
  charger: ChargerStation;
  ev: ReturnType<typeof getEVColors>;
  isSelected: boolean;
  onPress: () => void;
  onNavigate: () => void;
  index: number;
}) {
  const isUnavailable = charger.available === 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400).springify()}>
      <Pressable
        onPress={onPress}
        style={[
          styles.chargerCard,
          {
            backgroundColor: isSelected ? ev.neonGreen + "08" : ev.bgCard,
            borderColor: isSelected ? ev.neonGreen + "40" : ev.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.networkIcon, { backgroundColor: isUnavailable ? ev.neonPink + "15" : ev.neonGreen + "15" }]}>
            <Feather name="zap" size={18} color={isUnavailable ? ev.neonPink : ev.neonGreen} />
          </View>
          <View style={styles.cardHeaderText}>
            <Animated.Text style={[styles.chargerName, { color: ev.white }]} numberOfLines={1}>
              {charger.name}
            </Animated.Text>
            <Animated.Text style={[styles.chargerAddress, { color: ev.whiteDim }]} numberOfLines={1}>
              {charger.address}
            </Animated.Text>
          </View>
          <View style={styles.distanceBadge}>
            <Feather name="map-pin" size={12} color={ev.neonCyan} />
            <Animated.Text style={[styles.distanceText, { color: ev.neonCyan }]}>{charger.distance}</Animated.Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <SpeedBadge speed={charger.speed} ev={ev} />
            </View>
            <View style={[styles.priceBadge, { backgroundColor: ev.neonPurple + "15" }]}>
              <Animated.Text style={[styles.priceText, { color: ev.neonPurple }]}>{charger.pricePerKwh}/kWh</Animated.Text>
            </View>
            <View style={styles.networkBadge}>
              <Animated.Text style={[styles.networkText, { color: ev.whiteDim }]}>{charger.network}</Animated.Text>
            </View>
          </View>

          <View style={styles.availabilityRow}>
            <Animated.Text style={[styles.availabilityLabel, { color: isUnavailable ? ev.neonPink : ev.neonGreen }]}>
              {isUnavailable ? "All in use" : `${charger.available} of ${charger.chargerCount} available`}
            </Animated.Text>
            <AvailabilityDots available={charger.available} total={charger.chargerCount} ev={ev} />
          </View>
        </View>

        {isSelected ? (
          <View style={styles.cardActions}>
            <Pressable onPress={onNavigate} style={styles.navigateButton}>
              <LinearGradient
                colors={[ev.neonGreen, ev.neonCyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.navigateGradient}
              >
                <Feather name="navigation" size={16} color="#FFFFFF" />
                <Animated.Text style={styles.navigateText}>Navigate</Animated.Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function EVChargerMapScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const ev = getEVColors(isDark);
  const navigation = useNavigation();
  const [selectedCharger, setSelectedCharger] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const pulseAnim = useSharedValue(0.8);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulseAnim);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const filteredChargers = MOCK_CHARGERS.filter((c) => {
    if (filter === "available") return c.available > 0;
    if (filter === "fast") return c.speed === "DC Fast";
    return true;
  }).sort((a, b) => {
    if (filter === "nearest") return parseFloat(a.distance) - parseFloat(b.distance);
    return 0;
  });

  const totalAvailable = MOCK_CHARGERS.reduce((sum, c) => sum + c.available, 0);

  const handleNavigate = (charger: ChargerStation) => {
    const scheme = Platform.select({
      ios: `maps:0,0?q=${charger.latitude},${charger.longitude}`,
      android: `geo:0,0?q=${charger.latitude},${charger.longitude}(${charger.name})`,
      default: `https://maps.google.com/?q=${charger.latitude},${charger.longitude}`,
    });
    import("expo-linking").then(({ openURL }) => openURL(scheme));
  };

  const filters: { key: FilterType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "all", label: "All", icon: "grid" },
    { key: "available", label: "Open", icon: "check-circle" },
    { key: "fast", label: "Fast", icon: "zap" },
    { key: "nearest", label: "Nearest", icon: "map-pin" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: ev.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: ev.bg + "F2" }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={ev.white} />
        </Pressable>
        <Animated.Text style={[styles.headerTitle, { color: ev.white }]}>Nearby Chargers</Animated.Text>
        <View style={styles.headerRight}>
          <View style={[styles.countBadge, { backgroundColor: ev.neonGreen + "20" }]}>
            <Animated.View style={pulseStyle}>
              <Feather name="zap" size={12} color={ev.neonGreen} />
            </Animated.View>
            <Animated.Text style={[styles.countText, { color: ev.neonGreen }]}>
              {totalAvailable}
            </Animated.Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f.key ? ev.neonGreen + "20" : ev.bgCard,
                  borderColor: filter === f.key ? ev.neonGreen + "50" : ev.border,
                },
              ]}
            >
              <Feather name={f.icon} size={14} color={filter === f.key ? ev.neonGreen : ev.whiteDim} />
              <Animated.Text
                style={[styles.filterText, { color: filter === f.key ? ev.neonGreen : ev.whiteDim }]}
              >
                {f.label}
              </Animated.Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text style={[styles.resultCount, { color: ev.whiteDim }]}>
          {filteredChargers.length} {filteredChargers.length === 1 ? "station" : "stations"} found
        </Animated.Text>

        {filteredChargers.map((charger, index) => (
          <ChargerCard
            key={charger.id}
            charger={charger}
            ev={ev}
            isSelected={selectedCharger === charger.id}
            onPress={() => setSelectedCharger(selectedCharger === charger.id ? null : charger.id)}
            onNavigate={() => handleNavigate(charger)}
            index={index}
          />
        ))}

        {filteredChargers.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: ev.bgCard, borderColor: ev.border }]}>
            <Feather name="battery" size={40} color={ev.whiteDim} />
            <Animated.Text style={[styles.emptyTitle, { color: ev.white }]}>No Chargers Found</Animated.Text>
            <Animated.Text style={[styles.emptySubtext, { color: ev.whiteDim }]}>
              Try adjusting your filters to see more results
            </Animated.Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  countText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterRow: {
    paddingBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  chargerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  networkIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
    gap: 3,
  },
  chargerName: {
    fontSize: 16,
    fontWeight: "700",
  },
  chargerAddress: {
    fontSize: 13,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardBody: {
    gap: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statItem: {},
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 11,
    fontWeight: "600",
  },
  networkBadge: {
    marginLeft: "auto",
  },
  networkText: {
    fontSize: 12,
    fontWeight: "500",
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availabilityLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardActions: {
    paddingTop: 2,
  },
  navigateButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  navigateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  navigateText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  speedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  speedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
