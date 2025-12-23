import React from "react";
import { View, StyleSheet, Platform } from "react-native";
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
import { Pressable } from "react-native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { nearbyProviders, activeRequest } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapPlaceholder}>
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
            {nearbyProviders.slice(0, 3).map((provider, index) => (
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
        </View>

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
            Enter your location
          </ThemedText>
          <Feather name="map-pin" size={20} color={theme.primary} />
        </View>
      </View>

      {activeRequest ? (
        <Pressable
          onPress={handleViewActiveService}
          style={[
            styles.activeServiceBar,
            {
              bottom: tabBarHeight + Spacing.lg,
              backgroundColor: theme.backgroundDefault,
              ...Shadows.card,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: theme.warning }]} />
          <View style={styles.activeServiceInfo}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Service in Progress
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {activeRequest.provider?.name} is on the way
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={24} color={theme.textSecondary} />
        </Pressable>
      ) : null}

      {!activeRequest ? (
        <AnimatedPressable
          onPress={handleRequestService}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={[
            styles.fab,
            {
              bottom: tabBarHeight + Spacing.xl,
              backgroundColor: theme.primary,
              ...Shadows.fab,
            },
            fabAnimatedStyle,
          ]}
        >
          <Feather name="alert-circle" size={28} color="#FFFFFF" />
          <ThemedText type="body" style={styles.fabText}>
            Request Help
          </ThemedText>
        </AnimatedPressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    position: "relative",
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
    alignItems: "center",
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
  fab: {
    position: "absolute",
    right: Spacing.lg,
    left: Spacing.lg,
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
