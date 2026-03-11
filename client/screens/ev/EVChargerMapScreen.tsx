import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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
}

const MOCK_CHARGERS: ChargerStation[] = [
  { id: "1", name: "Volta Station - Downtown", distance: "0.4 mi", chargerCount: 8, speed: "DC Fast", available: 3, latitude: 37.7849, longitude: -122.4094, network: "Volta" },
  { id: "2", name: "ChargePoint - Oak Plaza", distance: "1.2 mi", chargerCount: 4, speed: "Level 2", available: 2, latitude: 37.7799, longitude: -122.4134, network: "ChargePoint" },
  { id: "3", name: "Tesla Supercharger - Mall", distance: "2.8 mi", chargerCount: 12, speed: "DC Fast", available: 7, latitude: 37.7749, longitude: -122.4194, network: "Tesla" },
  { id: "4", name: "EVgo - Gas Station", distance: "3.1 mi", chargerCount: 2, speed: "DC Fast", available: 0, latitude: 37.7899, longitude: -122.4044, network: "EVgo" },
  { id: "5", name: "Electrify America - Center", distance: "4.2 mi", chargerCount: 6, speed: "DC Fast", available: 4, latitude: 37.7719, longitude: -122.4244, network: "EA" },
  { id: "6", name: "Blink - Parking Garage", distance: "1.8 mi", chargerCount: 3, speed: "Level 2", available: 1, latitude: 37.7829, longitude: -122.3994, network: "Blink" },
];

const INITIAL_REGION = {
  latitude: 37.7809,
  longitude: -122.4094,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

function SpeedBadge({ speed, ev }: { speed: string; ev: ReturnType<typeof getEVColors> }) {
  const isFast = speed === "DC Fast";
  return (
    <View style={[styles.speedBadge, { backgroundColor: isFast ? ev.neonGreen + "20" : ev.neonCyan + "20" }]}>
      <Feather name="zap" size={10} color={isFast ? ev.neonGreen : ev.neonCyan} />
      <Animated.Text style={[styles.speedText, { color: isFast ? ev.neonGreen : ev.neonCyan }]}>{speed}</Animated.Text>
    </View>
  );
}

export default function EVChargerMapScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const ev = getEVColors(isDark);
  const navigation = useNavigation();
  const [selectedCharger, setSelectedCharger] = useState<ChargerStation | null>(null);
  const mapRef = useRef<MapView>(null);
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

  const handleMarkerPress = (charger: ChargerStation) => {
    setSelectedCharger(charger);
    mapRef.current?.animateToRegion({
      latitude: charger.latitude - 0.004,
      longitude: charger.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 400);
  };

  const handleNavigate = (charger: ChargerStation) => {
    const scheme = Platform.select({
      ios: `maps:0,0?q=${charger.latitude},${charger.longitude}`,
      android: `geo:0,0?q=${charger.latitude},${charger.longitude}(${charger.name})`,
      default: `https://maps.google.com/?q=${charger.latitude},${charger.longitude}`,
    });
    import("expo-linking").then(({ openURL }) => openURL(scheme));
  };

  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#0a0a1a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a1a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a3a" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f0f2a" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#050515" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#0f0f25" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0a1a10" }] },
  ];

  const lightMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#f0f9f4" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#d1fae5" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dcfce7" }] },
  ];

  const isWeb = Platform.OS === "web";

  return (
    <View style={[styles.container, { backgroundColor: ev.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: ev.bg + "E6" }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={ev.white} />
        </Pressable>
        <Animated.Text style={[styles.headerTitle, { color: ev.white }]}>Nearby Chargers</Animated.Text>
        <View style={styles.headerRight}>
          <View style={[styles.countBadge, { backgroundColor: ev.neonGreen + "20" }]}>
            <Animated.Text style={[styles.countText, { color: ev.neonGreen }]}>
              {MOCK_CHARGERS.reduce((sum, c) => sum + c.available, 0)} available
            </Animated.Text>
          </View>
        </View>
      </View>

      {isWeb ? (
        <View style={[styles.webMapFallback, { backgroundColor: ev.bgCard }]}>
          <Feather name="map" size={48} color={ev.neonCyan} />
          <Animated.Text style={[styles.webMapText, { color: ev.white }]}>
            Map View
          </Animated.Text>
          <Animated.Text style={[styles.webMapSubtext, { color: ev.whiteDim }]}>
            Open in Expo Go for the full interactive map experience
          </Animated.Text>

          <View style={styles.webChargerList}>
            {MOCK_CHARGERS.map((charger) => (
              <Pressable
                key={charger.id}
                onPress={() => setSelectedCharger(selectedCharger?.id === charger.id ? null : charger)}
                style={[
                  styles.webChargerItem,
                  {
                    backgroundColor: selectedCharger?.id === charger.id ? ev.neonGreen + "10" : ev.bgCardLight,
                    borderColor: selectedCharger?.id === charger.id ? ev.neonGreen : ev.border,
                  },
                ]}
              >
                <View style={styles.webChargerTop}>
                  <Animated.Text style={[styles.webChargerName, { color: ev.white }]} numberOfLines={1}>{charger.name}</Animated.Text>
                  <SpeedBadge speed={charger.speed} ev={ev} />
                </View>
                <View style={styles.webChargerBottom}>
                  <Animated.Text style={[styles.webChargerMeta, { color: ev.whiteDim }]}>{charger.distance}</Animated.Text>
                  <Animated.Text style={[styles.webChargerMeta, { color: charger.available > 0 ? ev.neonGreen : ev.neonPink }]}>
                    {charger.available > 0 ? `${charger.available}/${charger.chargerCount} available` : "All in use"}
                  </Animated.Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          customMapStyle={isDark ? darkMapStyle : lightMapStyle}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {MOCK_CHARGERS.map((charger) => (
            <Marker
              key={charger.id}
              coordinate={{ latitude: charger.latitude, longitude: charger.longitude }}
              onPress={() => handleMarkerPress(charger)}
              title={charger.name}
            >
              <View style={styles.markerContainer}>
                <View style={[
                  styles.markerDot,
                  {
                    backgroundColor: charger.available > 0 ? ev.neonGreen : ev.neonPink,
                    borderColor: charger.available > 0 ? ev.neonGreen + "40" : ev.neonPink + "40",
                  },
                ]}>
                  <Feather name="zap" size={14} color="#FFFFFF" />
                </View>
                <View style={[styles.markerCount, { backgroundColor: ev.bgCard, borderColor: ev.border }]}>
                  <Animated.Text style={[styles.markerCountText, { color: charger.available > 0 ? ev.neonGreen : ev.neonPink }]}>
                    {charger.available}
                  </Animated.Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {selectedCharger ? (
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={[styles.detailCard, { backgroundColor: ev.bgCard, borderColor: ev.border, paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.detailHandle}>
            <View style={[styles.handle, { backgroundColor: ev.border }]} />
          </View>

          <View style={styles.detailTop}>
            <View style={{ flex: 1 }}>
              <Animated.Text style={[styles.detailName, { color: ev.white }]} numberOfLines={1}>
                {selectedCharger.name}
              </Animated.Text>
              <Animated.Text style={[styles.detailDistance, { color: ev.whiteDim }]}>
                {selectedCharger.distance} away
              </Animated.Text>
            </View>
            <Pressable onPress={() => setSelectedCharger(null)} hitSlop={12}>
              <Feather name="x" size={20} color={ev.whiteDim} />
            </Pressable>
          </View>

          <View style={styles.detailStats}>
            <View style={[styles.detailStatItem, { backgroundColor: ev.bgCardLight }]}>
              <Feather name="zap" size={18} color={ev.neonGreen} />
              <Animated.Text style={[styles.detailStatValue, { color: ev.white }]}>{selectedCharger.speed}</Animated.Text>
              <Animated.Text style={[styles.detailStatLabel, { color: ev.whiteDim }]}>Speed</Animated.Text>
            </View>
            <View style={[styles.detailStatItem, { backgroundColor: ev.bgCardLight }]}>
              <Feather name="battery-charging" size={18} color={ev.neonCyan} />
              <Animated.Text style={[styles.detailStatValue, { color: ev.white }]}>{selectedCharger.chargerCount}</Animated.Text>
              <Animated.Text style={[styles.detailStatLabel, { color: ev.whiteDim }]}>Chargers</Animated.Text>
            </View>
            <View style={[styles.detailStatItem, { backgroundColor: ev.bgCardLight }]}>
              <Feather name="check-circle" size={18} color={selectedCharger.available > 0 ? ev.neonGreen : ev.neonPink} />
              <Animated.Text style={[styles.detailStatValue, { color: selectedCharger.available > 0 ? ev.neonGreen : ev.neonPink }]}>
                {selectedCharger.available}
              </Animated.Text>
              <Animated.Text style={[styles.detailStatLabel, { color: ev.whiteDim }]}>Available</Animated.Text>
            </View>
          </View>

          <View style={styles.detailActions}>
            <Pressable onPress={() => handleNavigate(selectedCharger)} style={styles.navigateButton}>
              <LinearGradient
                colors={[ev.neonGreen, ev.neonCyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.navigateGradient}
              >
                <Feather name="navigation" size={18} color="#FFFFFF" />
                <Animated.Text style={styles.navigateText}>Navigate</Animated.Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: "center",
  },
  markerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  markerCount: {
    position: "absolute",
    top: -6,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  markerCountText: {
    fontSize: 10,
    fontWeight: "800",
  },
  detailCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
  },
  detailHandle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  detailTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  detailDistance: {
    fontSize: 14,
  },
  detailStats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  detailStatItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  detailStatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  detailStatLabel: {
    fontSize: 11,
  },
  detailActions: {
    flexDirection: "row",
    gap: 10,
  },
  navigateButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  navigateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 10,
  },
  navigateText: {
    color: "#FFFFFF",
    fontSize: 16,
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
  webMapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  webMapText: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 6,
  },
  webMapSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  webChargerList: {
    width: "100%",
    gap: 10,
  },
  webChargerItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  webChargerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  webChargerName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  webChargerBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  webChargerMeta: {
    fontSize: 13,
  },
});
