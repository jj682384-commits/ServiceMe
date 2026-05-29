import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const CURRENT_YEAR = new Date().getFullYear();
const TAX_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1];

const IRS_MILEAGE_RATE: Record<number, string> = {
  2026: "$0.70",
  2025: "$0.70",
  2024: "$0.67",
  2023: "$0.655",
};

interface CompletedJob {
  id: string;
  service_type: string;
  total_cost: number | null;
  tip: number | null;
  estimated_cost: number | null;
  created_at: string;
}

function jobValue(j: CompletedJob) {
  return Number(j.total_cost ?? j.estimated_cost ?? 0) + Number(j.tip ?? 0);
}

function quarterRange(year: number, q: 1 | 2 | 3 | 4): [Date, Date] {
  const starts = [0, 3, 6, 9];
  const start = new Date(year, starts[q - 1], 1);
  const end = q < 4 ? new Date(year, starts[q], 1) : new Date(year + 1, 0, 1);
  return [start, end];
}

function jobsInQuarter(jobs: CompletedJob[], year: number, q: 1 | 2 | 3 | 4) {
  const [start, end] = quarterRange(year, q);
  return jobs.filter((j) => {
    const t = new Date(j.created_at).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
}

export default function ProviderTaxDocumentsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { currentProvider } = useApp();
  const [selectedYear, setSelectedYear] = useState(TAX_YEARS[0]);

  // Uses default fetcher — auth token is injected automatically
  const { data: allJobs = [], isLoading } = useQuery<CompletedJob[]>({
    queryKey: [`/api/providers/${currentProvider?.id}/completed-jobs`],
    enabled: !!currentProvider?.id,
  });

  const yearJobs = useMemo(
    () => allJobs.filter((j) => new Date(j.created_at).getFullYear() === selectedYear),
    [allJobs, selectedYear]
  );

  const yearGross = useMemo(() => yearJobs.reduce((s, j) => s + jobValue(j), 0), [yearJobs]);
  const yearNet = yearGross * 0.85;
  const platformFeesPaid = yearGross * 0.15;

  const threshold1099 = 600;
  const qualifies1099 = yearGross >= threshold1099;
  const is1099Available = selectedYear < CURRENT_YEAR;

  const quarters = useMemo(
    () =>
      ([1, 2, 3, 4] as const).map((q) => {
        const qJobs = jobsInQuarter(yearJobs, selectedYear, q);
        const qGross = qJobs.reduce((s, j) => s + jobValue(j), 0);
        const estimated = qGross * 0.25;
        const dueDates: Record<number, string> = {
          1: `Apr 15, ${selectedYear}`,
          2: `Jun 16, ${selectedYear}`,
          3: `Sep 15, ${selectedYear}`,
          4: `Jan 15, ${selectedYear + 1}`,
        };
        const labels: Record<number, string> = {
          1: "Q1 (Jan–Mar)",
          2: "Q2 (Apr–Jun)",
          3: "Q3 (Jul–Sep)",
          4: "Q4 (Oct–Dec)",
        };
        return { q, label: labels[q], due: dueDates[q], gross: qGross, estimated, count: qJobs.length };
      }),
    [yearJobs, selectedYear]
  );

  const sectionBg = isDark ? theme.backgroundDefault : "#FFFFFF";
  const mileageRate = IRS_MILEAGE_RATE[selectedYear] ?? IRS_MILEAGE_RATE[CURRENT_YEAR] ?? "$0.70";

  const handleDownload = () => {
    if (!is1099Available) {
      Alert.alert(
        "Not Yet Available",
        `Your ${selectedYear} 1099-K will be available by January 31, ${selectedYear + 1}.`
      );
      return;
    }
    if (!qualifies1099) {
      Alert.alert(
        "Below Threshold",
        `You earned $${yearGross.toFixed(2)} in ${selectedYear}. The 1099-K threshold is $600. No form is required for this year.`
      );
      return;
    }
    Alert.alert(
      `${selectedYear} 1099-K`,
      `Gross income reported: $${yearGross.toFixed(2)}\nPlatform fees: -$${platformFeesPaid.toFixed(2)}\nJobs completed: ${yearJobs.length}\n\nContact support@resqride.co to request your official 1099-K PDF.`,
      [{ text: "OK" }]
    );
  };

  const handleIrsLink = () => {
    Linking.openURL("https://www.irs.gov/businesses/gig-economy-tax-center");
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ["#1C2A3A", "#0F1923"] : ["#E8F4FD", "#D6EAF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={[styles.heroIcon, { backgroundColor: "#3B82F620" }]}>
            <Feather name="file-text" size={28} color="#3B82F6" />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.md, textAlign: "center" }}>
            Tax Documents
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 4 }}>
            Your earnings records and IRS forms
          </ThemedText>
        </LinearGradient>

        {/* Year Tabs */}
        <View style={[styles.yearTabRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          {TAX_YEARS.map((year) => (
            <Pressable
              key={year}
              style={[styles.yearTab, selectedYear === year && { backgroundColor: theme.primary }]}
              onPress={() => setSelectedYear(year)}
            >
              <ThemedText
                type="body"
                style={{ fontWeight: "600", color: selectedYear === year ? "#FFFFFF" : theme.textSecondary }}
              >
                {year}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Empty state */}
        {!isLoading && yearJobs.length === 0 && (
          <View style={[styles.emptyBox, { backgroundColor: sectionBg, borderColor: theme.border }]}>
            <Feather name="inbox" size={28} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
              No completed jobs recorded for {selectedYear}.
            </ThemedText>
          </View>
        )}

        {/* Earnings Summary */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {selectedYear} EARNINGS SUMMARY
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Gross Income</ThemedText>
              <ThemedText type="h3" style={{ color: theme.success, marginTop: 4 }}>
                ${yearGross.toFixed(2)}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Platform Fees</ThemedText>
              <ThemedText type="h3" style={{ color: theme.error, marginTop: 4 }}>
                -${platformFeesPaid.toFixed(2)}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Net Paid Out</ThemedText>
              <ThemedText type="h3" style={{ marginTop: 4 }}>${yearNet.toFixed(2)}</ThemedText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.row}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>Jobs Completed</ThemedText>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{yearJobs.length}</ThemedText>
          </View>
        </View>

        {/* 1099-K Form */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          TAX FORMS
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={styles.formRow}>
            <View style={[styles.formIcon, { backgroundColor: qualifies1099 ? "#10B98120" : theme.border }]}>
              <Feather
                name="file-text"
                size={20}
                color={qualifies1099 ? "#10B981" : theme.textSecondary}
              />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                1099-K — {selectedYear}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {!qualifies1099
                  ? `Below $600 threshold — no form issued`
                  : is1099Available
                  ? `Available — Gross: $${yearGross.toFixed(2)}`
                  : `Available Jan 31, ${selectedYear + 1}`}
              </ThemedText>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    !qualifies1099 ? theme.border :
                    is1099Available ? "#10B98120" : "#F59E0B20",
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color:
                    !qualifies1099 ? theme.textSecondary :
                    is1099Available ? "#10B981" : "#F59E0B",
                  fontWeight: "700",
                }}
              >
                {!qualifies1099 ? "N/A" : is1099Available ? "Ready" : "Pending"}
              </ThemedText>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.downloadBtn,
              {
                backgroundColor: qualifies1099 && is1099Available ? theme.primary : theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleDownload}
          >
            <Feather
              name="download"
              size={16}
              color={qualifies1099 && is1099Available ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              type="body"
              style={{
                marginLeft: 8,
                fontWeight: "600",
                color: qualifies1099 && is1099Available ? "#FFFFFF" : theme.textSecondary,
              }}
            >
              {is1099Available ? "Request PDF" : `Available Jan 31, ${selectedYear + 1}`}
            </ThemedText>
          </Pressable>
        </View>

        {/* Quarterly Estimated Taxes — computed from actual per-quarter job data */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          QUARTERLY ESTIMATED TAXES
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          {quarters.map((q, i) => (
            <View key={q.label}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{q.label}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Due {q.due} · {q.count} job{q.count !== 1 ? "s" : ""} · ${q.gross.toFixed(0)} gross
                  </ThemedText>
                </View>
                <ThemedText type="body" style={{ color: theme.primary, fontWeight: "700" }}>
                  ~${q.estimated.toFixed(0)}
                </ThemedText>
              </View>
            </View>
          ))}
          <View style={[styles.disclaimer, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" }]}>
            <Feather name="info" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: 8 }}>
              Estimates are ~25% of quarterly gross from your actual completed jobs. Consult a tax professional for your real liability.
            </ThemedText>
          </View>
        </View>

        {/* Business Deductions Reminder */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          DEDUCTION REMINDERS
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          {[
            {
              icon: "navigation" as const,
              title: "Mileage Log",
              desc: `Track business miles — ${mileageRate}/mile deductible for ${selectedYear}`,
            },
            {
              icon: "tool" as const,
              title: "Equipment & Supplies",
              desc: "Tools, safety gear, and supplies used for jobs",
            },
            {
              icon: "smartphone" as const,
              title: "Phone & Data",
              desc: "Business portion of your phone bill is deductible",
            },
            {
              icon: "shield" as const,
              title: "Insurance Premiums",
              desc: "Commercial auto or liability insurance costs",
            },
          ].map((item, i) => (
            <View key={item.title}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <View style={styles.row}>
                <View style={[styles.deductIcon, { backgroundColor: "#F59E0B20" }]}>
                  <Feather name={item.icon} size={15} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{item.title}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>{item.desc}</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* IRS Resources */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          TAX RESOURCES
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <Pressable
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleIrsLink}
          >
            <View style={[styles.deductIcon, { backgroundColor: "#3B82F620" }]}>
              <Feather name="external-link" size={15} color="#3B82F6" />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>IRS Gig Economy Tax Center</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                irs.gov — official guidance for gig workers
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  yearTabRow: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  yearTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  emptyBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing["2xl"],
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  section: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    marginHorizontal: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  formIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  deductIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
});
