import React, { createContext, useContext } from "react";
import { Platform, View, Text, Pressable, StyleSheet, Modal, Alert } from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useState } from "react";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "premium";

function getRevenueCatApiKey() {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat Public API Keys not found");
  }

  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }

  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;

  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat() {
  try {
    const apiKey = getRevenueCatApiKey();
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    console.log("RevenueCat configured");
  } catch (e) {
    console.warn("RevenueCat init failed:", e);
  }
}

function useSubscriptionContext() {
  const [confirmPkg, setConfirmPkg] = useState<PurchasesPackage | null>(null);

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      try { return await Purchases.getCustomerInfo(); } catch { return null; }
    },
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      try { return await Purchases.getOfferings(); } catch { return null; }
    },
    staleTime: 300 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      // User cancelled — no alert needed
      if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("usercancel")) return;
      // Expo Go / Browser mode limitation
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
    mutationFn: async () => Purchases.restorePurchases(),
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isSubscribed =
    !!customerInfoQuery.data?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];

  const requestPurchase = (pkg: PurchasesPackage) => {
    setConfirmPkg(pkg);
  };

  const confirmPurchase = () => {
    if (!confirmPkg) return;
    const pkg = confirmPkg;
    setConfirmPkg(null);
    purchaseMutation.mutate(pkg);
  };

  const cancelPurchase = () => setConfirmPkg(null);

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    requestPurchase,
    confirmPurchase,
    cancelPurchase,
    confirmPkg,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();

  return (
    <Context.Provider value={value}>
      {children}
      <PurchaseConfirmModal
        pkg={value.confirmPkg}
        onConfirm={value.confirmPurchase}
        onCancel={value.cancelPurchase}
        isPurchasing={value.isPurchasing}
      />
    </Context.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}

function PurchaseConfirmModal({
  pkg,
  onConfirm,
  onCancel,
  isPurchasing,
}: {
  pkg: PurchasesPackage | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPurchasing: boolean;
}) {
  if (!pkg) return null;

  return (
    <Modal transparent animationType="fade" visible={!!pkg}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <Text style={modalStyles.title}>Confirm Purchase</Text>
          <Text style={modalStyles.product}>{pkg.product.title}</Text>
          <Text style={modalStyles.price}>{pkg.product.priceString}</Text>
          <Text style={modalStyles.desc}>
            {pkg.product.description || "Subscribe to unlock all Premium benefits."}
          </Text>
          <Pressable
            style={[modalStyles.btn, modalStyles.confirmBtn, isPurchasing && modalStyles.disabled]}
            onPress={onConfirm}
            disabled={isPurchasing}
          >
            <Text style={modalStyles.confirmText}>{isPurchasing ? "Processing..." : "Subscribe"}</Text>
          </Pressable>
          <Pressable style={[modalStyles.btn, modalStyles.cancelBtn]} onPress={onCancel}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  product: {
    color: "#00AAFF",
    fontSize: 16,
    fontWeight: "600",
  },
  price: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  desc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  btn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtn: {
    backgroundColor: "#00AAFF",
  },
  cancelBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  confirmText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});
