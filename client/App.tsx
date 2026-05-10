import React, { useEffect, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
import { navigationRef } from "@/lib/navigationRef";
import { getApiUrl } from "@/lib/query-client";

initializeRevenueCat();

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
  return null;
}

export default function App() {
  const colorScheme = useColorScheme();
  const navTheme = colorScheme === "dark" ? DarkNavTheme : LightNavTheme;
  const [stripePublishableKey, setStripePublishableKey] = useState<string>("");
  const [fontsLoaded] = useFonts({
    Exo2_400Regular,
    Exo2_400Regular_Italic,
    Exo2_500Medium,
    Exo2_600SemiBold,
    Exo2_700Bold,
    Exo2_700Bold_Italic,
  });

  useEffect(() => {
    fetch(new URL("/api/stripe/publishable-key", getApiUrl()).toString())
      .then((r) => r.json())
      .then((d) => { if (d.publishableKey) setStripePublishableKey(d.publishableKey); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <StripeWrapper publishableKey={stripePublishableKey}>
        <QueryClientProvider client={queryClient}>
          <SubscriptionProvider>
            <AppProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <NavigationContainer theme={navTheme} ref={navigationRef}>
                    <NotificationSetup />
                    <RootStackNavigator />
                  </NavigationContainer>
                  <StatusBar style="auto" />
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </AppProvider>
          </SubscriptionProvider>
        </QueryClientProvider>
      </StripeWrapper>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
