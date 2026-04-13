import React, { useRef, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  View,
  Pressable,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, ServiceStatus } from "@/context/AppContext";
import { useChatNotifier } from "@/hooks/useChatNotifier";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

import ProviderDashboardScreen from "@/screens/provider/ProviderDashboardScreen";
import ProviderJobsScreen from "@/screens/provider/ProviderJobsScreen";
import ProviderMessagesScreen from "@/screens/provider/ProviderMessagesScreen";
import ProviderProfileScreen from "@/screens/provider/ProviderProfileScreen";

export type ProviderTabParamList = {
  DashboardTab: undefined;
  JobsTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

// Active statuses where the banner should appear
const ACTIVE_STATUSES: ServiceStatus[] = ["accepted", "en_route", "arrived", "in_progress"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  accepted:    { label: "Job Accepted",  color: "#3B82F6", icon: "check-circle" },
  en_route:    { label: "En Route",      color: "#F59E0B", icon: "navigation"   },
  arrived:     { label: "Arrived",       color: "#22C55E", icon: "map-pin"      },
  in_progress: { label: "In Progress",   color: "#8B5CF6", icon: "tool"         },
};

const SERVICE_LABELS: Partial<Record<ServiceType, string>> = {
  flat_tire:      "Flat Tire",
  jump_start:     "Jump Start",
  tow:            "Tow Service",
  fuel:           "Fuel Delivery",
  lockout:        "Lockout",
  obd_diagnostic: "OBD Diagnostic",
};

function ActiveJobBanner() {
  const { theme } = useTheme();
  const { activeRequest } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  // Pulse animation for the live dot
  const pulse = useRef(new Animated.Value(1)).current;

  const isActive =
    !!activeRequest && ACTIVE_STATUSES.includes(activeRequest.status as ServiceStatus);

  useEffect(() => {
    if (!isActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.8, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive]);

  if (!isActive || !activeRequest) return null;

  const config = STATUS_CONFIG[activeRequest.status] ?? STATUS_CONFIG.accepted;
  const serviceLabel = SERVICE_LABELS[activeRequest.serviceType as ServiceType] ?? activeRequest.serviceType;
  const driverName = (activeRequest.driver as any)?.name ?? null;

  // Sit just above the tab bar: 49px tab bar + bottom inset
  const bannerBottom = insets.bottom + 58;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        navigation.navigate("ProviderActiveJob");
      }}
      style={[
        styles.banner,
        {
          bottom: bannerBottom,
          backgroundColor: theme.backgroundDefault,
          borderLeftWidth: 4,
          borderLeftColor: config.color,
          ...Shadows.lg,
        },
      ]}
    >
      {/* Animated pulse ring */}
      <View style={styles.dotWrapper}>
        <Animated.View
          style={[
            styles.pulseDot,
            { backgroundColor: config.color + "40", transform: [{ scale: pulse }] },
          ]}
        />
        <View style={[styles.coreDot, { backgroundColor: config.color }]} />
      </View>

      <View style={styles.bannerText}>
        <View style={styles.bannerRow}>
          <Feather name={config.icon} size={13} color={config.color} />
          <ThemedText type="small" style={{ color: config.color, fontWeight: "700", marginLeft: 4 }}>
            {config.label}
          </ThemedText>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {serviceLabel}
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 1 }}>
          {driverName ? `Driver: ${driverName}` : "Tap to return to active job"}
        </ThemedText>
      </View>

      <View style={[styles.resumeChip, { backgroundColor: config.color }]}>
        <ThemedText type="small" style={{ color: "#FFF", fontWeight: "700", fontSize: 11 }}>
          Resume
        </ThemedText>
        <Feather name="chevron-right" size={13} color="#FFF" />
      </View>
    </Pressable>
  );
}

function withTabAnimation(ScreenComponent: React.ComponentType<any>) {
  return function WrappedScreen(props: any) {
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);
    const prevTabIndex = useRef<number | null>(null);

    React.useEffect(() => {
      const unsubFocus = props.navigation.addListener("focus", () => {
        const parent = props.navigation.getParent();
        const tabState = parent?.getState();
        const currentIndex = tabState?.index ?? -1;
        if (prevTabIndex.current !== null && prevTabIndex.current !== currentIndex) {
          opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
          scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.8 });
        }
        prevTabIndex.current = currentIndex;
      });
      const unsubBlur = props.navigation.addListener("blur", () => {
        const parent = props.navigation.getParent();
        const tabState = parent?.getState();
        const currentIndex = tabState?.index ?? -1;
        if (prevTabIndex.current !== null && prevTabIndex.current !== currentIndex) {
          opacity.value = withTiming(0, { duration: 150 });
          scale.value = 0.96;
          prevTabIndex.current = currentIndex;
        }
      });
      return () => { unsubFocus(); unsubBlur(); };
    }, [props.navigation]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    return (
      <View style={StyleSheet.absoluteFill}>
        <ReAnimated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <ScreenComponent {...props} />
        </ReAnimated.View>
      </View>
    );
  };
}

const AnimatedProviderDashboardScreen = withTabAnimation(ProviderDashboardScreen);
const AnimatedProviderJobsScreen = withTabAnimation(ProviderJobsScreen);
const AnimatedProviderMessagesScreen = withTabAnimation(ProviderMessagesScreen);
const AnimatedProviderProfileScreen = withTabAnimation(ProviderProfileScreen);

const Tab = createBottomTabNavigator<ProviderTabParamList>();

export default function ProviderTabNavigator() {
  const { theme, isDark } = useTheme();
  const { activeRequest } = useApp();

  // Background chat watcher — notifies when driver sends a message while not on ChatScreen
  useChatNotifier({
    conversationId: activeRequest?.id ?? null,
    myRole: "provider",
    peerName: activeRequest?.driver?.name ?? "Driver",
  });

  const hasActiveJob =
    !!activeRequest && ACTIVE_STATUSES.includes(activeRequest.status as ServiceStatus);

  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="DashboardTab"
        screenListeners={{
          tabPress: () => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        }}
        screenOptions={{
          tabBarActiveTintColor: theme.tabIconSelected,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: Platform.select({
              ios: "transparent",
              android: theme.backgroundRoot,
            }),
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
          headerTitleAlign: "center",
          headerTransparent: true,
          headerTintColor: theme.text,
          headerStyle: {
            backgroundColor: Platform.select({
              ios: "transparent",
              android: theme.backgroundRoot,
              web: theme.backgroundRoot,
            }),
          },
          headerBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null,
        }}
      >
        <Tab.Screen
          name="DashboardTab"
          component={AnimatedProviderDashboardScreen}
          options={{
            headerShown: false,
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="JobsTab"
          component={AnimatedProviderJobsScreen}
          options={{
            headerTitle: "Available Jobs",
            title: "Jobs",
            tabBarBadge: hasActiveJob ? " " : undefined,
            tabBarBadgeStyle: {
              backgroundColor: STATUS_CONFIG[activeRequest?.status ?? "accepted"]?.color ?? "#3B82F6",
              minWidth: 10,
              height: 10,
              borderRadius: 5,
              fontSize: 1,
            },
            tabBarIcon: ({ color, size }) => (
              <Feather name="briefcase" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="MessagesTab"
          component={AnimatedProviderMessagesScreen}
          options={{
            headerShown: false,
            title: "Messages",
            tabBarIcon: ({ color, size }) => (
              <Feather name="message-circle" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={AnimatedProviderProfileScreen}
          options={{
            headerShown: false,
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      {/* Floating active-job banner — sits above the tab bar on every screen */}
      <ActiveJobBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Banner
  banner: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    zIndex: 100,
  },
  dotWrapper: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDot: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  coreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bannerText: {
    flex: 1,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    width: 1,
    height: 10,
    marginHorizontal: Spacing.xs,
  },
  resumeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
});
