import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Switch,
  Modal,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

type PayoutSchedule = "daily" | "weekly" | "instant";

interface BankAccount {
  id: string;
  bankName: string;
  accountType: "checking" | "savings";
  last4: string;
  routingLast4: string;
  isDefault: boolean;
}

function jobFeeRate(r: { isExpress?: boolean }, acceptsPriority?: boolean): number {
  return r.isExpress && acceptsPriority ? 0.10 : 0.15;
}

export default function ProviderPaymentSettingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { requestHistory, currentProvider } = useApp();

  const completedJobs = requestHistory.filter(
    (r) => r.provider?.id === currentProvider?.id && r.status === "completed"
  );
  const acceptsPriority = currentProvider?.acceptsPriorityJobs;
  const totalGross = completedJobs.reduce((s, r) => s + (r.totalCost || r.estimatedCost || 0), 0);
  const totalFees = completedJobs.reduce((s, r) => s + (r.totalCost || r.estimatedCost || 0) * jobFeeRate(r, acceptsPriority), 0);
  const totalNet = totalGross - totalFees;
  const pendingBalance = completedJobs
    .slice(0, 2)
    .reduce((s, r) => s + (r.totalCost || r.estimatedCost || 0) * (1 - jobFeeRate(r, acceptsPriority)), 0);
  const availableBalance = Math.max(0, totalNet - pendingBalance);

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule>("weekly");
  const [instantPayoutEnabled, setInstantPayoutEnabled] = useState(false);
  const [minimumThreshold, setMinimumThreshold] = useState("25");
  const [showAddForm, setShowAddForm] = useState(false);
  const [bankName, setBankName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking");
  const [taxSSN, setTaxSSN] = useState("");
  const [showSSN, setShowSSN] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);

  useEffect(() => {
    setWithdrawAmount(availableBalance);
  }, [availableBalance]);

  const PRESETS = [10, 25, 50, 100];

  const handleAddAccount = () => {
    if (!bankName.trim() || routingNumber.length < 9 || accountNumber.length < 4) {
      Alert.alert("Missing Info", "Please fill in all bank account fields correctly.");
      return;
    }
    const newAccount: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: bankName.trim(),
      accountType,
      last4: accountNumber.slice(-4),
      routingLast4: routingNumber.slice(-4),
      isDefault: accounts.length === 0,
    };
    setAccounts((prev) => [...prev, newAccount]);
    setBankName("");
    setRoutingNumber("");
    setAccountNumber("");
    setShowAddForm(false);
  };

  const handleRemoveAccount = (id: string) => {
    if (accounts.find((a) => a.id === id)?.isDefault && accounts.length > 1) {
      Alert.alert("Cannot Remove", "Set another account as default before removing this one.");
      return;
    }
    Alert.alert("Remove Account", "Are you sure you want to remove this bank account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setAccounts((prev) => prev.filter((a) => a.id !== id)),
      },
    ]);
  };

  const handleSetDefault = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  };

  const handleTransfer = () => {
    if (availableBalance < 1) {
      Alert.alert("No Funds Available", "You don't have any funds available for transfer right now.");
      return;
    }
    setWithdrawAmount(availableBalance);
    setShowWithdrawModal(true);
  };

  const handleConfirmTransfer = () => {
    if (withdrawAmount < 1) {
      Alert.alert("Amount Too Low", "Please select at least $1 to transfer.");
      return;
    }
    const defaultAccount = accounts.find((a) => a.isDefault);
    const destination = defaultAccount
      ? `${defaultAccount.bankName} ••••${defaultAccount.last4}`
      : "your bank account";
    setShowWithdrawModal(false);
    Alert.alert(
      "Transfer Initiated",
      `$${withdrawAmount.toFixed(2)} will arrive in ${destination} within 1-2 business days.`
    );
  };

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
        <View style={[styles.balanceCard, { backgroundColor: theme.success }]}>
          <View style={styles.balanceRow}>
            <View>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)", fontWeight: "500" }}>
                AVAILABLE BALANCE
              </ThemedText>
              <ThemedText type="h1" style={{ color: "#FFFFFF", marginTop: 4 }}>
                ${availableBalance.toFixed(2)}
              </ThemedText>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
                ${pendingBalance.toFixed(2)} pending
              </ThemedText>
            </View>
            <Pressable
              onPress={handleTransfer}
              style={({ pressed }) => [
                styles.transferButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="arrow-up-circle" size={16} color={theme.success} />
              <ThemedText type="small" style={{ color: theme.success, fontWeight: "700" }}>
                Transfer
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.balanceBreakdown}>
            <View style={styles.balanceBreakdownItem}>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>
                Gross Earned
              </ThemedText>
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                ${totalGross.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.balanceBreakdownDivider} />
            <View style={styles.balanceBreakdownItem}>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>
                Platform Fee ({acceptsPriority ? "10–15" : "15"}%)
              </ThemedText>
              <ThemedText type="body" style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600" }}>
                -${totalFees.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.balanceBreakdownDivider} />
            <View style={styles.balanceBreakdownItem}>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>
                Net Earnings
              </ThemedText>
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                ${totalNet.toFixed(2)}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            BANK ACCOUNTS
          </ThemedText>

          {accounts.map((account) => (
            <View key={account.id} style={[styles.accountRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <View style={[styles.bankIcon, { backgroundColor: theme.secondary + "15" }]}>
                <Feather name="home" size={20} color={theme.secondary} />
              </View>
              <View style={styles.accountInfo}>
                <View style={styles.accountTitleRow}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {account.bankName}
                  </ThemedText>
                  {account.isDefault ? (
                    <View style={[styles.defaultBadge, { backgroundColor: theme.success + "20" }]}>
                      <ThemedText type="small" style={{ color: theme.success, fontWeight: "600", fontSize: 10 }}>
                        Default
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {account.accountType === "checking" ? "Checking" : "Savings"} •••• {account.last4}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Routing •••• {account.routingLast4}
                </ThemedText>
              </View>
              <View style={styles.accountActions}>
                {!account.isDefault ? (
                  <Pressable
                    onPress={() => handleSetDefault(account.id)}
                    style={({ pressed }) => [styles.smallButton, { backgroundColor: theme.secondary + "15", opacity: pressed ? 0.7 : 1 }]}
                  >
                    <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "600", fontSize: 10 }}>
                      Default
                    </ThemedText>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => handleRemoveAccount(account.id)}
                  style={({ pressed }) => [styles.smallButton, { backgroundColor: theme.error + "15", opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name="trash-2" size={12} color={theme.error} />
                </Pressable>
              </View>
            </View>
          ))}

          {showAddForm ? (
            <View style={[styles.addForm, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>
                Add Bank Account
              </ThemedText>

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Bank Name
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. Chase, Wells Fargo, Bank of America"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
              />

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Account Type
              </ThemedText>
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
                    <ThemedText
                      type="small"
                      style={{ color: accountType === type ? "#FFFFFF" : theme.text, fontWeight: "600" }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Routing Number (9 digits)
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={routingNumber}
                onChangeText={setRoutingNumber}
                placeholder="123456789"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={9}
                secureTextEntry
              />

              <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Account Number
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
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
                  onPress={() => setShowAddForm(false)}
                  style={({ pressed }) => [styles.formButton, { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 }]}
                >
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleAddAccount}
                  style={({ pressed }) => [styles.formButton, { backgroundColor: theme.secondary, flex: 1, opacity: pressed ? 0.7 : 1 }]}
                >
                  <ThemedText type="body" style={{ fontWeight: "600", color: "#FFFFFF" }}>Add Account</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowAddForm(true)}
              style={({ pressed }) => [
                styles.addBankButton,
                { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="plus" size={16} color={theme.secondary} />
              <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "600" }}>
                Add Bank Account
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PAYOUT SCHEDULE
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
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: payoutSchedule === option.key ? theme.secondary : theme.border },
                ]}
              >
                {payoutSchedule === option.key ? (
                  <View style={[styles.radioInner, { backgroundColor: theme.secondary }]} />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PAYOUT PREFERENCES
          </ThemedText>

          <View style={[styles.preferenceRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
            <View style={styles.preferenceInfo}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>Instant Payout</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Withdraw instantly for 1.5% fee
              </ThemedText>
            </View>
            <Switch
              value={instantPayoutEnabled}
              onValueChange={setInstantPayoutEnabled}
              trackColor={{ false: theme.border, true: theme.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.preferenceRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
            <View style={styles.preferenceInfo}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>Minimum Threshold</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Only pay out when balance exceeds this
              </ThemedText>
            </View>
            <View style={styles.thresholdInput}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>$</ThemedText>
              <TextInput
                style={{ color: theme.text, fontSize: 16, fontWeight: "600", minWidth: 40, textAlign: "right" }}
                value={minimumThreshold}
                onChangeText={setMinimumThreshold}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        </View>

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
              : "ServiceMe charges a 15% platform fee on every completed job. You keep 85% of the service fee plus 100% of all tips. Enable Accept Priority Requests in your profile to earn a reduced 10% fee on express jobs."}
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <ThemedText type="h3" style={{ fontWeight: "700" }}>Withdraw Funds</ThemedText>
              <Pressable onPress={() => setShowWithdrawModal(false)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.amountDisplay, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "500", marginBottom: 4 }}>
                WITHDRAW AMOUNT
              </ThemedText>
              <ThemedText type="h1" style={{ color: theme.success, fontWeight: "800", fontSize: 48 }}>
                ${withdrawAmount.toFixed(2)}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                of ${availableBalance.toFixed(2)} available
              </ThemedText>
            </View>

            <View style={styles.sliderWrapper}>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                Drag to choose an amount
              </ThemedText>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={Math.max(availableBalance, 1)}
                step={1}
                value={withdrawAmount}
                onValueChange={(val) => setWithdrawAmount(Math.round(val))}
                minimumTrackTintColor={theme.success}
                maximumTrackTintColor={theme.border}
                thumbTintColor={theme.success}
              />
              <View style={styles.sliderLabels}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>$1</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>${Math.max(availableBalance, 1).toFixed(0)}</ThemedText>
              </View>
            </View>

            <View style={styles.presetsRow}>
              {PRESETS.filter((p) => p <= availableBalance).map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setWithdrawAmount(preset)}
                  style={({ pressed }) => [
                    styles.presetChip,
                    {
                      backgroundColor: withdrawAmount === preset ? theme.success : theme.backgroundSecondary,
                      borderColor: withdrawAmount === preset ? theme.success : theme.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ fontWeight: "700", color: withdrawAmount === preset ? "#FFFFFF" : theme.text }}
                  >
                    ${preset}
                  </ThemedText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setWithdrawAmount(availableBalance)}
                style={({ pressed }) => [
                  styles.presetChip,
                  {
                    backgroundColor: withdrawAmount === availableBalance ? theme.success : theme.backgroundSecondary,
                    borderColor: withdrawAmount === availableBalance ? theme.success : theme.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ fontWeight: "700", color: withdrawAmount === availableBalance ? "#FFFFFF" : theme.text }}
                >
                  All
                </ThemedText>
              </Pressable>
            </View>

            {accounts.find((a) => a.isDefault) ? (
              <View style={[styles.destinationRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="home" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                  To: {accounts.find((a) => a.isDefault)?.bankName} ••••{accounts.find((a) => a.isDefault)?.last4}
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.destinationRow, { backgroundColor: theme.warning + "15", borderColor: theme.warning + "40" }]}>
                <Feather name="alert-circle" size={16} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.warning, flex: 1 }}>
                  Add a bank account to enable transfers
                </ThemedText>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowWithdrawModal(false)}
                style={({ pressed }) => [
                  styles.modalActionButton,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirmTransfer}
                style={({ pressed }) => [
                  styles.modalActionButton,
                  {
                    backgroundColor: accounts.find((a) => a.isDefault) ? theme.success : theme.border,
                    flex: 1,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText type="body" style={{ fontWeight: "700", color: "#FFFFFF" }}>
                  Transfer ${withdrawAmount.toFixed(2)}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  transferButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  balanceBreakdown: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.25)",
  },
  balanceBreakdownItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  balanceBreakdownDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
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
  accountRow: {
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
  accountInfo: { flex: 1, gap: 2 },
  accountTitleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  defaultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  accountActions: { flexDirection: "row", gap: Spacing.xs },
  smallButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    minHeight: 36,
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
  input: {
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
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  preferenceInfo: { flex: 1, gap: 2 },
  thresholdInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 36,
    paddingHorizontal: Spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    alignSelf: "center",
    marginVertical: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  amountDisplay: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  sliderWrapper: {
    marginBottom: Spacing.lg,
  },
  slider: {
    width: "100%",
    height: 44,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -Spacing.xs,
  },
  presetsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
  },
  presetChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalActionButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
