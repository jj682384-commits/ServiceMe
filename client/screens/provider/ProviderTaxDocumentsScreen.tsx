import React, { useState } from "react";
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
import { getApiUrl } from "@/lib/query-client";

const TAX_YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1];

interface CompletedJob {
  id: string;
  service_type: string;
  total_cost: number | null;
  tip: number | null;
  estimated_cost: number | null;
  created_at: string;
}

export default function ProviderTaxDocumentsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { currentProvider } = useApp();
  const [selectedYear, setSelectedYear] = useState(TAX_YEARS[0]);

  const { data: jobs = [] } = useQuery<CompletedJob[]>({
    queryKey: [`/api/providers/${currentProvider?.id}/completed-jobs`],
    enabled: !!currentProvider?.id,
    queryFn: async () => {
      const res = await fetch(new URL(`/api/providers/${currentProvider!.id}/completed-jobs`, getApiUrl()).toString());
      if (!res.ok) return [];
      return res.json();
    },
  });

  const jobsForYear = (year: number) =>
    jobs.filter((j) => new Date(j.created_at).getFullYear() === year);

  const grossForYear = (year: number) =>
    jobsForYear(year).reduce((sum, j) => {
      const cost = Number(j.total_cost ?? j.estimated_cost ?? 0);
      const tip = Number(j.tip ?? 0);
      return sum + cost + tip;
    }, 0);

  const yearJobs = jobsForYear(selectedYear);
  const yearGross = grossForYear(selectedYear);
  const yearNet = yearGross * 0.85;
  const platformFeesPaid = yearGross * 0.15;
  const threshold1099 = 600;
  const qualifies1099 = yearGross >= threshold1099;
  const currentYear = new Date().getFullYear();
  const is1099Available = selectedYear < currentYear;

  const sectionBg = isDark ? theme.backgroundDefault : "#FFFFFF";

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
        `You earned $${yearGross.toFixed(2)} in ${selectedYear}. The 1099-K threshold is $600. No form is required.`
      );
      return;
    }
    Alert.alert(
      "Download 1099-K",
      `Your ${selectedYear} 1099-K form shows $${yearGross.toFixed(2)} gross income. In a production build this would download the PDF.`,
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
              style={[
                styles.yearTab,
                selectedYear === year && { backgroundColor: theme.primary },
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <ThemedText
                type="body"
                style={{
                  fontWeight: "600",
                  color: selectedYear === year ? "#FFFFFF" : theme.textSecondary,
                }}
              >
                {year}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Earnings Summary */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {selectedYear} EARNINGS SUMMARY
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Gross Income
              </ThemedText>
              <ThemedText type="h3" style={{ color: theme.success, marginTop: 4 }}>
                ${yearGross.toFixed(2)}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Platform Fees
              </ThemedText>
              <ThemedText type="h3" style={{ color: theme.error, marginTop: 4 }}>
                -${platformFeesPaid.toFixed(2)}
              </ThemedText>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Net Paid Out
              </ThemedText>
              <ThemedText type="h3" style={{ marginTop: 4 }}>
                ${yearNet.toFixed(2)}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.row}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Jobs Completed
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {yearJobs.length}
            </ThemedText>
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
              {is1099Available ? "Download PDF" : `Available Jan 31, ${selectedYear + 1}`}
            </ThemedText>
          </Pressable>
        </View>

        {/* Quarterly Estimated Taxes */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          QUARTERLY ESTIMATED TAXES
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          {[
            { label: "Q1 (Jan–Mar)", due: `Apr 15, ${currentYear}`, pct: 0.25 },
            { label: "Q2 (Apr–Jun)", due: `Jun 15, ${currentYear}`, pct: 0.25 },
            { label: "Q3 (Jul–Sep)", due: `Sep 15, ${currentYear}`, pct: 0.25 },
            { label: "Q4 (Oct–Dec)", due: `Jan 15, ${currentYear + 1}`, pct: 0.25 },
          ].map((q, i) => {
            const qGross = yearGross * q.pct;
            const estimated = qGross * 0.25;
            return (
              <View key={q.label}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <View style={styles.row}>
                  <View>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {q.label}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Due {q.due}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={{ color: theme.primary, fontWeight: "700" }}>
                    ~${estimated.toFixed(0)}
                  </ThemedText>
                </View>
              </View>
            );
          })}
          <View style={[styles.disclaimer, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" }]}>
            <Feather name="info" size={14} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: 8 }}>
              Estimated at ~25% of quarterly gross. Consult a tax professional for your actual liability.
            </ThemedText>
          </View>
        </View>

        {/* Business Deductions Reminder */}
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          DEDUCTION REMINDERS
        </ThemedText>
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          {[
            { icon: "navigation" as const, title: "Mileage Log", desc: "Track business miles — $0.67/mile deductible in 2024" },
            { icon: "tool" as const, title: "Equipment & Supplies", desc: "Tools, safety gear, and supplies used for jobs" },
            { icon: "smartphone" as const, title: "Phone & Data", desc: "Business portion of your phone bill is deductible" },
            { icon: "shield" as const, title: "Insurance Premiums", desc: "Commercial auto or liability insurance costs" },
          ].map((item, i) => (
            <View key={item.title}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <View style={styles.row}>
                <View style={[styles.deductIcon, { backgroundColor: "#F59E0B20" }]}>
                  <Feather name={item.icon} size={15} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {item.desc}
                  </ThemedText>
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
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                IRS Gig Economy Tax Center
              </ThemedText>
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
