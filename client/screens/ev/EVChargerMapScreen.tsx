import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, Dimensions, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
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
import { GoogleMapView } from "@/components/GoogleMapView";

const { height: SH } = Dimensions.get("window");
const { width: SW } = Dimensions.get("window");
const MAP_HEIGHT = Math.min(SH * 0.35, 280);

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
  const displayTotal = Math.min(total, 8);
  const displayAvail = Math.min(available, displayTotal);
  const dots = [];
  for (let i = 0; i < displayTotal; i++) {
    dots.push(
      <View
        key={i}
        style={[
          styles.dot,
          { backgroundColor: i < displayAvail ? ev.neonGreen : ev.whiteGhost + "40" },
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
              <Animated.Text style={[styles.priceText, { color: ev.neonPurple }]}>{charger.pricePerKwh}</Animated.Text>
            </View>
            <View style={styles.networkBadge}>
              <Animated.Text style={[styles.networkText, { color: ev.whiteDim }]}>{charger.network}</Animated.Text>
            </View>
          </View>

          <View style={styles.availabilityRow}>
            <Animated.Text style={[styles.availabilityLabel, { color: isUnavailable ? ev.neonPink : ev.neonGreen }]}>
              {isUnavailable ? "Offline" : `${charger.available} of ${charger.chargerCount} available`}
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

function mapApiToCharger(item: Record<string, unknown>, userLat: number, userLon: number): ChargerStation | null {
  const addr = item.AddressInfo as Record<string, unknown> | undefined;
  if (!addr) return null;
  const lat = addr.Latitude as number;
  const lon = addr.Longitude as number;
  if (!lat || !lon) return null;

  const connections = (item.Connections as Record<string, unknown>[] | undefined) || [];
  const maxKw = connections.reduce((max: number, c: Record<string, unknown>) => {
    const kw = (c.PowerKW as number) || 0;
    return kw > max ? kw : max;
  }, 0);
  const speed = maxKw >= 50 ? "DC Fast" : "Level 2";

  const points = (item.NumberOfPoints as number) || 1;
  const isOp = (item.StatusType as Record<string, unknown> | undefined)?.IsOperationalBool;
  const available = isOp === false ? 0 : points;

  const dLat = (lat - userLat) * Math.PI / 180;
  const dLon = (lon - userLon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(userLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const distMi = 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const rawCost = item.UsageCost as string | undefined;
  const pricePerKwh = rawCost ? rawCost.slice(0, 20) : "Varies";

  return {
    id: String(item.ID),
    name: (addr.Title as string) || "Charging Station",
    address: (addr.AddressLine1 as string) || (addr.Town as string) || "",
    latitude: lat,
    longitude: lon,
    distance: distMi < 0.1 ? "< 0.1 mi" : `${distMi.toFixed(1)} mi`,
    chargerCount: points,
    available,
    speed,
    network: (item.OperatorInfo as Record<string, unknown> | undefined)?.Title as string || "Unknown",
    pricePerKwh,
  };
}

export default function EVChargerMapScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const ev = getEVColors(isDark);
  const navigation = useNavigation();
  const [selectedCharger, setSelectedCharger] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [chargers, setChargers] = useState<ChargerStation[]>([]);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [fetchError, setFetchError] = useState(false);
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

  const fetchChargers = useCallback(async (lat: number, lon: number) => {
    try {
      setFetchError(false);
      const url =
        `https://api.openchargemap.io/v3/poi/?output=json` +
        `&latitude=${lat}&longitude=${lon}` +
        `&distance=15&distanceunit=Miles` +
        `&maxresults=20&compact=true&verbose=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>[];
      const mapped = data
        .map((item) => mapApiToCharger(item, lat, lon))
        .filter((c): c is ChargerStation => c !== null);
      setChargers(mapped);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        setLoading(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserCoords(coords);
        await fetchChargers(coords.latitude, coords.longitude);
      } catch {
        setFetchError(true);
        setLoading(false);
      }
    })();
  }, [fetchChargers]);

  const filteredChargers = chargers
    .filter((c) => {
      if (filter === "available") return c.available > 0;
      if (filter === "fast") return c.speed === "DC Fast";
      return true;
    })
    .sort((a, b) => {
      if (filter === "nearest") return parseFloat(a.distance) - parseFloat(b.distance);
      return 0;
    });

  const totalAvailable = chargers.reduce((sum, c) => sum + (c.available > 0 ? 1 : 0), 0);

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

  const mapCenter = userCoords || { latitude: 37.7749, longitude: -122.4194 };

  return (
    <View style={[styles.container, { backgroundColor: ev.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: ev.bg + "F2" }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={ev.white} />
        </Pressable>
        <Animated.Text style={[styles.headerTitle, { color: ev.white }]}>Nearby Chargers</Animated.Text>
        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color={ev.neonGreen} />
          ) : (
            <View style={[styles.countBadge, { backgroundColor: ev.neonGreen + "20" }]}>
              <Animated.View style={pulseStyle}>
                <Feather name="zap" size={12} color={ev.neonGreen} />
              </Animated.View>
              <Animated.Text style={[styles.countText, { color: ev.neonGreen }]}>
                {totalAvailable}
              </Animated.Text>
            </View>
          )}
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
              <Animated.Text style={[styles.filterText, { color: filter === f.key ? ev.neonGreen : ev.whiteDim }]}>
                {f.label}
              </Animated.Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {Platform.OS !== "web" ? (
        <View style={{ height: MAP_HEIGHT }}>
          <GoogleMapView
            latitude={mapCenter.latitude}
            longitude={mapCenter.longitude}
            markers={filteredChargers.map((c) => ({
              id: c.id,
              latitude: c.latitude,
              longitude: c.longitude,
              title: c.name,
              description: `${c.available > 0 ? "Open" : "Offline"} • ${c.speed}`,
              color: c.available === 0 ? "#FF3D00" : c.id === selectedCharger ? "#00E676" : undefined,
            }))}
            onMarkerPress={(m) => setSelectedCharger(m.id === selectedCharger ? null : m.id)}
            mapStyle="dark"
          />
        </View>
      ) : null}

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={ev.neonGreen} />
            <Animated.Text style={[styles.stateText, { color: ev.whiteDim }]}>
              Finding chargers near you...
            </Animated.Text>
          </View>
        ) : locationDenied ? (
          <View style={[styles.emptyState, { backgroundColor: ev.bgCard, borderColor: ev.border }]}>
            <Feather name="map-pin" size={40} color={ev.whiteDim} />
            <Animated.Text style={[styles.emptyTitle, { color: ev.white }]}>Location Required</Animated.Text>
            <Animated.Text style={[styles.emptySubtext, { color: ev.whiteDim }]}>
              Enable location access to find nearby EV chargers
            </Animated.Text>
            {Platform.OS !== "web" ? (
              <Pressable
                onPress={() => import("expo-linking").then(({ openSettings }) => openSettings?.())}
                style={[styles.retryButton, { backgroundColor: ev.neonGreen + "20", borderColor: ev.neonGreen + "50" }]}
              >
                <Animated.Text style={[styles.retryText, { color: ev.neonGreen }]}>Open Settings</Animated.Text>
              </Pressable>
            ) : null}
          </View>
        ) : fetchError ? (
          <View style={[styles.emptyState, { backgroundColor: ev.bgCard, borderColor: ev.border }]}>
            <Feather name="wifi-off" size={40} color={ev.whiteDim} />
            <Animated.Text style={[styles.emptyTitle, { color: ev.white }]}>Couldn't Load Chargers</Animated.Text>
            <Animated.Text style={[styles.emptySubtext, { color: ev.whiteDim }]}>
              Check your connection and try again
            </Animated.Text>
            <Pressable
              onPress={() => {
                if (userCoords) {
                  setLoading(true);
                  fetchChargers(userCoords.latitude, userCoords.longitude);
                }
              }}
              style={[styles.retryButton, { backgroundColor: ev.neonCyan + "20", borderColor: ev.neonCyan + "50" }]}
            >
              <Animated.Text style={[styles.retryText, { color: ev.neonCyan }]}>Retry</Animated.Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Animated.Text style={[styles.resultCount, { color: ev.whiteDim }]}>
              {filteredChargers.length} {filteredChargers.length === 1 ? "station" : "stations"} found nearby
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: 0.3 },
  headerRight: { minWidth: 44, alignItems: "center" },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  countText: { fontSize: 13, fontWeight: "700" },
  filterRow: { paddingBottom: 8 },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  centeredState: { alignItems: "center", paddingTop: 60, gap: 16 },
  stateText: { fontSize: 15 },
  resultCount: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  chargerCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  networkIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardHeaderText: { flex: 1, gap: 3 },
  chargerName: { fontSize: 16, fontWeight: "700" },
  chargerAddress: { fontSize: 13 },
  distanceBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  distanceText: { fontSize: 13, fontWeight: "600" },
  cardBody: { gap: 10 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statItem: {},
  priceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priceText: { fontSize: 11, fontWeight: "600" },
  networkBadge: { marginLeft: "auto" },
  networkText: { fontSize: 12, fontWeight: "500" },
  availabilityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  availabilityLabel: { fontSize: 13, fontWeight: "600" },
  dotsRow: { flexDirection: "row", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cardActions: { paddingTop: 2 },
  navigateButton: { borderRadius: 12, overflow: "hidden" },
  navigateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  navigateText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  speedBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  speedText: { fontSize: 11, fontWeight: "600" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, borderRadius: 16, borderWidth: 1, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtext: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  retryText: { fontSize: 14, fontWeight: "600" },
});
