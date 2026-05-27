import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";

import { useTheme } from "@/hooks/useTheme";
import { getEVColors } from "@/constants/evColors";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface ChargerStation {
  id: string;
  name: string;
  address: string;
  distanceMi: number;
  distance: string;
  chargerCount: number;
  available: number;
  speed: string;
  network: string;
}

function haversineDistMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const distMi = haversineDistMi(userLat, userLon, lat, lon);

  return {
    id: String(item.ID),
    name: (addr.Title as string) || "Charging Station",
    address: (addr.AddressLine1 as string) || (addr.Town as string) || "",
    distanceMi: distMi,
    distance: distMi < 0.1 ? "< 0.1 mi" : `${distMi.toFixed(1)} mi`,
    chargerCount: points,
    available,
    speed,
    network: (item.OperatorInfo as Record<string, unknown> | undefined)?.Title as string || "Unknown",
  };
}

export default function EVChargerPickerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark } = useTheme();
  const EV = getEVColors(isDark);

  const [chargers, setChargers] = useState<ChargerStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const pulseAnim = useSharedValue(0.5);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(pulseAnim);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseAnim.value }));

  const fetchChargers = useCallback(async (lat: number, lon: number) => {
    setError(false);
    try {
      const url =
        `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lon}` +
        `&distance=20&distanceunit=Miles&maxresults=30&compact=true&verbose=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const data: Record<string, unknown>[] = await res.json();
      const mapped = data
        .map((item) => mapApiToCharger(item, lat, lon))
        .filter((c): c is ChargerStation => c !== null)
        .sort((a, b) => a.distanceMi - b.distanceMi);
      setChargers(mapped);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        setError(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserCoords(coords);
      fetchChargers(coords.latitude, coords.longitude);
    })();
  }, [fetchChargers]);

  const handleSelect = (charger: ChargerStation) => {
    const miles = parseFloat(charger.distanceMi.toFixed(1));
    navigation.navigate("EVTow", {
      selectedCharger: { name: charger.name, address: charger.address, miles },
    });
  };

  const renderCharger = ({ item, index }: { item: ChargerStation; index: number }) => {
    const isFast = item.speed === "DC Fast";
    const isUnavailable = item.available === 0;
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()}>
        <Pressable
          onPress={() => handleSelect(item)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: EV.bgCard, borderColor: EV.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconCircle, { backgroundColor: isUnavailable ? EV.neonPink + "15" : EV.neonGreen + "15" }]}>
              <Feather name="zap" size={18} color={isUnavailable ? EV.neonPink : EV.neonGreen} />
            </View>
          </View>
          <View style={styles.cardMiddle}>
            <Animated.Text style={[styles.chargerName, { color: EV.white }]} numberOfLines={1}>
              {item.name}
            </Animated.Text>
            <Animated.Text style={[styles.chargerAddress, { color: EV.whiteDim }]} numberOfLines={1}>
              {item.address}
            </Animated.Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: isFast ? EV.neonGreen + "20" : EV.neonCyan + "20" }]}>
                <Feather name="zap" size={9} color={isFast ? EV.neonGreen : EV.neonCyan} />
                <Animated.Text style={[styles.badgeText, { color: isFast ? EV.neonGreen : EV.neonCyan }]}>
                  {item.speed}
                </Animated.Text>
              </View>
              <Animated.Text style={[styles.networkText, { color: EV.whiteGhost }]} numberOfLines={1}>
                {item.network}
              </Animated.Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Animated.Text style={[styles.distText, { color: EV.neonCyan }]}>{item.distance}</Animated.Text>
            <Animated.Text style={[styles.availText, { color: isUnavailable ? EV.neonPink : EV.neonGreen }]}>
              {isUnavailable ? "Offline" : `${item.available} open`}
            </Animated.Text>
            <Feather name="chevron-right" size={16} color={EV.whiteGhost} style={{ marginTop: 4 }} />
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: EV.bg }]}>
      <LinearGradient
        colors={[EV.neonGreen + "08", EV.neonCyan + "05", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={EV.white} />
        </Pressable>
        <View style={styles.headerTextCol}>
          <Animated.Text style={[styles.headerLabel, { color: EV.neonGreen }]}>TOW DESTINATION</Animated.Text>
          <Animated.Text style={[styles.headerTitle, { color: EV.white }]}>Select a Charger</Animated.Text>
        </View>
        {loading ? (
          <Animated.View style={pulseStyle}>
            <Feather name="battery-charging" size={22} color={EV.neonGreen} />
          </Animated.View>
        ) : (
          <Pressable onPress={() => userCoords && fetchChargers(userCoords.latitude, userCoords.longitude)} hitSlop={12}>
            <Feather name="refresh-cw" size={20} color={EV.whiteDim} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={EV.neonGreen} />
          <Animated.Text style={[styles.loadingText, { color: EV.whiteDim }]}>
            Finding nearby chargers...
          </Animated.Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={EV.whiteGhost} />
          <Animated.Text style={[styles.errorTitle, { color: EV.white }]}>Could not load chargers</Animated.Text>
          <Animated.Text style={[styles.errorSub, { color: EV.whiteDim }]}>
            Check your connection and try again
          </Animated.Text>
          <Pressable
            onPress={() => userCoords && fetchChargers(userCoords.latitude, userCoords.longitude)}
            style={[styles.retryBtn, { backgroundColor: EV.neonGreen + "20", borderColor: EV.neonGreen + "40" }]}
          >
            <Animated.Text style={[styles.retryText, { color: EV.neonGreen }]}>Retry</Animated.Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={chargers}
          keyExtractor={(item) => item.id}
          renderItem={renderCharger}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Animated.Text style={[styles.listHeader, { color: EV.whiteDim }]}>
              {chargers.length} chargers within 20 miles — tap one to tow there
            </Animated.Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="map-pin" size={36} color={EV.whiteGhost} />
              <Animated.Text style={[styles.errorTitle, { color: EV.white }]}>No chargers found</Animated.Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12, gap: 12,
  },
  backBtn: { padding: 2 },
  headerTextCol: { flex: 1 },
  headerLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 3, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  listHeader: { fontSize: 13, marginBottom: 14, lineHeight: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  errorSub: { fontSize: 14, textAlign: "center" },
  retryBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  retryText: { fontSize: 15, fontWeight: "700" },
  card: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12,
  },
  cardLeft: {},
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  cardMiddle: { flex: 1, gap: 4 },
  chargerName: { fontSize: 15, fontWeight: "700" },
  chargerAddress: { fontSize: 12 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  networkText: { fontSize: 11, flex: 1 },
  cardRight: { alignItems: "flex-end" },
  distText: { fontSize: 14, fontWeight: "700" },
  availText: { fontSize: 11, marginTop: 2 },
});
