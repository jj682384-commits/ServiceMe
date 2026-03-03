import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

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

const Tab = createBottomTabNavigator<DriverTabParamList>();

export default function DriverTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="MapTab"
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
        name="MapTab"
        component={DriverMapScreen}
        options={{
          title: "Map",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Feather name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EVTab"
        component={EVModeScreen}
        options={{
          title: "EV",
          headerShown: false,
          tabBarActiveTintColor: "#00FF88",
          tabBarInactiveTintColor: "#6B7280",
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "#0A0E1A",
            borderTopWidth: 0,
            borderTopColor: "#0A0E1A",
            elevation: 0,
          },
          tabBarIcon: ({ focused, size }) => (
            <Feather name="zap" size={size} color={focused ? "#00FF88" : "#6B7280"} />
          ),
          tabBarLabel: "EV",
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={DriverHistoryScreen}
        options={{
          headerTitle: () => <HeaderTitle iconOnly />,
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={DriverMessagesScreen}
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
        component={DriverProfileScreen}
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
