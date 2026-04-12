import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated as RNAnimated,
  Dimensions,
  FlatList,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/hooks/useTheme";
import { getEVColors } from "@/constants/evColors";
import { GoogleMapView } from "@/components/GoogleMapView";
import { getApiUrl } from "@/lib/query-client";

const { height: SH, width: SW } = Dimensions.get("window");

interface ChargerStation {
  id: string;
  name: string;
  distanceMi: number;
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

type FilterType = "nearest" | "available" | "fast" | "all";
type ViewMode = "map" | "list";

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
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: displayTotal }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i < displayAvail ? ev.neonGreen : ev.whiteGhost + "40" }]}
        />
      ))}
    </View>
  );
}

function ChargerCard({
  charger,
  ev,
  isSelected,
  onPress,
  onNavigate,
  index,
  compact,
}: {
  charger: ChargerStation;
  ev: ReturnType<typeof getEVColors>;
  isSelected: boolean;
  onPress: () => void;
  onNavigate: () => void;
  index: number;
  compact?: boolean;
}) {
  const isUnavailable = charger.available === 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350).springify()}>
      <Pressable
        onPress={onPress}
        style={[
          styles.chargerCard,
          compact && styles.chargerCardCompact,
          {
            backgroundColor: isSelected ? ev.neonGreen + "08" : ev.bgCard,
            borderColor: isSelected ? ev.neonGreen + "50" : ev.border,
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
            <SpeedBadge speed={charger.speed} ev={ev} />
            <View style={[styles.priceBadge, { backgroundColor: ev.neonPurple + "15" }]}>
              <Animated.Text style={[styles.priceText, { color: ev.neonPurple }]}>{charger.pricePerKwh}</Animated.Text>
            </View>
            <View style={styles.networkBadge}>
              <Animated.Text style={[styles.networkText, { color: ev.whiteDim }]} numberOfLines={1}>
                {charger.network}
              </Animated.Text>
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
    distanceMi: distMi,
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

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [selectedCharger, setSelectedCharger] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("nearest");
  const [chargers, setChargers] = useState<ChargerStation[]>([]);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const bottomSheetAnim = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim = useSharedValue(0.8);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.8, { duration: 1100, easing: Easing.inOut(Easing.ease) })
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
      const base = getApiUrl();
      const url = new URL("/api/ev/chargers", base);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>[];
      const mapped = data
        .map((item) => mapApiToCharger(item, lat, lon))
        .filter((c): c is ChargerStation => c !== null)
        .sort((a, b) => a.distanceMi - b.distanceMi);
      setChargers(mapped);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const onRefresh = useCallback(async () => {
    if (!userCoords) return;
    setRefreshing(true);
    await fetchChargers(userCoords.latitude, userCoords.longitude);
  }, [userCoords, fetchChargers]);

  const filteredChargers = chargers
    .filter((c) => {
      if (filter === "available") return c.available > 0;
      if (filter === "fast") return c.speed === "DC Fast";
      return true;
    })
    .sort((a, b) => {
      if (filter === "nearest") return a.distanceMi - b.distanceMi;
      return 0;
    });

  const totalAvailable = chargers.filter((c) => c.available > 0).length;
  const totalFast = chargers.filter((c) => c.speed === "DC Fast").length;

  const selectedChargerData = chargers.find((c) => c.id === selectedCharger) ?? null;

  const handleNavigate = (charger: ChargerStation) => {
    const scheme = Platform.select({
      ios: `maps:0,0?q=${charger.latitude},${charger.longitude}`,
      android: `geo:0,0?q=${charger.latitude},${charger.longitude}(${charger.name})`,
      default: `https://maps.google.com/?q=${charger.latitude},${charger.longitude}`,
    });
    Linking.openURL(scheme!);
  };

  const handleMarkerPress = (markerId: string) => {
    setSelectedCharger(prev => prev === markerId ? null : markerId);
    RNAnimated.spring(bottomSheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const handleDismissSheet = () => {
    setSelectedCharger(null);
    RNAnimated.timing(bottomSheetAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const mapCenter = userCoords || { latitude: 37.7749, longitude: -122.4194 };

  const filters: { key: FilterType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "nearest", label: "Nearest", icon: "map-pin" },
    { key: "available", label: "Open", icon: "check-circle" },
    { key: "fast", label: "DC Fast", icon: "zap" },
    { key: "all", label: "All", icon: "grid" },
  ];

  const sheetTranslateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: ev.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: ev.bg + "F5" }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={ev.white} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Animated.Text style={[styles.headerTitle, { color: ev.white }]}>Nearby Chargers</Animated.Text>
          {!loading ? (
            <Animated.Text style={[styles.headerSubtitle, { color: ev.whiteDim }]}>
              {filteredChargers.length} stations found
            </Animated.Text>
          ) : null}
        </View>

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

      <View style={[styles.toggleRow, { borderBottomColor: ev.border + "60" }]}>
        <Pressable
          onPress={() => setViewMode("map")}
          style={[
            styles.toggleTab,
            viewMode === "map" && { borderBottomColor: ev.neonGreen, borderBottomWidth: 2 },
          ]}
        >
          <Feather name="map" size={16} color={viewMode === "map" ? ev.neonGreen : ev.whiteDim} />
          <Animated.Text style={[styles.toggleLabel, { color: viewMode === "map" ? ev.neonGreen : ev.whiteDim }]}>
            Map
          </Animated.Text>
        </Pressable>
        <Pressable
          onPress={() => { setViewMode("list"); handleDismissSheet(); }}
          style={[
            styles.toggleTab,
            viewMode === "list" && { borderBottomColor: ev.neonGreen, borderBottomWidth: 2 },
          ]}
        >
          <Feather name="list" size={16} color={viewMode === "list" ? ev.neonGreen : ev.whiteDim} />
          <Animated.Text style={[styles.toggleLabel, { color: viewMode === "list" ? ev.neonGreen : ev.whiteDim }]}>
            List
          </Animated.Text>
        </Pressable>
      </View>

      {viewMode === "map" ? (
        <View style={styles.mapContainer}>
          {Platform.OS !== "web" ? (
            locationDenied ? (
              <View style={[styles.fullStateBox, { backgroundColor: ev.bg }]}>
                <Feather name="map-pin" size={48} color={ev.whiteDim} />
                <Animated.Text style={[styles.emptyTitle, { color: ev.white }]}>Location Required</Animated.Text>
                <Animated.Text style={[styles.emptySubtext, { color: ev.whiteDim }]}>
                  Enable location access to see the map and find nearby EV chargers
                </Animated.Text>
                <Pressable
                  onPress={() => { try { Linking.openSettings(); } catch {} }}
                  style={[styles.retryButton, { backgroundColor: ev.neonGreen + "20", borderColor: ev.neonGreen + "50" }]}
                >
                  <Animated.Text style={[styles.retryText, { color: ev.neonGreen }]}>Open Settings</Animated.Text>
                </Pressable>
              </View>
            ) : (
              <>
                <GoogleMapView
                  latitude={mapCenter.latitude}
                  longitude={mapCenter.longitude}
                  showsUserLocation
                  markers={filteredChargers.map((c) => ({
                    id: c.id,
                    latitude: c.latitude,
                    longitude: c.longitude,
                    title: c.name,
                    description: `${c.available > 0 ? "Open" : "Offline"} · ${c.speed} · ${c.distance}`,
                    color: c.available === 0 ? "#FF3D00" : c.id === selectedCharger ? "#00FF88" : "#00D4FF",
                  }))}
                  onMarkerPress={(m) => handleMarkerPress(m.id)}
                  mapStyle="dark"
                  style={StyleSheet.absoluteFill}
                />

                {loading ? (
                  <View style={styles.mapLoadingBanner} pointerEvents="none">
                    <View style={[styles.mapBannerInner, { backgroundColor: ev.bg + "E8" }]}>
                      <ActivityIndicator size="small" color={ev.neonGreen} />
                      <Animated.Text style={[styles.mapBannerText, { color: ev.whiteDim }]}>
                        Finding chargers near you...
                      </Animated.Text>
                    </View>
                  </View>
                ) : fetchError ? (
                  <View style={styles.mapLoadingBanner} pointerEvents="box-none">
                    <View style={[styles.mapBannerInner, { backgroundColor: ev.bg + "EE" }]}>
                      <Feather name="wifi-off" size={14} color={ev.neonPink} />
                      <Animated.Text style={[styles.mapBannerText, { color: ev.whiteDim }]}>
                        Couldn't load chargers
                      </Animated.Text>
                      <Pressable
                        onPress={() => {
                          if (userCoords) { setLoading(true); fetchChargers(userCoords.latitude, userCoords.longitude); }
                        }}
                        style={[styles.bannerRetry, { backgroundColor: ev.neonCyan + "25" }]}
                      >
                        <Animated.Text style={[styles.bannerRetryText, { color: ev.neonCyan }]}>Retry</Animated.Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </>
            )
          ) : (
            <View style={[styles.fullStateBox, { backgroundColor: ev.bg }]}>
              <Feather name="smartphone" size={48} color={ev.whiteDim} />
              <Animated.Text style={[styles.emptyTitle, { color: ev.white }]}>Open in Expo Go</Animated.Text>
              <Animated.Text style={[styles.emptySubtext, { color: ev.whiteDim }]}>
                Run the app in Expo Go on your device to see the live map
              </Animated.Text>
            </View>
          )}

          {selectedChargerData ? (
            <RNAnimated.View
              style={[
                styles.bottomSheet,
                { backgroundColor: ev.bgCard, borderColor: ev.neonGreen + "40" },
                { transform: [{ translateY: sheetTranslateY }] },
                { paddingBottom: insets.bottom + 8 },
              ]}
            >
              <View style={styles.sheetHandle}>
                <View style={[styles.handleBar, { backgroundColor: ev.whiteDim + "60" }]} />
              </View>

              <View style={styles.sheetHeader}>
                <View style={[styles.sheetIcon, { backgroundColor: selectedChargerData.available === 0 ? ev.neonPink + "15" : ev.neonGreen + "15" }]}>
                  <Feather name="zap" size={20} color={selectedChargerData.available === 0 ? ev.neonPink : ev.neonGreen} />
                </View>
                <View style={styles.sheetTitleBlock}>
                  <Animated.Text style={[styles.sheetTitle, { color: ev.white }]} numberOfLines={1}>
                    {selectedChargerData.name}
                  </Animated.Text>
                  <Animated.Text style={[styles.sheetAddress, { color: ev.whiteDim }]} numberOfLines={1}>
                    {selectedChargerData.address}
                  </Animated.Text>
                </View>
                <Pressable onPress={handleDismissSheet} hitSlop={12}>
                  <Feather name="x" size={20} color={ev.whiteDim} />
                </Pressable>
              </View>

              <View style={styles.sheetStats}>
                <View style={[styles.statPill, { backgroundColor: ev.neonCyan + "15" }]}>
                  <Feather name="map-pin" size={13} color={ev.neonCyan} />
                  <Animated.Text style={[styles.statPillText, { color: ev.neonCyan }]}>{selectedChargerData.distance}</Animated.Text>
                </View>
                <SpeedBadge speed={selectedChargerData.speed} ev={ev} />
                <View style={[styles.statPill, { backgroundColor: ev.neonPurple + "15" }]}>
                  <Animated.Text style={[styles.statPillText, { color: ev.neonPurple }]}>{selectedChargerData.pricePerKwh}</Animated.Text>
                </View>
              </View>

              <View style={styles.sheetAvail}>
                <Animated.Text style={[styles.availabilityLabel, {
                  color: selectedChargerData.available === 0 ? ev.neonPink : ev.neonGreen,
                }]}>
                  {selectedChargerData.available === 0
                    ? "Offline"
                    : `${selectedChargerData.available} of ${selectedChargerData.chargerCount} ports available`}
                </Animated.Text>
                <AvailabilityDots available={selectedChargerData.available} total={selectedChargerData.chargerCount} ev={ev} />
              </View>

              <Pressable onPress={() => handleNavigate(selectedChargerData)} style={styles.navigateButton}>
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
            </RNAnimated.View>
          ) : null}
        </View>
      ) : (
        <View style={styles.listContainer}>
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
                  <Feather name={f.icon} size={13} color={filter === f.key ? ev.neonGreen : ev.whiteDim} />
                  <Animated.Text style={[styles.filterText, { color: filter === f.key ? ev.neonGreen : ev.whiteDim }]}>
                    {f.label}
                  </Animated.Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {loading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color={ev.neonGreen} />
              <Animated.Text style={[styles.stateText, { color: ev.whiteDim }]}>
                Finding chargers near you...
              </Animated.Text>
            </View>
          ) : locationDenied ? (
            <View style={styles.centeredState}>
              <Feather name="map-pin" size={40} color={ev.whiteDim} />
              <Animated.Text style={[styles.emptyTitle, { color: ev.white }]}>Location Required</Animated.Text>
              <Animated.Text style={[styles.emptySubtext, { color: ev.whiteDim }]}>
                Enable location access to find nearby EV chargers
              </Animated.Text>
              {Platform.OS !== "web" ? (
                <Pressable
                  onPress={() => { try { Linking.openSettings(); } catch {} }}
                  style={[styles.retryButton, { backgroundColor: ev.neonGreen + "20", borderColor: ev.neonGreen + "50" }]}
                >
                  <Animated.Text style={[styles.retryText, { color: ev.neonGreen }]}>Open Settings</Animated.Text>
                </Pressable>
              ) : null}
            </View>
          ) : fetchError ? (
            <View style={styles.centeredState}>
              <Feather name="wifi-off" size={40} color={ev.whiteDim} />
              <Animated.Text style={[styles.emptyTitle, { color: ev.white }]}>Couldn't Load Chargers</Animated.Text>
              <Pressable
                onPress={() => {
                  if (userCoords) { setLoading(true); fetchChargers(userCoords.latitude, userCoords.longitude); }
                }}
                style={[styles.retryButton, { backgroundColor: ev.neonCyan + "20", borderColor: ev.neonCyan + "50" }]}
              >
                <Animated.Text style={[styles.retryText, { color: ev.neonCyan }]}>Retry</Animated.Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={filteredChargers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={ev.neonGreen}
                  colors={[ev.neonGreen]}
                  title="Refreshing chargers..."
                  titleColor={ev.whiteDim}
                />
              }
              ListHeaderComponent={
                <View style={styles.listHeaderRow}>
                  <Animated.Text style={[styles.resultCount, { color: ev.whiteDim }]}>
                    {filteredChargers.length} {filteredChargers.length === 1 ? "station" : "stations"} nearby
                  </Animated.Text>
                  <View style={styles.summaryPills}>
                    <View style={[styles.summaryPill, { backgroundColor: ev.neonGreen + "15" }]}>
                      <Feather name="check-circle" size={11} color={ev.neonGreen} />
                      <Animated.Text style={[styles.summaryPillText, { color: ev.neonGreen }]}>{totalAvailable} open</Animated.Text>
                    </View>
                    <View style={[styles.summaryPill, { backgroundColor: ev.neonCyan + "15" }]}>
                      <Feather name="zap" size={11} color={ev.neonCyan} />
                      <Animated.Text style={[styles.summaryPillText, { color: ev.neonCyan }]}>{totalFast} fast</Animated.Text>
                    </View>
                  </View>
                </View>
              }
              renderItem={({ item, index }) => (
                <ChargerCard
                  charger={item}
                  ev={ev}
                  isSelected={selectedCharger === item.id}
                  onPress={() => setSelectedCharger(selectedCharger === item.id ? null : item.id)}
                  onNavigate={() => handleNavigate(item)}
                  index={index}
                />
              )}
              ListEmptyComponent={
                <View style={styles.centeredState}>
                  <Feather name="battery" size={40} color={ev.whiteDim} />
                  <Animated.Text style={[styles.emptyTitle, { color: ev.white }]}>No Chargers Found</Animated.Text>
                  <Animated.Text style={[styles.emptySubtext, { color: ev.whiteDim }]}>
                    Try changing the filter to see more results
                  </Animated.Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 12, fontWeight: "500" },
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

  toggleRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  toggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  toggleLabel: { fontSize: 14, fontWeight: "600" },

  mapContainer: { flex: 1 },

  mapLoadingBanner: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 10,
  },
  mapBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  mapBannerText: { fontSize: 13, fontWeight: "500" },
  bannerRetry: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  bannerRetryText: { fontSize: 12, fontWeight: "600" },

  fullStateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHandle: { alignItems: "center", paddingBottom: 4 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sheetTitleBlock: { flex: 1, gap: 3 },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetAddress: { fontSize: 13 },
  sheetStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5 },
  statPillText: { fontSize: 12, fontWeight: "600" },
  sheetAvail: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  listContainer: { flex: 1 },
  filterRow: { paddingBottom: 8, paddingTop: 4 },
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

  listContent: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  resultCount: { fontSize: 13, fontWeight: "500" },
  summaryPills: { flexDirection: "row", gap: 6 },
  summaryPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  summaryPillText: { fontSize: 11, fontWeight: "600" },

  centeredState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16, paddingHorizontal: 32 },
  stateText: { fontSize: 15 },

  chargerCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  chargerCardCompact: { padding: 12, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  networkIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardHeaderText: { flex: 1, gap: 3 },
  chargerName: { fontSize: 15, fontWeight: "700" },
  chargerAddress: { fontSize: 13 },
  distanceBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  distanceText: { fontSize: 13, fontWeight: "600" },
  cardBody: { gap: 10 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
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
    paddingVertical: 13,
    gap: 8,
  },
  navigateText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  speedBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  speedText: { fontSize: 11, fontWeight: "600" },

  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySubtext: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  retryText: { fontSize: 14, fontWeight: "600" },
});
