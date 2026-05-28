import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Linking,
  Alert,
  Animated as RNAnimated,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, withSequence, cancelAnimation, Easing, interpolate, runOnJS } from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ProviderTypeBadge } from "@/components/ProviderTypeBadge";
import { GoogleMapView } from "@/components/GoogleMapView";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, Provider, BADGE_CONFIG, BadgeType, PREFERRED_THRESHOLD } from "@/context/AppContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const HUB_PILL_H = 44;
const HUB_EXPANDED_H = 300;
const ACTION_ROW_H = 48;

// Color constants for provider status
const COLOR_FREE = "#22C55E";
const COLOR_BUSY = "#F59E0B";
const COLOR_PREFERRED = "#E91E63";

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
  onPress,
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
      <Feather name={icon} size={14} color={isSelected ? "#FFFFFF" : theme.textSecondary} />
      <ThemedText
        type="small"
        style={{ color: isSelected ? "#FFFFFF" : theme.text, marginLeft: Spacing.xs }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function StatusBadge({ isBusy }: { isBusy?: boolean }) {
  const color = isBusy ? COLOR_BUSY : COLOR_FREE;
  const label = isBusy ? "Busy" : "Free";
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "20", borderColor: color + "50" }]}>
      <View style={[styles.statusDotSmall, { backgroundColor: color }]} />
      <ThemedText type="small" style={{ color, fontWeight: "700", fontSize: 11 }}>
        {label}
      </ThemedText>
    </View>
  );
}

function MechanicCard({
  provider,
  onPress,
  isPreferred,
}: {
  provider: Provider;
  onPress: () => void;
  isPreferred?: boolean;
}) {
  const { theme } = useTheme();
  const vehicleIcon =
    provider.vehicleType === "tow_truck" ? "truck" : provider.vehicleType === "service_van" ? "box" : "tool";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.mechanicCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: isPreferred ? COLOR_PREFERRED + "60" : theme.border,
        },
      ]}
    >
      <View style={[styles.mechanicIcon, { backgroundColor: provider.isBusy ? COLOR_BUSY + "20" : COLOR_FREE + "20" }]}>
        <Feather name={vehicleIcon} size={20} color={provider.isBusy ? COLOR_BUSY : COLOR_FREE} />
      </View>
      <View style={styles.mechanicInfo}>
        <View style={styles.nameRow}>
          <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }} numberOfLines={1}>
            {provider.name}
          </ThemedText>
          <View style={styles.badgesRow}>
            <StatusBadge isBusy={provider.isBusy} />
            {isPreferred ? (
              <View style={[styles.preferredTag, { backgroundColor: COLOR_PREFERRED + "20" }]}>
                <Feather name="heart" size={10} color={COLOR_PREFERRED} />
              </View>
            ) : null}
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
          {provider.distance != null ? (
            <>
              <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
              <Feather name="navigation" size={12} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: 2 }}>
                {typeof provider.distance === "number" ? provider.distance.toFixed(1) : provider.distance} mi
              </ThemedText>
            </>
          ) : null}
        </View>
        <View style={styles.servicesRow}>
          {provider.servicesOffered.slice(0, 3).map((service) => (
            <View key={service} style={[styles.serviceTag, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="small" style={{ fontSize: 10, color: theme.textSecondary }}>
                {service.replace(/_/g, " ")}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

function WebMapPlaceholder({ providers }: { providers: Provider[] }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.mapBackground, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.mapGrid}>
        {[...Array(6)].map((_, i) => (
          <View key={i} style={[styles.gridLine, { backgroundColor: theme.border, opacity: 0.3 }]} />
        ))}
      </View>
      <View style={[styles.userMarker, { backgroundColor: theme.primary, ...Shadows.lg }]}>
        <Feather name="navigation" size={20} color="#FFFFFF" />
      </View>
      <View style={styles.providersOnMap}>
        {providers.slice(0, 3).map((provider, index) => (
          <View key={provider.id} style={[styles.providerOnMap, { top: 80 + index * 60, left: 40 + index * 80 }]}>
            <View
              style={[
                styles.webMarker,
                { backgroundColor: provider.isBusy ? COLOR_BUSY : isProviderPreferred(provider.id) ? COLOR_PREFERRED : COLOR_FREE },
              ]}
            >
              <Feather name="truck" size={14} color="#FFF" />
            </View>
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

// Module-level preferred check for WebMapPlaceholder (will be overridden by hook in main component)
let isProviderPreferred = (_id: string) => false;

// Quick request card — shown when user taps a provider marker
function QuickRequestCard({
  provider,
  isPreferred,
  slideAnim,
  bottomInset,
  onRequestService,
  onViewProfile,
  onDismiss,
}: {
  provider: Provider;
  isPreferred: boolean;
  slideAnim: RNAnimated.Value;
  bottomInset: number;
  onRequestService: () => void;
  onViewProfile: () => void;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();
  const vehicleIcon =
    provider.vehicleType === "tow_truck" ? "truck" : provider.vehicleType === "service_van" ? "box" : "tool";

  const statusColor = provider.isBusy ? COLOR_BUSY : isPreferred ? COLOR_PREFERRED : COLOR_FREE;
  const statusLabel = provider.isBusy ? "Busy" : "Free";

  return (
    <RNAnimated.View
      style={[
        styles.quickCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderTopColor: statusColor,
          transform: [{ translateY: slideAnim }],
          paddingBottom: bottomInset,
          ...Shadows.xl,
        },
      ]}
    >
      {/* Dismiss bar */}
      <Pressable onPress={onDismiss} style={styles.quickCardDismissBar}>
        <View style={[styles.quickCardHandle, { backgroundColor: theme.border }]} />
      </Pressable>

      <View style={styles.quickCardHeader}>
        <View style={[styles.quickCardAvatar, { backgroundColor: statusColor + "20" }]}>
          <Feather name={vehicleIcon} size={26} color={statusColor} />
        </View>
        <View style={styles.quickCardInfo}>
          <View style={styles.quickCardNameRow}>
            <ThemedText type="h4" style={{ flex: 1 }} numberOfLines={1}>
              {provider.name}
            </ThemedText>
            <Pressable onPress={onDismiss} hitSlop={12}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.quickCardMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "20", borderColor: statusColor + "50" }]}>
              <View style={[styles.statusDotSmall, { backgroundColor: statusColor }]} />
              <ThemedText type="small" style={{ color: statusColor, fontWeight: "700", fontSize: 11 }}>
                {statusLabel}
              </ThemedText>
            </View>
            <View style={styles.quickCardRating}>
              <Feather name="star" size={13} color={theme.warning} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 3 }}>
                {provider.rating.toFixed(1)} ({provider.reviewCount})
              </ThemedText>
            </View>
            {provider.distance != null ? (
              <View style={styles.quickCardRating}>
                <Feather name="navigation" size={12} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: 3 }}>
                  {typeof provider.distance === "number" ? provider.distance.toFixed(1) : provider.distance} mi
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.quickCardBadges}>
        <ProviderTypeBadge type={provider.providerType} size="small" />
        {provider.verificationStatus === "verified" ? (
          <VerificationBadge status="verified" size="small" showLabel />
        ) : null}
        {isPreferred ? (
          <View style={[styles.preferredTag, { backgroundColor: COLOR_PREFERRED + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }]}>
            <Feather name="heart" size={10} color={COLOR_PREFERRED} />
            <ThemedText type="small" style={{ fontSize: 10, color: COLOR_PREFERRED, fontWeight: "700", marginLeft: 3 }}>
              Preferred
            </ThemedText>
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickCardServices}>
        {provider.servicesOffered.map((svc) => (
          <View key={svc} style={[styles.serviceTag, { backgroundColor: theme.backgroundSecondary, marginRight: Spacing.xs }]}>
            <ThemedText type="small" style={{ fontSize: 11, color: theme.textSecondary }}>
              {svc.replace(/_/g, " ")}
            </ThemedText>
          </View>
        ))}
      </ScrollView>

      {provider.isBusy ? (
        <View style={[styles.busyNotice, { backgroundColor: COLOR_BUSY + "12", borderColor: COLOR_BUSY + "30" }]}>
          <Feather name="clock" size={14} color={COLOR_BUSY} />
          <ThemedText type="small" style={{ color: COLOR_BUSY, marginLeft: Spacing.xs, flex: 1 }}>
            Currently helping another driver. You can still request — they'll be notified when free.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.quickCardActions}>
        <Pressable
          onPress={onViewProfile}
          style={[styles.quickCardSecondaryBtn, { borderColor: theme.border }]}
        >
          <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: "600", fontSize: 14 }}>
            View Profile
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onRequestService}
          style={[styles.quickCardPrimaryBtn, { backgroundColor: provider.isBusy ? COLOR_BUSY : theme.primary }]}
        >
          <Feather name="zap" size={16} color="#FFF" />
          <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", fontSize: 14, marginLeft: Spacing.xs }}>
            {provider.isBusy ? "Request Anyway" : "Request Service"}
          </ThemedText>
        </Pressable>
      </View>
    </RNAnimated.View>
  );
}

export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: screenWidth } = useWindowDimensions();
  // "Get Help Fast" is the rightmost flex:1 chip in a 3-chip row.
  // Center of that button from the right edge of the screen:
  const rowWidth = screenWidth - 2 * Spacing.lg;
  const helpBtnCenterFromRight = Spacing.lg + rowWidth / 6;
  const helpRippleRight = helpBtnCenterFromRight - ACTION_ROW_H / 2;
  const { theme } = useTheme();
  const { activeRequest, setUserLocation, userLocation, isPreferredProvider, setNearbyProviders } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [selectedFilter, setSelectedFilter] = useState<ServiceType | "all">("all");
  const [hubOpen, setHubOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [activeAction, setActiveAction] = useState<"diagnose" | "tow" | "service" | null>(null);

  // Slide animation for the quick-request card
  const slideAnim = useRef(new RNAnimated.Value(300)).current;

  // Hub expand/collapse animation
  const hubAnim = useSharedValue(0);
  // Shared value mirror of hubOpen for gesture worklets (can't read React state on UI thread)
  const hubIsOpen = useSharedValue(false);
  const dragY = useSharedValue(0);

  const collapseHub = () => {
    setHubOpen(false);
  };

  const toggleHub = () => {
    const next = !hubOpen;
    setHubOpen(next);
    hubIsOpen.value = next;
    if (next) {
      hubAnim.value = withSpring(1, { damping: 20, stiffness: 220 });
    } else {
      dragY.value = 0;
      hubAnim.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) });
    }
  };

  // Swipe-down gesture — only applied to the header zone, not the ScrollView
  const swipeDownGesture = Gesture.Pan()
    .activeOffsetY(6)          // respond after just 6px down-movement — minimal latency
    .failOffsetY(-6)           // cancel if user swipes up
    .onUpdate((e) => {
      if (!hubIsOpen.value) return;
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (!hubIsOpen.value) return;
      if (e.translationY > 40 || e.velocityY > 300) {
        // Snap shut — fast 140ms collapse so it feels instant
        hubAnim.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) });
        dragY.value = withTiming(0, { duration: 140 });
        hubIsOpen.value = false;
        runOnJS(collapseHub)();
      } else {
        // Bounce back to fully open
        dragY.value = withSpring(0, { damping: 22, stiffness: 350 });
      }
    });

  const hubContainerStyle = useAnimatedStyle(() => ({
    height: interpolate(hubAnim.value, [0, 1], [HUB_PILL_H, HUB_EXPANDED_H]),
    borderRadius: interpolate(hubAnim.value, [0, 1], [HUB_PILL_H / 2, 16]),
    transform: [{ translateY: dragY.value }],
  }));
  const hubPillOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(hubAnim.value, [0, 0.35], [1, 0]),
  }));
  const hubExpandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(hubAnim.value, [0.45, 1], [0, 1]),
  }));

  // Update module-level preferred check so WebMapPlaceholder can use it
  isProviderPreferred = isPreferredProvider;

  const fabScale = useSharedValue(1);
  const fabAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));
  const handleFabPressIn = () => { fabScale.value = withSpring(0.95, { damping: 15, stiffness: 150 }); };
  const handleFabPressOut = () => { fabScale.value = withSpring(1, { damping: 15, stiffness: 150 }); };

  // "Get Help Fast" button — dedicated spring-launch animation
  const helpBtnScale = useSharedValue(1);
  const helpRippleScale = useSharedValue(0);
  const helpRippleOpacity = useSharedValue(0);

  const helpBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: helpBtnScale.value }],
  }));
  const helpRippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: helpRippleScale.value }],
    opacity: helpRippleOpacity.value,
  }));

  // Reset button animation when the screen re-focuses (e.g. back from ServiceRequest)
  useFocusEffect(
    useCallback(() => {
      cancelAnimation(helpBtnScale);
      cancelAnimation(helpRippleScale);
      cancelAnimation(helpRippleOpacity);
      helpBtnScale.value = 1;
      helpRippleScale.value = 0;
      helpRippleOpacity.value = 0;
    }, [helpBtnScale, helpRippleScale, helpRippleOpacity]),
  );

  const pressHelpFast = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setActiveAction("service");
    // Spring-launch: snap up then release
    helpBtnScale.value = withSequence(
      withSpring(1.22, { damping: 8, stiffness: 600 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );
    // Ripple burst from the button outward
    helpRippleScale.value = 0;
    helpRippleOpacity.value = 0.55;
    helpRippleScale.value = withTiming(3.6, { duration: 700, easing: Easing.out(Easing.quad) });
    helpRippleOpacity.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }, () => {
      helpRippleScale.value = 0;
    });
    // Navigate after the peak of the spring (190ms)
    setTimeout(() => {
      navigation.navigate("ServiceRequest" as any);
      setTimeout(() => setActiveAction(null), 400);
    }, 190);
  }, [navigation, helpBtnScale, helpRippleScale, helpRippleOpacity]);

  // Quick-action row tap — haptic + highlight + instant navigation
  const pressAction = useCallback(
    (action: "diagnose" | "tow" | "service", route: keyof RootStackParamList) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setActiveAction(action);
      navigation.navigate(route as any);
      setTimeout(() => setActiveAction(null), 400);
    },
    [navigation],
  );

  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (permission?.granted && Platform.OS !== "web") {
      setLocating(true);
      (async () => {
        try {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        } catch {
          // Failed to get location — leave userLocation null; user can retry
        } finally {
          setLocating(false);
        }
      })();
    } else if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setLocating(false);
          },
          () => {
            // Browser geolocation denied or failed — leave null
            setLocating(false);
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      }
    }
  }, [permission?.granted, setUserLocation]);

  // Poll nearby providers every 10 seconds for live tracking
  const { data: apiProviders } = useQuery<Provider[]>({
    queryKey: ["/api/providers/nearby", userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      const base = new URL("/api/providers/nearby", getApiUrl());
      if (userLocation) {
        base.searchParams.set("lat", String(userLocation.latitude));
        base.searchParams.set("lng", String(userLocation.longitude));
        base.searchParams.set("radius", "25");
      }
      const res = await fetch(base.toString());
      if (!res.ok) throw new Error("Failed to fetch providers");
      return res.json();
    },
    refetchInterval: 10000,
    staleTime: 8000,
  });

  useEffect(() => {
    if (apiProviders) {
      setNearbyProviders(apiProviders);
      // Keep selectedProvider data fresh
      if (selectedProvider) {
        const fresh = apiProviders.find((p) => p.id === selectedProvider.id);
        if (fresh) setSelectedProvider(fresh);
        else if (apiProviders.length === 0) setSelectedProvider(null);
      }
    }
  }, [apiProviders]);

  const providersLoaded = apiProviders !== undefined;
  const providers = apiProviders ?? [];
  const filteredProviders =
    selectedFilter === "all"
      ? providers
      : providers.filter((p) => p.servicesOffered.includes(selectedFilter as ServiceType));

  const freeCount = providers.filter((p) => !p.isBusy).length;
  const busyCount = providers.filter((p) => p.isBusy).length;

  // Show / hide quick request card
  const showQuickCard = (provider: Provider) => {
    setSelectedProvider(provider);
    // Collapse hub when a provider card slides in
    if (hubOpen) {
      setHubOpen(false);
      hubIsOpen.value = false;
      dragY.value = 0;
      hubAnim.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) });
    }
    RNAnimated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const hideQuickCard = () => {
    RNAnimated.timing(slideAnim, { toValue: 300, useNativeDriver: true, duration: 220 }).start(() => {
      setSelectedProvider(null);
    });
  };

  const handleMarkerPress = (marker: { id: string }) => {
    const provider = providers.find((p) => p.id === marker.id);
    if (provider) showQuickCard(provider);
  };

  const handleRequestService = (providerId: string) => {
    hideQuickCard();
    setTimeout(() => navigation.navigate("ServiceRequest", { providerId }), 240);
  };

  const handleOpenSettings = async () => {
    if (Platform.OS !== "web") {
      try { await Linking.openSettings(); } catch { Alert.alert("Unable to open settings"); }
    }
  };

  const renderPermissionRequest = () => (
    <View style={[styles.permissionContainer, { backgroundColor: theme.backgroundDefault }]}>
      <Feather name="map-pin" size={48} color={theme.primary} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, textAlign: "center" }}>Enable Location</ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
        Find nearby mechanics and get faster service by enabling location access.
      </ThemedText>
      {permission?.status === "denied" && !permission.canAskAgain ? (
        Platform.OS !== "web" ? (
          <Pressable onPress={handleOpenSettings} style={[styles.permissionButton, { backgroundColor: theme.primary }]}>
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>Open Settings</ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.lg }}>
            Run in Expo Go to use location features
          </ThemedText>
        )
      ) : (
        <Pressable onPress={requestPermission} style={[styles.permissionButton, { backgroundColor: theme.primary }]}>
          <Feather name="navigation" size={18} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>Enable Location</ThemedText>
        </Pressable>
      )}
    </View>
  );

  if (!permission && Platform.OS !== "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const isWeb = Platform.OS === "web";
  const hasPermission = isWeb || permission?.granted;

  // Build map markers with availability colors
  const providerMarkers = filteredProviders
    .filter((p) => p.location != null)
    .map((p) => ({
      id: p.id,
      latitude: p.location!.latitude,
      longitude: p.location!.longitude,
      title: p.name,
      description: `${p.isBusy ? "Busy" : "Free"} • ${p.rating.toFixed(1)}★ ${p.distance != null ? `• ${p.distance.toFixed(1)} mi` : ""}`,
      color: p.isBusy ? COLOR_BUSY : isPreferredProvider(p.id) ? COLOR_PREFERRED : COLOR_FREE,
    }));

  return (
    <ThemedView style={styles.container}>
      {!hasPermission ? (
        renderPermissionRequest()
      ) : locating || !userLocation ? (
        <View style={[styles.locatingContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="navigation" size={36} color={theme.primary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
            {locating ? "Getting your location…" : "Could not get your location.\nCheck that location access is enabled."}
          </ThemedText>
          {!locating && (
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") {
                  setLocating(true);
                  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                    .then((loc) => setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }))
                    .catch(() => {})
                    .finally(() => setLocating(false));
                }
              }}
              style={[styles.permissionButton, { backgroundColor: theme.primary, marginTop: Spacing.lg }]}
            >
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>Retry</ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <GoogleMapView
          latitude={userLocation.latitude}
          longitude={userLocation.longitude}
          markers={providerMarkers}
          onMarkerPress={handleMarkerPress}
          showsUserLocation={!isWeb && !!permission?.granted}
          fallback={<WebMapPlaceholder providers={filteredProviders} />}
        />
      )}

      {/* Top search bar */}
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
          {providers.length > 0
            ? `${freeCount} free · ${busyCount} busy nearby`
            : "Find nearby mechanics"}
        </ThemedText>
        <Pressable onPress={() => { toggleHub(); if (selectedProvider) hideQuickCard(); }}>
          <Feather name={hubOpen ? "x" : "list"} size={20} color={theme.primary} />
        </Pressable>
      </View>

      {/* Empty state — shown when location is known but no providers are in the area */}
      {hasPermission && providersLoaded && providers.length === 0 && userLocation && !selectedProvider && (
        <View
          style={[
            styles.emptyMapCard,
            {
              top: insets.top + Spacing.lg + 56 + 52,
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              ...Shadows.md,
            },
          ]}
        >
          <Feather name="map-pin" size={18} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", marginLeft: Spacing.sm }}>
            No providers in your area yet
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2, textAlign: "center" }}>
            We're growing fast — check back soon or try expanding your search radius.
          </ThemedText>
        </View>
      )}

      {/* Online indicator legend — sits below filter chips row (chips row is at +56, chip height ~36px) */}
      {providers.length > 0 && (
        <View style={[styles.legend, { top: insets.top + Spacing.lg + 56 + 44, backgroundColor: theme.backgroundDefault + "EE", ...Shadows.sm }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLOR_FREE }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>Free</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLOR_BUSY }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>Busy</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLOR_PREFERRED }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>Preferred</ThemedText>
          </View>
        </View>
      )}

      {/* Emergency button */}
      <Pressable
        onPress={() => navigation.navigate("EmergencyMode")}
        style={[styles.emergencyButton, { top: insets.top + Spacing.lg, backgroundColor: theme.error, ...Shadows.lg }]}
      >
        <Feather name="shield" size={18} color="#FFFFFF" />
      </Pressable>

      {/* Service filter chips */}
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

      {/* Nearby Mechanics Hub — collapsible pill, sits above the action row */}
      {hasPermission && !selectedProvider &&
      (!activeRequest || activeRequest.status === "completed" || activeRequest.status === "cancelled") ? (
        <Animated.View
          style={[
            styles.hubContainer,
            { bottom: tabBarHeight + ACTION_ROW_H + Spacing.xl, backgroundColor: theme.backgroundDefault, ...Shadows.lg },
            hubContainerStyle,
          ]}
        >
          {/* Collapsed pill content */}
          <Animated.View style={[styles.hubPill, hubPillOpacity]} pointerEvents={hubOpen ? "none" : "auto"}>
            <Pressable style={styles.hubPillInner} onPress={toggleHub}>
              <View style={[styles.statusDotSmall, { backgroundColor: freeCount > 0 ? COLOR_FREE : theme.textSecondary }]} />
              <ThemedText type="small" style={{ fontWeight: "600", flex: 1 }}>Nearby Mechanics</ThemedText>
              {freeCount > 0 ? (
                <View style={[styles.onlinePill, { backgroundColor: COLOR_FREE + "20" }]}>
                  <ThemedText style={{ color: COLOR_FREE, fontSize: 10, fontWeight: "700" }}>{freeCount} online</ThemedText>
                </View>
              ) : null}
              <Feather name="chevron-up" size={16} color={theme.textSecondary} />
            </Pressable>
          </Animated.View>

          {/* Expanded content — fades in on open */}
          <Animated.View style={[{ flex: 1 }, hubExpandedOpacity]} pointerEvents={hubOpen ? "auto" : "none"}>
            {/* Drag handle — gesture lives here only, no ScrollView conflict */}
            <GestureDetector gesture={swipeDownGesture}>
              <View style={styles.dragHandleZone}>
                <View style={styles.dragHandleRow}>
                  <View style={[styles.dragHandleBar, { backgroundColor: theme.border }]} />
                </View>
                <View style={[styles.listHeader, { borderBottomColor: theme.border }]}>
                  <View style={styles.listHeaderLeft}>
                    <ThemedText type="h4">Nearby Mechanics</ThemedText>
                    {freeCount > 0 ? (
                      <View style={[styles.onlinePill, { backgroundColor: COLOR_FREE + "20" }]}>
                        <View style={[styles.statusDotSmall, { backgroundColor: COLOR_FREE }]} />
                        <ThemedText type="small" style={{ color: COLOR_FREE, fontWeight: "700", fontSize: 10 }}>
                          {freeCount} online
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                    <Pressable onPress={() => navigation.navigate("BrowseProviders")}>
                      <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                        Browse All ({filteredProviders.length})
                      </ThemedText>
                    </Pressable>
                    <Pressable onPress={toggleHub}>
                      <Feather name="chevron-down" size={18} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </GestureDetector>
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {filteredProviders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="map-pin" size={24} color={theme.textSecondary} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                    No mechanics found nearby. Try expanding your area.
                  </ThemedText>
                </View>
              ) : (
                filteredProviders.map((provider) => (
                  <MechanicCard
                    key={provider.id}
                    provider={provider}
                    isPreferred={isPreferredProvider(provider.id)}
                    onPress={() => showQuickCard(provider)}
                  />
                ))
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      ) : null}

      {/* Active service — compact right-aligned pill matching FAB style */}
      {activeRequest && activeRequest.status !== "completed" && activeRequest.status !== "cancelled" ? (
        <View style={[styles.fabContainer, { bottom: tabBarHeight + Spacing.xl }]}>
          {/* Status chip */}
          <View style={[styles.activeStatusChip, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, ...Shadows.sm }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {activeRequest.status === "pending"
                ? "Finding a provider…"
                : activeRequest.status === "accepted"
                ? `Accepted${activeRequest.provider?.name ? ` · ${activeRequest.provider.name}` : ""}`
                : activeRequest.status === "en_route" || activeRequest.status === "arrived"
                ? `${activeRequest.status === "arrived" ? "Arrived" : "En Route"}${activeRequest.eta ? ` · ${activeRequest.eta} min` : ""}`
                : "Service in progress"}
            </ThemedText>
          </View>
          {/* Track button */}
          <AnimatedPressable
            onPress={() => navigation.navigate("ActiveService")}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            style={[styles.fab, { backgroundColor: theme.success, ...Shadows.xl }, fabAnimatedStyle]}
          >
            <Feather name="navigation" size={22} color="#FFFFFF" />
            <ThemedText type="body" style={styles.fabText}>Track Service</ThemedText>
          </AnimatedPressable>
        </View>
      ) : null}

      {/* Persistent quick-action row — always visible (no active request, no quick card) */}
      {(!activeRequest || activeRequest.status === "completed" || activeRequest.status === "cancelled") &&
      !selectedProvider ? (
        <>
          {/* Ripple burst — screen-level overlay, never interferes with the row layout */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.helpRippleRing,
              {
                backgroundColor: theme.primary,
                bottom: tabBarHeight + Spacing.lg,
                right: helpRippleRight,
              },
              helpRippleStyle,
            ]}
          />
        <View
          style={[
            styles.actionRow,
            { bottom: tabBarHeight + Spacing.lg, backgroundColor: theme.backgroundDefault, ...Shadows.md },
          ]}
        >
          {/* Diagnose chip */}
          <Pressable
            onPress={() => pressAction("diagnose", "SmartDiagnostic")}
            style={[
              styles.actionChip,
              activeAction === "diagnose"
                ? { backgroundColor: theme.secondary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Feather
              name="cpu"
              size={15}
              color={activeAction === "diagnose" ? "#FFF" : theme.secondary}
            />
            <ThemedText
              type="small"
              style={{
                color: activeAction === "diagnose" ? "#FFF" : theme.secondary,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Diagnose
            </ThemedText>
          </Pressable>

          <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />

          {/* Need a Tow chip */}
          <Pressable
            onPress={() => pressAction("tow", "TowRequest")}
            style={[
              styles.actionChip,
              activeAction === "tow"
                ? { backgroundColor: theme.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Feather
              name="truck"
              size={15}
              color={activeAction === "tow" ? "#FFF" : theme.primary}
            />
            <ThemedText
              type="small"
              style={{
                color: activeAction === "tow" ? "#FFF" : theme.primary,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Need a Tow
            </ThemedText>
          </Pressable>

          <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />

          {/* Get Help Fast chip — always filled as the CTA, with spring-launch animation */}
          <AnimatedPressable
            onPress={pressHelpFast}
            style={[
              styles.actionChipPrimary,
              {
                backgroundColor:
                  activeAction === "service"
                    ? theme.primaryDark ?? theme.primary
                    : theme.primary,
              },
              helpBtnAnimStyle,
            ]}
          >
            <Feather name="zap" size={15} color="#FFF" />
            <ThemedText
              type="small"
              style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}
            >
              Get Help Fast
            </ThemedText>
          </AnimatedPressable>
        </View>
        </>
      ) : null}

      {/* Quick request card (appears when marker tapped) */}
      {selectedProvider ? (
        <>
          <Pressable style={styles.quickCardBackdrop} onPress={hideQuickCard} />
          <QuickRequestCard
            provider={selectedProvider}
            isPreferred={isPreferredProvider(selectedProvider.id)}
            slideAnim={slideAnim}
            bottomInset={tabBarHeight}
            onRequestService={() => handleRequestService(selectedProvider.id)}
            onViewProfile={() => {
              hideQuickCard();
              setTimeout(() => navigation.navigate("ProviderDetail", { providerId: selectedProvider.id, providerData: selectedProvider }), 240);
            }}
            onDismiss={hideQuickCard}
          />
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  locatingContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing["2xl"],
  },
  permissionContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing["2xl"],
  },
  permissionButton: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full, marginTop: Spacing.xl,
  },
  mapBackground: { flex: 1, position: "relative", overflow: "hidden" },
  mapGrid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-around" },
  gridLine: { width: 1, height: "100%" },
  userMarker: {
    position: "absolute", top: "50%", left: "50%",
    marginLeft: -20, marginTop: -20, width: 40, height: 40,
    borderRadius: 20, alignItems: "center", justifyContent: "center", zIndex: 10,
  },
  providersOnMap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  providerOnMap: { position: "absolute" },
  webMarker: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  webMapOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  searchBar: {
    position: "absolute", left: Spacing.lg, right: 76,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full, zIndex: 20,
  },
  emergencyButton: {
    position: "absolute", right: Spacing.lg,
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center", zIndex: 20,
  },
  legend: {
    position: "absolute", right: Spacing.lg,
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: BorderRadius.full, zIndex: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  filterRow: { position: "absolute", left: 0, right: 0, zIndex: 10 },
  filterChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  hubContainer: {
    position: "absolute", left: Spacing.lg, right: Spacing.lg,
    overflow: "hidden",
  },
  hubPill: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: HUB_PILL_H,
  },
  hubPillInner: {
    flex: 1, flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.md, gap: Spacing.sm, height: HUB_PILL_H,
  },
  dragHandleZone: {
    // Tappable/swipeable header zone — gesture lives here only
  },
  dragHandleRow: {
    alignItems: "center", paddingTop: 8, paddingBottom: 2,
  },
  dragHandleBar: {
    width: 36, height: 4, borderRadius: 2,
  },
  listHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  onlinePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  listScroll: { maxHeight: 200 },
  emptyState: { padding: Spacing.xl, alignItems: "center" },
  emptyMapCard: { position: "absolute", left: 20, right: 20, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, alignItems: "center", gap: 4 },
  mechanicCard: {
    flexDirection: "row", alignItems: "center",
    padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 0, gap: Spacing.md,
  },
  mechanicIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  mechanicInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  badgesRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  mechanicMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 2 },
  servicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  serviceTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  preferredTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  activeStatusChip: {
    flexDirection: "row", alignItems: "center", gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  fabContainer: {
    position: "absolute", right: Spacing.lg, gap: Spacing.sm, alignItems: "flex-end",
  },
  fab: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  fabText: { color: "#FFFFFF", fontWeight: "700" },
  // Persistent horizontal quick-action row
  helpRippleRing: {
    position: "absolute",
    width: ACTION_ROW_H,
    height: ACTION_ROW_H,
    borderRadius: ACTION_ROW_H / 2,
    zIndex: 49,
  },
  actionRow: {
    position: "absolute", left: Spacing.lg, right: Spacing.lg,
    flexDirection: "row", alignItems: "center",
    borderRadius: BorderRadius.full, overflow: "hidden",
    height: ACTION_ROW_H, zIndex: 50,
  },
  actionChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, height: ACTION_ROW_H, borderRightWidth: 0,
  },
  actionChipPrimary: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, height: ACTION_ROW_H, borderRadius: BorderRadius.full,
  },
  actionDivider: { width: StyleSheet.hairlineWidth, height: 24 },
  // Quick request card
  quickCardBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 },
  quickCard: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 3, zIndex: 40,
  },
  quickCardDismissBar: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  quickCardHandle: { width: 40, height: 4, borderRadius: 2 },
  quickCardHeader: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.md },
  quickCardAvatar: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  quickCardInfo: { flex: 1 },
  quickCardNameRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  quickCardMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: Spacing.sm },
  quickCardRating: { flexDirection: "row", alignItems: "center" },
  quickCardBadges: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  quickCardServices: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  busyNotice: {
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.xs,
    marginHorizontal: Spacing.lg, padding: Spacing.sm,
    borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: Spacing.md,
  },
  quickCardActions: {
    flexDirection: "row", gap: Spacing.sm, paddingHorizontal: Spacing.lg,
  },
  quickCardSecondaryBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1.5,
  },
  quickCardPrimaryBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: Spacing.md, borderRadius: BorderRadius.full, gap: Spacing.xs,
  },
});
