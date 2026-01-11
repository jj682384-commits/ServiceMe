import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import WelcomeScreen from "@/screens/WelcomeScreen";
import SignUpScreen from "@/screens/SignUpScreen";
import SignInScreen from "@/screens/SignInScreen";
import RoleSelectionScreen from "@/screens/RoleSelectionScreen";
import ProviderTypeSelectionScreen from "@/screens/ProviderTypeSelectionScreen";
import DriverTabNavigator from "@/navigation/DriverTabNavigator";
import ProviderTabNavigator from "@/navigation/ProviderTabNavigator";
import ServiceRequestScreen from "@/screens/ServiceRequestScreen";
import ActiveServiceScreen from "@/screens/ActiveServiceScreen";
import ServiceCompletionScreen from "@/screens/ServiceCompletionScreen";
import ChatScreen from "@/screens/ChatScreen";
import LegalDocumentsScreen from "@/screens/LegalDocumentsScreen";
import ReportProblemScreen from "@/screens/ReportProblemScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import SearchRadiusScreen from "@/screens/SearchRadiusScreen";

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: { becomeProvider?: boolean } | undefined;
  SignIn: undefined;
  RoleSelection: undefined;
  ProviderTypeSelection: undefined;
  DriverTabs: undefined;
  ProviderTabs: undefined;
  ServiceRequest: undefined;
  ActiveService: undefined;
  ServiceCompletion: undefined;
  Chat: { conversationId: string; providerName: string };
  LegalDocuments: undefined;
  ReportProblem: undefined;
  EditProfile: undefined;
  SearchRadius: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RoleSelection"
        component={RoleSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProviderTypeSelection"
        component={ProviderTypeSelectionScreen}
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
        name="ServiceCompletion"
        component={ServiceCompletionScreen}
        options={{
          headerTitle: "Complete Service",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          headerTitle: route.params.providerName,
        })}
      />
      <Stack.Screen
        name="LegalDocuments"
        component={LegalDocumentsScreen}
        options={{
          headerTitle: "Legal",
        }}
      />
      <Stack.Screen
        name="ReportProblem"
        component={ReportProblemScreen}
        options={{
          headerTitle: "Report a Problem",
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerTitle: "Edit Profile",
        }}
      />
      <Stack.Screen
        name="SearchRadius"
        component={SearchRadiusScreen}
        options={{
          headerTitle: "Search Radius",
        }}
      />
    </Stack.Navigator>
  );
}
