import React, { useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useActiveJobTracker } from "@/hooks/useActiveJobTracker";

import DriverMapScreen from "@/screens/driver/DriverMapScreen";
import DriverHistoryScreen from "@/screens/driver/DriverHistoryScreen";
import DriverMessagesScreen from "@/screens/driver/DriverMessagesScreen";
import DriverProfileScreen from "@/screens/driver/DriverProfileScreen";
import EVModeScreen from "@/screens/driver/EVModeScreen";
import { HeaderTitle } from "@/components/HeaderTitle";

export type DriverTabParamList = {
  MapTab: undefined;
  EVTab: undefined;
  HistoryTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

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
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <ScreenComponent {...props} />
        </Animated.View>
      </View>
    );
  };
}

const AnimatedDriverMapScreen = withTabAnimation(DriverMapScreen);
const AnimatedEVModeScreen = withTabAnimation(EVModeScreen);
const AnimatedDriverHistoryScreen = withTabAnimation(DriverHistoryScreen);
const AnimatedDriverMessagesScreen = withTabAnimation(DriverMessagesScreen);
const AnimatedDriverProfileScreen = withTabAnimation(DriverProfileScreen);

const Tab = createBottomTabNavigator<DriverTabParamList>();

export default function DriverTabNavigator() {
  const { theme, isDark } = useTheme();
  // Runs on every driver screen — polls job status, fires notifications, handles completion nav
  useActiveJobTracker();

  return (
    <Tab.Navigator
      initialRouteName="MapTab"
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
            web: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          borderTopColor: theme.backgroundRoot,
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
        name="EVTab"
        component={AnimatedEVModeScreen}
        options={{
          title: "EV",
          headerShown: false,
          tabBarActiveTintColor: isDark ? "#00FF88" : "#059669",
          tabBarInactiveTintColor: isDark ? "#6B7280" : "#9CA3AF",
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isDark ? "#0A0E1A" : "#F0F9F4",
            borderTopWidth: 0,
            borderTopColor: isDark ? "#0A0E1A" : "#F0F9F4",
            elevation: 0,
          },
          tabBarIcon: ({ focused, size }) => (
            <Feather name="zap" size={size} color={focused ? (isDark ? "#00FF88" : "#059669") : (isDark ? "#6B7280" : "#9CA3AF")} />
          ),
          tabBarLabel: "EV",
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={AnimatedDriverHistoryScreen}
        options={{
          headerShown: false,
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={AnimatedDriverMapScreen}
        options={{
          title: "Map",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Feather name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={AnimatedDriverMessagesScreen}
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
        component={AnimatedDriverProfileScreen}
        options={{
          headerShown: false,
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
