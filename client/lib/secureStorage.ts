import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "sm_auth_token";

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  }
}

export async function loadAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(TOKEN_KEY);
  } else {
    try {
      const val = await SecureStore.getItemAsync(TOKEN_KEY);
      if (val) return val;
    } catch {}
    return AsyncStorage.getItem(TOKEN_KEY);
  }
}

export async function deleteAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}
