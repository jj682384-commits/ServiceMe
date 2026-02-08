import React, { useState, useEffect } from "react";
import { View, StyleSheet, Platform, Pressable, ScrollView, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Location from "expo-location";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ProviderTypeBadge } from "@/components/ProviderTypeBadge";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, Provider } from "@/context/AppContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SERVICE_FILTERS: { type: ServiceType | "all"; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { type: "all", label: "All", icon: "grid" },
  { type: "flat_tire", label: "Tire", icon: "disc" },
  { type: "jump_start", label: "Battery", icon: "battery-charging" },
  { type: "fuel", label: "Fuel", icon: "droplet" },
  { type: "lockout", label: "Lockout", icon: "key" },
];

function FilterChip({ 
  label, 
  icon, 
  isSelected, 
  onPress 
}: { 
  label: string; 
  icon: keyof typeof Feather.glyphMap; 
  isSelected: boolean; 
  onPress: () => void;
}) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
          borderColor: isSelected ? theme.primary : theme.border,
        },
      ]}
    >
      <Feather 
        name={icon} 
        size={14} 
        color={isSelected ? "#FFFFFF" : theme.textSecondary} 
      />
      <ThemedText 
        type="small" 
        style={{ 
          color: isSelected ? "#FFFFFF" : theme.text,
          marginLeft: Spacing.xs,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function MechanicCard({ provider, onPress }: { provider: Provider; onPress: () => void }) {
  const { theme } = useTheme();
  
  const vehicleIcon = provider.vehicleType === "tow_truck" ? "truck" : 
                      provider.vehicleType === "service_van" ? "box" : "tool";
  
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.mechanicCard,
        { 
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.mechanicIcon, { backgroundColor: theme.secondary }]}>
        <Feather name={vehicleIcon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.mechanicInfo}>
        <View style={styles.nameRow}>
          <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
            {provider.name}
          </ThemedText>
          <View style={styles.badgesRow}>
            <ProviderTypeBadge type={provider.providerType} size="small" />
            {provider.verificationStatus === "verified" ? (
              <VerificationBadge status="verified" size="small" showLabel={false} />
            ) : null}
          </View>
        </View>
        <View style={styles.mechanicMeta}>
          <Feather name="star" size={12} color={theme.warning} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 2 }}>
            {provider.rating.toFixed(1)} ({provider.reviewCount})
          </ThemedText>
          {provider.distance !== undefined ? (
            <>
              <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
              <Feather name="navigation" size={12} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: 2 }}>
                {provider.distance} mi
              </ThemedText>
            </>
          ) : null}
        </View>
        <View style={styles.servicesRow}>
          {provider.servicesOffered.slice(0, 3).map((service) => (
            <View 
              key={service} 
              style={[styles.serviceTag, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText type="small" style={{ fontSize: 10, color: theme.textSecondary }}>
                {service.replace("_", " ")}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

function ProviderMarker({ name, rating }: { name: string; rating: number }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.markerContainer, { backgroundColor: theme.secondary }]}>
      <Feather name="truck" size={16} color="#FFFFFF" />
      <View style={[styles.markerBubble, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" style={styles.markerName} numberOfLines={1}>
          {name}
        </ThemedText>
        <View style={styles.ratingRow}>
          <Feather name="star" size={12} color={theme.warning} />
          <ThemedText type="small" style={styles.ratingText}>
            {rating.toFixed(1)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function WebMapPlaceholder({ providers }: { providers: Provider[] }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.mapBackground, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.mapGrid}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.gridLine,
              { backgroundColor: theme.border, opacity: 0.3 },
            ]}
          />
        ))}
      </View>
      
      <View style={[styles.userMarker, { backgroundColor: theme.primary, ...Shadows.lg }]}>
        <Feather name="navigation" size={20} color="#FFFFFF" />
      </View>

      <View style={styles.providersOnMap}>
        {providers.slice(0, 3).map((provider, index) => (
          <View
            key={provider.id}
            style={[
              styles.providerOnMap,
              {
                top: 80 + index * 60,
                left: 40 + index * 80,
              },
            ]}
          >
            <ProviderMarker name={provider.name} rating={provider.rating} />
          </View>
        ))}
      </View>
      
      <View style={styles.webMapOverlay}>
        <Feather name="map" size={32} color={theme.primary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
          Interactive map available in Expo Go
        </ThemedText>
      </View>
    </View>
  );
}

export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { activeRequest, setUserLocation, getProvidersWithDistance, userLocation, nearbyProviders } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [selectedFilter, setSelectedFilter] = useState<ServiceType | "all">("all");
  const [showList, setShowList] = useState(true);
  
  const fabScale = useSharedValue(1);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleRequestService = () => {
    navigation.navigate("ServiceRequest");
  };

  const handleViewActiveService = () => {
    navigation.navigate("ActiveService");
  };

  useEffect(() => {
    if (permission?.granted && Platform.OS !== "web") {
      (async () => {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } catch (error) {
          setUserLocation({ latitude: 37.7849, longitude: -122.4094 });
        }
      })();
    } else if (Platform.OS === "web") {
      setUserLocation({ latitude: 37.7849, longitude: -122.4094 });
    }
  }, [permission?.granted, setUserLocation]);

  const providers = getProvidersWithDistance();
  const filteredProviders = selectedFilter === "all" 
    ? providers 
    : providers.filter(p => p.servicesOffered.includes(selectedFilter));

  const handleOpenSettings = async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        Alert.alert("Unable to open settings");
      }
    }
  };

  const renderPermissionRequest = () => (
    <View style={[styles.permissionContainer, { backgroundColor: theme.backgroundDefault }]}>
      <Feather name="map-pin" size={48} color={theme.primary} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
        Enable Location
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
        Find nearby mechanics and get faster service by enabling location access.
      </ThemedText>
      {permission?.status === "denied" && !permission.canAskAgain ? (
        Platform.OS !== "web" ? (
          <Pressable
            onPress={handleOpenSettings}
            style={[styles.permissionButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Open Settings
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
            Run in Expo Go to use location features
          </ThemedText>
        )
      ) : (
        <Pressable
          onPress={requestPermission}
          style={[styles.permissionButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="navigation" size={18} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
            Enable Location
          </ThemedText>
        </Pressable>
      )}
    </View>
  );

  if (!permission && Platform.OS !== "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Loading...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const isWeb = Platform.OS === "web";
  const hasPermission = isWeb || permission?.granted;

  return (
    <ThemedView style={styles.container}>
      {hasPermission ? (
        <WebMapPlaceholder providers={filteredProviders} />
      ) : (
        renderPermissionRequest()
      )}

      <View
        style={[
          styles.searchBar,
          {
            top: insets.top + Spacing.lg,
            backgroundColor: theme.backgroundDefault,
            borderWidth: 1,
            borderColor: theme.border,
            ...Shadows.md,
          },
        ]}
      >
        <Feather name="search" size={20} color={theme.primary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
          Find nearby mechanics
        </ThemedText>
        <Pressable onPress={() => setShowList(!showList)}>
          <Feather name={showList ? "map" : "list"} size={20} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterRow, { top: insets.top + Spacing.lg + 56 }]}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
      >
        {SERVICE_FILTERS.map((filter) => (
          <FilterChip
            key={filter.type}
            label={filter.label}
            icon={filter.icon}
            isSelected={selectedFilter === filter.type}
            onPress={() => setSelectedFilter(filter.type)}
          />
        ))}
      </ScrollView>

      {showList && hasPermission ? (
        <View
          style={[
            styles.listContainer,
            {
              bottom: activeRequest ? tabBarHeight + 100 : tabBarHeight + 80,
              backgroundColor: theme.backgroundDefault,
              ...Shadows.lg,
            },
          ]}
        >
          <View style={styles.listHeader}>
            <ThemedText type="h4">
              Nearby Mechanics
            </ThemedText>
            <Pressable onPress={() => navigation.navigate("BrowseProviders")}>
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                Browse All ({filteredProviders.length})
              </ThemedText>
            </Pressable>
          </View>
          <ScrollView 
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
          >
            {filteredProviders.map((provider) => (
              <MechanicCard
                key={provider.id}
                provider={provider}
                onPress={() => navigation.navigate("ProviderDetail", { providerId: provider.id })}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {activeRequest ? (
        <Pressable
          onPress={handleViewActiveService}
          style={[
            styles.activeServiceBar,
            {
              bottom: tabBarHeight + Spacing.lg,
              backgroundColor: theme.backgroundDefault,
              ...Shadows.lg,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
          <View style={styles.activeServiceInfo}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Provider en route
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {activeRequest.eta ? `${activeRequest.eta} min away • ${activeRequest.provider?.name}` : activeRequest.provider?.name}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={24} color={theme.textSecondary} />
        </Pressable>
      ) : null}

      {!activeRequest ? (
        <View style={[styles.fabContainer, { bottom: tabBarHeight + Spacing.xl }]}>
          <AnimatedPressable
            onPress={() => navigation.navigate("TowRequest")}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            style={[
              styles.towFab,
              {
                backgroundColor: theme.secondary,
                ...Shadows.lg,
              },
            ]}
          >
            <Feather name="truck" size={22} color="#FFFFFF" />
            <ThemedText type="small" style={styles.towFabText}>
              Need a Tow?
            </ThemedText>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={handleRequestService}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            style={[
              styles.fab,
              {
                backgroundColor: theme.primary,
                ...Shadows.xl,
              },
              fabAnimatedStyle,
            ]}
          >
            <Feather name="zap" size={28} color="#FFFFFF" />
            <ThemedText type="body" style={styles.fabText}>
              Get Help Fast
            </ThemedText>
          </AnimatedPressable>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
  mapBackground: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  mapGrid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  gridLine: {
    width: 1,
    height: "100%",
  },
  userMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  providersOnMap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  providerOnMap: {
    position: "absolute",
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  markerBubble: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    minWidth: 80,
    alignItems: "center",
  },
  markerName: {
    fontWeight: "500",
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
  },
  webMapOverlay: {
    position: "absolute",
    bottom: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  searchBar: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  filterRow: {
    position: "absolute",
    left: 0,
    right: 0,
    maxHeight: 44,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  listContainer: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    maxHeight: 280,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  listScroll: {
    maxHeight: 220,
  },
  mechanicCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  mechanicIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  mechanicInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  mechanicMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: Spacing.sm,
  },
  servicesRow: {
    flexDirection: "row",
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  serviceTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  activeServiceBar: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  activeServiceInfo: {
    flex: 1,
  },
  fabContainer: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    gap: Spacing.md,
  },
  towFab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  towFabText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  fabText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
