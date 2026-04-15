import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, Platform, ActivityIndicator } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStripe } from "@stripe/stripe-react-native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

interface StripeCard {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: { name?: string };
}

function brandIcon(brand: string): string {
  switch (brand.toLowerCase()) {
    case "visa": return "Visa";
    case "mastercard": return "Mastercard";
    case "amex": return "Amex";
    case "discover": return "Discover";
    default: return brand.charAt(0).toUpperCase() + brand.slice(1);
  }
}

function PaymentCard({
  method,
  isDefault,
  onSetDefault,
  onRemove,
}: {
  method: StripeCard;
  isDefault: boolean;
  onSetDefault: () => void;
  onRemove: () => void;
}) {
  const { theme } = useTheme();

  const handleRemove = () => {
    Alert.alert(
      "Remove Card",
      `Remove ${brandIcon(method.card.brand)} ending in ${method.card.last4}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: onRemove },
      ]
    );
  };

  return (
    <View style={[styles.cardItem, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: theme.secondary + "15" }]}>
          <Feather name="credit-card" size={24} color={theme.secondary} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {brandIcon(method.card.brand)}
            </ThemedText>
            {isDefault ? (
              <View style={[styles.defaultBadge, { backgroundColor: theme.success + "20" }]}>
                <ThemedText type="small" style={{ color: theme.success, fontWeight: "600", fontSize: 10 }}>
                  Default
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Ending in {method.card.last4}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Expires {String(method.card.exp_month).padStart(2, "0")}/{method.card.exp_year}
          </ThemedText>
        </View>
      </View>
      <View style={styles.cardActions}>
        {!isDefault ? (
          <Pressable
            onPress={onSetDefault}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.secondary + "15", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "600" }}>
              Set as Default
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleRemove}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.error + "15", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="trash-2" size={14} color={theme.error} />
          <ThemedText type="small" style={{ color: theme.error, fontWeight: "600" }}>
            Remove
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default function PaymentMethodsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const qc = useQueryClient();

  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [addingCard, setAddingCard] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/stripe/payment-methods"],
    select: (d: { paymentMethods: StripeCard[] }) => d.paymentMethods ?? [],
  });

  const paymentMethods: StripeCard[] = data ?? [];

  const removeMutation = useMutation({
    mutationFn: (pmId: string) => apiRequest("DELETE", `/api/stripe/payment-methods/${pmId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/stripe/payment-methods"] }),
    onError: () => Alert.alert("Error", "Could not remove card. Please try again."),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (pmId: string) =>
      apiRequest("POST", "/api/stripe/payment-methods/set-default", { paymentMethodId: pmId }),
    onSuccess: (_data, pmId) => setDefaultId(pmId),
    onError: () => Alert.alert("Error", "Could not update default card."),
  });

  const handleAddCard = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Use Mobile App", "Adding cards is available in the iOS/Android app.");
      return;
    }
    setAddingCard(true);
    try {
      const publishableKeyRes = await fetch(new URL("/api/stripe/publishable-key", getApiUrl()).toString());
      const { publishableKey } = await publishableKeyRes.json();

      const setupRes = await apiRequest("POST", "/api/stripe/setup-intent", {});
      const { clientSecret, customerId } = (await setupRes.json()) as { clientSecret: string; customerId: string };

      const ephemeralRes = await apiRequest("POST", "/api/stripe/ephemeral-key", { apiVersion: "2024-04-10" });
      const { ephemeralKey } = (await ephemeralRes.json()) as { ephemeralKey: string };

      const { error: initError } = await initPaymentSheet({
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        setupIntentClientSecret: clientSecret,
        merchantDisplayName: "ResqRide",
        returnURL: "resqride://stripe-redirect",
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: { address: { country: "US" } },
      });

      if (initError) {
        Alert.alert("Error", initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Error", presentError.message);
        }
        return;
      }

      await qc.invalidateQueries({ queryKey: ["/api/stripe/payment-methods"] });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not add card. Please try again.");
    } finally {
      setAddingCard(false);
    }
  }, [initPaymentSheet, presentPaymentSheet, qc]);

  const effectiveDefaultId = defaultId ?? (paymentMethods[0]?.id ?? null);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Loading payment methods...
            </ThemedText>
          </View>
        ) : null}

        {!isLoading && paymentMethods.map((method) => (
          <PaymentCard
            key={method.id}
            method={method}
            isDefault={method.id === effectiveDefaultId}
            onSetDefault={() => setDefaultMutation.mutate(method.id)}
            onRemove={() => removeMutation.mutate(method.id)}
          />
        ))}

        {!isLoading && paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="credit-card" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
              No Payment Methods
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              Add a card to pay for services
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          onPress={handleAddCard}
          disabled={addingCard}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border, opacity: pressed || addingCard ? 0.6 : 1 },
          ]}
        >
          {addingCard ? (
            <ActivityIndicator size="small" color={theme.secondary} />
          ) : (
            <Feather name="plus" size={20} color={theme.secondary} />
          )}
          <ThemedText type="body" style={{ color: theme.secondary, fontWeight: "600" }}>
            {addingCard ? "Opening card form..." : "Add Payment Method"}
          </ThemedText>
        </Pressable>

        {Platform.OS === "web" ? (
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
            Open in the iOS or Android app to add a card
          </ThemedText>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cardItem: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, gap: 2 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  defaultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: Spacing["2xl"],
  },
  loadingState: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: Spacing.xl,
  },
});
