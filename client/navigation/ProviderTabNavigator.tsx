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

import ProviderDashboardScreen from "@/screens/provider/ProviderDashboardScreen";
import ProviderJobsScreen from "@/screens/provider/ProviderJobsScreen";
import ProviderMessagesScreen from "@/screens/provider/ProviderMessagesScreen";
import ProviderProfileScreen from "@/screens/provider/ProviderProfileScreen";
import { HeaderTitle } from "@/components/HeaderTitle";

export type ProviderTabParamList = {
  DashboardTab: undefined;
  JobsTab: undefined;
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

const AnimatedProviderDashboardScreen = withTabAnimation(ProviderDashboardScreen);
const AnimatedProviderJobsScreen = withTabAnimation(ProviderJobsScreen);
const AnimatedProviderMessagesScreen = withTabAnimation(ProviderMessagesScreen);
const AnimatedProviderProfileScreen = withTabAnimation(ProviderProfileScreen);

const Tab = createBottomTabNavigator<ProviderTabParamList>();

export default function ProviderTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
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
  );
}
