import React, { useEffect, useState } from "react";
import { StyleSheet, Platform, View } from "react-native";
import { SplashAnimation } from "@/components/SplashAnimation";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import StripeWrapper from "@/components/StripeWrapper";
import { useFonts, Exo2_400Regular, Exo2_400Regular_Italic, Exo2_500Medium, Exo2_600SemiBold, Exo2_700Bold, Exo2_700Bold_Italic } from "@expo-google-fonts/exo-2";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { Colors } from "@/constants/theme";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useProviderJobAlerts } from "@/hooks/useProviderJobAlerts";
import { navigationRef } from "@/lib/navigationRef";
import { getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { requestNotificationPermission } from "@/lib/notifications";

initializeRevenueCat();

// Request notification permission as early as possible so local notifications
// work for both drivers and providers regardless of push-token availability.
requestNotificationPermission().catch(() => {});

const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.backgroundRoot,
    card: Colors.light.backgroundRoot,
    border: Colors.light.border,
    text: Colors.light.text,
    primary: Colors.light.primary,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.backgroundRoot,
    card: Colors.dark.backgroundRoot,
    border: Colors.dark.border,
    text: Colors.dark.text,
    primary: Colors.dark.primary,
  },
};

function NotificationSetup() {
  usePushNotifications();
  useProviderJobAlerts();
  return null;
}

function AppInner({ stripePublishableKey }: { stripePublishableKey: string }) {
  const { isDark } = useTheme();
  const navTheme = isDark ? DarkNavTheme : LightNavTheme;

  return (
    <StripeWrapper publishableKey={stripePublishableKey}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <GestureHandlerRootView style={styles.root}>
            <NavigationContainer theme={navTheme} ref={navigationRef}>
              <NotificationSetup />
              <RootStackNavigator />
            </NavigationContainer>
            <StatusBar style={isDark ? "light" : "dark"} />
          </GestureHandlerRootView>
        </KeyboardProvider>
      </SafeAreaProvider>
    </StripeWrapper>
  );
}

export default function App() {
  const [stripePublishableKey, setStripePublishableKey] = useState<string>("");
  const [showSplash, setShowSplash] = useState(Platform.OS !== "web");
  const [fontsLoaded, fontError] = useFonts({
    Exo2_400Regular,
    Exo2_400Regular_Italic,
    Exo2_500Medium,
    Exo2_600SemiBold,
    Exo2_700Bold,
    Exo2_700Bold_Italic,
  });

  // Safety net: hide the native splash as soon as fonts are ready (or fail),
  // so the app never freezes if SplashAnimation fails to mount for any reason.
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    fetch(new URL("/api/stripe/publishable-key", getApiUrl()).toString())
      .then((r) => r.json())
      .then((d) => { if (d.publishableKey) setStripePublishableKey(d.publishableKey); })
      .catch(() => {});
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={styles.root}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SubscriptionProvider>
            <AppProvider>
              <AppInner stripePublishableKey={stripePublishableKey} />
            </AppProvider>
          </SubscriptionProvider>
        </QueryClientProvider>
      </ErrorBoundary>
      {showSplash && (
        <SplashAnimation onFinish={() => setShowSplash(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
