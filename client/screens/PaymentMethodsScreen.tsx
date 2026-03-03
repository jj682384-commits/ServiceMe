import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, TextInput } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp, PaymentMethod } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const cardBrandLabels: Record<PaymentMethod["type"], string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
};

function PaymentCard({
  method,
  onSetDefault,
  onRemove,
}: {
  method: PaymentMethod;
  onSetDefault: () => void;
  onRemove: () => void;
}) {
  const { theme } = useTheme();

  const handleRemove = () => {
    Alert.alert(
      "Remove Card",
      `Are you sure you want to remove ${cardBrandLabels[method.type]} ending in ${method.last4}?`,
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
              {cardBrandLabels[method.type]}
            </ThemedText>
            {method.isDefault ? (
              <View style={[styles.defaultBadge, { backgroundColor: theme.success + "20" }]}>
                <ThemedText type="small" style={{ color: theme.success, fontWeight: "600", fontSize: 10 }}>
                  Default
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Ending in {method.last4}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Expires {String(method.expiryMonth).padStart(2, "0")}/{method.expiryYear}
          </ThemedText>
        </View>
      </View>
      <View style={styles.cardActions}>
        {!method.isDefault ? (
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
  const { paymentMethods, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [zipCode, setZipCode] = useState("");

  const handleAddCard = () => {
    if (!cardholderName.trim() || !cardNumber.trim() || !expiry.trim() || !zipCode.trim()) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    const parts = expiry.split("/");
    if (parts.length !== 2) {
      Alert.alert("Invalid Expiry", "Please enter expiry as MM/YY.");
      return;
    }

    const month = parseInt(parts[0], 10);
    const year = 2000 + parseInt(parts[1], 10);

    if (month < 1 || month > 12 || isNaN(year)) {
      Alert.alert("Invalid Expiry", "Please enter a valid expiry date.");
      return;
    }

    const last4 = cardNumber.slice(-4);
    const types: PaymentMethod["type"][] = ["visa", "mastercard", "amex", "discover"];
    const detectedType = types[Math.floor(Math.random() * 2)];

    addPaymentMethod({
      type: detectedType,
      last4,
      isDefault: paymentMethods.length === 0,
      expiryMonth: month,
      expiryYear: year,
      cardholderName: cardholderName.trim(),
    });

    setCardholderName("");
    setCardNumber("");
    setExpiry("");
    setZipCode("");
    setShowAddForm(false);
  };

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
        {paymentMethods.map((method) => (
          <PaymentCard
            key={method.id}
            method={method}
            onSetDefault={() => setDefaultPaymentMethod(method.id)}
            onRemove={() => removePaymentMethod(method.id)}
          />
        ))}

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="credit-card" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
              No Payment Methods
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              Add a card to get started
            </ThemedText>
          </View>
        ) : null}

        {showAddForm ? (
          <View style={[styles.addForm, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>
              Add Payment Method
            </ThemedText>

            <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Cardholder Name
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="Full name on card"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="words"
            />

            <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Card Number
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="Card number"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={19}
              secureTextEntry
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Expiry (MM/YY)
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={expiry}
                  onChangeText={setExpiry}
                  placeholder="MM/YY"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Zip Code
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={zipCode}
                  onChangeText={setZipCode}
                  placeholder="Zip code"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <Pressable
                onPress={() => setShowAddForm(false)}
                style={({ pressed }) => [
                  styles.formButton,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAddCard}
                style={({ pressed }) => [
                  styles.formButton,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1, flex: 1 },
                ]}
              >
                <ThemedText type="body" style={{ fontWeight: "600", color: "#FFFFFF" }}>
                  Add Card
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowAddForm(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="plus" size={20} color={theme.secondary} />
            <ThemedText type="body" style={{ color: theme.secondary, fontWeight: "600" }}>
              Add Payment Method
            </ThemedText>
          </Pressable>
        )}
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  cardInfo: {
    flex: 1,
    gap: 2,
  },
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
  addForm: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  inputLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  formRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing["2xl"],
  },
  formButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: Spacing["2xl"],
  },
});
