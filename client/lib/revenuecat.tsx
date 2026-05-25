import React, { createContext, useContext } from "react";
import { Platform, Alert } from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "premium";

function getRevenueCatApiKey(): string | null {
  if (Platform.OS === "web") return REVENUECAT_TEST_API_KEY || null;
  if (__DEV__ || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY || null;
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY || null;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY || null;
  return REVENUECAT_TEST_API_KEY || null;
}

function isPurchasesAvailable(): boolean {
  try {
    return typeof Purchases !== "undefined" && typeof Purchases.configure === "function";
  } catch {
    return false;
  }
}

export function initializeRevenueCat() {
  try {
    if (!isPurchasesAvailable()) {
      console.log("RevenueCat: native module not available (Expo Go), skipping init");
      return;
    }
    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      console.log("RevenueCat: no API key configured, skipping init");
      return;
    }
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    console.log("RevenueCat configured");
  } catch (e) {
    console.warn("RevenueCat init failed:", e);
  }
}

function useSubscriptionContext() {
  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      try {
        if (!isPurchasesAvailable()) return null;
        return await Purchases.getCustomerInfo();
      } catch { return null; }
    },
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      try {
        if (!isPurchasesAvailable()) return null;
        return await Purchases.getOfferings();
      } catch { return null; }
    },
    staleTime: 300 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      if (!isPurchasesAvailable()) throw new Error("not available");
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("usercancel")) return;
      if (
        msg.toLowerCase().includes("browser") ||
        msg.toLowerCase().includes("storekit") ||
        msg.toLowerCase().includes("not available") ||
        msg.toLowerCase().includes("simulator")
      ) {
        Alert.alert(
          "Purchases Not Available",
          "In-app purchases require the App Store version of ResqRide. Download from the App Store to subscribe.",
        );
        return;
      }
      Alert.alert("Purchase Failed", msg || "Something went wrong. Please try again.");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!isPurchasesAvailable()) return null;
      return Purchases.restorePurchases();
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isSubscribed =
    !!customerInfoQuery.data?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];

  const requestPurchase = (pkg: PurchasesPackage) => {
    Alert.alert(
      "Confirm Purchase",
      `${pkg.product.title}\n${pkg.product.priceString}\n\n${pkg.product.description || "Subscribe to unlock all Premium benefits."}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Subscribe",
          onPress: () => purchaseMutation.mutate(pkg),
        },
      ],
    );
  };

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    requestPurchase,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
