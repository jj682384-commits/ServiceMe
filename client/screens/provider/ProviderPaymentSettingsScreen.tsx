import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";

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

interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  accountId?: string;
}

type PayoutSchedule = "daily" | "weekly" | "instant";

export default function ProviderPaymentSettingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { currentProvider } = useApp();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const bankQueryKey = `/api/providers/${currentProvider?.id}/payout-bank`;
  const connectStatusKey = `/api/stripe/connect/status/${currentProvider?.id}`;

  // ── Connect status ──────────────────────────────────────────────────────────
  const { data: connectData, isLoading: connectLoading, refetch: refetchConnect } =
    useQuery<ConnectStatus>({
      queryKey: [connectStatusKey],
      enabled: !!currentProvider?.id,
      staleTime: 30_000,
    });

  const isConnected = connectData?.connected && connectData?.detailsSubmitted;
  const isPayoutsEnabled = connectData?.payoutsEnabled;
  const connectStarted = connectData?.connected && !connectData?.detailsSubmitted;

  // Refetch Connect status when app returns to foreground after browser opens
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        refetchConnect();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [refetchConnect]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/connect/onboard", {
        providerId: currentProvider!.id,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start Stripe onboarding");
      }
      return res.json() as Promise<{ url: string; accountId: string }>;
    },
    onSuccess: async ({ url }) => {
      if (Platform.OS === "web") {
        // Web: open in new tab
        (global as any).open?.(url, "_blank");
      } else {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
        // Refetch after browser closes
        refetchConnect();
      }
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  // ── Manual bank account (fallback when Connect not set up) ──────────────────
  const { data: bankData, isLoading: bankLoading } = useQuery<{ bankAccount: SavedBankAccount | null }>({
    queryKey: [bankQueryKey],
    enabled: !!currentProvider?.id && !isConnected,
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

  // ── Stripe Connect status card ──────────────────────────────────────────────
  const renderConnectCard = () => {
    if (connectLoading) {
      return (
        <View style={[styles.connectCard, { backgroundColor: theme.backgroundDefault }]}>
          <ActivityIndicator color={theme.secondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            Checking payout status...
          </ThemedText>
        </View>
      );
    }

    if (isConnected && isPayoutsEnabled) {
      // Fully connected
      return (
        <View style={[styles.connectCard, { backgroundColor: theme.success + "15", borderColor: theme.success + "40", borderWidth: 1 }]}>
          <View style={styles.connectCardRow}>
            <View style={[styles.connectIcon, { backgroundColor: theme.success + "20" }]}>
              <Feather name="check-circle" size={22} color={theme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "800", color: theme.success }}>
                Stripe Payouts Active
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                Your bank is connected via Stripe. Earnings transfer automatically when you cash out.
              </ThemedText>
            </View>
          </View>
          <View style={[styles.connectDivider, { backgroundColor: theme.success + "25" }]} />
          <View style={styles.connectBadgeRow}>
            <View style={[styles.connectBadge, { backgroundColor: theme.success + "20" }]}>
              <Feather name="zap" size={11} color={theme.success} />
              <ThemedText type="small" style={{ color: theme.success, fontWeight: "700", fontSize: 11 }}>
                Instant payouts available
              </ThemedText>
            </View>
            <View style={[styles.connectBadge, { backgroundColor: theme.success + "20" }]}>
              <Feather name="shield" size={11} color={theme.success} />
              <ThemedText type="small" style={{ color: theme.success, fontWeight: "700", fontSize: 11 }}>
                Identity verified
              </ThemedText>
            </View>
          </View>
        </View>
      );
    }

    if (isConnected && !isPayoutsEnabled) {
      // Account created + submitted but Stripe still reviewing
      return (
        <View style={[styles.connectCard, { backgroundColor: theme.warning + "12", borderColor: theme.warning + "40", borderWidth: 1 }]}>
          <View style={styles.connectCardRow}>
            <View style={[styles.connectIcon, { backgroundColor: theme.warning + "20" }]}>
              <Feather name="clock" size={22} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "800", color: theme.warning }}>
                Under Review
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                Stripe is verifying your account. This usually takes a few minutes to 1 business day.
              </ThemedText>
            </View>
          </View>
        </View>
      );
    }

    if (connectStarted) {
      // Account exists but onboarding not finished
      return (
        <View style={[styles.connectCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.connectCardRow}>
            <View style={[styles.connectIcon, { backgroundColor: theme.warning + "20" }]}>
              <Feather name="alert-circle" size={22} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "700" }}>
                Setup Incomplete
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                You started Stripe onboarding but haven't finished. Resume to start receiving real payouts.
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            style={({ pressed }) => [
              styles.connectBtn,
              { backgroundColor: theme.warning, opacity: pressed || connectMutation.isPending ? 0.8 : 1 },
            ]}
          >
            {connectMutation.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="arrow-right-circle" size={16} color="#FFF" />
                <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700" }}>
                  Resume Setup
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      );
    }

    // Not connected at all
    return (
      <View style={[styles.connectCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.connectCardRow}>
          <View style={[styles.connectIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="credit-card" size={22} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "700" }}>
              Connect Your Bank with Stripe
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Required to receive real payouts. Stripe securely verifies your identity and bank — takes about 5 minutes.
            </ThemedText>
          </View>
        </View>

        <View style={styles.connectFeatureList}>
          {[
            { icon: "shield" as const, text: "Bank-level encryption — Stripe stores your account details, not us" },
            { icon: "zap" as const, text: "Instant and standard payouts once verified" },
            { icon: "check-circle" as const, text: "Identity verification handled by Stripe (no extra steps in app)" },
          ].map((f, i) => (
            <View key={i} style={styles.connectFeature}>
              <Feather name={f.icon} size={13} color={theme.success} />
              <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>{f.text}</ThemedText>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
          style={({ pressed }) => [
            styles.connectBtn,
            { backgroundColor: theme.primary, opacity: pressed || connectMutation.isPending ? 0.8 : 1 },
          ]}
        >
          {connectMutation.isPending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Feather name="external-link" size={16} color="#FFF" />
              <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700" }}>
                Connect Bank via Stripe
              </ThemedText>
            </>
          )}
        </Pressable>

        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm, fontSize: 11 }}>
          Powered by Stripe Connect — the same technology used by Lyft, DoorDash, and Instacart
        </ThemedText>
      </View>
    );
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

        {/* ── Stripe Connect Card ── */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          BANK ACCOUNT & PAYOUTS
        </ThemedText>
        {renderConnectCard()}

        {/* ── Manual bank account — only shown when Stripe Connect not complete ── */}
        {!isConnected ? (
          <View style={[styles.section, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.sm }]}>
            <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              MANUAL BANK ACCOUNT (OPTIONAL FALLBACK)
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, lineHeight: 17 }}>
              For in-app balance cash-outs only. For real bank transfers, connect via Stripe above.
            </ThemedText>

            {bankLoading ? (
              <View style={styles.bankLoadingRow}>
                <ActivityIndicator size="small" color={theme.secondary} />
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
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert("Remove Bank Account", "Are you sure?", [
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
                  Add Bank Account Manually
                </ThemedText>
              </Pressable>
            ) : null}

            {showAddForm ? (
              <View style={styles.addForm}>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>
                  Add Bank Account
                </ThemedText>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Bank Name</ThemedText>
                <TextInput style={[styles.formInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]} value={bankName} onChangeText={setBankName} placeholder="e.g. Chase, Wells Fargo" placeholderTextColor={theme.textSecondary} autoCapitalize="words" />
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Account Holder Name</ThemedText>
                <TextInput style={[styles.formInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]} value={accountHolderName} onChangeText={setAccountHolderName} placeholder="Full name on account" placeholderTextColor={theme.textSecondary} autoCapitalize="words" />
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Account Type</ThemedText>
                <View style={styles.accountTypeRow}>
                  {(["checking", "savings"] as const).map((type) => (
                    <Pressable key={type} onPress={() => setAccountType(type)} style={[styles.accountTypeButton, { backgroundColor: accountType === type ? theme.secondary : theme.backgroundSecondary, borderColor: accountType === type ? theme.secondary : theme.border }]}>
                      <ThemedText type="small" style={{ color: accountType === type ? "#FFF" : theme.text, fontWeight: "600" }}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Routing Number (9 digits)</ThemedText>
                <TextInput style={[styles.formInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]} value={routingNumber} onChangeText={setRoutingNumber} placeholder="123456789" placeholderTextColor={theme.textSecondary} keyboardType="number-pad" maxLength={9} secureTextEntry />
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>Account Number</ThemedText>
                <TextInput style={[styles.formInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]} value={accountNumber} onChangeText={setAccountNumber} placeholder="Account number" placeholderTextColor={theme.textSecondary} keyboardType="number-pad" maxLength={17} secureTextEntry />
                <View style={styles.formActions}>
                  <Pressable onPress={() => { setShowAddForm(false); setBankName(""); setAccountHolderName(""); setRoutingNumber(""); setAccountNumber(""); }} style={({ pressed }) => [styles.formButton, { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 }]}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => saveBankMutation.mutate({ bankName, accountHolderName, accountType, routingNumber, accountNumber })} disabled={saveBankMutation.isPending} style={({ pressed }) => [styles.formButton, { backgroundColor: theme.secondary, flex: 1, opacity: pressed || saveBankMutation.isPending ? 0.7 : 1 }]}>
                    {saveBankMutation.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <ThemedText type="body" style={{ fontWeight: "600", color: "#FFF" }}>Save Account</ThemedText>}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

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
                Earnings are credited to your balance the moment a job is finalized. Cash out anytime — Standard (free, 1-2 days) or Instant (30 min, 1.5% fee).
              </ThemedText>
            </View>
          </View>
        </View>

        {/* ── Payout Schedule ── */}
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            DEFAULT PAYOUT SCHEDULE
          </ThemedText>
          {scheduleOptions.map((option, i) => (
            <Pressable key={option.key} onPress={() => setPayoutSchedule(option.key)} style={[styles.scheduleRow, i > 0 ? { borderTopColor: theme.border, borderTopWidth: 1 } : null]}>
              <View style={styles.scheduleInfo}>
                <ThemedText type="body" style={{ fontWeight: "500" }}>{option.label}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{option.sublabel}</ThemedText>
              </View>
              <View style={[styles.radioOuter, { borderColor: payoutSchedule === option.key ? theme.secondary : theme.border }]}>
                {payoutSchedule === option.key ? <View style={[styles.radioInner, { backgroundColor: theme.secondary }]} /> : null}
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
              Alert.prompt("Social Security Number", "Enter your SSN for 1099 tax reporting", (v) => { if (v) setTaxSSN(v); }, "plain-text", taxSSN, "number-pad");
            }}
          >
            <Feather name="shield" size={18} color={theme.textSecondary} />
            <View style={styles.taxInfo}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>Social Security Number</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>{taxSSN ? "Used for 1099 tax reporting" : "Required — tap to add"}</ThemedText>
            </View>
            <View style={styles.ssnRow}>
              {taxSSN ? (
                <>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{showSSN ? taxSSN : `•••-••-${taxSSN.slice(-4)}`}</ThemedText>
                  <Pressable onPress={() => setShowSSN((v) => !v)} style={{ marginLeft: Spacing.sm }}>
                    <Feather name={showSSN ? "eye-off" : "eye"} size={16} color={theme.textSecondary} />
                  </Pressable>
                </>
              ) : (
                <Feather name="plus-circle" size={18} color={theme.warning} />
              )}
            </View>
          </Pressable>
          <Pressable style={[styles.taxRow, { borderTopColor: theme.border, borderTopWidth: 1 }]} onPress={() => Alert.alert("Tax Documents", "Your 1099 forms will be available in January for the previous tax year.")}>
            <Feather name="file-text" size={18} color={theme.textSecondary} />
            <View style={styles.taxInfo}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>Tax Documents (1099)</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Available each January for the prior tax year</ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </Pressable>
          <View style={[styles.taxRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
            <Feather name={taxSSN ? "check-circle" : "alert-circle"} size={18} color={taxSSN ? theme.success : theme.warning} />
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
              ? "ResqRide charges a 10% fee on priority jobs and 15% on standard jobs. Tips are always fee-free."
              : "ResqRide charges a 15% platform fee on every completed job. You keep 85% of the service fee plus 100% of all tips."}
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
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
  connectCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  connectCardRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  connectIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  connectDivider: {
    height: 1,
  },
  connectBadgeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  connectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  connectFeatureList: {
    gap: Spacing.sm,
  },
  connectFeature: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
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
  bankLoadingRow: {
    padding: Spacing.lg,
    alignItems: "center",
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
  addForm: { padding: Spacing.lg },
  inputLabel: { fontWeight: "600", marginBottom: Spacing.xs, marginTop: Spacing.md },
  formInput: { height: 48, borderRadius: BorderRadius.xs, paddingHorizontal: Spacing.md, fontSize: 16, borderWidth: 1 },
  accountTypeRow: { flexDirection: "row", gap: Spacing.md },
  accountTypeButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs, borderWidth: 1, alignItems: "center" },
  formActions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.xl },
  formButton: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.xs },
  section: { borderRadius: BorderRadius.md, marginBottom: Spacing.lg, overflow: "hidden" },
  sectionTitle: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, fontWeight: "600" },
  scheduleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  scheduleInfo: { flex: 1, gap: 2 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  taxRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  taxInfo: { flex: 1, gap: 2 },
  ssnRow: { flexDirection: "row", alignItems: "center" },
  infoBox: { flexDirection: "row", gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: Spacing.xl, alignItems: "flex-start" },
});
