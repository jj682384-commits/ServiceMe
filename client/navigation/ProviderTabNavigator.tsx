import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
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

function AnimatedTabScreen({ children, isFocused }: { children: React.ReactNode; isFocused: boolean }) {
  const opacity = useSharedValue(isFocused ? 1 : 0);
  const scale = useSharedValue(isFocused ? 1 : 0.96);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      opacity.value = 1;
      scale.value = 1;
      return;
    }
    if (isFocused) {
      opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.8 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = 0.96;
    }
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

function withTabAnimation(ScreenComponent: React.ComponentType<any>) {
  return function WrappedScreen(props: any) {
    const isFocused = props.navigation.isFocused();
    const [focused, setFocused] = React.useState(isFocused);

    React.useEffect(() => {
      const unsubFocus = props.navigation.addListener("focus", () => setFocused(true));
      const unsubBlur = props.navigation.addListener("blur", () => setFocused(false));
      return () => { unsubFocus(); unsubBlur(); };
    }, [props.navigation]);

    return (
      <View style={StyleSheet.absoluteFill}>
        <AnimatedTabScreen isFocused={focused}>
          <ScreenComponent {...props} />
        </AnimatedTabScreen>
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
          headerTitle: () => <HeaderTitle title="ServiceMe" />,
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
          headerTitle: "Messages",
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
          headerTitle: "Profile",
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
