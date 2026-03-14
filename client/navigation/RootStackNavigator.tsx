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
import SupportScreen from "@/screens/SupportScreen";
import TowRequestScreen from "@/screens/TowRequestScreen";
import PremiumUpgradeScreen from "@/screens/PremiumUpgradeScreen";
import BrowseProvidersScreen from "@/screens/BrowseProvidersScreen";
import ProviderDetailScreen from "@/screens/ProviderDetailScreen";
import SmartDiagnosticScreen from "@/screens/SmartDiagnosticScreen";
import EmergencyModeScreen from "@/screens/EmergencyModeScreen";
import VehicleManagementScreen from "@/screens/VehicleManagementScreen";
import EVMobileChargeScreen from "@/screens/ev/EVMobileChargeScreen";
import EVTowScreen from "@/screens/ev/EVTowScreen";
import EVRangeAlertScreen from "@/screens/ev/EVRangeAlertScreen";
import EVAddVehicleScreen from "@/screens/ev/EVAddVehicleScreen";
import EVDiagnosticScreen from "@/screens/ev/EVDiagnosticScreen";
import EVChargerMapScreen from "@/screens/ev/EVChargerMapScreen";
import PreferredProvidersScreen from "@/screens/PreferredProvidersScreen";
import PaymentMethodsScreen from "@/screens/PaymentMethodsScreen";
import BillingHistoryScreen from "@/screens/BillingHistoryScreen";
import ServiceDetailScreen from "@/screens/ServiceDetailScreen";
import ProviderSignUpScreen from "@/screens/ProviderSignUpScreen";
import BackgroundSettingsScreen from "@/screens/BackgroundSettingsScreen";
import ProviderActiveJobScreen from "@/screens/provider/ProviderActiveJobScreen";
import ProviderPaymentSettingsScreen from "@/screens/provider/ProviderPaymentSettingsScreen";
import ProviderEarningsHistoryScreen from "@/screens/provider/ProviderEarningsHistoryScreen";
import ProviderVehicleScreen from "@/screens/provider/ProviderVehicleScreen";

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  RoleSelection: undefined;
  ProviderTypeSelection: undefined;
  DriverTabs: undefined;
  ProviderTabs: undefined;
  SmartDiagnostic: undefined;
  ServiceRequest: { providerId?: string; serviceType?: string; notes?: string } | undefined;
  ActiveService: undefined;
  ServiceCompletion: undefined;
  Chat: { conversationId: string; providerName: string };
  LegalDocuments: { initialTab?: "privacy" | "terms" | "liability" } | undefined;
  ReportProblem: undefined;
  EditProfile: undefined;
  SearchRadius: undefined;
  Support: undefined;
  TowRequest: undefined;
  PremiumUpgrade: undefined;
  BrowseProviders: undefined;
  ProviderDetail: { providerId: string };
  EmergencyMode: undefined;
  VehicleManagement: undefined;
  EVMobileCharge: undefined;
  EVTow: undefined;
  EVRangeAlert: undefined;
  EVAddVehicle: undefined;
  EVDiagnostic: undefined;
  EVChargerMap: undefined;
  ProviderSignUp: { providerType: "independent" | "shop" };
  PreferredProviders: undefined;
  PaymentMethods: undefined;
  BillingHistory: undefined;
  ServiceDetail: { requestId: string };
  BackgroundSettings: undefined;
  ProviderActiveJob: undefined;
  ProviderPaymentSettings: undefined;
  ProviderEarningsHistory: undefined;
  ProviderVehicle: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="RoleSelection"
        component={RoleSelectionScreen}
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="ProviderTypeSelection"
        component={ProviderTypeSelectionScreen}
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="DriverTabs"
        component={DriverTabNavigator}
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="ProviderTabs"
        component={ProviderTabNavigator}
        options={{ headerShown: false, animation: "fade" }}
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
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{
          headerTitle: "Help & Support",
        }}
      />
      <Stack.Screen
        name="TowRequest"
        component={TowRequestScreen}
        options={{
          presentation: "modal",
          headerTitle: "Tow Service",
        }}
      />
      <Stack.Screen
        name="PremiumUpgrade"
        component={PremiumUpgradeScreen}
        options={{
          presentation: "modal",
          headerTitle: "Go Premium",
        }}
      />
      <Stack.Screen
        name="BrowseProviders"
        component={BrowseProvidersScreen}
        options={{
          headerTitle: "Browse Providers",
        }}
      />
      <Stack.Screen
        name="ProviderDetail"
        component={ProviderDetailScreen}
        options={{
          headerTitle: "Provider Details",
        }}
      />
      <Stack.Screen
        name="SmartDiagnostic"
        component={SmartDiagnosticScreen}
        options={{
          presentation: "modal",
          headerTitle: "Smart Diagnostic",
        }}
      />
      <Stack.Screen
        name="EmergencyMode"
        component={EmergencyModeScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="VehicleManagement"
        component={VehicleManagementScreen}
        options={{
          headerTitle: "My Vehicles",
        }}
      />
      <Stack.Screen
        name="EVMobileCharge"
        component={EVMobileChargeScreen}
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="EVTow"
        component={EVTowScreen}
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="EVRangeAlert"
        component={EVRangeAlertScreen}
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="EVAddVehicle"
        component={EVAddVehicleScreen}
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="EVDiagnostic"
        component={EVDiagnosticScreen}
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="EVChargerMap"
        component={EVChargerMapScreen}
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="ProviderSignUp"
        component={ProviderSignUpScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="PreferredProviders"
        component={PreferredProvidersScreen}
        options={{
          headerTitle: "Preferred Providers",
        }}
      />
      <Stack.Screen
        name="ServiceDetail"
        component={ServiceDetailScreen}
        options={{
          headerTitle: "Service Details",
        }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{
          headerTitle: "Payment Methods",
        }}
      />
      <Stack.Screen
        name="BillingHistory"
        component={BillingHistoryScreen}
        options={{
          headerTitle: "Billing History",
        }}
      />
      <Stack.Screen
        name="BackgroundSettings"
        component={BackgroundSettingsScreen}
        options={{
          headerTitle: "Background",
        }}
      />
      <Stack.Screen
        name="ProviderActiveJob"
        component={ProviderActiveJobScreen}
        options={{
          headerTitle: "Active Job",
        }}
      />
      <Stack.Screen
        name="ProviderPaymentSettings"
        component={ProviderPaymentSettingsScreen}
        options={{
          headerTitle: "Payout Settings",
        }}
      />
      <Stack.Screen
        name="ProviderEarningsHistory"
        component={ProviderEarningsHistoryScreen}
        options={{
          headerTitle: "Earnings History",
        }}
      />
      <Stack.Screen
        name="ProviderVehicle"
        component={ProviderVehicleScreen}
        options={{
          headerTitle: "My Vehicle",
        }}
      />
    </Stack.Navigator>
  );
}
