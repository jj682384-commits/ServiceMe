import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import RoleSelectionScreen from "@/screens/RoleSelectionScreen";
import DriverTabNavigator from "@/navigation/DriverTabNavigator";
import ProviderTabNavigator from "@/navigation/ProviderTabNavigator";
import ServiceRequestScreen from "@/screens/ServiceRequestScreen";
import ActiveServiceScreen from "@/screens/ActiveServiceScreen";
import ChatScreen from "@/screens/ChatScreen";

export type RootStackParamList = {
  RoleSelection: undefined;
  DriverTabs: undefined;
  ProviderTabs: undefined;
  ServiceRequest: undefined;
  ActiveService: undefined;
  Chat: { conversationId: string; providerName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="RoleSelection"
        component={RoleSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DriverTabs"
        component={DriverTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProviderTabs"
        component={ProviderTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ServiceRequest"
        component={ServiceRequestScreen}
        options={{
          presentation: "modal",
          headerTitle: "Request Service",
        }}
      />
      <Stack.Screen
        name="ActiveService"
        component={ActiveServiceScreen}
        options={{
          headerTitle: "Service Status",
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          headerTitle: route.params.providerName,
        })}
      />
    </Stack.Navigator>
  );
}
