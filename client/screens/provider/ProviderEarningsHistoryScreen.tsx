import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, ServiceRequest } from "@/context/AppContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const PLATFORM_FEE_STANDARD = 0.15;
const PLATFORM_FEE_PRIORITY = 0.10;

function getPlatformFee(isExpress: boolean | undefined, acceptsPriorityJobs: boolean | undefined): number {
  return (isExpress && acceptsPriorityJobs) ? PLATFORM_FEE_PRIORITY : PLATFORM_FEE_STANDARD;
}

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
  mobile_inflation: "Mobile Tire Inflation",
  tire_check: "Tire Check / Inspection",
  other: "Other",
};

const serviceTypeIcons: Record<ServiceType, keyof typeof Feather.glyphMap> = {
  flat_tire: "disc",
  jump_start: "battery-charging",
  tow: "truck",
  fuel: "droplet",
  lockout: "key",
  obd_diagnostic: "cpu",
  mobile_inflation: "wind",
  tire_check: "search",
  other: "tool",
};

interface EarningEntry {
  id: string;
  request: ServiceRequest;
  gross: number;
  fee: number;
  feeRate: number;
  net: number;
  tip: number;
}

interface PayoutRecord {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  payoutType: "instant" | "standard";
  status: string;
  bankLast4: string | null;
  createdAt: string;
}

interface EarningsData {
  balance: number;
  payouts: PayoutRecord[];
}

interface SavedBankAccount {
  bankName: string;
  accountType: "checking" | "savings";
  accountHolderName: string;
  routingLast4: string;
  accountLast4: string;
}

type PayoutType = "instant" | "standard";

function EarningCard({ entry }: { entry: EarningEntry }) {
  const { theme } = useTheme();
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handlePress = () => {
    Alert.alert(
      `${serviceTypeLabels[entry.request.serviceType]} — Earnings Detail`,
      [
        `Driver: ${entry.request.driver?.name ?? "Unknown"}`,
        `Date: ${formatDate(entry.request.createdAt)}`,
        `Service fee: $${entry.gross.toFixed(2)}`,
        `Tip: $${entry.tip.toFixed(2)}`,
        `Platform fee (${Math.round(entry.feeRate * 100)}%): -$${entry.fee.toFixed(2)}`,
        `Net payout: $${entry.net.toFixed(2)}`,
      ]
        .filter(Boolean)
        .join("\n"),
      [{ text: "OK" }]
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: theme.secondary + "15" }]}>
        <Feather name={serviceTypeIcons[entry.request.serviceType]} size={20} color={theme.secondary} />
      </View>

      <View style={styles.cardContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
          {serviceTypeLabels[entry.request.serviceType]}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {entry.request.driver?.name ?? "Driver"} · {formatDate(entry.request.createdAt)}
        </ThemedText>
        <View style={styles.feeRow}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            ${entry.gross.toFixed(2)} gross
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.error }}>
            {"  "}−${entry.fee.toFixed(2)} fee
          </ThemedText>
          {entry.tip > 0 ? (
            <ThemedText type="small" style={{ color: theme.success }}>
              {"  "}+${entry.tip.toFixed(2)} tip
            </ThemedText>
          ) : null}
        </View>
      </View>

      <ThemedText type="h4" style={{ color: theme.success }}>
        +${entry.net.toFixed(2)}
      </ThemedText>
    </Pressable>
  );
}

function PayoutCard({ payout }: { payout: PayoutRecord }) {
  const { theme } = useTheme();
  const date = new Date(payout.createdAt);
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const isInstant = payout.payoutType === "instant";

  return (
    <View style={[styles.payoutCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.payoutCardIcon, { backgroundColor: theme.primary + "15" }]}>
        <Feather name={isInstant ? "zap" : "clock"} size={18} color={theme.primary} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {isInstant ? "Instant Transfer" : "Standard Transfer"}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {label}{payout.bankLast4 ? ` · •••• ${payout.bankLast4}` : ""}
        </ThemedText>
        {payout.fee > 0 ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Fee: ${payout.fee.toFixed(2)}
          </ThemedText>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <ThemedText type="body" style={{ fontWeight: "700", color: theme.text }}>
          ${payout.netAmount.toFixed(2)}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: theme.warning + "20" }]}>
          <ThemedText type="small" style={{ color: theme.warning, fontWeight: "600", fontSize: 10 }}>
            Processing
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function ProviderEarningsHistoryScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { requestHistory, currentProvider, updateHistoryEntry } = useApp();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [serverTips, setServerTips] = useState<Record<string, number>>({});
  const [showCashOut, setShowCashOut] = useState(false);
  const [payoutType, setPayoutType] = useState<PayoutType>("standard");
  const [amountText, setAmountText] = useState("");

  const earningsKey = `/api/providers/${currentProvider?.id}/earnings`;
  const bankKey = `/api/providers/${currentProvider?.id}/payout-bank`;

  const { data: earningsData, isLoading: earningsLoading } = useQuery<EarningsData>({
    queryKey: [earningsKey],
    enabled: !!currentProvider?.id,
    refetchInterval: 15000,
  });

  const { data: bankData } = useQuery<{ bankAccount: SavedBankAccount | null }>({
    queryKey: [bankKey],
    enabled: !!currentProvider?.id,
  });

  const balance = earningsData?.balance ?? 0;
  const payoutHistory = earningsData?.payouts ?? [];
  const savedBank = bankData?.bankAccount ?? null;

  useEffect(() => {
    if (balance > 0) setAmountText(balance.toFixed(2));
  }, [balance]);

  const payoutAmount = parseFloat(amountText) || 0;
  const fee = payoutType === "instant" ? Math.round(payoutAmount * 0.015 * 100) / 100 : 0;
  const netAmount = Math.max(0, payoutAmount - fee);

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/providers/${currentProvider!.id}/payout`, {
        amount: payoutAmount,
        payoutType,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Payout failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [earningsKey] });
      setShowCashOut(false);
      const arrivalMsg = payoutType === "instant"
        ? "Funds will arrive within 30 minutes."
        : "Funds will arrive in 1-2 business days.";
      Alert.alert(
        "Transfer Submitted",
        `$${netAmount.toFixed(2)} is on its way to your bank. ${arrivalMsg}`
      );
    },
    onError: (e: Error) => Alert.alert("Transfer Failed", e.message),
  });

  const handleCashOut = () => {
    if (!savedBank) {
      Alert.alert(
        "No Bank Account",
        "Add a bank account in Payout Settings before cashing out.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Bank", onPress: () => navigation.navigate("ProviderPaymentSettings") },
        ]
      );
      return;
    }
    if (balance < 5) {
      Alert.alert("Balance Too Low", "Minimum cash out is $5.00.");
      return;
    }
    setAmountText(balance.toFixed(2));
    setPayoutType("standard");
    setShowCashOut(true);
  };

  const handleConfirm = () => {
    if (payoutAmount < 5) {
      Alert.alert("Amount Too Low", "Minimum cash out is $5.00.");
      return;
    }
    if (payoutAmount > balance) {
      Alert.alert("Amount Too High", `Maximum is $${balance.toFixed(2)}.`);
      return;
    }
    payoutMutation.mutate();
  };

  const completedJobs = useMemo(
    () =>
      requestHistory
        .filter((r) => r.provider?.id === currentProvider?.id && r.status === "completed")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [requestHistory, currentProvider],
  );

  useEffect(() => {
    if (completedJobs.length === 0) return;
    const fetchTips = async () => {
      const results: Record<string, number> = {};
      await Promise.all(
        completedJobs.map(async (r) => {
          try {
            const url = new URL(`/api/jobs/${r.id}`, getApiUrl());
            const res = await fetch(url.toString(), { headers: { "Cache-Control": "no-cache" } });
            if (!res.ok) return;
            const job = await res.json();
            if (typeof job.tip === "number") {
              results[r.id] = job.tip;
              if (r.tip !== job.tip) {
                updateHistoryEntry(r.id, { tip: job.tip, totalCost: job.totalCost });
              }
            }
          } catch {}
        }),
      );
      setServerTips((prev) => ({ ...prev, ...results }));
    };
    fetchTips();
  }, [completedJobs.length]);

  const entries = useMemo<EarningEntry[]>(() => {
    return completedJobs.map((r) => {
      const gross = r.estimatedCost || 0;
      const tip = serverTips[r.id] !== undefined ? serverTips[r.id] : Math.max(0, (r.tip || 0));
      const feeRate = getPlatformFee(r.isExpress, currentProvider?.acceptsPriorityJobs);
      const fee = gross * feeRate;
      const net = gross - fee + tip;
      return { id: r.id, request: r, gross, fee, feeRate, net, tip };
    });
  }, [completedJobs, serverTips, currentProvider?.acceptsPriorityJobs]);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const thisWeekNet = entries
    .filter((e) => e.request.createdAt >= startOfWeek)
    .reduce((s, e) => s + e.net, 0);

  const thisMonthNet = entries
    .filter(
      (e) =>
        e.request.createdAt.getMonth() === now.getMonth() &&
        e.request.createdAt.getFullYear() === now.getFullYear()
    )
    .reduce((s, e) => s + e.net, 0);

  const allTimeNet = entries.reduce((s, e) => s + e.net, 0);

  const renderHeader = () => (
    <View>
      {/* ── Cash-Out Hero Card ── */}
      <View style={[styles.balanceCard, { backgroundColor: theme.success }]}>
        <View style={styles.balanceTop}>
          <View>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>
              AVAILABLE BALANCE
            </ThemedText>
            {earningsLoading ? (
              <ActivityIndicator color="#FFFFFF" style={{ marginTop: 8 }} />
            ) : (
              <ThemedText style={{ color: "#FFFFFF", fontSize: 44, fontWeight: "800", marginTop: 4 }}>
                ${balance.toFixed(2)}
              </ThemedText>
            )}
          </View>
          <Pressable
            onPress={handleCashOut}
            disabled={earningsLoading}
            style={({ pressed }) => [
              styles.cashOutBtn,
              { opacity: pressed || earningsLoading ? 0.8 : 1 },
            ]}
          >
            <Feather name="arrow-up-circle" size={16} color={theme.success} />
            <ThemedText type="small" style={{ color: theme.success, fontWeight: "800" }}>
              Cash Out
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)", marginTop: Spacing.sm }}>
          Minimum $5.00 · Instant (1.5% fee) or Standard (free, 1-2 days)
        </ThemedText>
      </View>

      {/* ── Payout History ── */}
      {payoutHistory.length > 0 ? (
        <View style={{ marginBottom: Spacing.md }}>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            TRANSFER HISTORY
          </ThemedText>
          {payoutHistory.map((p) => <PayoutCard key={p.id} payout={p} />)}
        </View>
      ) : null}

      {/* ── Summary Grid ── */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="trending-up" size={16} color={theme.secondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 6 }}>
            This Week
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: 2 }}>
            ${thisWeekNet.toFixed(2)}
          </ThemedText>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="calendar" size={16} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 6 }}>
            This Month
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: 2 }}>
            ${thisMonthNet.toFixed(2)}
          </ThemedText>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="award" size={16} color={theme.warning} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 6 }}>
            All Time
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: 2 }}>
            ${allTimeNet.toFixed(2)}
          </ThemedText>
        </View>
      </View>

      {entries.length > 0 ? (
        <View style={styles.feeNotice}>
          <Feather name="info" size={12} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            {currentProvider?.acceptsPriorityJobs
              ? "10% fee on priority jobs, 15% on standard jobs. Tips are fee-free."
              : "15% platform fee deducted. Tips are fee-free — you keep 100%."}
          </ThemedText>
        </View>
      ) : null}

      {entries.length > 0 ? (
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          COMPLETED JOBS
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EarningCard entry={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.sm,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          !entries.length ? (
            <View style={styles.emptyState}>
              <Feather name="dollar-sign" size={48} color={theme.textSecondary} />
              <ThemedText type="h4" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
                No Earnings Yet
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                Accept and complete jobs to start earning. Your balance will appear here automatically.
              </ThemedText>
            </View>
          ) : null
        }
      />

      {/* ── Cash-Out Modal ── */}
      <Modal
        visible={showCashOut}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCashOut(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <ThemedText type="h3" style={{ fontWeight: "700" }}>Cash Out</ThemedText>
              <Pressable onPress={() => setShowCashOut(false)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            {/* Amount */}
            <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
              AMOUNT
            </ThemedText>
            <View style={[styles.amountRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <ThemedText type="h3" style={{ color: theme.textSecondary, fontWeight: "700" }}>$</ThemedText>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
              />
              <Pressable onPress={() => setAmountText(balance.toFixed(2))}>
                <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "700" }}>Max</ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
              Available: ${balance.toFixed(2)}
            </ThemedText>

            {/* Payout type */}
            <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
              TRANSFER SPEED
            </ThemedText>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setPayoutType("standard")}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: payoutType === "standard" ? theme.primary : theme.backgroundSecondary,
                    borderColor: payoutType === "standard" ? theme.primary : theme.border,
                  },
                ]}
              >
                <Feather name="clock" size={16} color={payoutType === "standard" ? "#FFF" : theme.textSecondary} />
                <View>
                  <ThemedText type="body" style={{ fontWeight: "700", color: payoutType === "standard" ? "#FFF" : theme.text }}>
                    Standard
                  </ThemedText>
                  <ThemedText type="small" style={{ color: payoutType === "standard" ? "rgba(255,255,255,0.8)" : theme.textSecondary }}>
                    1-2 days · Free
                  </ThemedText>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setPayoutType("instant")}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: payoutType === "instant" ? theme.secondary : theme.backgroundSecondary,
                    borderColor: payoutType === "instant" ? theme.secondary : theme.border,
                  },
                ]}
              >
                <Feather name="zap" size={16} color={payoutType === "instant" ? "#FFF" : theme.textSecondary} />
                <View>
                  <ThemedText type="body" style={{ fontWeight: "700", color: payoutType === "instant" ? "#FFF" : theme.text }}>
                    Instant
                  </ThemedText>
                  <ThemedText type="small" style={{ color: payoutType === "instant" ? "rgba(255,255,255,0.8)" : theme.textSecondary }}>
                    ~30 min · 1.5% fee
                  </ThemedText>
                </View>
              </Pressable>
            </View>

            {/* Fee breakdown */}
            <View style={[styles.breakdownBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <View style={styles.breakdownRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Transfer amount</ThemedText>
                <ThemedText type="small" style={{ fontWeight: "600" }}>${payoutAmount.toFixed(2)}</ThemedText>
              </View>
              {fee > 0 ? (
                <View style={styles.breakdownRow}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Instant fee (1.5%)</ThemedText>
                  <ThemedText type="small" style={{ color: theme.error, fontWeight: "600" }}>−${fee.toFixed(2)}</ThemedText>
                </View>
              ) : null}
              <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: Spacing.sm, paddingTop: Spacing.sm }]}>
                <ThemedText type="body" style={{ fontWeight: "700" }}>You receive</ThemedText>
                <ThemedText type="body" style={{ color: theme.success, fontWeight: "800" }}>${netAmount.toFixed(2)}</ThemedText>
              </View>
            </View>

            {/* Destination */}
            {savedBank ? (
              <View style={[styles.destRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="home" size={14} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                  To: {savedBank.bankName} {savedBank.accountType === "checking" ? "Checking" : "Savings"} •••• {savedBank.accountLast4}
                </ThemedText>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCashOut(false)}
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 }]}
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                disabled={payoutMutation.isPending}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { flex: 1, backgroundColor: theme.success, opacity: pressed || payoutMutation.isPending ? 0.7 : 1 },
                ]}
              >
                {payoutMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "800" }}>
                    Transfer ${netAmount.toFixed(2)}
                  </ThemedText>
                )}
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
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cashOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  feeNotice: {
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  payoutCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  payoutCardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  feeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
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
  inputLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
  },
  typeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  breakdownBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destRow: {
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
  modalBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
