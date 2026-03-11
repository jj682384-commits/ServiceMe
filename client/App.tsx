import React from "react";
import { StyleSheet, useColorScheme, View, Text } from "react-native";
import { StatusBar } from "expo-status-bar";

let NavigationContainer: any;
let DefaultTheme: any;
let DarkTheme: any;
let GestureHandlerRootView: any;
let KeyboardProvider: any;
let SafeAreaProvider: any;
let QueryClientProvider: any;
let queryClient: any;
let RootStackNavigator: any;
let ErrorBoundaryComp: any;
let KeyboardDismissButton: any;
let AppProvider: any;
let Colors: any;

const errors: string[] = [];

try { const m = require("@react-navigation/native"); NavigationContainer = m.NavigationContainer; DefaultTheme = m.DefaultTheme; DarkTheme = m.DarkTheme; } catch (e: any) { errors.push("nav: " + e.message); }
try { GestureHandlerRootView = require("react-native-gesture-handler").GestureHandlerRootView; } catch (e: any) { errors.push("gesture: " + e.message); }
try { KeyboardProvider = require("react-native-keyboard-controller").KeyboardProvider; } catch (e: any) { errors.push("keyboard: " + e.message); }
try { SafeAreaProvider = require("react-native-safe-area-context").SafeAreaProvider; } catch (e: any) { errors.push("safearea: " + e.message); }
try { const m = require("@tanstack/react-query"); QueryClientProvider = m.QueryClientProvider; } catch (e: any) { errors.push("query: " + e.message); }
try { queryClient = require("@/lib/query-client").queryClient; } catch (e: any) { errors.push("queryclient: " + e.message); }
try { RootStackNavigator = require("@/navigation/RootStackNavigator").default; } catch (e: any) { errors.push("navigator: " + e.message); }
try { ErrorBoundaryComp = require("@/components/ErrorBoundary").ErrorBoundary; } catch (e: any) { errors.push("errorboundary: " + e.message); }
try { KeyboardDismissButton = require("@/components/KeyboardDismissButton").KeyboardDismissButton; } catch (e: any) { errors.push("kbdismiss: " + e.message); }
try { AppProvider = require("@/context/AppContext").AppProvider; } catch (e: any) { errors.push("appcontext: " + e.message); }
try { Colors = require("@/constants/theme").Colors; } catch (e: any) { errors.push("theme: " + e.message); }

export default function App() {
  if (errors.length > 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111827", padding: 20 }}>
        <Text style={{ color: "#EF4444", fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>Import Errors ({errors.length})</Text>
        {errors.map((e, i) => (
          <Text key={i} style={{ color: "#FCA5A5", fontSize: 12, marginBottom: 8, textAlign: "left", width: "100%" }}>{e}</Text>
        ))}
      </View>
    );
  }

  const colorScheme = useColorScheme();

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

  const navTheme = colorScheme === "dark" ? DarkNavTheme : LightNavTheme;

  return (
    <ErrorBoundaryComp>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                <NavigationContainer theme={navTheme}>
                  <RootStackNavigator />
                  <KeyboardDismissButton />
                </NavigationContainer>
                <StatusBar style="auto" />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundaryComp>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
