import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface SavedBankAccount {
  bankName: string;
  accountType: "checking" | "savings";
  accountHolderName: string;
  routingLast4: string;
  accountLast4: string;
}

type PayoutSchedule = "daily" | "weekly" | "instant";

export default function ProviderPaymentSettingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { currentProvider } = useApp();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const bankQueryKey = `/api/providers/${currentProvider?.id}/payout-bank`;

  const { data: bankData, isLoading: bankLoading } = useQuery<{ bankAccount: SavedBankAccount | null }>({
    queryKey: [bankQueryKey],
    enabled: !!currentProvider?.id,
  });
  const savedBank = bankData?.bankAccount ?? null;

  const saveBankMutation = useMutation({
    mutationFn: async (payload: {
      bankName: string; accountType: string; accountHolderName: string;
      routingNumber: string; accountNumber: string;
    }) => {
      const res = await apiRequest("POST", `/api/providers/${currentProvider!.id}/payout-bank`, payload);
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to save bank account"); }
      return res.json() as Promise<{ bankAccount: SavedBankAccount }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [bankQueryKey] });
      setShowAddForm(false);
      setBankName(""); setAccountHolderName(""); setRoutingNumber(""); setAccountNumber("");
      Alert.alert("Saved", "Your bank account has been saved for payouts.");
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const removeBankMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/providers/${currentProvider!.id}/payout-bank`, {});
      if (!res.ok) throw new Error("Failed to remove bank account");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [bankQueryKey] }),
    onError: () => Alert.alert("Error", "Could not remove bank account. Please try again."),
  });

  const acceptsPriority = currentProvider?.acceptsPriorityJobs;

  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule>("weekly");
  const [taxSSN, setTaxSSN] = useState("");
  const [showSSN, setShowSSN] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking");

  const scheduleOptions: { key: PayoutSchedule; label: string; sublabel: string }[] = [
    { key: "daily", label: "Daily", sublabel: "Every business day" },
    { key: "weekly", label: "Weekly", sublabel: "Every Friday" },
    { key: "instant", label: "Instant", sublabel: "1.5% fee applies" },
  ];

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
        {/* ── Earnings & Cash Out Link ── */}
        <Pressable
          onPress={() => navigation.navigate("ProviderEarningsHistory")}
          style={({ pressed }) => [
            styles.earningsLink,
            { backgroundColor: theme.success, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.earningsLinkIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Feather name="trending-up" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "800" }}>
              Earnings & Cash Out
            </ThemedText>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
              View balance and transfer funds anytime
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>

        {/* ── How Payouts Work ── */}
        <View style={[styles.payoutInfoCard, { backgroundColor: theme.secondary + "12", borderColor: theme.secondary + "30" }]}>
          <View style={styles.payoutInfoRow}>
            <View style={[styles.payoutInfoIcon, { backgroundColor: theme.secondary + "20" }]}>
              <Feather name="dollar-sign" size={20} color={theme.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "700", color: theme.secondary }}>
                How Payouts Work
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2, lineHeight: 18 }}>
                Earnings are credited to your balance instantly when a job is finalized. Cash out anytime — Standard (free, 1-2 days) or Instant (30 min, 1.5% fee).
              </ThemedText>
            </View>
          </View>
          <View style={[styles.payoutInfoDivider, { backgroundColor: theme.secondary + "20" }]} />
          <View style={styles.payoutInfoSteps}>
            {[
              { icon: "check-circle" as const, text: "Complete a service request" },
              { icon: "zap" as const, text: "Earnings added to your balance immediately" },
              { icon: "arrow-up-circle" as const, text: "Cash out on your schedule, anytime" },
            ].map((step, i) => (
              <View key={i} style={styles.payoutInfoStep}>
                <Feather name={step.icon} size={14} color={theme.secondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
                  {step.text}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* ── Bank Account ── */}
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PAYOUT BANK ACCOUNT
          </ThemedText>

          {bankLoading ? (
            <View style={styles.bankLoadingRow}>
              <ActivityIndicator size="small" color={theme.secondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                Loading account info...
              </ThemedText>
            </View>
          ) : savedBank ? (
            <View style={[styles.bankAccountRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <View style={[styles.bankIcon, { backgroundColor: theme.secondary + "15" }]}>
                <Feather name="home" size={20} color={theme.secondary} />
              </View>
              <View style={styles.bankAccountInfo}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{savedBank.bankName}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {savedBank.accountHolderName}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {savedBank.accountType === "checking" ? "Checking" : "Savings"} •••• {savedBank.accountLast4}
                  {"  "}Routing •••• {savedBank.routingLast4}
                </ThemedText>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert("Remove Bank Account", "Are you sure you want to remove this bank account?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => removeBankMutation.mutate() },
                  ])
                }
                disabled={removeBankMutation.isPending}
                style={({ pressed }) => [
                  styles.removeButton,
                  { backgroundColor: theme.error + "15", opacity: pressed || removeBankMutation.isPending ? 0.6 : 1 },
                ]}
              >
                {removeBankMutation.isPending ? (
                  <ActivityIndicator size="small" color={theme.error} />
                ) : (
                  <Feather name="trash-2" size={14} color={theme.error} />
                )}
              </Pressable>
            </View>
          ) : !showAddForm ? (
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={({ pressed }) => [
                styles.addBankButton,
                { borderColor: theme.secondary + "60", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="plus" size={16} color={theme.secondary} />
              <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "600" }}>
                Add Bank Account
              </ThemedText>
            </Pressable>
          ) : null}

          {showAddForm ? (
            <View style={[styles.addForm, { borderTopColor: savedBank ? theme.border : "transparent", borderTopWidth: savedBank ? 1 : 0 }]}>
              <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>
                {savedBank ? "Update Bank Account" : "Add Bank Account"}
              </ThemedText>

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Bank Name</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. Chase, Wells Fargo, Bank of America"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
              />

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Account Holder Name</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                placeholder="Full name on the account"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
              />

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Account Type</ThemedText>
              <View style={styles.accountTypeRow}>
                {(["checking", "savings"] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setAccountType(type)}
                    style={[
                      styles.accountTypeButton,
                      {
                        backgroundColor: accountType === type ? theme.secondary : theme.backgroundSecondary,
                        borderColor: accountType === type ? theme.secondary : theme.border,
                      },
                    ]}
                  >
                    <ThemedText type="small" style={{ color: accountType === type ? "#FFFFFF" : theme.text, fontWeight: "600" }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Routing Number (9 digits)</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={routingNumber}
                onChangeText={setRoutingNumber}
                placeholder="123456789"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={9}
                secureTextEntry
              />

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Account Number</ThemedText>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Account number"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={17}
                secureTextEntry
              />

              <View style={styles.formActions}>
                <Pressable
                  onPress={() => { setShowAddForm(false); setBankName(""); setAccountHolderName(""); setRoutingNumber(""); setAccountNumber(""); }}
                  style={({ pressed }) => [styles.formButton, { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 }]}
                >
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => saveBankMutation.mutate({ bankName, accountHolderName, accountType, routingNumber, accountNumber })}
                  disabled={saveBankMutation.isPending}
                  style={({ pressed }) => [styles.formButton, { backgroundColor: theme.secondary, flex: 1, opacity: pressed || saveBankMutation.isPending ? 0.7 : 1 }]}
                >
                  {saveBankMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText type="body" style={{ fontWeight: "600", color: "#FFFFFF" }}>Save Account</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Payout Schedule ── */}
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            DEFAULT PAYOUT SCHEDULE
          </ThemedText>
          {scheduleOptions.map((option, i) => (
            <Pressable
              key={option.key}
              onPress={() => setPayoutSchedule(option.key)}
              style={[
                styles.scheduleRow,
                i > 0 ? { borderTopColor: theme.border, borderTopWidth: 1 } : null,
              ]}
            >
              <View style={styles.scheduleInfo}>
                <ThemedText type="body" style={{ fontWeight: "500" }}>{option.label}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{option.sublabel}</ThemedText>
              </View>
              <View style={[styles.radioOuter, { borderColor: payoutSchedule === option.key ? theme.secondary : theme.border }]}>
                {payoutSchedule === option.key ? (
                  <View style={[styles.radioInner, { backgroundColor: theme.secondary }]} />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Tax Information ── */}
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            TAX INFORMATION
          </ThemedText>

          <Pressable
            style={[styles.taxRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}
            onPress={() => {
              Alert.prompt(
                "Social Security Number",
                "Enter your SSN for 1099 tax reporting (stored securely)",
                (value) => { if (value) setTaxSSN(value); },
                "plain-text",
                taxSSN,
                "number-pad"
              );
            }}
          >
            <Feather name="shield" size={18} color={theme.textSecondary} />
            <View style={styles.taxInfo}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>Social Security Number</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {taxSSN ? "Used for 1099 tax reporting" : "Required — tap to add"}
              </ThemedText>
            </View>
            <View style={styles.ssnRow}>
              {taxSSN ? (
                <>
                  <ThemedText type="body" style={{ fontWeight: "600", color: theme.text }}>
                    {showSSN ? taxSSN : `•••-••-${taxSSN.slice(-4)}`}
                  </ThemedText>
                  <Pressable onPress={() => setShowSSN((v) => !v)} style={{ marginLeft: Spacing.sm }}>
                    <Feather name={showSSN ? "eye-off" : "eye"} size={16} color={theme.textSecondary} />
                  </Pressable>
                </>
              ) : (
                <Feather name="plus-circle" size={18} color={theme.warning} />
              )}
            </View>
          </Pressable>

          <Pressable
            style={[styles.taxRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}
            onPress={() => Alert.alert("Tax Documents", "Your 1099 forms will be available for download in January for the previous tax year.")}
          >
            <Feather name="file-text" size={18} color={theme.textSecondary} />
            <View style={styles.taxInfo}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>Tax Documents (1099)</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Available each January for the prior tax year
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </Pressable>

          <View style={[styles.taxRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
            <Feather
              name={taxSSN ? "check-circle" : "alert-circle"}
              size={18}
              color={taxSSN ? theme.success : theme.warning}
            />
            <View style={styles.taxInfo}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>W-9 Status</ThemedText>
              <ThemedText type="small" style={{ color: taxSSN ? theme.success : theme.warning }}>
                {taxSSN ? "On file — ready for payouts" : "SSN required to receive payouts"}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" }]}>
          <Feather name="info" size={14} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, flex: 1, lineHeight: 18 }}>
            {acceptsPriority
              ? "ServiceMe charges a 10% fee on priority jobs and 15% on standard jobs. Tips are always fee-free — you keep 100%."
              : "ServiceMe charges a 15% platform fee on every completed job. You keep 85% of the service fee plus 100% of all tips."}
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  earningsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  earningsLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  payoutInfoCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  payoutInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  payoutInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  payoutInfoDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  payoutInfoSteps: {
    gap: Spacing.sm,
  },
  payoutInfoStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  bankAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  bankAccountInfo: { flex: 1, gap: 2 },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  addBankButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    margin: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addForm: {
    padding: Spacing.lg,
  },
  inputLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  formInput: {
    height: 48,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  accountTypeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    alignItems: "center",
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  formButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xs,
  },
  section: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    fontWeight: "600",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  scheduleInfo: { flex: 1, gap: 2 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  taxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  taxInfo: { flex: 1, gap: 2 },
  ssnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    alignItems: "flex-start",
  },
});
